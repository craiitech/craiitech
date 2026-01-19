
'use client';

import { redirect, usePathname, useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { useEffect, useMemo, useCallback, useRef } from 'react';
import type { Campus, Unit, Submission } from '@/lib/types';
import { collection, query, where, Query, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Building2 } from 'lucide-react';
import { ActivityLogProvider } from '@/lib/activity-log-provider';
import { Header } from '@/components/dashboard/header';
import { Chatbot } from '@/components/dashboard/chatbot';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/actions';

const LoadingSkeleton = () => (
  <div className="flex items-start">
    <div className="w-64 border-r h-screen p-4 flex-col gap-4 hidden md:flex">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
    <main className="flex-1 p-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-80" />
          <Skeleton className="col-span-3 h-80" />
        </div>
      </div>
    </main>
  </div>
);

/**
 * Custom hook to detect user inactivity and trigger a callback.
 * @param onIdle - The function to call when the user is idle.
 * @param idleTime - The inactivity timeout in milliseconds.
 * @param enabled - A boolean to enable or disable the timer.
 */
const useIdleTimer = (onIdle: () => void, idleTime: number, enabled: boolean) => {
  const timeoutId = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    timeoutId.current = setTimeout(onIdle, idleTime);
  }, [onIdle, idleTime]);

  useEffect(() => {
    // If the timer is disabled, clean up any existing timer and do nothing.
    if (!enabled) {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      return;
    }

    const events = ['mousemove', 'keydown', 'mousedown', 'scroll'];

    const handleActivity = () => {
      resetTimer();
    };

    // Set up event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Initialize the timer
    resetTimer();

    // Cleanup function
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer, enabled]);
};


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const firebaseState = useFirebase();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile, isUserLoading, isAdmin, userRole, firestore, isSupervisor } = useUser();

  // Global console.error trapping to automatically log client-side errors to Firestore
  useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Call the original console.error to not lose the default browser behavior
      originalConsoleError(...args);

      // Prevent infinite loops if logging itself fails
      if (args[0] && typeof args[0] === 'string' && args[0].includes('Failed to log error to Firestore')) {
        return;
      }
      
      const errorMessage = args.map(arg => {
        if (arg instanceof Error) {
          return `${arg.message}${arg.stack ? `\nStack: ${arg.stack}`: ''}${arg.digest ? `\nDigest: ${arg.digest}` : ''}`;
        }
        try {
          // Attempt to stringify objects for more detail
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }).join('\n');

      // Automatically log the captured error to the backend
      logError({
          errorMessage: errorMessage,
          errorStack: new Error().stack, // Get a stack trace for where the log was called
          url: window.location.href,
          userId: user?.uid,
          userName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : undefined,
          userRole: userProfile?.role,
          userEmail: userProfile?.email,
      }).catch(e => {
        // Use the original console.error to report if the logging service itself fails
        originalConsoleError('Failed to log error to Firestore:', e);
      });
    };

    // Cleanup function to restore the original console.error when the component unmounts
    return () => {
      console.error = originalConsoleError;
    };
  }, [user, userProfile]);

  // Presence system effect
  useEffect(() => {
    if (!user || !firestore) return;

    const userStatusRef = doc(firestore, 'users', user.uid);
    
    // Set online status and last seen timestamp
    updateDoc(userStatusRef, {
        isOnline: true,
        lastSeen: serverTimestamp()
    });

    // Heartbeat to keep status fresh every minute
    const interval = setInterval(() => {
        if (document.hasFocus()) { // Only update if tab is active
            updateDoc(userStatusRef, {
                lastSeen: serverTimestamp()
            });
        }
    }, 60000);

    // Best-effort attempt to set offline on tab close
    const handleBeforeUnload = () => {
        updateDoc(userStatusRef, { isOnline: false });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on unmount
    return () => {
        clearInterval(interval);
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, firestore]);


  // Implement the inactivity logout timer.
  const handleIdle = useCallback(() => {
    toast({
      title: 'Session Timeout',
      description: 'You have been logged out due to inactivity.',
    });
    router.push('/logout');
  }, [router, toast]);
  
  // Conditionally enable the timer. It will not run for admins.
  useIdleTimer(handleIdle, 2 * 60 * 1000, !isAdmin); // 2 minutes


  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  const getNotificationQuery = (): Query | null => {
    if (!firestore || !userProfile || !userRole) return null;
    const submissionsCollection = collection(firestore, 'submissions');

    if (isAdmin) {
      return query(submissionsCollection, where('statusId', '==', 'submitted'));
    }

    if (isSupervisor) {
        if (userRole === 'Campus Director' || userRole === 'Campus ODIMO' || userRole?.toLowerCase().includes('vice president')) {
            if (!userProfile.campusId) return null;
            return query(submissionsCollection, where('campusId', '==', userProfile.campusId), where('statusId', '==', 'submitted'));
        }
    }
    
    return query(submissionsCollection, where('userId', '==', userProfile.id), where('statusId', '==', 'rejected'));
  }

  const notificationQuery = useMemoFirebase(() => getNotificationQuery(), [firestore, userProfile, userRole, isSupervisor, isAdmin]);

  const { data: notifications } = useCollection<Submission>(notificationQuery);

  const notificationCount = useMemo(() => {
    if (!notifications || !userProfile) return 0;
    
    // Admin should see a count of all pending submissions.
    if (isAdmin) {
      return notifications.length;
    }
    
    // Other supervisors should not see their own submissions in the notification count.
    if (isSupervisor) {
      return notifications.filter(s => s.userId !== userProfile.id).length;
    }
    
    // Regular users see notifications for their rejected items.
    return notifications.length;
  }, [notifications, userProfile, isAdmin, isSupervisor]);


  const userLocation = useMemo(() => {
    if (!userProfile || !campuses || !units) return '';
    const campusName = campuses.find(c => c.id === userProfile.campusId)?.name;
    const unitName = units.find(u => u.id === userProfile.unitId)?.name;
    let location = campusName || '';
    if (unitName && !isSupervisor) location += ` / ${unitName}`;
    return location;
  }, [userProfile, campuses, units, isSupervisor]);

  const displayName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : user?.displayName;
  const displayAvatar = userProfile?.avatar || user?.photoURL;
  const fallbackAvatar = displayName ? displayName.split(' ').map(n => n[0]).join('') : '?';
  const displayRole = isAdmin ? 'Admin' : userRole;


  useEffect(() => {
    if (isUserLoading) {
      return; 
    }
    
    if (pathname === '/complete-registration' || pathname === '/awaiting-verification') {
        return;
    }

    if (!user) {
      redirect('/login');
      return;
    }

    if (isAdmin) {
        return;
    }

    if (userProfile) {
        if (!userProfile.verified) {
            redirect('/awaiting-verification');
            return;
        }
        
        const isCampusLevelUser = userRole === 'Campus Director' || userRole === 'Campus ODIMO' || userRole?.toLowerCase().includes('vice president');
        const isProfileIncomplete = isCampusLevelUser
            ? !userProfile.campusId || !userProfile.roleId
            : !userProfile.campusId || !userProfile.roleId || !userProfile.unitId;

        if (isProfileIncomplete) {
            redirect('/complete-registration');
            return;
        }
    } else {
      redirect('/complete-registration');
    }
  }, [user, userProfile, isUserLoading, isAdmin, userRole, pathname]);


  if (isUserLoading) {
      return <LoadingSkeleton />;
  }

  if (!user && !['/complete-registration', '/awaiting-verification'].includes(pathname)) {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <Skeleton className="h-16 w-16" />
        </div>
    );
  }

  return (
    <ActivityLogProvider>
      <SidebarProvider>
        <Sidebar variant="sidebar" collapsible="icon">
          <SidebarHeader className="items-center justify-center text-center p-4">
            {displayAvatar && (
              <Avatar className="h-20 w-20">
                <AvatarImage src={displayAvatar} alt={displayName || 'User'} />
                <AvatarFallback>
                  {fallbackAvatar}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="mt-2 text-center">
              <p className="font-semibold text-lg">{displayName}</p>
              <p className="text-sm text-sidebar-primary font-medium">{displayRole}</p>
              {userLocation && (
                <div className="flex items-center justify-center gap-1 text-sm text-sidebar-foreground/80 mt-1">
                  <Building2 className="h-4 w-4" />
                  <span>{userLocation}</span>
                </div>
              )}
            </div>
          </SidebarHeader>
          <SidebarContent className="p-4">
            <SidebarNav />
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <Header notificationCount={notificationCount} />
          <main className="p-4 lg:p-8 bg-background/90">{children}</main>
          <Chatbot />
        </SidebarInset>
      </SidebarProvider>
    </ActivityLogProvider>
  );
}
