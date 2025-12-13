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
import { doc, updateDoc } from 'firebase/firestore';
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
    <Card className="w-full max-w-2xl">
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
    <Card className="w-full max-w-md text-center">
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
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      {view === 'loading' && <Loader2 className="h-12 w-12 animate-spin" />}
      {view === 'nda' && renderNDA()}
      {view === 'confirmation' && renderConfirmation()}
    </div>
  );
}
