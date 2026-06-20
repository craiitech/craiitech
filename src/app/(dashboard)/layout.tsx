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
import type { Campus, Unit, Submission, SoftwareEvaluation, CorrectiveActionRequest, Risk, ProgramComplianceRecord, ManagementReviewOutput, Cycle, UnitFormRequest, ProcedureRevisionRequest } from '@/lib/types';
import { collection, query, where, Query, doc, updateDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
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
import { GuidedTour } from '@/components/dashboard/guided-tour';
import { InstallPwaDialog } from '@/components/dashboard/install-pwa-dialog';
import { SoftwareEvaluationGate } from '@/components/evaluation/software-evaluation-gate';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VoiceProvider } from '@/components/voice/voice-provider';

const CURRENT_SYSTEM_VERSION = '2.6.0'; 

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
  
  // Defaulting guidance to false (hidden) as requested
  const [isGuidanceVisible, setIsGuidanceVisible] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const storedVisibility = localStorage.getItem('rsu_eoms_guidance_visible');
    if (storedVisibility !== null) {
      setIsGuidanceVisible(storedVisibility === 'true');
    }
    setHasHydrated(true);

    // Register Service Worker for offline capability
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker registered with scope:', reg.scope))
        .catch((err) => console.error('Service Worker registration failed:', err));
    }
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
            return query(col, where('campusId', '==', userProfile.campusId));
        }
    }
    return query(col, where('userId', '==', userProfile.id));
  }

  const getCarNotificationQuery = (): Query | null => {
      if (!firestore || !userProfile || !userRole) return null;
      const col = collection(firestore, 'correctiveActionRequests');
      const isInstitutionalViewer = isAdmin || isAuditor;
      if (isInstitutionalViewer) return query(col, where('status', '==', 'For Final Verification'));
      if (isSupervisor) return query(col, where('campusId', '==', userProfile.campusId), where('status', '==', 'For Final Verification'));
      return query(col, where('unitId', '==', userProfile.unitId));
  }

  const getRisksNotificationQuery = (): Query | null => {
      if (!firestore || !userProfile || !userRole) return null;
      const col = collection(firestore, 'risks');
      if (isAdmin || isSupervisor) return col;
      if (userProfile.unitId && userProfile.campusId) return query(col, where('unitId', '==', userProfile.unitId));
      return null;
  }

  const subNotifQuery = useMemoFirebase(() => getSubmissionsNotificationQuery(), [firestore, userProfile, userRole, isSupervisor, isAdmin]);
  const { data: subNotifications } = useCollection<Submission>(subNotifQuery);

  const carNotifQuery = useMemoFirebase(() => getCarNotificationQuery(), [firestore, userProfile, userRole, isSupervisor, isAdmin, isAuditor]);
  const { data: carNotifications } = useCollection<CorrectiveActionRequest>(carNotifQuery);

  const risksNotifQuery = useMemoFirebase(() => getRisksNotificationQuery(), [firestore, userProfile, userRole, isSupervisor, isAdmin]);
  const { data: riskNotifications } = useCollection<Risk>(risksNotifQuery);

  const compliancesNotifQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'programCompliances');
  }, [firestore]);
  const { data: complianceNotifications } = useCollection<ProgramComplianceRecord>(compliancesNotifQuery);

  const decisionsNotifQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'managementReviewOutputs');
  }, [firestore]);
  const { data: decisionNotifications } = useCollection<ManagementReviewOutput>(decisionsNotifQuery);

  const commsNotifQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'communications');
  }, [firestore]);
  const { data: commsNotifications } = useCollection<any>(commsNotifQuery);

  const getFormRequestsNotificationQuery = (): Query | null => {
      if (!firestore || !userProfile) return null;
      const col = collection(firestore, 'unitFormRequests');
      if (isAdmin) return col;
      
      if (userProfile.unitId) {
          const unitObj = allUnits?.find(u => u.id === userProfile.unitId);
          const targetId = (unitObj?.category === 'Academic') ? 'academic-shared' : userProfile.unitId;
          return query(col, where('unitId', '==', targetId));
      }
      return null;
  };

  const formRequestsNotifQuery = useMemoFirebase(() => getFormRequestsNotificationQuery(), [firestore, userProfile, isAdmin, allUnits]);
  const { data: formRequestNotifications } = useCollection<UnitFormRequest>(formRequestsNotifQuery);

  const getRevisionRequestsNotificationQuery = (): Query | null => {
      if (!firestore || !userProfile) return null;
      const col = collection(firestore, 'procedureRevisionRequests');
      if (isAdmin) return col;
      
      if (userProfile.unitId) {
          const unitObj = allUnits?.find(u => u.id === userProfile.unitId);
          const targetId = (unitObj?.category === 'Academic') ? 'academic-shared' : userProfile.unitId;
          return query(col, where('unitId', '==', targetId));
      }
      return null;
  };

  const revisionRequestsNotifQuery = useMemoFirebase(() => getRevisionRequestsNotificationQuery(), [firestore, userProfile, isAdmin, allUnits]);
  const { data: revisionRequestsNotifications } = useCollection<ProcedureRevisionRequest>(revisionRequestsNotifQuery);

  // EOMS Points — unit submissions for current year
  const currentYear = new Date().getFullYear();
  const eomsSubsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.unitId) return null;
    return query(
      collection(firestore, 'submissions'),
      where('unitId', '==', userProfile.unitId)
    );
  }, [firestore, userProfile]);
  const { data: eomsSubmissions } = useCollection<Submission>(eomsSubsQuery);

  const cyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
  const { data: cycles } = useCollection<Cycle>(cyclesQuery);

  const eomsPoints = useMemo(() => {
    if (!eomsSubmissions || !userProfile) return null;
    const yearSubs = eomsSubmissions.filter(s => s.year === currentYear && s.isDraft !== true);

    const submissionTypes = [
      'SWOT Analysis',
      'Needs and Expectation of Interested Parties',
      'Operational Plan',
      'Quality Objectives Monitoring',
      'Risk and Opportunity Registry',
      'Risk and Opportunity Action Plan'
    ];

    const calcCycle = (cycleId: 'first' | 'final') => {
      const cycleDeadline = (cycles || []).find(c => c.name === cycleId && Number(c.year) === currentYear);
      const rorSub = yearSubs.find(s => s.cycleId === cycleId && s.reportType === 'Risk and Opportunity Registry');
      const isActionPlanExempt = rorSub?.riskRating === 'low';

      return submissionTypes.reduce((sum, type) => {
        if (type === 'Risk and Opportunity Action Plan' && isActionPlanExempt) return sum + 1.0;
        const sub = yearSubs.find(s => s.cycleId === cycleId && s.reportType === type);
        if (!sub) return sum;
        if (!cycleDeadline?.endDate) return sum + 1.0;
        const getMs = (v: any) => v?.toDate ? v.toDate().getTime() : v instanceof Date ? v.getTime() : v?.seconds ? v.seconds * 1000 : new Date(v).getTime();
        return sum + (getMs(sub.submissionDate) <= getMs(cycleDeadline.endDate) ? 1.0 : 0.5);
      }, 0);
    };

    const total = calcCycle('first') + calcCycle('final');
    let tier: string = 'Unranked';
    if (total >= 11) tier = 'Gold';
    else if (total >= 8) tier = 'Silver';
    else if (total >= 1) tier = 'Bronze';

    return { total, tier };
  }, [eomsSubmissions, cycles, userProfile, currentYear]);

  const subNotificationsCount = useMemo(() => {
    if (!subNotifications) return 0;
    if (isAdmin) return subNotifications.length;
    if (isSupervisor && userProfile) {
      return subNotifications.filter(s => s.userId !== userProfile.id && s.statusId === 'submitted').length;
    }
    return subNotifications.filter(s => s.statusId === 'rejected').length;
  }, [subNotifications, userProfile, isAdmin, isSupervisor]);

  const carNotificationsCount = useMemo(() => {
    if (!carNotifications) return 0;
    if (isAdmin || isSupervisor) return carNotifications.length;
    return carNotifications.filter(c => c.status === 'Open' || c.status === 'Awaiting Response/Update').length;
  }, [carNotifications, isAdmin, isSupervisor]);

  const riskNotificationsCount = useMemo(() => {
    if (!riskNotifications) return 0;
    return riskNotifications.filter(r => {
      if (r.status === 'Closed') return false;
      if (isAdmin) return true;
      if (isSupervisor && userProfile) {
         return r.campusId === userProfile.campusId;
      }
      return r.unitId === userProfile?.unitId && r.campusId === userProfile?.campusId;
    }).length;
  }, [riskNotifications, userProfile, isAdmin, isSupervisor]);

  const accreditationNotificationsCount = useMemo(() => {
    if (!complianceNotifications || !userProfile) return 0;
    let count = 0;
    complianceNotifications.forEach(c => {
        c.accreditationRecords?.forEach(m => {
            m.recommendations?.forEach(reco => {
                if (reco.status === 'Closed') return;
                
                let isRelevant = false;
                if (isAdmin) {
                    isRelevant = true;
                } else if (isSupervisor) {
                    isRelevant = reco.assignedUnitIds?.some(uid => {
                        const unit = allUnits?.find(u => u.id === uid);
                        return unit?.campusIds?.includes(userProfile.campusId);
                    }) || false;
                } else {
                    isRelevant = reco.assignedUnitIds?.includes(userProfile.unitId) || false;
                }
                
                if (isRelevant) count++;
            });
        });
    });
    return count;
  }, [complianceNotifications, userProfile, allUnits, isAdmin, isSupervisor]);

  const decisionNotificationsCount = useMemo(() => {
    if (!decisionNotifications || !userProfile) return 0;
    return decisionNotifications.filter(o => {
      if (o.status === 'Closed') return false;
      if (isAdmin) return true;
      if (isSupervisor) {
         return o.assignments?.some((a: any) => {
             const unit = allUnits?.find(u => u.id === a.unitId);
             return unit?.campusIds?.includes(userProfile.campusId);
         }) || false;
      }
      return o.assignments?.some((a: any) => a.unitId === userProfile.unitId) || false;
    }).length;
  }, [decisionNotifications, userProfile, allUnits, isAdmin, isSupervisor]);

  const commNotificationsCount = useMemo(() => {
    if (!commsNotifications || !userProfile) return 0;
    const currentYear = new Date().getFullYear();
    const roleLower = userRole?.toLowerCase() || '';
    const isOdimo = isAdmin || roleLower.includes('odimo') || roleLower.includes('coordinator');

    return commsNotifications.filter(c => {
      if (c.senderUnitId === userProfile.unitId) return false;
      const date = c.createdAt?.toDate ? c.createdAt.toDate() : c.createdAt ? new Date(c.createdAt) : null;
      if (date && date.getFullYear() !== currentYear) return false;

      let isRecipient = false;
      if (c.recipientType === 'all') {
        isRecipient = true;
      } else if (c.recipientType === 'campus' && c.recipientIds?.includes(userProfile.campusId)) {
        isRecipient = true;
      } else if (c.recipientType === 'unit' && c.recipientIds?.includes(userProfile.unitId)) {
        isRecipient = true;
      } else if (c.recipientType === 'individual' && c.recipientIds?.includes(userProfile.id)) {
        isRecipient = true;
      }

      if (!isRecipient) return false;

      // If not ODIMO, only count/notify if the communication has been received/stamped by the unit's ODIMO
      const isReceivedByUnit = !!c.recipientRefNums?.[userProfile.unitId];
      if (!isOdimo && !isReceivedByUnit) return false;

      const hasRead = c.readBy?.includes(userProfile.id) || (userProfile.unitId && c.readBy?.includes(userProfile.unitId));
      return !hasRead;
    }).length;
  }, [commsNotifications, userProfile, userRole, isAdmin]);

  const formRequestNotificationsCount = useMemo(() => {
    if (!formRequestNotifications || !userProfile) return 0;
    return formRequestNotifications.filter(r => {
      if (isAdmin) {
        return r.status === 'Submitted' || r.status === 'QA Review' || r.status === 'Endorsement for Approval';
      }
      return r.status === 'Returned for Correction';
    }).length;
  }, [formRequestNotifications, userProfile, isAdmin]);

  const revisionRequestsNotificationsCount = useMemo(() => {
    if (!revisionRequestsNotifications || !userProfile) return 0;
    return revisionRequestsNotifications.filter(r => {
      if (isAdmin) {
        return r.status === 'Submitted' || r.status === 'Awaiting Presidential Approval';
      }
      return r.status === 'Returned for Revision';
    }).length;
  }, [revisionRequestsNotifications, userProfile, isAdmin]);

  const totalNotificationsCount = useMemo(() => {
    return subNotificationsCount + carNotificationsCount + riskNotificationsCount + accreditationNotificationsCount + decisionNotificationsCount + commNotificationsCount + formRequestNotificationsCount + revisionRequestsNotificationsCount;
  }, [subNotificationsCount, carNotificationsCount, riskNotificationsCount, accreditationNotificationsCount, decisionNotificationsCount, commNotificationsCount, formRequestNotificationsCount, revisionRequestsNotificationsCount]);

  const notificationsList = useMemo(() => {
    const list: any[] = [];
    const MAX_ITEMS = 30;

    // 1. Submissions — individual items
    if (subNotifications && userProfile) {
      subNotifications.forEach(sub => {
        if (!isAdmin && ((isSupervisor && (sub.userId === userProfile.id || sub.statusId !== 'submitted')) || (!isSupervisor && sub.statusId !== 'rejected'))) return;
        list.push({
          id: `sub-${sub.id}`,
          module: 'submissions',
          label: sub.controlNumber || `${sub.reportType || 'Submission'} — ${sub.unitName || ''}`,
          description: isAdmin || isSupervisor ? 'Pending approval' : 'Rejected — resubmit required',
          link: isAdmin || isSupervisor ? '/approvals' : '/submissions'
        });
      });
    }

    // 2. CARs — individual items
    if (carNotifications) {
      carNotifications.forEach(car => {
        if (!isAdmin && !isSupervisor && !isAuditor && car.status !== 'Open' && car.status !== 'Awaiting Response/Update') return;
        list.push({
          id: `car-${car.id}`,
          module: 'car',
          label: `${car.carNumber} — ${car.natureOfFinding}`,
          description: car.status,
          link: '/qa-reports?tab=car'
        });
      });
    }

    // 3. Risks — individual items
    if (riskNotifications && userProfile) {
      riskNotifications.forEach(r => {
        if (r.status === 'Closed') return;
        if (isSupervisor && r.campusId !== userProfile.campusId) return;
        if (!isAdmin && !isSupervisor && (r.unitId !== userProfile.unitId || r.campusId !== userProfile.campusId)) return;
        list.push({
          id: `risk-${r.id}`,
          module: 'risk',
          label: r.objective || r.description?.substring(0, 80) || 'Risk item',
          description: `${r.status} — ${r.type || 'Risk'}`,
          link: '/risk-register'
        });
      });
    }

    // 4. Accreditation recommendations — individual items
    if (complianceNotifications && userProfile) {
      complianceNotifications.forEach(c => {
        c.accreditationRecords?.forEach(m => {
          m.recommendations?.forEach(reco => {
            if (reco.status === 'Closed') return;
            let isRelevant = false;
            if (isAdmin) isRelevant = true;
            else if (isSupervisor) {
              isRelevant = reco.assignedUnitIds?.some(uid => {
                const unit = allUnits?.find(u => u.id === uid);
                return unit?.campusIds?.includes(userProfile.campusId);
              }) || false;
            } else {
              isRelevant = reco.assignedUnitIds?.includes(userProfile.unitId) || false;
            }
            if (!isRelevant) return;
            list.push({
              id: `accred-${c.id}-${m.id}-${reco.id}`,
              module: 'accreditation',
              label: reco.text?.substring(0, 80) || 'Accreditation gap',
              description: `${reco.type === 'Mandatory' ? 'Mandatory — ' : ''}${reco.status}`,
              link: isAdmin || isSupervisor ? '/dashboard#overview' : '/academic-programs'
            });
          });
        });
      });
    }

    // 5. MR Decisions — individual items
    if (decisionNotifications && userProfile) {
      decisionNotifications.forEach(d => {
        if (d.status === 'Closed') return;
        let isRelevant = false;
        if (isAdmin) isRelevant = true;
        else if (isSupervisor) {
          isRelevant = d.assignments?.some((a: any) => {
            const unit = allUnits?.find(u => u.id === a.unitId);
            return unit?.campusIds?.includes(userProfile.campusId);
          }) || false;
        } else {
          isRelevant = d.assignments?.some((a: any) => a.unitId === userProfile.unitId) || false;
        }
        if (!isRelevant) return;
        list.push({
          id: `decision-${d.id}`,
          module: 'decisions',
          label: d.description?.substring(0, 80) || 'MR decision',
          description: d.status,
          link: '/qa-reports?tab=decisions'
        });
      });
    }

    // 6. Communications — individual items
    if (commsNotifications && userProfile) {
      const roleLower = userRole?.toLowerCase() || '';
      const isOdimo = isAdmin || roleLower.includes('odimo') || roleLower.includes('coordinator');
      const currentYear = new Date().getFullYear();
      commsNotifications.forEach(c => {
        if (c.senderUnitId === userProfile.unitId) return;
        const date = c.createdAt?.toDate ? c.createdAt.toDate() : c.createdAt ? new Date(c.createdAt) : null;
        if (date && date.getFullYear() !== currentYear) return;
        let isRecipient = false;
        if (c.recipientType === 'all') isRecipient = true;
        else if (c.recipientType === 'campus' && c.recipientIds?.includes(userProfile.campusId)) isRecipient = true;
        else if (c.recipientType === 'unit' && c.recipientIds?.includes(userProfile.unitId)) isRecipient = true;
        else if (c.recipientType === 'individual' && c.recipientIds?.includes(userProfile.id)) isRecipient = true;
        if (!isRecipient) return;
        const isReceivedByUnit = !!c.recipientRefNums?.[userProfile.unitId];
        if (!isOdimo && !isReceivedByUnit) return;
        const hasRead = c.readBy?.includes(userProfile.id) || (userProfile.unitId && c.readBy?.includes(userProfile.unitId));
        if (hasRead) return;
        list.push({
          id: `comm-${c.id}`,
          module: 'communications',
          label: c.subject || c.kind || 'Communication',
          description: 'Unread',
          link: '/communications'
        });
      });
    }
    // 7. Form Requests — individual items
    if (formRequestNotifications && userProfile) {
      formRequestNotifications.forEach(r => {
        if (isAdmin) {
          if (r.status !== 'Submitted' && r.status !== 'QA Review' && r.status !== 'Endorsement for Approval') return;
          list.push({
            id: `form-req-${r.id}`,
            module: 'unit-forms',
            label: `Form App — ${r.unitName || 'Unit'}`,
            description: r.isDraft ? `Draft: ${r.status}` : `Pending: ${r.status}`,
            link: '/unit-forms?tab=roster'
          });
        } else {
          if (r.status !== 'Returned for Correction') return;
          list.push({
            id: `form-req-${r.id}`,
            module: 'unit-forms',
            label: `Form App Returned`,
            description: `Correction required for ${r.requestedForms?.length || 0} forms`,
            link: '/unit-forms?tab=roster'
          });
        }
      });
    }

    // 8. Procedure Revision Requests — individual items
    if (revisionRequestsNotifications && userProfile) {
      revisionRequestsNotifications.forEach(r => {
        if (isAdmin) {
          if (r.status !== 'Submitted' && r.status !== 'Awaiting Presidential Approval') return;
          list.push({
            id: `rev-req-${r.id}`,
            module: 'manuals',
            label: `Manual Rev — ${r.unitName || 'Unit'}`,
            description: `Pending: ${r.status}`,
            link: '/manuals'
          });
        } else {
          if (r.status !== 'Returned for Revision') return;
          list.push({
            id: `rev-req-${r.id}`,
            module: 'manuals',
            label: `Manual Rev Returned`,
            description: `Returned for revision — review feedback`,
            link: '/manuals'
          });
        }
      });
    }

    return list.slice(0, MAX_ITEMS);
  }, [subNotifications, carNotifications, riskNotifications, complianceNotifications, decisionNotifications, commsNotifications, formRequestNotifications, revisionRequestsNotifications, userProfile, userRole, isAdmin, isSupervisor, isAuditor, allUnits]);

  const notificationCount = subNotificationsCount;

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
              <div className="relative flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-none transition-all overflow-hidden">
                <div className="absolute top-0 -left-6 w-24 h-24 bg-white/30 rounded-full blur-3xl animate-float-blob group-data-[collapsible=icon]:hidden -z-10" />
                <div className="absolute bottom-0 -right-6 w-20 h-20 bg-accent/30 rounded-full blur-3xl animate-float-blob group-data-[collapsible=icon]:hidden -z-10" style={{ animationDelay: '3s' }} />
                
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
                  {eomsPoints && (
                    <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-black text-white/70 uppercase tracking-wider">AY {currentYear}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "text-[9px] font-black uppercase px-1.5 py-0.5 rounded-sm tracking-wider",
                          eomsPoints.tier === 'Gold' && 'bg-yellow-400 text-yellow-900',
                          eomsPoints.tier === 'Silver' && 'bg-slate-300 text-slate-800',
                          eomsPoints.tier === 'Bronze' && 'bg-amber-700 text-amber-100',
                          eomsPoints.tier === 'Unranked' && 'bg-white/10 text-white/50'
                        )}>{eomsPoints.tier}</span>
                        <span className="text-xs font-black text-white">{eomsPoints.total.toFixed(1)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent className="p-4 pt-2">
              <SidebarNav 
                notificationCount={notificationCount} 
                commNotificationCount={commNotificationsCount} 
                formRequestNotificationsCount={formRequestNotificationsCount} 
                manualsNotificationCount={revisionRequestsNotificationsCount} 
              />
            </SidebarContent>
          </Sidebar>
          <SidebarInset className="overflow-hidden">
            <VoiceProvider>
              <Header 
                  notificationCount={notificationCount} 
                  totalNotificationsCount={totalNotificationsCount}
                  notificationsList={notificationsList}
                  isGuidanceVisible={isGuidanceVisible}
                  onToggleGuidance={handleToggleGuidance}
              />
              <main className="flex flex-col lg:flex-row gap-6 p-4 lg:p-8 bg-background/90 h-[calc(100vh-4rem)] overflow-hidden">
                  <div className="flex-1 min-w-0 overflow-auto h-full pr-2">
                      {children}
                  </div>
                
                {hasHydrated && isGuidanceVisible && (
                    <Suspense fallback={<div className="w-80 shrink-0" />}>
                        <PageGuidance className="hidden lg:block h-full" />
                    </Suspense>
                )}
            </main>
            <Chatbot />
            <GuidedTour />
            </VoiceProvider>
          </SidebarInset>
        </SidebarProvider>
      </div>
      
      <InstallPwaDialog />
      <WhatsNewDialog isOpen={isWhatsNewOpen} onOpenChange={setIsWhatsNewOpen} onAcknowledge={handleAcknowledgeUpdates} />
      {!isEvaluationComplete && !isLoadingEval && <SoftwareEvaluationGate />}
    </ActivityLogProvider>
  );
}
