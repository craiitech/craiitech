
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, ListChecks } from 'lucide-react';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { ActivityLog } from '@/lib/types';
import { format } from 'date-fns';

export default function LogoutPage() {
  const router = useRouter();
  const { auth, firestore } = useFirebase();
  const { user, userProfile } = useUser();
  const [countdown, setCountdown] = useState(5);

  // Get the timestamp from when the session started to fetch logs
  const sessionStartTimestamp = useMemo(() => new Date(), []);
  
  const activityQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'activityLogs'),
      where('userId', '==', user.uid),
      where('timestamp', '>=', sessionStartTimestamp),
      orderBy('timestamp', 'desc'),
      limit(10) // Limit to the last 10 activities for this summary
    );
  }, [firestore, user, sessionStartTimestamp]);

  const { data: activities, isLoading } = useCollection<ActivityLog>(activityQuery);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const performLogout = async () => {
        if (auth) {
          await signOut(auth);
          // Use window.location to force a full refresh, clearing any client-side state
          window.location.href = '/login';
        } else {
            router.push('/login');
        }
      };
      performLogout();
    }
  }, [countdown, auth, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ListChecks className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold">
            Logging you out...
          </CardTitle>
          <CardDescription>
            Here is a summary of your recent activity during this session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : activities && activities.length > 0 ? (
            <ul className="space-y-2 text-left text-sm text-muted-foreground">
              {activities.map(log => (
                <li key={log.id} className="flex items-start gap-3">
                  <span className="font-mono text-xs w-28 shrink-0">{format(log.timestamp.toDate(), 'h:mm:ss a')}</span>
                  <p className='flex-1'>
                    <span className="font-medium text-foreground">{log.action.replace(/_/g, ' ')}</span>
                    {log.details.reportType && ` for "${log.details.reportType}"`}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
             <div className="flex items-center justify-center h-40 text-muted-foreground">
                No activities recorded this session.
            </div>
          )}
        </CardContent>
        <div className="p-6 pt-0">
          <p className="text-lg font-semibold">
            Redirecting in {countdown}
          </p>
        </div>
      </Card>
    </div>
  );
}

    