'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  LayoutDashboard,
  ShieldCheck,
  Compass,
  Award,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Building2,
  BarChart3,
  Layers,
  AlertTriangle,
  Info,
  Loader2,
  Check,
  Eye,
} from 'lucide-react';
import type { CampusSetting, Unit, User } from '@/lib/types';
import Link from 'next/link';

export function HomeDashboardSettingsManagement() {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [allowWorkspaceSwitch, setAllowWorkspaceSwitch] = useState(true);
  const [defaultTab, setDefaultTab] = useState('overview');
  const [reviewers, setReviewers] = useState<Record<string, string>>({});
  const [verifiers, setVerifiers] = useState<Record<string, string>>({});

  const globalSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'campusSettings', 'global') : null),
    [firestore],
  );
  const { data: globalSetting, isLoading } = useDoc<CampusSetting>(globalSettingsRef);
  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const usersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  useEffect(() => {
    if (globalSetting) {
      setIsEnabled(!!globalSetting.enableUnifiedHomeDashboard);
      setAllowWorkspaceSwitch(globalSetting.allowUserWorkspaceSwitch !== false);
      setDefaultTab(globalSetting.homeDashboardDefaultTab || 'overview');
      setReviewers(globalSetting.homeDashboardReviewers || {});
      setVerifiers(globalSetting.homeDashboardVerifiers || {});
    }
  }, [globalSetting]);

  const handleSaveSettings = async () => {
    if (!firestore || !globalSettingsRef) return;
    setIsSubmitting(true);
    try {
      await setDoc(
        globalSettingsRef,
        {
          enableUnifiedHomeDashboard: isEnabled,
          allowUserWorkspaceSwitch: allowWorkspaceSwitch,
          homeDashboardDefaultTab: defaultTab,
          homeDashboardReviewers: reviewers,
          homeDashboardVerifiers: verifiers,
          homeDashboardUpdatedAt: serverTimestamp(),
          homeDashboardUpdatedBy: userProfile?.id || 'admin',
          homeDashboardUpdatedByName: userProfile?.firstName
            ? `${userProfile.firstName} ${userProfile.lastName}`
            : 'Administrator',
        },
        { merge: true },
      );

      toast({
        title: 'Home Dashboard Settings Saved',
        description: isEnabled
          ? 'Unified Strategic Home Dashboard is now ACTIVE for all users.'
          : 'Unified Strategic Home Dashboard is now OFF. Standard role-based workspaces are restored.',
      });
    } catch (err: any) {
      console.error('Failed to update home dashboard settings:', err);
      toast({
        title: 'Save Failed',
        description: err?.message || 'Could not update settings in database.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const dashboardPillars = [
    {
      id: 'overview',
      name: '1. Executive Overview',
      tag: 'Pulse',
      desc: 'Composite institutional quality score, cross-framework health dials, executive alerts, and university stats.',
      icon: LayoutDashboard,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    },
    {
      id: 'archipelagic-intelligence',
      name: '2. Archipelagic Intelligence (AQ)',
      tag: 'Strategic Plan',
      desc: 'RSU 10-Point Agenda tracking, VP Sectoral Strategic Goals, island campus resource equity, and operational attainment.',
      icon: Compass,
      color: 'text-sky-600 bg-sky-50 border-sky-200',
    },
    {
      id: 'suc-levelling',
      name: '3. SUC Levelling (DBM-CHED)',
      tag: 'Rank Elevation',
      desc: '4 KRAs (Higher Education, Research, Resource Management, Governance), Level III to IV/V point tracker & simulator.',
      icon: Award,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    },
    {
      id: 'ched-monitoring',
      name: '4. CHED Program Monitoring',
      tag: 'COPC & Student Data',
      desc: 'Certificate of Program Compliance (COPC), student enrollment per semester, graduation totals, board exam pass rates & warnings.',
      icon: GraduationCap,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    },
    {
      id: 'eoms',
      name: '5. EOMS (ISO 21001:2025)',
      tag: 'Global Standard',
      desc: 'Educational Organizations Management System, PDCA cycle health, IQA audits, non-conformity CARs, and ISO clauses.',
      icon: ShieldCheck,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      id: 'ched-isa',
      name: '6. CHED ISA (Institutional Sustainability)',
      tag: 'Accreditation',
      desc: '5 ISA Governance Dimensions (Governance, Teaching/Learning, Research/Professional Exposure, Support for Students, Community).',
      icon: Layers,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
    },
    {
      id: 'aaccup',
      name: '7. AACCUP Institutional & Program Accreditation',
      tag: 'Program Quality',
      desc: 'Candidate, Level I, II, III, and IV program levels, 10 AACCUP survey areas scorecard, expiring accreditations, and recommendations.',
      icon: Award,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
    },
    {
      id: 'risk-intelligence',
      name: '8. Risk & Opportunity Intelligence',
      tag: 'Decision Support',
      desc: 'ISO 31000 5x5 Likelihood-Severity Matrix, critical risk escalation, treatment progress, and realized opportunities.',
      icon: AlertTriangle,
      color: 'text-orange-600 bg-orange-50 border-orange-200',
    },
    {
      id: 'campus-equity',
      name: '9. Multi-Island Campus Equity Radar',
      tag: 'Decentralization',
      desc: 'Side-by-side comparative analytics across Main and satellite island campuses for equitable development and funding.',
      icon: Building2,
      color: 'text-teal-600 bg-teal-50 border-teal-200',
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 dark:border-slate-800 shadow-md">
        <CardHeader className="bg-slate-50/70 dark:bg-slate-900/40 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-wider">
                  System Executive Feature
                </Badge>
                {isEnabled ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] font-black flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> ACTIVE FOR ALL USERS
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500 border-slate-300 text-[9px] font-black">
                    STANDARD ROLE WORKSPACES
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 mt-2">
                Unified Institutional Home Dashboard Settings
              </CardTitle>
              <CardDescription className="text-xs font-medium text-slate-500">
                Configure whether all university users see the comprehensive Multi-Framework Strategic Home Dashboard
                upon logging in.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard" target="_blank">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px] font-bold uppercase tracking-wider gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" /> Preview Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Master Toggle */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="master-dashboard-toggle"
                  className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  Enable Unified Home Dashboard for All Users
                </Label>
                {isEnabled && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500 text-white uppercase">
                    On
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                When turned <strong className="text-slate-700 dark:text-slate-300 font-bold">ON</strong>, all users
                (faculty, staff, department chairs, deans, campus directors, and auditors) will see the Unified
                Strategic Home Dashboard showcasing Overview, Archipelagic Intelligence (AQ), SUC Levelling, CHED
                Program Monitoring, EOMS ISO 21001:2025, CHED ISA, AACCUP Accreditation, and Decision Intelligence.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="master-dashboard-toggle"
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>

          {/* Additional Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Allow User Workspace Toggle */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="workspace-toggle"
                  className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  Allow Workspace Quick-Switch
                </Label>
                <Switch
                  id="workspace-toggle"
                  checked={allowWorkspaceSwitch}
                  onCheckedChange={setAllowWorkspaceSwitch}
                  disabled={!isEnabled}
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                When enabled, unit heads, faculty, and auditors have a quick toggle button on the dashboard header to
                switch between the
                <strong> Institutional Hub</strong> and their personal <strong>Unit / Auditor Workspace</strong>{' '}
                anytime.
              </p>
            </div>

            {/* Default Tab Selection */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Label className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-slate-200">
                Default Initial Landing Tab
              </Label>
              <Select value={defaultTab} onValueChange={setDefaultTab} disabled={!isEnabled}>
                <SelectTrigger className="h-9 text-xs bg-white border-slate-200 font-medium">
                  <SelectValue placeholder="Select initial tab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview" className="text-xs font-bold">
                    1. Overview (Executive Pulse)
                  </SelectItem>
                  <SelectItem value="archipelagic-intelligence" className="text-xs font-bold">
                    2. Archipelagic Intelligence (AQ)
                  </SelectItem>
                  <SelectItem value="suc-levelling" className="text-xs font-bold">
                    3. SUC Levelling (DBM-CHED)
                  </SelectItem>
                  <SelectItem value="ched-monitoring" className="text-xs font-bold">
                    4. CHED Program Monitoring
                  </SelectItem>
                  <SelectItem value="eoms" className="text-xs font-bold">
                    5. EOMS (ISO 21001:2025)
                  </SelectItem>
                  <SelectItem value="ched-isa" className="text-xs font-bold">
                    6. CHED ISA (Sustainability)
                  </SelectItem>
                  <SelectItem value="aaccup" className="text-xs font-bold">
                    7. AACCUP Accreditation
                  </SelectItem>
                  <SelectItem value="risk-intelligence" className="text-xs font-bold">
                    8. Risk & Opportunity Intelligence
                  </SelectItem>
                  <SelectItem value="campus-equity" className="text-xs font-bold">
                    9. Multi-Island Campus Equity
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">
                Select which framework tab opens by default when users enter the system dashboard.
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Unit Dashboard Review Assignments
              </h4>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Assign a confirmer and a verifier for each unit. Assigned accounts can act from the unit dashboard; VPs
                and administrators retain verification oversight.
              </p>
            </div>
            {isLoadingUnits || isLoadingUsers ? (
              <div className="flex items-center gap-2 py-3 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading units and accounts...
              </div>
            ) : units?.length ? (
              <div className="grid gap-2">
                {units.map((unit) => {
                  const candidates =
                    users?.filter(
                      (user) =>
                        user.unitId === unit.id ||
                        user.assignedUnitIds?.includes(unit.id) ||
                        user.assignments?.some((assignment) => assignment.unitId === unit.id) ||
                        user.id === reviewers[unit.id] ||
                        user.id === verifiers[unit.id],
                    ) || [];
                  return (
                    <div
                      key={unit.id}
                      className="grid gap-3 rounded-lg border bg-white p-3 dark:bg-slate-900 md:grid-cols-[minmax(140px,1fr)_minmax(220px,1fr)_minmax(220px,1fr)] md:items-center"
                    >
                      <Label className="text-xs font-bold">{unit.name}</Label>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Confirm updates</Label>
                        <Select
                          value={reviewers[unit.id] || 'unassigned'}
                          onValueChange={(userId) =>
                            setReviewers((previous) => {
                              const next = { ...previous };
                              if (userId === 'unassigned') delete next[unit.id];
                              else next[unit.id] = userId;
                              return next;
                            })
                          }
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select confirming account" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned" className="text-xs">
                              No confirmer assigned
                            </SelectItem>
                            {candidates.map((candidate) => (
                              <SelectItem key={candidate.id} value={candidate.id} className="text-xs">
                                {candidate.firstName} {candidate.lastName} ({candidate.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Verify confirmation</Label>
                        <Select
                          value={verifiers[unit.id] || 'unassigned'}
                          onValueChange={(userId) =>
                            setVerifiers((previous) => {
                              const next = { ...previous };
                              if (userId === 'unassigned') delete next[unit.id];
                              else next[unit.id] = userId;
                              return next;
                            })
                          }
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select verifying account" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned" className="text-xs">
                              No verifier assigned
                            </SelectItem>
                            {candidates.map((candidate) => (
                              <SelectItem key={candidate.id} value={candidate.id} className="text-xs">
                                {candidate.firstName} {candidate.lastName} ({candidate.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-3 text-xs text-slate-500">No units are available to assign.</p>
            )}
          </div>

          {/* Unified Dashboard Pillars Preview */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Integrated Framework Pillars (9 Modules)
              </h4>
              <Badge variant="outline" className="text-[9px] font-bold text-slate-500">
                All Modules Active
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {dashboardPillars.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col justify-between hover:border-slate-300 transition-colors shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <div className={`p-1.5 rounded-md border ${p.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <Badge variant="outline" className="text-[8px] font-mono font-bold">
                          {p.tag}
                        </Badge>
                      </div>
                      <h5 className="text-xs font-black text-slate-800 dark:text-slate-200 leading-snug">{p.name}</h5>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{p.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50 dark:bg-slate-900/40 border-t p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="h-4 w-4 text-slate-400 shrink-0" />
            <span>
              Changes take effect immediately across all active user sessions without requiring a system restart.
            </span>
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={isSubmitting || isLoading}
            className="w-full sm:w-auto font-black uppercase text-xs tracking-wider gap-2 px-6 shadow-md shadow-primary/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Save Dashboard Settings
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
