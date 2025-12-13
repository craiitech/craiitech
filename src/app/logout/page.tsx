
'use client';

import { useState, useEffect } from 'react';
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
import { LogOut } from 'lucide-react';

export default function LogoutPage() {
  const router = useRouter();
  const auth = useAuth();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const performLogout = async () => {
        if (auth) {
          try {
            await signOut(auth);
          } catch (error) {
            console.error("Error signing out: ", error);
          }
        }
        // Use window.location to force a full refresh, clearing any client-side state
        window.location.href = '/login';
      };
      performLogout();
    }
  }, [countdown, auth, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <LogOut className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold">
            Logging you out...
          </CardTitle>
          <CardDescription>
            You are being securely signed out.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <p className="text-lg font-semibold">
            Redirecting to login in {countdown}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
