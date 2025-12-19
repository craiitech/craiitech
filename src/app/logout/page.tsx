
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
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

export default function LogoutPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const { clearSessionLogs } = useSessionActivity();

  useEffect(() => {
    const handleFinalLogout = async () => {
      if (auth) {
        try {
          await signOut(auth);
          clearSessionLogs(); // Clear the logs from the client-side context
        } catch (error) {
          console.error('Error signing out: ', error);
          toast({
            title: "Logout Error",
            description: "There was an issue logging you out.",
            variant: 'destructive',
          });
        }
      }
      // Use router.push('/') for a client-side navigation to the home page.
      router.push('/');
    };

    handleFinalLogout();
  }, [auth, clearSessionLogs, router, toast]);


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
