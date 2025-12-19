
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
  signInWithRedirect,
  AuthError,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Loader2, Mail, X, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import { DataPrivacyDialog } from './data-privacy-dialog';
import { logUserActivity } from '@/lib/activity-logger';

interface AuthFormProps {
  initialTab: 'signin' | 'signup';
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

const firebaseErrorMap: Record<string, string> = {
    "auth/user-not-found": "No account found with this email address. Please sign up or try again.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-email": "The email address is not valid. Please check the format.",
    "auth/email-already-in-use": "This email address is already associated with an account.",
    "auth/weak-password": "The password is too weak. Please use at least 6 characters.",
    "auth/popup-closed-by-user": "The sign-in window was closed. Please try again.",
    "auth/cancelled-popup-request": "The sign-in window was closed. Please try again.",
    "auth/invalid-credential": "Invalid credentials. Please check your email and password and try again.",
};


export function AuthForm({ initialTab }: AuthFormProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyPolicyAgreed, setPrivacyPolicyAgreed] = useState(false);
  const [isPrivacyDialogOpen, setIsPrivacyDialogOpen] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  useEffect(() => {
    // This effect ensures the dialog opens on initial render of the signup form
    if (activeTab === 'signup') {
      setIsPrivacyDialogOpen(true);
    }
  }, [activeTab]);


  const togglePasswordVisibility = () => setIsPasswordVisible(!isPasswordVisible);
  
  const handleTabChange = (tab: 'signin' | 'signup') => {
    setActiveTab(tab);
    // Clear credentials and errors when switching tabs
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setIsPasswordVisible(false);
    setAuthError(null);

    if (tab === 'signup') {
        setIsPrivacyDialogOpen(true);
    }
  };
  
  const clearError = () => {
    if (authError) {
        setAuthError(null);
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setAuthError('Authentication service is not available.');
      return;
    }
    if (!email || !password) {
        setAuthError("Please enter both email and password.");
        return;
    }
    setIsSubmitting(true);
    setAuthError(null);

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // On success, the onAuthStateChanged listener in the provider will handle the user state.
        // We can now safely redirect.
        router.push('/dashboard');
    } catch (error) {
        console.error('Sign in error:', error);
        const errorCode = (error as AuthError).code;
        setAuthError(firebaseErrorMap[errorCode] || 'An unknown sign-in error occurred. Please try again.');
        setIsSubmitting(false); // Only set submitting to false on error
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) {
        setAuthError('Authentication service is not available.');
        return;
    }
    if (!email || !password || !firstName || !lastName) {
      setAuthError("Please fill out all fields.");
      return;
    }
    if (!privacyPolicyAgreed) {
        setAuthError("You must agree to the Data Privacy Statement to create an account.");
        return;
    }
    setIsSubmitting(true);
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      const userData = {
        id: user.uid,
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        roleId: '',
        role: '',
        campusId: '',
        unitId: '',
        verified: false,
        ndaAccepted: false,
      };

      await setDoc(doc(firestore, 'users', user.uid), userData);

      // Log successful account creation
      await logUserActivity(user.uid, `${firstName} ${lastName}`, 'New User', 'user_register', { method: 'email' });

      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');

      toast({
        title: 'Account Created!',
        description: 'Please complete your registration.',
      });
      router.push('/complete-registration');
    } catch (error) {
      console.error('Sign up error:', error);
      const errorCode = (error as AuthError).code;
      setAuthError(firebaseErrorMap[errorCode] || 'An unknown registration error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
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
    signInWithPopup(auth, provider)
      .then(async (result) => {
        const user = result.user;
        const additionalInfo = getAdditionalUserInfo(result);
        const [first = '', last = ''] = user.displayName?.split(' ') || [];

        if (additionalInfo?.isNewUser) {
          const userDocRef = doc(firestore, 'users', user.uid);
          await setDoc(userDocRef, {
            id: user.uid,
            email: user.email,
            firstName: first,
            lastName: last,
            avatar: user.photoURL,
            roleId: '',
            role: '',
            campusId: '',
            unitId: '',
            verified: false,
            ndaAccepted: false,
          });
          await logUserActivity(user.uid, user.displayName || 'Unknown', 'New User', 'user_register', { method: 'google' });
          toast({
            title: 'Account Created!',
            description: 'Please complete your registration.',
          });
          router.push('/complete-registration');
        } else {
          // Check if user document exists for returning user, create if not
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
             await setDoc(userDocRef, {
                id: user.uid,
                email: user.email,
                firstName: first,
                lastName: last,
                avatar: user.photoURL,
                roleId: '',
                role: '',
                campusId: '',
                unitId: '',
                verified: false,
                ndaAccepted: false,
            });
             router.push('/complete-registration');
          } else {
            // We don't log here, the provider will log on auth state change
            router.push('/dashboard');
          }
        }
      })
      .catch((error) => {
        console.error('Google sign-in error:', error);
        const errorCode = (error as AuthError).code;
        setAuthError(firebaseErrorMap[errorCode] || 'An unknown error occurred during Google Sign-In.');
      })
      .finally(() => {
        setIsSubmitting(false);
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
            onChange={(e) => { setEmail(e.target.value); clearError(); }}
            disabled={isSubmitting}
            className="pl-9 bg-gray-800/50 border-gray-700 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password-signin">Password</Label>
        <div className="relative">
            <Input
            id="password-signin"
            type={isPasswordVisible ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError(); }}
            disabled={isSubmitting}
            placeholder="Enter your password"
            className="pr-10 bg-gray-800/50 border-gray-700 focus:ring-primary focus:border-primary"
            />
            <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
            >
                {isPasswordVisible ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
            </button>
        </div>
      </div>
      <Button
        type="submit"
        className="w-full bg-white text-black hover:bg-gray-200"
        disabled={isSubmitting}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign In
      </Button>
    </form>
  );

  const renderSignUp = () => (
    <form onSubmit={handleSignUp} className="space-y-6">
      <div className="flex gap-4">
        <div className="space-y-2 w-full">
          <Label htmlFor="first-name">First Name</Label>
          <Input
            id="first-name"
            placeholder="John"
            required
            value={firstName}
            onChange={(e) => { setFirstName(e.target.value); clearError(); }}
            disabled={isSubmitting}
            className="bg-gray-800/50 border-gray-700 focus:ring-primary focus:border-primary"
          />
        </div>
        <div className="space-y-2 w-full">
          <Label htmlFor="last-name">Last Name</Label>
          <Input
            id="last-name"
            placeholder="Doe"
            required
            value={lastName}
            onChange={(e) => { setLastName(e.target.value); clearError(); }}
            disabled={isSubmitting}
            className="bg-gray-800/50 border-gray-700 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email-signup">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="email-signup"
            type="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearError(); }}
            disabled={isSubmitting}
            className="pl-9 bg-gray-800/50 border-gray-700 focus:ring-primary focus:border-primary"
          />
        </div>
        <p className="text-xs text-muted-foreground pt-1">Please use your official RSU email address.</p>
      </div>
       <div className="space-y-2">
        <Label htmlFor="password-signup">Password</Label>
        <div className="relative">
            <Input
            id="password-signup"
            type={isPasswordVisible ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError(); }}
            disabled={isSubmitting}
            placeholder="Create a password"
            className="pr-10 bg-gray-800/50 border-gray-700 focus:ring-primary focus:border-primary"
            />
             <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
            >
                {isPasswordVisible ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
            </button>
        </div>
      </div>
      
       <div className="flex items-center space-x-2">
        <Checkbox 
          id="privacy-policy" 
          checked={privacyPolicyAgreed}
          onCheckedChange={(checked) => { setPrivacyPolicyAgreed(checked as boolean); clearError(); }}
        />
        <label
          htmlFor="privacy-policy"
          className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          I agree to the{' '}
          <Button
            type="button"
            variant="link"
            className="p-0 h-auto text-xs text-white hover:underline"
            onClick={() => setIsPrivacyDialogOpen(true)}
          >
            Data Privacy Statement
          </Button>
          .
        </label>
      </div>

      <Button
        type="submit"
        className="w-full bg-white text-black hover:bg-gray-200"
        disabled={isSubmitting || !privacyPolicyAgreed}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create an account
      </Button>
    </form>
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
                : 'bg-transparent text-gray-400 hover:bg-gray-700/50 hover:text-white'
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
                : 'bg-transparent text-gray-400 hover:bg-gray-700/50 hover:text-white'
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
            <AlertCircle className="h-4 w-4 flex-shrink-0"/>
            <span className="leading-snug">{authError}</span>
        </div>
      )}

      {activeTab === 'signup' ? renderSignUp() : renderSignIn()}

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-gray-800/50 px-2 text-gray-400 backdrop-blur-sm rounded-full">
            Or sign {activeTab === 'signup' ? 'up' : 'in'} with
          </span>
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
          Google
        </Button>
      </div>
      {activeTab === 'signup' && (
        <p className="mt-6 text-center text-xs text-gray-400">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-white">
            Terms & Service
          </Link>
        </p>
      )}
    </div>
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

    