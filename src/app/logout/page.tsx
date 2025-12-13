
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
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { List, ListItem } from '@/components/ui/list';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LogOut, Activity } from 'lucide-react';
import { useSessionActivity } from '@/lib/activity-log-provider';

export default function LogoutPage() {
  const router = useRouter();
  const auth = useAuth();
  const [countdown, setCountdown] = useState(5);
  const { sessionLogs, clearSessionLogs } = useSessionActivity();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      handleFinalLogout();
    }
  }, [countdown, auth, router]);

  const handleFinalLogout = async () => {
    if (auth) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Error signing out: ', error);
      }
    }
    clearSessionLogs();
    // Use window.location to force a full refresh, clearing all client-side state
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
            Here is a summary of your activity during this session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionLogs.length > 0 ? (
            <ScrollArea className="h-48 rounded-md border">
              <List className="p-2">
                {sessionLogs.map((log, index) => (
                  <ListItem key={index} className="flex justify-between text-sm">
                    <span>{log.message}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </ListItem>
                ))}
              </List>
            </ScrollArea>
          ) : (
             <div className="flex h-48 items-center justify-center rounded-md border text-center text-sm text-muted-foreground">
                <Activity className="mr-2 h-4 w-4" />
                No activity was recorded this session.
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Redirecting to home page in {countdown}...
          </p>
          <Button onClick={handleFinalLogout} className="w-full">
            Go to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
