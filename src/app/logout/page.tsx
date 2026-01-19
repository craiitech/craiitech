
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { doc, updateDoc } from 'firebase/firestore';

export default function LogoutPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const { clearSessionLogs } = useSessionActivity();
  const { user, firestore, isUserLoading } = useUser();
  const hasInitiatedLogout = useRef(false);

  useEffect(() => {
    // Wait until user loading is complete and we have a user object.
    if (isUserLoading || !user || !auth || !firestore) {
      return;
    }
    
    // Ensure the logout process only runs once.
    if (hasInitiatedLogout.current) {
      return;
    }
    hasInitiatedLogout.current = true;

    const handleFinalLogout = async () => {
      try {
        // Proceed with Firebase sign-out.
        await signOut(auth);
        clearSessionLogs();
      } catch (error) {
        console.error('Error during sign out: ', error);
        toast({
          title: "Logout Error",
          description: "There was an issue signing you out.",
          variant: 'destructive',
        });
      } finally {
        // Always redirect to the home page.
        router.push('/');
      }
    };
    
    // Start the logout process.
    handleFinalLogout();

  }, [user, isUserLoading, auth, firestore, router, toast, clearSessionLogs]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Logging Out
          </CardTitle>
          <CardDescription>
            Please wait while we securely log you out.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex justify-center items-center py-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
