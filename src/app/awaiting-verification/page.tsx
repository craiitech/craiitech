'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { signOut, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, updateDoc } from '@/firebase/firestore-wrapper';
import { Loader2, CheckCircle, ShieldAlert } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AwaitingVerificationPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, userProfile, isUserLoading } = useUser();

  const [view, setView] = useState<'loading' | 'nda' | 'confirmation'>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isUserLoading) {
      if (!user || !userProfile) {
        router.push('/login');
        return;
      }
      const roleLower = userProfile.role?.toLowerCase() || '';
      const isUnitOptionalUser = roleLower === 'campus director' || roleLower === 'campus odimo' || roleLower === 'auditor' || roleLower.includes('vice president');
      const isProfileIncomplete = isUnitOptionalUser ? !userProfile.campusId || !userProfile.roleId || !userProfile.sex : !userProfile.campusId || !userProfile.roleId || !userProfile.unitId || !userProfile.sex;
      if (isProfileIncomplete) {
        router.push('/complete-registration');
        return;
      }
      if (userProfile.verified) {
        router.push('/dashboard');
        return;
      }
      if (userProfile.ndaAccepted) {
        setView('confirmation');
      } else {
        setView('nda');
      }
    }
  }, [user, userProfile, isUserLoading, router]);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    router.push('/login');
  };

  const handleAccept = async () => {
    if (!firestore || !user) return;
    setIsSubmitting(true);
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, { ndaAccepted: true });
      setView('confirmation');
    } catch (error) {
      console.error('Failed to accept NDA:', error);
      // You might want to show a toast message here
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderNDA = () => (
    <Card className="w-full max-w-2xl bg-white/95 dark:bg-slate-900/90 backdrop-blur shadow-2xl border border-slate-200 dark:border-slate-700 dark:border-slate-800">
      <CardHeader className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <ShieldAlert className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="mt-4 text-2xl font-bold">
          Non-Disclosure Agreement
        </CardTitle>
        <CardDescription>
          Please read and accept the following terms to proceed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 rounded-md border p-4 text-sm">
          <div className="space-y-4">
            <p>
              As a user of the Romblon State University (RSU) Educational
              Organizations Management System (EOMS) Portal, you acknowledge
              that you will have access to sensitive information, documents, and
              data related to the university's quality assurance and management
              processes.
            </p>
            <h3 className="font-semibold">1. Confidentiality</h3>
            <p>
              You agree to maintain the strict confidentiality of all non-public
              information accessed through this portal. This includes, but is
              not limited to, operational plans, monitoring reports, internal
              audits, and personal data of other users.
            </p>
            <h3 className="font-semibold">2. Authorized Use</h3>
            <p>
              Your account is for official RSU duties only. You agree not to use
              your access for any personal gain, fraudulent activity, or any
              purpose that is not directly related to your role and
              responsibilities within the EOMS framework. Unauthorized
              distribution, copying, or disclosure of information is strictly
              prohibited.
            </p>
            <h3 className="font-semibold">3. Data Integrity</h3>
            <p>
              You are responsible for the accuracy and integrity of the data you
              submit. You agree not to knowingly submit false or misleading
              information.
            </p>
            <h3 className="font-semibold">4. Consequences of Breach</h3>
            <p>
              Any breach of this agreement may result in disciplinary action, up
              to and including termination of employment or enrollment, and may
              also lead to legal action in accordance with university policies
              and Philippine law.
            </p>
            <p>
              By clicking "Accept and Proceed," you confirm that you have read,
              understood, and agree to be bound by the terms of this
              Non-Disclosure Agreement. Your account will then be submitted to
              the RSU Quality Assurance Office for final verification.
            </p>
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button
          onClick={handleAccept}
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Accept and Proceed
        </Button>
        <Button onClick={handleLogout} className="w-full" variant="outline">
          Cancel and Log Out
        </Button>
      </CardFooter>
    </Card>
  );

  const renderConfirmation = () => (
    <Card className="w-full max-w-md text-center bg-white/95 dark:bg-slate-900/90 backdrop-blur shadow-2xl border border-slate-200 dark:border-slate-700 dark:border-slate-800">
      <CardHeader>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <CardTitle className="mt-4 text-2xl font-bold">
          Pending Verification
        </CardTitle>
        <CardDescription>
          Thank you for accepting the terms. Your account is now awaiting final
          verification from the RSU Quality Assurance Office.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          You will be notified via your RSU email once your account has been
          approved. You can then log in to access the RSU EOMS Portal.
        </p>
        <Button onClick={handleLogout} className="w-full">
          Back to Login
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden p-4 lg:p-0">
      <style>{`
        @keyframes kenBurnsBackground {
          0% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.08) translate(-0.5%, -0.5%); }
          100% { transform: scale(1) translate(0, 0); }
        }
        @keyframes float-slow-1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(30px, -30px) scale(1.08); }
        }
        @keyframes float-slow-2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-20px, 20px) scale(0.95); }
        }
      `}</style>

      {/* Background Layer with Animation and Abstract Dark Space */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-slate-950 overflow-hidden">
        {/* Animated Campus Photo (rsupage.png) */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: "url('/rsupage.png')",
            opacity: 0.38,
            animation: "kenBurnsBackground 45s ease-in-out infinite",
          }}
        />
        {/* Abstract Dark Tint Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-950/90 to-[#0a1e12]/95 backdrop-blur-[1px]" />
        
        {/* Luminous Animated Glow Blobs */}
        <div 
          className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[100px] pointer-events-none"
          style={{ animation: 'float-slow-1 15s ease-in-out infinite' }}
        />
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[100px] pointer-events-none"
          style={{ animation: 'float-slow-2 18s ease-in-out infinite' }}
        />
      </div>

      <div className="relative z-10 flex w-full items-center justify-center p-4">
        {view === 'loading' && <Loader2 className="h-12 w-12 animate-spin text-white" />}
        {view === 'nda' && renderNDA()}
        {view === 'confirmation' && renderConfirmation()}
      </div>
    </div>
  );
}
