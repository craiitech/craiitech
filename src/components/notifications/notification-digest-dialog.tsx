'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Sparkles,
  FileCheck,
  AlertTriangle,
  MessageSquare,
  ShieldCheck,
  FileText,
  Activity,
  Calendar,
  Clock,
  Building2,
  School,
  ArrowRight,
  ExternalLink,
  Award,
  CheckCircle2,
  FolderUp,
  Globe,
  QrCode,
  Zap,
  HardDrive,
  SlidersHorizontal,
  MessageSquareText,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Cycle, Submission } from '@/lib/types';
import { useYear } from '@/lib/year-provider';
import { format, isAfter } from 'date-fns';

interface NotificationDigestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Array<{
    id: string;
    module?: string;
    label?: string;
    description?: string;
    link?: string;
    timestamp?: string;
  }>;
  userProfile?: any;
  userRole?: string | null;
  unitName?: string;
  campusName?: string;
  selectedYear?: number;
  cycles?: Cycle[] | null;
  eomsSubmissions?: Submission[] | null;
  eomsPoints?: { total: number; tier: string } | null;
  currentSystemVersion?: string;
  hasUnreadUpdates?: boolean;
  onAcknowledgeUpdates?: () => void;
  onAcknowledge: () => void;
  onMarkAllAsRead?: () => void;
}

const platformUpdates = [
  {
    title: 'Automated Campus & Site Google Drive Auto-Upload',
    tag: 'MAJOR • ISO 7.5.3',
    icon: <FolderUp className="h-5 w-5 text-emerald-500" />,
    desc: 'Units and coordinators now upload their EOMS Submission Documents (SWOT, Needs & Expectations, Operational Plan, Quality Objectives, and Risk Registry & Action Plan) directly into their respective Site / Campus Google Drive repository folders with automatic file verification and zero manual link copy-pasting.',
    highlight: true,
  },
  {
    title: 'Online CSM Evaluation & QR Codes',
    tag: 'CSM • ARTA',
    icon: <Globe className="h-5 w-5 text-sky-500" />,
    desc: 'Clients can submit Citizen/Client Satisfaction Measurement (CSM) feedback online without logging in. Generate unit-specific QR codes and shareable links from the Visitor Logbook Hub.',
  },
  {
    title: 'Digital Visitor Logbook Hub',
    tag: 'SERVICES',
    icon: <ShieldCheck className="h-5 w-5 text-indigo-500" />,
    desc: 'Touchless visitor registration with QR sign-in, real-time logging, kiosk modes, and printable formal institutional visitor logbooks for administrative audits.',
  },
  {
    title: 'Unit Activity QR Attendance & Evaluation',
    tag: 'MONITORING',
    icon: <QrCode className="h-5 w-5 text-amber-500" />,
    desc: 'Track attendance and evaluate seminars, orientations, and unit activities via instantaneous QR scanning and real-time participant feedback.',
  },
  {
    title: 'RSU EOMS Mobile Application',
    tag: 'MOBILE',
    icon: <Zap className="h-5 w-5 text-primary" />,
    desc: 'Official Android mobile app available for download from /get-app. Conduct on-site inspections, visitor check-in, and audit logging on mobile devices.',
  },
];

export function NotificationDigestDialog({
  isOpen,
  onOpenChange,
  notifications = [],
  userProfile,
  userRole,
  unitName,
  campusName,
  selectedYear: propSelectedYear,
  cycles = [],
  eomsSubmissions,
  eomsPoints: propEomsPoints,
  currentSystemVersion = '2.7.0',
  hasUnreadUpdates = false,
  onAcknowledgeUpdates,
  onAcknowledge,
  onMarkAllAsRead,
}: NotificationDigestDialogProps) {
  const router = useRouter();
  const yearContext = useYear();
  const activeYear = propSelectedYear || yearContext.selectedYear || new Date().getFullYear();

  const [activeTab, setActiveTab] = useState<'all' | 'actions' | 'deadlines' | 'whats-new'>('all');
  const [mustReadWhatsNew, setMustReadWhatsNew] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (hasUnreadUpdates) {
        setActiveTab('whats-new');
        setMustReadWhatsNew(true);
      } else {
        setMustReadWhatsNew(false);
      }
    }
  }, [isOpen, hasUnreadUpdates]);

  const calculatedEomsPoints = useMemo(() => {
    if (propEomsPoints) return propEomsPoints;
    if (!eomsSubmissions || !userProfile) return null;
    const yearSubs = eomsSubmissions.filter((s) => s.year === activeYear && s.isDraft !== true);

    const submissionTypes = [
      'SWOT Analysis',
      'Needs and Expectation of Interested Parties',
      'Operational Plan',
      'Quality Objectives Monitoring',
      'Risk and Opportunity Registry',
      'Risk and Opportunity Action Plan',
    ];

    const calcCycle = (cycleId: 'first' | 'final') => {
      const cycleDeadline = (cycles || []).find((c) => c.name === cycleId && Number(c.year) === activeYear);
      const rorSub = yearSubs.find((s) => s.cycleId === cycleId && s.reportType === 'Risk and Opportunity Registry');
      const isActionPlanExempt = rorSub?.riskRating === 'low';

      return submissionTypes.reduce((sum, type) => {
        if (type === 'Risk and Opportunity Action Plan' && isActionPlanExempt) return sum + 1.0;
        const sub = yearSubs.find((s) => s.cycleId === cycleId && s.reportType === type);
        if (!sub) return sum;
        if (!cycleDeadline?.endDate) return sum + 1.0;
        const getMs = (v: any) =>
          v?.toDate
            ? v.toDate().getTime()
            : v instanceof Date
              ? v.getTime()
              : v?.seconds
                ? v.seconds * 1000
                : v
                  ? new Date(v).getTime()
                  : null;
        return (
          sum +
          (getMs(sub.submissionDate) &&
          getMs(cycleDeadline.endDate) &&
          getMs(sub.submissionDate)! <= getMs(cycleDeadline.endDate)!
            ? 1.0
            : 0.5)
        );
      }, 0);
    };

    const total = calcCycle('first') + calcCycle('final');
    let tier: string = 'Unranked';
    if (total >= 11) tier = 'Gold';
    else if (total >= 8) tier = 'Silver';
    else if (total >= 1) tier = 'Bronze';

    return { total, tier };
  }, [propEomsPoints, eomsSubmissions, cycles, userProfile, activeYear]);

  const eomsPoints = calculatedEomsPoints;
  const selectedYear = activeYear;

  const displayName = userProfile ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() : 'User';

  const getModuleIcon = (module?: string) => {
    switch (module) {
      case 'submissions':
        return <FileCheck className="h-4 w-4 text-emerald-500" />;
      case 'car':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'risk':
        return <Activity className="h-4 w-4 text-rose-500" />;
      case 'accreditation':
        return <ShieldCheck className="h-4 w-4 text-indigo-500" />;
      case 'decisions':
        return <Sparkles className="h-4 w-4 text-purple-500" />;
      case 'communications':
        return <MessageSquare className="h-4 w-4 text-sky-500" />;
      case 'unit-forms':
      case 'manuals':
        return <FileText className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const getModuleBadgeLabel = (module?: string) => {
    switch (module) {
      case 'submissions':
        return 'Submission';
      case 'car':
        return 'CAR / Audit';
      case 'risk':
        return 'Risk';
      case 'accreditation':
        return 'Accreditation';
      case 'decisions':
        return 'MR Decision';
      case 'communications':
        return 'Communication';
      case 'unit-forms':
        return 'Form Request';
      case 'manuals':
        return 'Procedure Manual';
      default:
        return 'System';
    }
  };

  const cycleDeadlines = useMemo(() => {
    if (!cycles || cycles.length === 0) return [];
    return cycles
      .filter((c) => Number(c.year) === selectedYear)
      .map((c) => {
        const getMs = (v: any) =>
          v?.toDate
            ? v.toDate().getTime()
            : v instanceof Date
              ? v.getTime()
              : v?.seconds
                ? v.seconds * 1000
                : v
                  ? new Date(v).getTime()
                  : null;

        const startMs = getMs(c.startDate);
        const endMs = getMs(c.endDate);
        const endDate = endMs ? new Date(endMs) : null;
        const isPastDeadline = endDate ? !isAfter(endDate, new Date()) : false;

        return {
          id: c.id,
          name: c.name === 'first' ? '1st Cycle (Mid-Year)' : 'Final Cycle (Year-End)',
          rawName: c.name,
          startDate: startMs ? new Date(startMs) : null,
          endDate,
          isPastDeadline,
          deadlineText: endDate ? format(endDate, 'MMM dd, yyyy') : 'No deadline set',
          status: isPastDeadline ? 'Closed / Evaluation' : 'Active / Submissions Open',
        };
      });
  }, [cycles, selectedYear]);

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'actions') {
      return ['submissions', 'car', 'risk', 'accreditation', 'decisions', 'unit-forms', 'manuals'].includes(
        item.module || '',
      );
    }
    return true;
  });

  const handleNavigate = (link?: string) => {
    onAcknowledge();
    onOpenChange(false);
    if (link) {
      router.push(link);
    }
  };

  const handleDismiss = () => {
    onAcknowledge();
    onOpenChange(false);
  };

  const handleMarkAllAndDismiss = () => {
    if (onMarkAllAsRead) {
      onMarkAllAsRead();
    }
    onAcknowledge();
    onOpenChange(false);
  };

  const handleAcknowledgeWhatsNew = () => {
    if (onAcknowledgeUpdates) {
      onAcknowledgeUpdates();
    }
    setMustReadWhatsNew(false);
    setActiveTab('all');
  };

  const hasActionNotifications = notifications.length > 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={mustReadWhatsNew ? () => {} : onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[92dvh] flex flex-col p-0 overflow-hidden border border-primary/20 shadow-2xl rounded-3xl bg-background/95 backdrop-blur-2xl">
        {/* Header with Institutional Gradient */}
        <div className="p-6 pb-5 bg-gradient-to-br from-primary via-primary/95 to-slate-900 text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md shadow-inner">
                {mustReadWhatsNew || activeTab === 'whats-new' ? (
                  <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
                ) : hasActionNotifications ? (
                  <Bell className="h-6 w-6 text-yellow-300 animate-bounce" />
                ) : (
                  <ShieldCheck className="h-6 w-6 text-emerald-300" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertDialogTitle className="text-lg font-black uppercase tracking-tight text-white">
                    {mustReadWhatsNew || activeTab === 'whats-new'
                      ? `What's New in RSU EOMS (v${currentSystemVersion})`
                      : hasActionNotifications
                        ? 'Action Required & Updates'
                        : 'Welcome & Institutional Status'}
                  </AlertDialogTitle>
                  {mustReadWhatsNew || activeTab === 'whats-new' ? (
                    <Badge className="bg-yellow-400 hover:bg-yellow-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                      v{currentSystemVersion} Platform Update
                    </Badge>
                  ) : hasActionNotifications ? (
                    <Badge className="bg-yellow-400 hover:bg-yellow-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                      {notifications.length} Action Items
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-500/80 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-400/30">
                      All Caught Up
                    </Badge>
                  )}
                </div>
                <AlertDialogDescription className="text-xs text-white/80 font-medium mt-1">
                  {mustReadWhatsNew || activeTab === 'whats-new'
                    ? 'Important briefing from the Quality Assurance Office. Please review before proceeding.'
                    : `Welcome back, ${displayName}! Here is your institutional guidance and quality status.`}
                </AlertDialogDescription>
              </div>
            </div>
          </div>

          {/* Unit & Academic Context Bar */}
          <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap text-[11px] font-bold text-white/90">
            <div className="flex items-center gap-2">
              {unitName && (
                <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                  <Building2 className="h-3 w-3 text-yellow-300" />
                  <span className="truncate max-w-[180px]">{unitName}</span>
                </div>
              )}
              {campusName && (
                <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                  <School className="h-3 w-3 text-emerald-300" />
                  <span className="truncate max-w-[150px]">{campusName}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                <Calendar className="h-3 w-3 text-white/70" />
                <span>AY {selectedYear}</span>
              </div>
              {eomsPoints && (
                <div className="flex items-center gap-1 bg-yellow-400/20 px-2 py-0.5 rounded-lg border border-yellow-400/30 text-yellow-200">
                  <Award className="h-3 w-3 text-yellow-300" />
                  <span>
                    {eomsPoints.tier} ({eomsPoints.total.toFixed(1)} pts)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Filter / View Tabs */}
          <div className="mt-3">
            {mustReadWhatsNew ? (
              <div className="flex items-center justify-between bg-black/20 px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-wider text-yellow-300">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-300 animate-pulse" />
                  <span>Step 1: What's New & System Update (Required Reading)</span>
                </div>
                <span className="text-white/60 font-semibold normal-case text-[10px]">
                  Digest unlocks upon acknowledgment
                </span>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
                <TabsList className="bg-black/20 p-1 rounded-xl h-8 border border-white/10 grid grid-cols-4">
                  <TabsTrigger
                    value="all"
                    className="text-[10px] font-black uppercase tracking-wider rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 truncate"
                  >
                    Overview ({notifications.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="actions"
                    className="text-[10px] font-black uppercase tracking-wider rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 truncate"
                  >
                    Actions ({notifications.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="deadlines"
                    className="text-[10px] font-black uppercase tracking-wider rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 truncate"
                  >
                    Deadlines ({cycleDeadlines.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="whats-new"
                    className="text-[10px] font-black uppercase tracking-wider rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900 truncate gap-1"
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>What's New</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <ScrollArea className="flex-1 p-5 max-h-[50dvh] overflow-y-auto">
          {/* ================================================================= */}
          {/* VIEW: WHAT'S NEW & DEVELOPER WELCOME (FIRST STAGE)                */}
          {/* ================================================================= */}
          {activeTab === 'whats-new' && (
            <div className="space-y-4">
              {/* 1. DEVELOPER WELCOME STATEMENT (COMES FIRST) */}
              <div className="p-5 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-amber-500/10 dark:from-primary/20 dark:via-background dark:to-amber-500/15 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black shadow-md shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-wider px-2 py-0.5">
                        Quality Assurance Office
                      </Badge>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Portal Engineering
                      </span>
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-foreground">
                      Message from the Developer
                    </h3>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-foreground/90 leading-relaxed font-medium">
                  <p>
                    Hi, <strong className="text-primary font-black">Quality Champion</strong>! This is{' '}
                    <strong className="text-foreground font-black underline decoration-primary decoration-2 underline-offset-2">
                      Sir Mavz
                    </strong>
                    , the developer of this EOMS Submission Portal from the{' '}
                    <strong className="font-bold text-foreground">Quality Assurance Office</strong>.
                  </p>
                  <p>
                    Welcome to our latest portal release! We have rolled out an important system enhancement designed to
                    streamline and safeguard your unit's ISO 21001:2018 document control workflows.
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Please review the major update below regarding the new automated Site / Campus Google Drive upload
                    integration before proceeding to your institutional quality briefing.
                  </p>
                </div>
              </div>

              {/* 2. MAJOR NEW FEATURE SPOTLIGHT: SITE / CAMPUS GOOGLE DRIVE AUTO-UPLOAD */}
              <div className="p-5 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-3 shadow-xs">
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FolderUp className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5">
                        Major Update • ISO 7.5.3
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[9px] font-black tracking-wider text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      >
                        Site Repository
                      </Badge>
                    </div>
                    <h4 className="text-sm font-black uppercase text-foreground tracking-tight">
                      Automated Campus & Site Google Drive Auto-Upload
                    </h4>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      Units and coordinators now upload their EOMS Submission Documents (SWOT, Needs & Expectations,
                      Operational Plan, Quality Objectives, and Risk Registry & Action Plan) directly into their
                      respective{' '}
                      <strong className="text-foreground">Site / Campus Google Drive repository folders</strong>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-[11px]">
                  <div className="p-3 rounded-xl bg-background/80 border border-emerald-500/20 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      Drag-and-Drop Dropzone
                    </p>
                    <p className="text-muted-foreground text-[10.5px] leading-snug">
                      Select or drop your PDF / document directly into the submission form with instant size and format
                      validation.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-background/80 border border-emerald-500/20 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      Zero Manual Link Pasting
                    </p>
                    <p className="text-muted-foreground text-[10.5px] leading-snug">
                      The high-reliability Apps Script cloud bridge automatically ingests the file, sets permissions,
                      and stores the direct viewing link.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. OTHER PLATFORM EVOLUTIONS */}
              <div className="space-y-2.5 pt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Additional Recent Capabilities
                </p>

                {platformUpdates.slice(1).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-2xl border border-primary/10 bg-card/60 hover:bg-primary/5 transition-all shadow-xs"
                  >
                    <div className="h-9 w-9 rounded-xl bg-background border border-primary/15 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      {item.icon}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border-primary/20 bg-primary/5 text-primary"
                        >
                          {item.tag}
                        </Badge>
                        <h5 className="text-xs font-bold text-foreground">{item.title}</h5>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW: NOTIFICATION DIGEST (OVERVIEW / ACTIONS / DEADLINES)         */}
          {/* ================================================================= */}
          {activeTab !== 'whats-new' && (
            <>
              {/* 1. Good Standing Banner if 0 notifications */}
              {!hasActionNotifications && activeTab !== 'deadlines' && (
                <div className="mb-4 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 flex items-start gap-3.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                      Unit In Good Standing — All Quality Modules Clear
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                      Your unit has no rejected submissions, overdue CAR audit findings, or unaddressed risk items at
                      this time.
                    </p>
                  </div>
                </div>
              )}

              {/* 2. Deadlines & Cycle Reminders View */}
              {(activeTab === 'deadlines' || (!hasActionNotifications && activeTab === 'all')) && (
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Academic Year {selectedYear} Submission Deadlines</span>
                    </div>
                  </div>

                  {cycleDeadlines.length === 0 ? (
                    <div className="p-4 rounded-2xl border border-dashed border-primary/20 text-center text-xs text-muted-foreground font-medium">
                      No institutional cycle deadlines currently registered for AY {selectedYear}.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {cycleDeadlines.map((cycle) => (
                        <div
                          key={cycle.id}
                          className="p-3.5 rounded-2xl border border-primary/10 bg-card/60 hover:bg-primary/5 transition-all shadow-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-black uppercase text-foreground">{cycle.name}</span>
                            <Badge
                              variant={cycle.isPastDeadline ? 'secondary' : 'default'}
                              className={cn(
                                'text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md',
                                cycle.isPastDeadline ? 'bg-muted text-muted-foreground' : 'bg-emerald-500 text-white',
                              )}
                            >
                              {cycle.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            <span>
                              Deadline: <strong className="text-foreground">{cycle.deadlineText}</strong>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. Action Required Notifications List */}
              {activeTab !== 'deadlines' && hasActionNotifications && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary mb-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span>Pending Action Items</span>
                  </div>

                  {filteredNotifications.map((notif, idx) => (
                    <div
                      key={notif.id || idx}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-primary/10 bg-card/60 hover:bg-primary/5 transition-all shadow-xs hover:border-primary/20"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-xl bg-background border border-primary/15 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          {getModuleIcon(notif.module)}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border-primary/20 bg-primary/5 text-primary"
                            >
                              {getModuleBadgeLabel(notif.module)}
                            </Badge>
                          </div>
                          <p className="text-xs font-bold text-foreground leading-snug line-clamp-2">
                            {notif.label || 'Notification Item'}
                          </p>
                          {notif.description && (
                            <p className="text-[11px] text-muted-foreground font-medium line-clamp-1">
                              {notif.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          size="sm"
                          onClick={() => handleNavigate(notif.link)}
                          className="h-7 px-3 text-[10px] font-black uppercase tracking-wider gap-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs group/btn"
                        >
                          <span>Take Action</span>
                          <ChevronRight className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 4. Quick Module Shortcuts */}
              <div className="mt-4 pt-4 border-t border-primary/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2.5">
                  Quick Workspace Access
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigate('/submissions')}
                    className="h-9 px-2.5 text-[10px] font-black uppercase tracking-wider justify-start gap-1.5 rounded-xl border-primary/15 hover:bg-primary/5 hover:border-primary/30"
                  >
                    <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="truncate">Submissions</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigate('/communications')}
                    className="h-9 px-2.5 text-[10px] font-black uppercase tracking-wider justify-start gap-1.5 rounded-xl border-primary/15 hover:bg-primary/5 hover:border-primary/30"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-sky-600" />
                    <span className="truncate">Communications</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigate('/risk-register')}
                    className="h-9 px-2.5 text-[10px] font-black uppercase tracking-wider justify-start gap-1.5 rounded-xl border-primary/15 hover:bg-primary/5 hover:border-primary/30"
                  >
                    <Activity className="h-3.5 w-3.5 text-rose-600" />
                    <span className="truncate">Risk Register</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigate('/qa-reports')}
                    className="h-9 px-2.5 text-[10px] font-black uppercase tracking-wider justify-start gap-1.5 rounded-xl border-primary/15 hover:bg-primary/5 hover:border-primary/30"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span className="truncate">QA Reports</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <AlertDialogFooter className="p-4 bg-muted/40 border-t border-primary/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          {mustReadWhatsNew ? (
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>v{currentSystemVersion} Platform Update</span>
              </div>
              <Button
                type="button"
                onClick={handleAcknowledgeWhatsNew}
                className="h-10 px-6 font-black uppercase text-xs tracking-wider rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Acknowledge & Continue to Digest</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                {activeTab !== 'whats-new' && hasActionNotifications && onMarkAllAsRead && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAndDismiss}
                    className="text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-primary gap-1.5 h-9 px-3 rounded-xl"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    <span>Mark All Read & Dismiss</span>
                  </Button>
                )}
                {activeTab === 'whats-new' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('all')}
                    className="text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-primary gap-1.5 h-9 px-3 rounded-xl"
                  >
                    <span>Back to Quality Digest</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <AlertDialogCancel
                  onClick={handleDismiss}
                  className="text-xs font-black uppercase tracking-wider rounded-xl h-9 px-4 border-primary/20 hover:bg-muted m-0"
                >
                  Later
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDismiss}
                  className="text-xs font-black uppercase tracking-wider rounded-xl h-9 px-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md m-0"
                >
                  Acknowledge & Continue
                </AlertDialogAction>
              </div>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
