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
import { Loader2, Mail, X, Eye, EyeOff, AlertCircle, Users, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import { DataPrivacyDialog } from './data-privacy-dialog';
import { logUserActivity } from '@/lib/activity-logger';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const firebaseErrorMap: Record<string, string> = {
  'auth/user-not-found': 'No account found with this email address. Please sign up or try again.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-email': 'The email address is not valid. Please check the format.',
  'auth/email-already-in-use': 'This email address is already associated with an account.',
  'auth/weak-password': 'The password is too weak. Please use at least 6 characters.',
  'auth/popup-closed-by-user': 'The sign-in window was closed. Please try again.',
  'auth/cancelled-popup-request': 'A sign-in request is already in progress. Please wait or refresh the page.',
  'auth/invalid-credential': 'Invalid credentials. Please check your email and password and try again.',
  'auth/operation-not-allowed':
    'Google Sign-In is not enabled. Please contact the administrator to enable it in the Firebase Console.',
  'auth/popup-blocked':
    'The sign-in popup was blocked by your browser. Please allow popups or try again to use redirect.',
  'auth/unauthorized-domain':
    'This domain is not authorized for Google Sign-In. Please contact the administrator to add this URL to the Authorized Domains list in Firebase.',
  'auth/too-many-requests':
    'Access to this account has been temporarily disabled due to many failed login attempts. Please reset your password or try again later.',
  'auth/quota-exceeded': 'The university server is experiencing high traffic. Please wait a moment and try again.',
  'auth/internal-error': 'A temporary internal error occurred. Please refresh the page and try again.',
};

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
  const [authError, setAuthError] = useState<string | null>(null);
  const [authAccessPolicy, setAuthAccessPolicy] = useState<AuthAccessPolicy>(DEFAULT_AUTH_ACCESS_POLICY);

  // Forgot Password States
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, userProfile, isUserLoading } = useUser();

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
          setAuthError(
            policy.allowRegisteredExternalEmails
              ? 'Access Denied: This email is not registered in the system. Please contact the administrator to register your account.'
              : policy.allowExternalGoogleAccounts
                ? 'Access Denied: Please sign in with your official @rsu.edu.ph account or continue with Google.'
                : 'Institutional Requirement: Please connect using your official Romblon State University Google account (@rsu.edu.ph).',
          );
          setIsSubmitting(false);
          return;
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
        setAuthError('An error occurred while setting up your institutional profile. Please try again.');
        setIsSubmitting(false);
      }
    },
    [auth, firestore, firstName, lastName, sex, router, toast],
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
            setAuthError(
              firebaseErrorMap[errorCode] ||
                `Sign-in failed (${errorCode}). Please check your connection or Whitelisted Domains.`,
            );
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
    setIsPasswordVisible(false);
    setAuthError(null);
  };

  const clearError = () => {
    if (authError) setAuthError(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setAuthError('Authentication service is not available.');
      return;
    }
    if (!email || !password) {
      setAuthError('Please enter both email and password.');
      return;
    }
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await handleAuthResult(result);
    } catch (error) {
      const errorCode = (error as AuthError).code;
      setAuthError(
        firebaseErrorMap[errorCode] || `Sign-in failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) {
      setAuthError('Authentication service is not available.');
      return;
    }
    if (!email || !password || !firstName || !lastName || !sex) {
      setAuthError('Please fill out all fields, including sex identification.');
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const isInstitutional = normalizedEmail.endsWith('@rsu.edu.ph');
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isInstitutional && !isDev) {
      setAuthError('Institutional Requirement: Please register using your official university email (@rsu.edu.ph).');
      return;
    }
    if (!privacyPolicyAgreed) {
      setAuthError('You must agree to the Data Privacy Statement to create an account.');
      return;
    }
    setIsSubmitting(true);
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await handleAuthResult(userCredential);
    } catch (error) {
      const errorCode = (error as AuthError).code;
      setAuthError(
        firebaseErrorMap[errorCode] ||
          `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
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
      toast({
        title: 'Request Failed',
        description: firebaseErrorMap[errorCode] || 'Could not send reset email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  const processGoogleSignIn = () => {
    if (!auth || !firestore) {
      setAuthError('Authentication service is not available.');
      return;
    }
    setIsSubmitting(true);
    setAuthError(null);
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
          setAuthError(
            firebaseErrorMap[errorCode] ||
              `Google Sign-In Error: ${errorCode}. Please ensure this domain is whitelisted in Firebase.`,
          );
          setIsSubmitting(false);
        }
      });
  };

  const renderSignIn = () => (
    <form onSubmit={handleSignIn} className="space-y-6">
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
            onChange={(e) => {
              setEmail(e.target.value);
              clearError();
            }}
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
            disabled={isSubmitting}
            placeholder="Enter your password"
            className="pr-10 bg-gray-800/50 border-gray-700 focus:ring-primary focus:border-primary"
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
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
      <Button
        type="submit"
        className="w-full bg-white dark:bg-slate-900 text-black dark:text-white hover:bg-gray-200"
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign In
      </Button>
    </form>
  );

  const renderSignUp = () => (
    <div className="space-y-5">
      <div className="rounded-xl bg-gray-800/60 border border-gray-700/80 p-4 space-y-3 text-left">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-widest text-emerald-300">
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
      <div className="w-full max-w-md rounded-2xl border border-gray-700/50 p-8 text-white shadow-2xl backdrop-blur-lg">
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

        <h2 className="text-2xl font-bold mb-2 text-center">
          {activeTab === 'signup' ? 'Create your RSU EOMS Account' : 'RSU EOMS Submission Portal'}
        </h2>

        {authError && (
          <div className="bg-destructive/20 border border-destructive/50 text-destructive text-xs rounded-md p-3 flex items-center gap-2 mb-4">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="leading-snug">{authError}</span>
          </div>
        )}

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
