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
import { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import type { Campus, Unit, Submission } from '@/lib/types';
import { collection, query, where, Query, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Building2 } from 'lucide-react';
import { ActivityLogProvider } from '@/lib/activity-log-provider';
import { Header } from '@/components/dashboard/header';
import { Chatbot } from '@/components/dashboard/chatbot';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { WhatsNewDialog } from '@/components/dashboard/whats-new-dialog';
import { Logo } from '@/components/logo';

const CURRENT_SYSTEM_VERSION = '2.5.0'; // Current release version

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

const useIdleTimer = (onIdle: () => void, idleTime: number, enabled: boolean) => {
  const timeoutId = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    timeoutId.current = setTimeout(onIdle, idleTime);
  }, [onIdle, idleTime]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutId.current) clearTimeout(timeoutId.current);
      return;
    }

    const events = ['mousemove', 'keydown', 'mousedown', 'scroll'];
    const handleActivity = () => { resetTimer(); };
    events.forEach(event => window.addEventListener(event, handleActivity));
    resetTimer();
    return () => {
      if (timeoutId.current) clearTimeout(timeoutId.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [resetTimer, enabled]);
};


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile, isUserLoading, isAdmin, isAuditor, userRole, firestore, isSupervisor, systemSettings } = useUser();
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);

  useEffect(() => {
    if (!isUserLoading && userProfile && userProfile.verified) {
        if (userProfile.lastSeenVersion !== CURRENT_SYSTEM_VERSION) {
            const timer = setTimeout(() => setIsWhatsNewOpen(true), 1500);
            return () => clearTimeout(timer);
        }
    }
  }, [isUserLoading, userProfile]);

  const handleAcknowledgeUpdates = async () => {
    if (!user || !firestore) return;
    try {
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, { lastSeenVersion: CURRENT_SYSTEM_VERSION });
        setIsWhatsNewOpen(false);
    } catch (e) {
        setIsWhatsNewOpen(false);
    }
  };

  useEffect(() => {
    if (!user || !firestore) return;
    const userStatusRef = doc(firestore, 'users', user.uid);
    updateDoc(userStatusRef, { lastSeen: serverTimestamp() }).catch(() => {});
  }, [user, firestore]);

  const handleIdle = useCallback(() => {
    toast({ title: 'Session Timeout', description: 'You have been logged out due to inactivity.' });
    router.push('/logout');
  }, [router, toast]);
  
  useIdleTimer(handleIdle, 30 * 60 * 1000, !isAdmin && !isAuditor);

  const campusesQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'campuses') : null), [firestore, user]);
  const { data: allCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'units') : null), [firestore, user]);
  const { data: allUnits } = useCollection<Unit>(unitsQuery);

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
    if (!notifications) return 0;
    if (isAdmin) return notifications.length;
    if (isSupervisor && userProfile) {
        return notifications.filter(s => s.userId !== userProfile.id).length;
    }
    return notifications.length;
  }, [notifications, userProfile, isAdmin, isSupervisor]);


  const userLocation = useMemo(() => {
    if (!userProfile || !allCampuses || !allUnits) return '';
    const campusName = allCampuses.find(c => c.id === userProfile.campusId)?.name;
    const unitName = allUnits.find(u => u.id === userProfile.unitId)?.name;
    let location = campusName || '';
    
    const isCampusLevel = userRole === 'Campus Director' || userRole === 'Campus ODIMO' || isAdmin || userRole?.toLowerCase().includes('vice president');
    if (unitName && !isCampusLevel && userRole !== 'Auditor') location += ` / ${unitName}`;
    return location;
  }, [userProfile, allCampuses, allUnits, userRole, isAdmin]);

  const displayName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : user?.displayName;
  const displayAvatar = userProfile?.avatar || user?.photoURL;
  const fallbackAvatar = displayName ? displayName.split(' ').map(n => n[0]).join('') : '?';
  const displayRole = isAdmin ? 'Admin' : userRole;


  useEffect(() => {
    if (isUserLoading) return; 
    if (pathname === '/complete-registration' || pathname === '/awaiting-verification') return;
    if (!user) { router.push('/login'); return; }
    
    if (isAdmin) return;
    
    if (userProfile) {
        // First check for verification to avoid redirect loop
        if (!userProfile.verified) { 
            router.push('/awaiting-verification'); 
            return; 
        }
        
        const roleLower = userRole?.toLowerCase() || '';
        const isUnitOptionalUser = 
            roleLower === 'campus director' || 
            roleLower === 'campus odimo' || 
            roleLower === 'auditor' || 
            roleLower.includes('vice president');

        const isProfileIncomplete = isUnitOptionalUser
            ? !userProfile.campusId || !userProfile.roleId || !userProfile.sex
            : !userProfile.campusId || !userProfile.roleId || !userProfile.unitId || !userProfile.sex;
            
        if (isProfileIncomplete) {
            router.push('/complete-registration');
        }
    } else {
      router.push('/complete-registration');
    }
  }, [user, userProfile, isUserLoading, isAdmin, userRole, pathname, router]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const scale = userProfile?.accessibility?.fontSize || 1.0;
      document.documentElement.style.fontSize = `${scale * 100}%`;
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.documentElement.style.fontSize = ''; 
      }
    };
  }, [userProfile?.accessibility?.fontSize]);

  const accessibilityClasses = useMemo(() => {
    if (!userProfile?.accessibility) return '';
    const { highContrast, dyslexicFont, reducedMotion, themeColor } = userProfile.accessibility;
    return cn(
      highContrast && 'accessibility-high-contrast',
      dyslexicFont && 'accessibility-dyslexic-font',
      reducedMotion && 'accessibility-reduced-motion',
      themeColor && themeColor !== 'default' && `theme-${themeColor}`
    );
  }, [userProfile?.accessibility]);


  if (isUserLoading) return <LoadingSkeleton />;

  return (
    <ActivityLogProvider>
      <div className={cn("flex min-h-screen w-full", accessibilityClasses)}>
        <SidebarProvider>
          <Sidebar variant="sidebar" collapsible="icon">
            <SidebarHeader className="p-4">
              <div className="relative flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-white/10 border border-white/20 shadow-xl group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-none transition-all overflow-hidden">
                {/* Abstract Loop Background Animation */}
                <div className="absolute top-0 -left-6 w-24 h-24 bg-primary/20 rounded-full blur-2xl animate-float-blob group-data-[collapsible=icon]:hidden -z-10" />
                <div className="absolute bottom-0 -right-6 w-20 h-20 bg-accent/20 rounded-full blur-2xl animate-float-blob group-data-[collapsible=icon]:hidden -z-10" style={{ animationDelay: '3s' }} />
                
                {displayAvatar ? (
                  <Avatar className="h-16 w-16 transition-all group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10">
                    <AvatarImage src={displayAvatar} alt={displayName || 'User'} />
                    <AvatarFallback>{fallbackAvatar}</AvatarFallback>
                  </Avatar>
                ) : (
                  <Logo className="h-12 w-12 transition-all group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8" />
                )}
                <div className="mt-3 text-center group-data-[collapsible=icon]:hidden">
                  <p className="font-bold text-sm leading-tight text-white">{displayName}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-sidebar-primary mt-1">{displayRole}</p>
                  {userLocation && (
                    <div className="flex items-center justify-center gap-1 text-[10px] text-white/60 mt-2 italic">
                      <Building2 className="h-3 w-3" />
                      <span className="truncate max-w-[120px]">{userLocation}</span>
                    </div>
                  )}
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="p-4 pt-2">
              <SidebarNav notificationCount={notificationCount} />
            </SidebarContent>
          </Sidebar>
          <SidebarInset>
            <Header notificationCount={notificationCount} />
            <main className="p-4 lg:p-8 bg-background/90">{children}</main>
            <Chatbot />
          </SidebarInset>
        </SidebarProvider>
      </div>
      
      <WhatsNewDialog 
        isOpen={isWhatsNewOpen}
        onOpenChange={setIsWhatsNewOpen}
        onAcknowledge={handleAcknowledgeUpdates}
      />
    </ActivityLogProvider>
  );
}