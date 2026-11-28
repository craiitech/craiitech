'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore, useUser } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
  signInWithRedirect,
  getRedirectResult,
  AuthError,
  UserCredential,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, type Firestore } from '@/firebase/firestore-wrapper';
import { Loader2, Mail, X, Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { DataPrivacyDialog } from './data-privacy-dialog';
import { NumericCaptcha } from './numeric-captcha';
import { logUserActivity } from '@/lib/activity-logger';
import {
  type AuthFeedback,
  type LoginSecurityState,
  MAX_FAILED_CAPTCHA_ATTEMPTS_BEFORE_LOCKOUT,
  MAX_FAILED_PASSWORD_ATTEMPTS_BEFORE_CAPTCHA,
  clearLocalSecurityState,
  createEmptySecurityState,
  formatLockoutCountdown,
  formatLockoutDuration,
  generateNumericCaptcha,
  getRemainingLockoutMs,
  isAccountLocked,
  isInvalidCredentialErrorCode,
  mergeSecurityStates,
  normalizeLoginIdentifier,
  readLastActiveSecurityContext,
  readLocalSecurityState,
  recordFailedCaptchaAttempt,
  recordFailedPasswordAttempt,
  resetLoginSecurityState,
  verifyNumericCaptcha,
  writeLocalSecurityState,
} from '@/lib/login-security';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface AuthFormProps {
  initialTab: 'signin' | 'signup';
}

type AuthAccessPolicy = {
  allowExternalGoogleAccounts: boolean;
  allowRegisteredExternalEmails: boolean;
};

const DEFAULT_AUTH_ACCESS_POLICY: AuthAccessPolicy = {
  allowExternalGoogleAccounts: false,
  allowRegisteredExternalEmails: false,
};

async function getAuthAccessPolicy(firestore: Firestore): Promise<AuthAccessPolicy> {
  try {
    const settingsDoc = await getDoc(doc(firestore, 'system', 'settings'));
    const data = settingsDoc.exists() ? settingsDoc.data() : {};
    return {
      allowExternalGoogleAccounts: data.allowExternalGoogleAccounts === true,
      allowRegisteredExternalEmails: data.allowRegisteredExternalEmails === true,
    };
  } catch {
    return DEFAULT_AUTH_ACCESS_POLICY;
  }
}

const firebaseFeedbackMap: Record<string, Omit<AuthFeedback, 'variant'>> = {
  'auth/user-not-found': {
    title: 'Invalid Email or Password',
    message: 'The email address or password you entered does not match an active account.',
  },
  'auth/wrong-password': {
    title: 'Invalid Email or Password',
    message: 'The email address or password you entered is incorrect.',
  },
  'auth/invalid-credential': {
    title: 'Invalid Email or Password',
    message: 'The email address or password you entered is incorrect.',
  },
  'auth/invalid-email': {
    title: 'Invalid Email Format',
    message: 'Please enter a valid institutional email address (e.g. name@rsu.edu.ph).',
  },
  'auth/email-already-in-use': {
    title: 'Email Already Registered',
    message: 'This email address is already associated with an existing account.',
    hint: 'Switch to Sign in to access your account.',
  },
  'auth/weak-password': {
    title: 'Weak Password',
    message: 'Please use at least 6 characters for your account password.',
  },
  'auth/popup-closed-by-user': {
    title: 'Sign-In Window Closed',
    message: 'The Google sign-in window was closed before completing authentication. Please try again.',
  },
  'auth/cancelled-popup-request': {
    title: 'Sign-In Already in Progress',
    message: 'Another sign-in window is already open. Please wait or refresh the page.',
  },
  'auth/operation-not-allowed': {
    title: 'Sign-In Method Disabled',
    message: 'This authentication method is currently disabled. Please contact your system administrator.',
  },
  'auth/popup-blocked': {
    title: 'Sign-In Popup Blocked',
    message: 'Your browser blocked the sign-in popup. Allow popups or try again to continue via redirect.',
  },
  'auth/unauthorized-domain': {
    title: 'Unauthorized Domain',
    message: 'This portal domain is not yet authorized for Google Sign-In. Please contact the administrator.',
  },
  'auth/too-many-requests': {
    title: 'Too Many Failed Attempts',
    message: 'Authentication has been temporarily throttled due to repeated failed attempts.',
    hint: 'Please reset your password or wait before trying again.',
  },
  'auth/network-request-failed': {
    title: 'Network Connection Error',
    message: 'Unable to reach the authentication server. Please check your internet connection and try again.',
  },
  'auth/quota-exceeded': {
    title: 'Server Busy',
    message: 'The authentication server is experiencing high traffic. Please wait a moment and try again.',
  },
  'auth/internal-error': {
    title: 'Temporary Authentication Error',
    message: 'An unexpected authentication error occurred. Please refresh the page and try again.',
  },
};

function getMappedAuthFeedback(errorCode: string | undefined, fallbackTitle: string): AuthFeedback {
  const mapped = errorCode ? firebaseFeedbackMap[errorCode] : undefined;
  if (mapped) {
    return { variant: 'error', ...mapped };
  }
  return {
    variant: 'error',
    title: fallbackTitle,
    message: 'Unable to complete authentication right now. Please verify your details and try again.',
  };
}

function buildLockedFeedback(state: LoginSecurityState, now: number): AuthFeedback {
  const remainingMs = getRemainingLockoutMs(state, now);
  const unlockTime =
    state.lockedUntil !== null
      ? new Date(state.lockedUntil).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '';
  return {
    variant: 'locked',
    title: 'Account Locked for 30 Minutes',
    message:
      'Login has been temporarily blocked after 5 invalid CAPTCHA attempts. You cannot sign in to this account until the lockout period ends.',
    hint: unlockTime
      ? `Remaining lockout duration: ${formatLockoutDuration(remainingMs)} (unlocks at ${unlockTime}).`
      : `Remaining lockout duration: ${formatLockoutDuration(remainingMs)}.`,
  };
}

export function AuthForm({ initialTab }: AuthFormProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyPolicyAgreed, setPrivacyPolicyAgreed] = useState(false);
  const [isPrivacyDialogOpen, setIsPrivacyDialogOpen] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<AuthFeedback | null>(null);
  const [authAccessPolicy, setAuthAccessPolicy] = useState<AuthAccessPolicy>(DEFAULT_AUTH_ACCESS_POLICY);

  // Security guard states (invalid clearing, 3-attempt CAPTCHA, 5-attempt CAPTCHA 30-min lockout)
  const [securityState, setSecurityState] = useState<LoginSecurityState>(() => createEmptySecurityState());
  const [activeSecurityEmail, setActiveSecurityEmail] = useState('');
  const [captchaCode, setCaptchaCode] = useState(() => generateNumericCaptcha());
  const [captchaInput, setCaptchaInput] = useState('');
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Forgot Password States
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, userProfile, isUserLoading } = useUser();

  const syncLoginGuard = useCallback(
    async (
      action: 'status' | 'password_failed' | 'captcha_failed' | 'reset',
      targetEmail: string,
      idToken?: string,
    ): Promise<LoginSecurityState> => {
      const normalized = normalizeLoginIdentifier(targetEmail);
      const now = Date.now();
      if (!normalized) return createEmptySecurityState(now);

      let localState = readLocalSecurityState(normalized, now);
      if (action === 'password_failed') {
        localState = recordFailedPasswordAttempt(localState, now);
        writeLocalSecurityState(normalized, localState);
      } else if (action === 'captcha_failed') {
        localState = recordFailedCaptchaAttempt(localState, now);
        writeLocalSecurityState(normalized, localState);
      } else if (action === 'reset') {
        clearLocalSecurityState(normalized);
        localState = resetLoginSecurityState(now);
      }

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (idToken) {
          headers.Authorization = `Bearer ${idToken}`;
        }
        const response = await fetch('/api/auth/login-guard', {
          method: 'POST',
          headers,
          body: JSON.stringify({ action, email: normalized }),
        });
        if (!response.ok) return localState;
        const data = (await response.json()) as { state?: LoginSecurityState };
        if (!data?.state) return localState;

        if (action === 'reset') {
          clearLocalSecurityState(normalized);
          return resetLoginSecurityState(Date.now());
        }

        const merged = mergeSecurityStates(localState, data.state, Date.now());
        writeLocalSecurityState(normalized, merged);
        return merged;
      } catch {
        return localState;
      }
    },
    [],
  );

  // Automatically redirect if already logged in with a profile
  useEffect(() => {
    if (user && userProfile && !isUserLoading) {
      router.push('/dashboard');
    }
  }, [user, userProfile, isUserLoading, router]);

  // Load the administrator-configured sign-in policy so the Google account chooser
  // can avoid restricting to the RSU Workspace domain when external accounts are allowed.
  useEffect(() => {
    if (!firestore) return;
    let cancelled = false;
    getAuthAccessPolicy(firestore).then((policy) => {
      if (!cancelled) setAuthAccessPolicy(policy);
    });
    return () => {
      cancelled = true;
    };
  }, [firestore]);

  // Restore any active CAPTCHA or 30-minute lockout context on mount
  useEffect(() => {
    if (activeTab !== 'signin') return;
    let cancelled = false;
    const now = Date.now();
    const ctx = readLastActiveSecurityContext(now);
    if (!ctx) return;

    setActiveSecurityEmail(ctx.email);
    setSecurityState(ctx.state);
    setNowMs(now);
    if (isAccountLocked(ctx.state, now)) {
      setAuthFeedback(buildLockedFeedback(ctx.state, now));
    } else if (ctx.state.captchaRequired) {
      setCaptchaCode(generateNumericCaptcha());
      setAuthFeedback({
        variant: 'warning',
        title: 'CAPTCHA Verification Required',
        message: 'Multiple failed login attempts were previously detected for this account.',
        hint: 'Please enter the 6-digit CAPTCHA number below to verify your sign-in.',
      });
    }

    syncLoginGuard('status', ctx.email).then((merged) => {
      if (cancelled) return;
      const current = Date.now();
      setSecurityState(merged);
      setNowMs(current);
      if (isAccountLocked(merged, current)) {
        setAuthFeedback(buildLockedFeedback(merged, current));
      } else if (!merged.captchaRequired) {
        setActiveSecurityEmail('');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [activeTab, syncLoginGuard]);

  // Live 1-second countdown while an account is locked for 30 minutes
  const isLockedTimerActive = isAccountLocked(securityState, nowMs);
  useEffect(() => {
    if (!isLockedTimerActive) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (!isAccountLocked(securityState, current)) {
        if (activeSecurityEmail) {
          clearLocalSecurityState(activeSecurityEmail);
        }
        setSecurityState(resetLoginSecurityState(current));
        setActiveSecurityEmail('');
        setCaptchaInput('');
        setCaptchaCode(generateNumericCaptcha());
        setAuthFeedback({
          variant: 'info',
          title: 'Account Lockout Expired',
          message: 'Your 30-minute temporary lockout has ended. You may now sign in again.',
        });
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isLockedTimerActive, securityState, activeSecurityEmail]);

  /**
   * Centralized logic to handle authentication results.
   */
  const handleAuthResult = useCallback(
    async (result: UserCredential) => {
      if (!firestore) return;
      const user = result.user;
      const additionalInfo = getAdditionalUserInfo(result);

      try {
        const normalizedEmail = (user.email || '').trim().toLowerCase();
        const guardStatusNow = Date.now();
        const guardState = await syncLoginGuard('status', normalizedEmail);
        if (isAccountLocked(guardState, guardStatusNow)) {
          if (auth) {
            await auth.signOut();
          }
          setActiveSecurityEmail(normalizedEmail);
          setSecurityState(guardState);
          setNowMs(guardStatusNow);
          setAuthFeedback(buildLockedFeedback(guardState, guardStatusNow));
          setIsSubmitting(false);
          return;
        }

        const isInstitutional = normalizedEmail.endsWith('@rsu.edu.ph') || normalizedEmail === 'admin@eoms.com';
        const providerId = additionalInfo?.providerId || (result as any).credential?.providerId || '';
        const isGoogle = providerId === 'google.com';

        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const isRegistered = userDoc.exists();
        const policy = await getAuthAccessPolicy(firestore);
        setAuthAccessPolicy(policy);

        let isAccessAllowed = isInstitutional;
        if (!isAccessAllowed) {
          if (policy.allowRegisteredExternalEmails) {
            // Any email domain is accepted, but only for accounts already in the registry.
            isAccessAllowed = isRegistered;
          } else if (policy.allowExternalGoogleAccounts) {
            // Non-institutional accounts may enter only through Google sign-in.
            isAccessAllowed = isGoogle;
          }
        }

        if (!isAccessAllowed) {
          if (auth) {
            await auth.signOut();
          }
          setAuthFeedback({
            variant: 'error',
            title: 'Access Denied',
            message: policy.allowRegisteredExternalEmails
              ? 'This email address is not registered in the system. Please contact the administrator to register your account.'
              : policy.allowExternalGoogleAccounts
                ? 'Please sign in with your official @rsu.edu.ph account or continue with Google.'
                : 'Please connect using your official Romblon State University Google account (@rsu.edu.ph).',
          });
          setIsSubmitting(false);
          return;
        }

        clearLocalSecurityState(normalizedEmail);
        setSecurityState(resetLoginSecurityState());
        setActiveSecurityEmail('');
        setCaptchaInput('');
        try {
          const idToken = await user.getIdToken();
          await syncLoginGuard('reset', normalizedEmail, idToken);
        } catch {
          // Do not block an authorized login if cleanup fails.
        }

        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('rsu_eoms_digest_seen_session');
          sessionStorage.setItem('rsu_eoms_pending_login_digest', 'true');
        }

        // If it's a new Auth user OR the user exists in Auth but is missing their Firestore profile
        if (additionalInfo?.isNewUser || !userDoc.exists()) {
          const nameParts = (user.displayName || '').trim().split(/\s+/).filter(Boolean);
          const first = nameParts[0] || '';
          const last = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
          const userData = {
            id: user.uid,
            email: user.email,
            firstName: firstName || first || '',
            lastName: lastName || last || '',
            sex: sex || '',
            avatar: user.photoURL,
            roleId: '',
            role: '',
            campusId: '',
            unitId: '',
            verified: false,
            ndaAccepted: false,
            privacyPolicyAgreed: false,
          };
          await setDoc(userDocRef, userData, { merge: true });

          const method = (result as any).credential?.providerId || (user.email ? 'google.com' : 'unknown');
          await logUserActivity(
            user.uid,
            `${userData.firstName} ${userData.lastName}`.trim() || user.email || 'New User',
            'New User',
            'user_register',
            { method },
          );

          toast({
            title: 'RSU Google Account Connected!',
            description:
              'Please provide your First Name, Last Name, Sex Identification, and agree to the Data Privacy Statement.',
          });
          router.push('/complete-registration');
        } else {
          const existingData = userDoc.data();
          const needsOnboarding =
            !existingData?.firstName ||
            !existingData?.lastName ||
            !existingData?.sex ||
            !existingData?.campusId ||
            (!existingData?.privacyPolicyAgreed && !existingData?.ndaAccepted);

          if (needsOnboarding && normalizedEmail !== 'admin@eoms.com') {
            router.push('/complete-registration');
          } else {
            router.push('/dashboard');
          }
        }
      } catch (err) {
        setAuthFeedback({
          variant: 'error',
          title: 'Profile Setup Error',
          message: 'An error occurred while setting up your institutional profile. Please try again.',
        });
        setIsSubmitting(false);
      }
    },
    [auth, firestore, firstName, lastName, sex, router, toast, syncLoginGuard],
  );

  // Handle Redirect Result on Mount
  useEffect(() => {
    if (auth && firestore) {
      getRedirectResult(auth)
        .then((result) => {
          if (result) {
            setIsSubmitting(true);
            handleAuthResult(result);
          }
        })
        .catch((error) => {
          const errorCode = (error as AuthError).code;
          if (errorCode !== 'auth/redirect-cancelled-by-user') {
            setAuthFeedback(getMappedAuthFeedback(errorCode, 'Google Sign-In Failed'));
          }
        });
    }
  }, [auth, firestore, handleAuthResult]);

  const togglePasswordVisibility = () => setIsPasswordVisible(!isPasswordVisible);

  const handleTabChange = (tab: 'signin' | 'signup') => {
    setActiveTab(tab);
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setSex('');
    setCaptchaInput('');
    setIsPasswordVisible(false);
    setAuthFeedback(null);
  };

  const clearError = () => {
    if (authFeedback && authFeedback.variant !== 'locked') {
      setAuthFeedback(null);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setAuthFeedback({
        variant: 'error',
        title: 'Service Unavailable',
        message: 'Authentication service is not available right now. Please refresh and try again.',
      });
      return;
    }
    if (!email.trim() || !password) {
      setAuthFeedback({
        variant: 'error',
        title: 'Missing Credentials',
        message: 'Please enter both your email address and password to sign in.',
      });
      return;
    }

    const targetEmail = normalizeLoginIdentifier(email);
    setIsSubmitting(true);
    setAuthFeedback(null);

    const statusNow = Date.now();
    const effectiveState = await syncLoginGuard('status', targetEmail);

    if (isAccountLocked(effectiveState, statusNow)) {
      setActiveSecurityEmail(targetEmail);
      setSecurityState(effectiveState);
      setNowMs(statusNow);
      setEmail('');
      setPassword('');
      setCaptchaInput('');
      setIsPasswordVisible(false);
      setAuthFeedback(buildLockedFeedback(effectiveState, statusNow));
      setIsSubmitting(false);
      return;
    }

    if (effectiveState.captchaRequired) {
      setActiveSecurityEmail(targetEmail);
      setSecurityState(effectiveState);

      if (!securityState.captchaRequired) {
        setCaptchaCode(generateNumericCaptcha());
        setCaptchaInput('');
        setAuthFeedback({
          variant: 'warning',
          title: 'CAPTCHA Verification Required',
          message: 'Multiple failed login attempts were detected for this account.',
          hint: 'Please enter the 6-digit CAPTCHA number below to continue signing in.',
        });
        setIsSubmitting(false);
        return;
      }

      if (!captchaInput.trim()) {
        const remainingCaptcha = Math.max(
          0,
          MAX_FAILED_CAPTCHA_ATTEMPTS_BEFORE_LOCKOUT - effectiveState.failedCaptchaAttempts,
        );
        setAuthFeedback({
          variant: 'warning',
          title: 'CAPTCHA Number Required',
          message: 'Please enter the 6-digit CAPTCHA number displayed below before signing in.',
          hint: `${remainingCaptcha} invalid CAPTCHA ${remainingCaptcha === 1 ? 'attempt' : 'attempts'} remaining before a 30-minute lockout.`,
        });
        setIsSubmitting(false);
        return;
      }

      if (!verifyNumericCaptcha(captchaCode, captchaInput)) {
        const updatedState = await syncLoginGuard('captcha_failed', targetEmail);
        const failureNow = Date.now();
        setActiveSecurityEmail(targetEmail);
        setSecurityState(updatedState);
        setNowMs(failureNow);
        setCaptchaInput('');
        setCaptchaCode(generateNumericCaptcha());

        if (isAccountLocked(updatedState, failureNow)) {
          setEmail('');
          setPassword('');
          setIsPasswordVisible(false);
          setAuthFeedback(buildLockedFeedback(updatedState, failureNow));
        } else {
          const remainingCaptcha = Math.max(
            0,
            MAX_FAILED_CAPTCHA_ATTEMPTS_BEFORE_LOCKOUT - updatedState.failedCaptchaAttempts,
          );
          setAuthFeedback({
            variant: 'warning',
            title: 'Incorrect CAPTCHA Number',
            message: 'The 6-digit verification number you entered does not match. A new code has been generated.',
            hint: `Invalid CAPTCHA attempt ${updatedState.failedCaptchaAttempts} of ${MAX_FAILED_CAPTCHA_ATTEMPTS_BEFORE_LOCKOUT} — ${remainingCaptcha} ${
              remainingCaptcha === 1 ? 'attempt' : 'attempts'
            } remaining before a 30-minute account lockout.`,
          });
        }
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      await handleAuthResult(result);
    } catch (error) {
      const errorCode = (error as AuthError).code;

      if (
        isInvalidCredentialErrorCode(errorCode) ||
        errorCode === 'auth/invalid-email' ||
        errorCode === 'auth/too-many-requests'
      ) {
        setEmail('');
        setPassword('');
        setCaptchaInput('');
        setIsPasswordVisible(false);
      }

      if (isInvalidCredentialErrorCode(errorCode)) {
        const updatedState = await syncLoginGuard('password_failed', targetEmail);
        setActiveSecurityEmail(targetEmail);
        setSecurityState(updatedState);

        if (updatedState.captchaRequired) {
          setCaptchaCode(generateNumericCaptcha());
          setAuthFeedback({
            variant: 'warning',
            title:
              updatedState.failedPasswordAttempts === MAX_FAILED_PASSWORD_ATTEMPTS_BEFORE_CAPTCHA
                ? 'CAPTCHA Verification Required'
                : 'Invalid Email or Password',
            message:
              'The email address or password you entered is incorrect. Please enter the CAPTCHA number below to continue signing in.',
          });
        } else {
          setAuthFeedback({
            variant: 'error',
            title: 'Invalid Email or Password',
            message: 'The email address or password you entered is incorrect. Please try again.',
          });
        }
      } else {
        setAuthFeedback(getMappedAuthFeedback(errorCode, 'Sign-In Failed'));
      }
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) {
      setAuthFeedback({
        variant: 'error',
        title: 'Service Unavailable',
        message: 'Authentication service is not available.',
      });
      return;
    }
    if (!email || !password || !firstName || !lastName || !sex) {
      setAuthFeedback({
        variant: 'error',
        title: 'Incomplete Details',
        message: 'Please fill out all fields, including sex identification.',
      });
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const isInstitutional = normalizedEmail.endsWith('@rsu.edu.ph');
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isInstitutional && !isDev) {
      setAuthFeedback({
        variant: 'error',
        title: 'Institutional Email Required',
        message: 'Please register using your official university email (@rsu.edu.ph).',
      });
      return;
    }
    if (!privacyPolicyAgreed) {
      setAuthFeedback({
        variant: 'error',
        title: 'Privacy Statement Required',
        message: 'You must agree to the Data Privacy Statement to create an account.',
      });
      return;
    }
    setIsSubmitting(true);
    setAuthFeedback(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await handleAuthResult(userCredential);
    } catch (error) {
      const errorCode = (error as AuthError).code;
      setAuthFeedback(getMappedAuthFeedback(errorCode, 'Registration Failed'));
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async () => {
    if (!auth || !resetEmail) return;
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: 'Reset Link Sent',
        description: `A password reset email has been sent to ${resetEmail}. Please check your inbox.`,
      });
      setIsResetDialogOpen(false);
      setResetEmail('');
    } catch (error) {
      const errorCode = (error as AuthError).code;
      const mapped = getMappedAuthFeedback(errorCode, 'Password Reset Failed');
      toast({
        title: mapped.title,
        description: mapped.message,
        variant: 'destructive',
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const processGoogleSignIn = () => {
    if (!auth || !firestore) {
      setAuthFeedback({
        variant: 'error',
        title: 'Service Unavailable',
        message: 'Authentication service is not available.',
      });
      return;
    }
    setIsSubmitting(true);
    setAuthFeedback(null);
    const provider = new GoogleAuthProvider();
    const allowExternalAccounts =
      authAccessPolicy.allowExternalGoogleAccounts || authAccessPolicy.allowRegisteredExternalEmails;
    provider.setCustomParameters(
      allowExternalAccounts ? { prompt: 'select_account' } : { prompt: 'select_account', hd: 'rsu.edu.ph' },
    );

    // Attempt popup first
    signInWithPopup(auth, provider)
      .then(async (result) => {
        handleAuthResult(result);
      })
      .catch((error) => {
        const errorCode = (error as AuthError).code;

        // If popup is blocked or closed, fallback to redirect
        const shouldRedirect =
          errorCode === 'auth/popup-blocked' ||
          errorCode === 'auth/popup-closed-by-user' ||
          errorCode === 'auth/cancelled-popup-request' ||
          errorCode === 'auth/internal-error';

        if (shouldRedirect) {
          signInWithRedirect(auth, provider);
        } else {
          setAuthFeedback(getMappedAuthFeedback(errorCode, 'Google Sign-In Failed'));
          setIsSubmitting(false);
        }
      });
  };

  const normalizedTypedEmail = normalizeLoginIdentifier(email);
  const isCurrentTargetLocked =
    isAccountLocked(securityState, nowMs) && (!normalizedTypedEmail || normalizedTypedEmail === activeSecurityEmail);
  const lockoutCountdown = formatLockoutCountdown(getRemainingLockoutMs(securityState, nowMs));

  const handleSignInEmailChange = (nextValue: string) => {
    setEmail(nextValue);
    const typed = normalizeLoginIdentifier(nextValue);
    const now = Date.now();

    if (typed) {
      const stored = readLocalSecurityState(typed, now);
      if (isAccountLocked(stored, now)) {
        setActiveSecurityEmail(typed);
        setSecurityState(stored);
        setNowMs(now);
        setAuthFeedback(buildLockedFeedback(stored, now));
        return;
      }
      if (stored.captchaRequired) {
        setActiveSecurityEmail(typed);
        setSecurityState(stored);
        if (!securityState.captchaRequired) {
          setCaptchaCode(generateNumericCaptcha());
        }
        clearError();
        return;
      }
      if (
        typed.includes('@') &&
        activeSecurityEmail &&
        typed !== activeSecurityEmail &&
        !activeSecurityEmail.startsWith(typed)
      ) {
        setActiveSecurityEmail(typed);
        setSecurityState(stored);
        setCaptchaInput('');
      }
    }

    if (!isAccountLocked(securityState, now)) {
      clearError();
    } else if (typed.includes('@') && typed !== activeSecurityEmail && !activeSecurityEmail.startsWith(typed)) {
      setAuthFeedback(null);
    }
  };

  const renderSignIn = () => (
    <form onSubmit={handleSignIn} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email-signin">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="email-signin"
            type="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(e) => handleSignInEmailChange(e.target.value)}
            disabled={isSubmitting}
            className="pl-9 bg-gray-800/50 border-gray-700 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="password-signin">Password</Label>
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-[10px] text-white/60 hover:text-white uppercase font-bold tracking-widest"
            onClick={() => {
              setResetEmail(email);
              setIsResetDialogOpen(true);
            }}
          >
            Forgot password?
          </Button>
        </div>
        <div className="relative">
          <Input
            id="password-signin"
            type={isPasswordVisible ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError();
            }}
            disabled={isSubmitting || isCurrentTargetLocked}
            placeholder="Enter your password"
            className="pr-10 bg-gray-800/50 border-gray-700 focus:ring-primary focus:border-primary"
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            disabled={isSubmitting || isCurrentTargetLocked}
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 flex items-center pr-3"
          >
            {isPasswordVisible ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {securityState.captchaRequired && !isCurrentTargetLocked && (
        <NumericCaptcha
          code={captchaCode}
          value={captchaInput}
          onChange={(val) => {
            setCaptchaInput(val);
            clearError();
          }}
          onRefresh={() => {
            setCaptchaCode(generateNumericCaptcha());
            setCaptchaInput('');
            clearError();
          }}
          failedAttempts={securityState.failedCaptchaAttempts}
          maxAttempts={MAX_FAILED_CAPTCHA_ATTEMPTS_BEFORE_LOCKOUT}
          disabled={isSubmitting}
        />
      )}

      <Button
        type="submit"
        className="w-full bg-white dark:bg-slate-900 text-black dark:text-white hover:bg-gray-200 disabled:opacity-60"
        disabled={isSubmitting || isCurrentTargetLocked}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isCurrentTargetLocked ? (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Account Locked ({lockoutCountdown})
          </>
        ) : (
          'Sign In'
        )}
      </Button>
    </form>
  );

  const renderSignUp = () => (
    <div className="space-y-5">
      <div className="rounded-xl bg-slate-800/70 border border-slate-700 p-4 space-y-3 text-left">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            Official RSU Google Workspace Enrollment
          </span>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">
          Account registration uses your official{' '}
          <strong className="text-white">Romblon State University Email (@rsu.edu.ph)</strong> via Google
          Authentication.
        </p>
        <div className="space-y-1.5 pt-1 border-t border-gray-700/60 text-[11px] text-gray-300">
          <p className="font-bold text-white">What happens after connecting your RSU Google account:</p>
          <ol className="list-decimal pl-4 space-y-1 text-gray-300">
            <li>
              Enter and verify your official <strong>First Name</strong> and <strong>Last Name</strong>.
            </li>
            <li>
              Select your <strong>Sex Identification</strong> (required under CMO No. 1, s. 2015 GAD SDD).
            </li>
            <li>
              Select your <strong>Campus, Role, and Unit</strong> assignment.
            </li>
            <li>
              Review and agree to the <strong>Data Privacy Statement (RA 10173)</strong>.
            </li>
          </ol>
        </div>
      </div>

      <Button
        type="button"
        onClick={processGoogleSignIn}
        disabled={isSubmitting}
        className="w-full h-12 bg-white hover:bg-gray-100 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center gap-2.5"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-5 w-5" />}
        Sign up with RSU Email (rsu.edu.ph)
      </Button>
    </div>
  );

  return (
    <>
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/95 p-8 text-white shadow-lg">
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-gray-700/50"
            onClick={() => router.push('/')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex justify-center mb-6">
          <div className="flex rounded-full bg-gray-800/50 p-1 border border-gray-700/50">
            <Button
              onClick={() => handleTabChange('signup')}
              className={cn(
                'rounded-full px-6 py-1 text-sm',
                activeTab === 'signup'
                  ? 'bg-gray-600/70 text-white'
                  : 'bg-transparent text-gray-400 hover:bg-gray-700/50 hover:text-white',
              )}
            >
              Sign up
            </Button>
            <Button
              onClick={() => handleTabChange('signin')}
              className={cn(
                'rounded-full px-6 py-1 text-sm',
                activeTab === 'signin'
                  ? 'bg-gray-600/70 text-white'
                  : 'bg-transparent text-gray-400 hover:bg-gray-700/50 hover:text-white',
              )}
            >
              Sign in
            </Button>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6 text-center">
          {activeTab === 'signup' ? 'Create your RSU EOMS Account' : 'RSU EOMS Submission Portal'}
        </h2>

        {activeTab === 'signup' ? renderSignUp() : renderSignIn()}

        {activeTab === 'signin' && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-800/50 px-2 text-gray-400 backdrop-blur-sm rounded-full">Or sign in with</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Button
                variant="outline"
                className="bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 text-white"
                onClick={processGoogleSignIn}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <GoogleIcon className="mr-2 h-5 w-5" />
                RSU Email (rsu.edu.ph) via Google
              </Button>
            </div>
          </>
        )}
        {activeTab === 'signup' && (
          <p className="mt-6 text-center text-xs text-gray-400">
            By connecting your RSU Google account, you will next confirm your Name, GAD Sex Identification, and{' '}
            <button type="button" onClick={() => setIsPrivacyDialogOpen(true)} className="underline hover:text-white">
              Data Privacy Statement
            </button>
            .
          </p>
        )}
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="bg-slate-900 border-gray-700 text-white sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto bg-primary/10 h-12 w-12 rounded-full flex items-center justify-center mb-4">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">Account Recovery</DialogTitle>
            <DialogDescription className="text-center text-gray-400 text-sm">
              Enter your RSU email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reset-email" className="text-gray-300">
              Official RSU Email
            </Label>
            <div className="relative mt-2">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                id="reset-email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="yourname@rsu.edu.ph"
                className="bg-gray-800 border-gray-700 text-white pl-10 h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsResetDialogOpen(false)}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPasswordSubmit}
              disabled={isSendingReset || !resetEmail}
              className="bg-white dark:bg-slate-900 text-black dark:text-white hover:bg-gray-200 h-11 px-8"
            >
              {isSendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(authFeedback)}
        onOpenChange={(open) => {
          if (!open) setAuthFeedback(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{authFeedback?.title}</AlertDialogTitle>
            <AlertDialogDescription>{authFeedback?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          {authFeedback?.variant === 'locked' && isAccountLocked(securityState, nowMs) && (
            <p className="text-sm font-medium text-destructive">Time remaining: {lockoutCountdown}</p>
          )}
          {authFeedback?.hint && <p className="text-xs text-muted-foreground">{authFeedback.hint}</p>}
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAuthFeedback(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DataPrivacyDialog
        isOpen={isPrivacyDialogOpen}
        onOpenChange={setIsPrivacyDialogOpen}
        onAccept={() => {
          setPrivacyPolicyAgreed(true);
          setIsPrivacyDialogOpen(false);
        }}
      />
    </>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" {...props}>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.804 9.81C34.553 6.186 29.658 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691c-1.328 1.9-2.131 4.2-2.131 6.6C4.175 23.6 5 26.1 6.306 28.31l-5.01-3.882C.05 21.6 0 18.9 0 16.1s.05-5.5 1.296-8.209z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-4.819C28.907 36.5 26.545 38 24 38c-3.866 0-7.172-1.93-9.15-4.854l-6.357 4.93C11.134 41.2 17.06 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.16-4.087 5.571l6.19 4.819c3.424-3.167 5.57-7.794 5.57-12.891c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
