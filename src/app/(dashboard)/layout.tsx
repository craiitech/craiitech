'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useCallback, useRef, useState, useEffect, Suspense } from 'react';
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
import type { Campus, Unit, Submission, SoftwareEvaluation, CorrectiveActionRequest } from '@/lib/types';
import { collection, query, where, Query, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Building2, School, Info, WifiOff, ShieldAlert, Database, CloudDownload, RotateCw, Loader2 } from 'lucide-react';
import { ActivityLogProvider } from '@/lib/activity-log-provider';
import { Header } from '@/components/dashboard/header';
import { Chatbot } from '@/components/dashboard/chatbot';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { WhatsNewDialog } from '@/components/dashboard/whats-new-dialog';
import { Logo } from '@/components/logo';
import { PageGuidance } from '@/components/dashboard/page-guidance';
import { InstallPwaDialog } from '@/components/dashboard/install-pwa-dialog';
import { SoftwareEvaluationGate } from '@/components/evaluation/software-evaluation-gate';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const CURRENT_SYSTEM_VERSION = '2.5.0'; 

const FullScreenLoader = () => (
    <div className="flex h-screen w-full items-center justify-center p-4 bg-background/60 backdrop-blur-xl">
        <div className="flex flex-col items-center gap-4 text-center animate-in fade-in duration-700">
            <div className="relative h-20 w-20 rounded-3xl bg-white shadow-2xl border border-primary/10 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <div className="space-y-1">
                <h2 className="text-xl font-black uppercase tracking-[0.3em] text-primary">Synchronizing Institutional Data</h2>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Accessing RSU Quality Management System Cloud Registry...</p>
            </div>
        </div>
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
  const isOnline = useNetworkStatus();
  const { user, userProfile, isUserLoading, isAdmin, isAuditor, userRole, firestore, isSupervisor, systemSettings } = useUser();
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  
  const [isGuidanceVisible, setIsGuidanceVisible] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const storedVisibility = localStorage.getItem('rsu_eoms_guidance_visible');
    if (storedVisibility !== null) {
      setIsGuidanceVisible(storedVisibility === 'true');
    }
    setHasHydrated(true);
  }, []);

  const handleToggleGuidance = useCallback(() => {
    setIsGuidanceVisible(prev => {
      const next = !prev;
      localStorage.setItem('rsu_eoms_guidance_visible', String(next));
      return next;
    });
  }, []);

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

  const evaluationQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'softwareEvaluations'), where('userId', '==', user.uid));
  }, [firestore, user]);
  
  const { data: userEvaluations, isLoading: isLoadingEval } = useCollection<SoftwareEvaluation>(evaluationQuery);

  const isEvaluationComplete = useMemo(() => {
    if (isAdmin) return true;
    if (isLoadingEval) return true; 
    return userEvaluations && userEvaluations.length > 0;
  }, [userEvaluations, isLoadingEval, isAdmin]);

  const getSubmissionsNotificationQuery = (): Query | null => {
    if (!firestore || !userProfile || !userRole) return null;
    const col = collection(firestore, 'submissions');
    if (isAdmin) return query(col, where('statusId', '==', 'submitted'));
    if (isSupervisor) {
        if (userRole === 'Campus Director' || userRole === 'Campus ODIMO' || userRole?.toLowerCase().includes('vice president')) {
            if (!userProfile.campusId) return null;
            return query(col, where('campusId', '==', userProfile.campusId), where('statusId', '==', 'submitted'));
        }
    }
    return query(col, where('userId', '==', userProfile.id), where('statusId', '==', 'rejected'));
  }

  const getCarNotificationQuery = (): Query | null => {
      if (!firestore || !userProfile || !userRole) return null;
      const col = collection(firestore, 'correctiveActionRequests');
      const isInstitutionalViewer = isAdmin || isAuditor;
      if (isInstitutionalViewer) return query(col, where('status', '==', 'For Final Verification'));
      if (isSupervisor) return query(col, where('campusId', '==', userProfile.campusId), where('status', '==', 'For Final Verification'));
      return query(col, where('unitId', '==', userProfile.unitId), where('status', 'in', ['Open', 'Awaiting Response/Update']));
  }

  const subNotifQuery = useMemoFirebase(() => getSubmissionsNotificationQuery(), [firestore, userProfile, userRole, isSupervisor, isAdmin]);
  const { data: subNotifications } = useCollection<Submission>(subNotifQuery);

  const carNotifQuery = useMemoFirebase(() => getCarNotificationQuery(), [firestore, userProfile, userRole, isSupervisor, isAdmin, isAuditor]);
  const { data: carNotifications } = useCollection<CorrectiveActionRequest>(carNotifQuery);

  const notificationCount = useMemo(() => {
    let count = 0;
    if (subNotifications) {
        if (isAdmin) count += subNotifications.length;
        else if (isSupervisor && userProfile) {
            count += subNotifications.filter(s => s.userId !== userProfile.id).length;
        } else {
            count += subNotifications.length;
        }
    }
    if (carNotifications) count += carNotifications.length;
    return count;
  }, [subNotifications, carNotifications, userProfile, isAdmin, isSupervisor]);

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
        if (!userProfile.verified) { 
            router.push('/awaiting-verification'); 
            return; 
        }
        const roleLower = userRole?.toLowerCase() || '';
        const isUnitOptionalUser = roleLower === 'campus director' || roleLower === 'campus odimo' || roleLower === 'auditor' || roleLower.includes('vice president');
        const isProfileIncomplete = isUnitOptionalUser ? !userProfile.campusId || !userProfile.roleId || !userProfile.sex : !userProfile.campusId || !userProfile.roleId || !userProfile.unitId || !userProfile.sex;
        if (isProfileIncomplete) router.push('/complete-registration');
    } else {
      router.push('/complete-registration');
    }
  }, [user, userProfile, isUserLoading, isAdmin, userRole, pathname, router]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const scale = userProfile?.accessibility?.fontSize || 1.0;
      document.documentElement.style.fontSize = `${scale * 100}%`;
    }
  }, [userProfile?.accessibility?.fontSize]);

  const accessibilityClasses = useMemo(() => {
    if (!userProfile?.accessibility) return '';
    const { highContrast, dyslexicFont, reducedMotion, themeColor } = userProfile.accessibility;
    return cn(highContrast && 'accessibility-high-contrast', dyslexicFont && 'accessibility-dyslexic-font', reducedMotion && 'accessibility-reduced-motion', themeColor && themeColor !== 'default' && `theme-${themeColor}`);
  }, [userProfile?.accessibility]);

  if (isUserLoading) return <FullScreenLoader />;

  const isAuditorOfflineLockActive = !isOnline && isAuditor && !localStorage.getItem('rsu_last_mirror_time');

  if (isAuditorOfflineLockActive) {
      return (
          <div className="flex h-screen w-full items-center justify-center p-8 bg-slate-100">
              <Card className="max-w-md w-full border-destructive/20 shadow-2xl">
                  <CardHeader className="bg-destructive/5 text-center pb-8 border-b">
                      <div className="mx-auto h-20 w-20 rounded-full bg-destructive flex items-center justify-center text-white mb-6 animate-pulse">
                          <WifiOff className="h-10 w-10" />
                      </div>
                      <CardTitle className="text-2xl font-black uppercase text-destructive">Offline Access Restricted</CardTitle>
                      <CardDescription className="text-slate-600 font-bold mt-2">No local institutional mirror detected on this device.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-8 space-y-6">
                      <div className="flex gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 italic text-sm text-slate-500">
                          <Info className="h-5 w-5 shrink-0 mt-0.5" />
                          <p>To conduct audits without an internet connection, you must first connect to the university network and perform a <strong>Deep Mirroring</strong> handshake in the Auditor Workspace.</p>
                      </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50 border-t py-6">
                      <Button onClick={() => window.location.reload()} className="w-full h-12 font-black uppercase tracking-widest gap-2 shadow-xl shadow-primary/20">
                          <RotateCw className="h-4 w-4" /> Try Reconnecting
                      </Button>
                  </CardFooter>
              </Card>
          </div>
      );
  }

  return (
    <ActivityLogProvider>
      <div className={cn("flex min-h-screen w-full", accessibilityClasses)}>
        <SidebarProvider>
          <Sidebar variant="sidebar" collapsible="icon">
            <SidebarHeader className="p-4">
              <div className="relative flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-primary border border-white/10 shadow-xl group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-none transition-all overflow-hidden">
                <div className="absolute top-0 -left-6 w-24 h-24 bg-white/20 rounded-full blur-2xl animate-float-blob group-data-[collapsible=icon]:hidden -z-10" />
                <div className="absolute bottom-0 -right-6 w-20 h-20 bg-accent/20 rounded-full blur-2xl animate-float-blob group-data-[collapsible=icon]:hidden -z-10" style={{ animationDelay: '3s' }} />
                
                {displayAvatar ? (
                  <Avatar className="h-16 w-16 transition-all group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 border-2 border-white/20">
                    <AvatarImage src={displayAvatar} alt={displayName || 'User'} />
                    <AvatarFallback>{fallbackAvatar}</AvatarFallback>
                  </Avatar>
                ) : (
                  <Logo className="h-12 w-12 transition-all group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8" />
                )}
                <div className="mt-3 text-center group-data-[collapsible=icon]:hidden">
                  <p className="font-black text-sm leading-tight text-white">{displayName}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 mt-1">{displayRole}</p>
                  <div className="mt-2 space-y-1">
                    {userProfile?.unitId && (
                      <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-900 font-bold uppercase tracking-tight">
                          <Building2 className="h-3 w-3 text-slate-900/40 shrink-0" />
                          <span className="truncate max-w-[150px]">{allUnits?.find(u => u.id === userProfile.unitId)?.name || 'Loading Unit...'}</span>
                      </div>
                    )}
                    {userProfile?.campusId && (
                      <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-900/60 italic font-bold">
                          <School className="h-3 w-3 shrink-0 opacity-40" />
                          <span className="truncate max-w-[150px]">{allCampuses?.find(c => c.id === userProfile.campusId)?.name || 'Loading Site...'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="p-4 pt-2">
              <SidebarNav notificationCount={notificationCount} />
            </SidebarContent>
          </Sidebar>
          <SidebarInset className="overflow-hidden">
            <Header 
                notificationCount={notificationCount} 
                isGuidanceVisible={isGuidanceVisible}
                onToggleGuidance={handleToggleGuidance}
            />
            <main className="flex flex-col lg:flex-row gap-6 p-4 lg:p-8 bg-background/90 h-[calc(100vh-4rem)] overflow-hidden">
                <div className="flex-1 min-0 overflow-y-auto h-full pr-2">
                    {children}
                </div>
                
                {hasHydrated && isGuidanceVisible && (
                    <Suspense fallback={<div className="w-80 shrink-0" />}>
                        <PageGuidance className="hidden lg:block h-full" />
                    </Suspense>
                )}
            </main>
            <Chatbot />
          </SidebarInset>
        </SidebarProvider>
      </div>
      
      <InstallPwaDialog />
      <WhatsNewDialog isOpen={isWhatsNewOpen} onOpenChange={setIsWhatsNewOpen} onAcknowledge={handleAcknowledgeUpdates} />
      {!isEvaluationComplete && !isLoadingEval && <SoftwareEvaluationGate />}
    </ActivityLogProvider>
  );
}
