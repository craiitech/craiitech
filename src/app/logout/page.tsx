
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { List, ListItem } from '@/components/ui/list';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogOut, Activity, Loader2 } from 'lucide-react';
import { logUserActivity } from '@/lib/activity-logger';
import { useToast } from '@/hooks/use-toast';

export default function LogoutPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const [countdown, setCountdown] = useState(5);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // We don't have session logs anymore in this simplified setup.
  // This could be replaced with something else if needed.

  useEffect(() => {
    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1);
      } else {
        handleFinalLogout();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleFinalLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    if (auth) {
      try {
        if (user) {
          // It's good practice to log the logout action before actually signing out
          await logUserActivity(user.uid, 'user_logout', { method: 'manual' });
        }
        await signOut(auth);
      } catch (error) {
        console.error('Error signing out: ', error);
        toast({
          title: "Logout Error",
          description: "There was an issue logging you out.",
          variant: 'destructive',
        });
      }
    }
    // Force a full refresh to the landing page.
    window.location.href = '/';
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <LogOut className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold">
            You have been logged out
          </CardTitle>
          <CardDescription>
            Thank you for using the RSU EOMS Portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex h-32 items-center justify-center rounded-md border text-center text-sm text-muted-foreground">
                <Activity className="mr-2 h-4 w-4" />
                Your session has ended securely.
            </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Redirecting to the home page in {countdown}...
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
