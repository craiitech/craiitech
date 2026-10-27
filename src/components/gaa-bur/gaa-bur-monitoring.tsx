'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Banknote, CalendarRange, CheckCircle2, Loader2, Plus, Save, Trash2, Upload, Wallet } from 'lucide-react';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc, query, serverTimestamp, setDoc, where } from '@/firebase/firestore-wrapper';
import { useYear } from '@/lib/year-provider';
import { useToast } from '@/hooks/use-toast';
import type {
  GaaBurFinancialTargets,
  GaaBurPhysicalTarget,
  GaaBurQuarter,
  GaaBurReport,
  GaaBurTargets,
} from '@/lib/types';
import {
  DEFAULT_BUR_TARGETS,
  computeBur,
  computeReportBur,
  formatPercent,
  formatPeso,
  getAttainment,
  getAttainmentStatus,
  getBurStatus,
  getFinancialTotal,
  getLatestReport,
  isIpdoProfile,
  toFiniteNumber,
} from '@/lib/gaa-bur';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GaaBurImportDialog } from '@/components/gaa-bur/gaa-bur-import-dialog';
import { cn } from '@/lib/utils';

type FinancialForm = {
  ps: string;
  mooe: string;
  co: string;
};

type BurTargetForm = {
  obligation: string;
  disbursement: string;
};

type QuarterForm = {
  allotments: string;
  obligations: string;
  disbursements: string;
  remarks: string;
};

type PhysicalTargetForm = {
  id: string;
  indicator: string;
  baseline: string;
  target: string;
  actual: string;
  unit: string;
  remarks: string;
};

const QUARTERS: GaaBurQuarter[] = [1, 2, 3, 4];

function physicalTargetToForm(row: GaaBurPhysicalTarget): PhysicalTargetForm {
  return {
    id: row.id,
    indicator: row.indicator,
    baseline: row.baseline ? String(row.baseline) : '',
    target: row.target ? String(row.target) : '',
    actual: row.actual ? String(row.actual) : '',
    unit: row.unit,
    remarks: row.remarks,
  };
}

function physicalTargetToModel(row: PhysicalTargetForm): GaaBurPhysicalTarget {
  return {
    id: row.id,
    indicator: row.indicator.trim(),
    baseline: toFiniteNumber(row.baseline),
    target: toFiniteNumber(row.target),
    actual: toFiniteNumber(row.actual),
    unit: row.unit.trim(),
    remarks: row.remarks.trim(),
  };
}

function createQuarterForms(): Record<GaaBurQuarter, QuarterForm> {
  return {
    1: { allotments: '', obligations: '', disbursements: '', remarks: '' },
    2: { allotments: '', obligations: '', disbursements: '', remarks: '' },
    3: { allotments: '', obligations: '', disbursements: '', remarks: '' },
    4: { allotments: '', obligations: '', disbursements: '', remarks: '' },
  };
}

const attainmentBadgeClasses: Record<string, string> = {
  Met: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'On Track': 'border-blue-200 bg-blue-50 text-blue-700',
  'At Risk': 'border-amber-200 bg-amber-50 text-amber-700',
  'Not Met': 'border-red-200 bg-red-50 text-red-700',
};

const burBadgeClasses: Record<string, string> = {
  'On Target': 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Below Target': 'border-red-200 bg-red-50 text-red-700',
};

function AttainmentBadge({ rate }: { rate: number }) {
  const status = getAttainmentStatus(rate);
  return (
    <Badge variant="outline" className={cn('font-medium', attainmentBadgeClasses[status])}>
      {status}
    </Badge>
  );
}

function BurStatusBadge({ actual, target }: { actual: number; target: number }) {
  const status = getBurStatus(actual, target);
  return (
    <Badge variant="outline" className={cn('font-medium', burBadgeClasses[status])}>
      {status}
    </Badge>
  );
}

export function GaaBurMonitoring() {
  const firestore = useFirestore();
  const { user, userProfile, isAdmin, isUserLoading, can } = useUser();
  const { selectedYear, setSelectedYear } = useYear();
  const { toast } = useToast();

  const isIpdo = isIpdoProfile(userProfile?.role, userProfile?.unitName);
  const canView = isAdmin || isIpdo || can('gaa_bur.view');
  const canManageTargets = isAdmin || isIpdo || can('gaa_bur.manage');
  const canEnterActuals = isAdmin || isIpdo || can('gaa_bur.enter_actuals');

  const targetsRef = useMemoFirebase(
    () => (firestore && canView ? doc(firestore, 'gaaBurTargets', String(selectedYear)) : null),
    [firestore, canView, selectedYear],
  );
  const { data: targets, isLoading: targetsLoading } = useDoc<GaaBurTargets>(targetsRef);

  const reportsQuery = useMemoFirebase(
    () =>
      firestore && canView ? query(collection(firestore, 'gaaBurReports'), where('year', '==', selectedYear)) : null,
    [firestore, canView, selectedYear],
  );
  const { data: reports, isLoading: reportsLoading } = useCollection<GaaBurReport>(reportsQuery);

  const [financial, setFinancial] = useState<FinancialForm>({ ps: '', mooe: '', co: '' });
  const [burTargets, setBurTargets] = useState<BurTargetForm>({
    obligation: String(DEFAULT_BUR_TARGETS.obligation),
    disbursement: String(DEFAULT_BUR_TARGETS.disbursement),
  });
  const [physicalTargets, setPhysicalTargets] = useState<PhysicalTargetForm[]>([]);
  const [quarterForms, setQuarterForms] = useState<Record<GaaBurQuarter, QuarterForm>>(createQuarterForms());
  const [isSavingTargets, setIsSavingTargets] = useState(false);
  const [savingQuarter, setSavingQuarter] = useState<GaaBurQuarter | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const dirtyQuartersRef = useRef<Set<GaaBurQuarter>>(new Set());

  useEffect(() => {
    dirtyQuartersRef.current.clear();
    setQuarterForms(createQuarterForms());
  }, [selectedYear]);

  useEffect(() => {
    if (targetsLoading) return;

    setFinancial({
      ps: targets?.financial?.ps ? String(targets.financial.ps) : '',
      mooe: targets?.financial?.mooe ? String(targets.financial.mooe) : '',
      co: targets?.financial?.co ? String(targets.financial.co) : '',
    });
    setBurTargets({
      obligation: String(targets?.burTargets?.obligation ?? DEFAULT_BUR_TARGETS.obligation),
      disbursement: String(targets?.burTargets?.disbursement ?? DEFAULT_BUR_TARGETS.disbursement),
    });
    setPhysicalTargets((targets?.physicalTargets ?? []).map(physicalTargetToForm));
  }, [targets, targetsLoading]);

  useEffect(() => {
    if (reportsLoading) return;

    setQuarterForms((previous) => {
      const next = createQuarterForms();

      QUARTERS.forEach((quarter) => {
        if (dirtyQuartersRef.current.has(quarter)) {
          next[quarter] = previous[quarter];
        }
      });

      (reports ?? []).forEach((report) => {
        if (dirtyQuartersRef.current.has(report.quarter)) return;
        if (report.quarter >= 1 && report.quarter <= 4) {
          next[report.quarter] = {
            allotments: report.allotments ? String(report.allotments) : '',
            obligations: report.obligations ? String(report.obligations) : '',
            disbursements: report.disbursements ? String(report.disbursements) : '',
            remarks: report.remarks ?? '',
          };
        }
      });

      return next;
    });
  }, [reports, reportsLoading]);

  const parsedFinancial = useMemo<GaaBurFinancialTargets>(
    () => ({
      ps: toFiniteNumber(financial.ps),
      mooe: toFiniteNumber(financial.mooe),
      co: toFiniteNumber(financial.co),
    }),
    [financial],
  );

  const parsedBurTargets = useMemo(
    () => ({
      obligation: toFiniteNumber(burTargets.obligation),
      disbursement: toFiniteNumber(burTargets.disbursement),
    }),
    [burTargets],
  );

  const sortedReports = useMemo(() => [...(reports ?? [])].sort((a, b) => a.quarter - b.quarter), [reports]);
  const latestReport = useMemo(() => getLatestReport(sortedReports), [sortedReports]);
  const latestBur = useMemo(
    () => (latestReport ? computeReportBur(latestReport) : { obligation: 0, disbursement: 0 }),
    [latestReport],
  );

  const gaaTotal = getFinancialTotal(parsedFinancial);
  const latestAllotments = latestReport?.allotments ?? 0;
  const latestObligations = latestReport?.obligations ?? 0;
  const latestDisbursements = latestReport?.disbursements ?? 0;

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from(
      new Set([...Array.from({ length: 11 }, (_, index) => currentYear - 5 + index), selectedYear]),
    ).sort((a, b) => a - b);
  }, [selectedYear]);

  const isLoading = targetsLoading || reportsLoading;

  const addPhysicalTarget = () => {
    setPhysicalTargets((previous) => [
      ...previous,
      {
        id: `physical-${Date.now()}-${previous.length}`,
        indicator: '',
        baseline: '',
        target: '',
        actual: '',
        unit: '%',
        remarks: '',
      },
    ]);
  };

  const updatePhysicalTarget = <K extends keyof Omit<PhysicalTargetForm, 'id'>>(
    id: string,
    field: K,
    value: PhysicalTargetForm[K],
  ) => {
    setPhysicalTargets((previous) => previous.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const removePhysicalTarget = (id: string) => {
    setPhysicalTargets((previous) => previous.filter((row) => row.id !== id));
  };

  const updateQuarterForm = <K extends keyof QuarterForm>(quarter: GaaBurQuarter, field: K, value: QuarterForm[K]) => {
    dirtyQuartersRef.current.add(quarter);
    setQuarterForms((previous) => ({
      ...previous,
      [quarter]: {
        ...previous[quarter],
        [field]: value,
      },
    }));
  };

  const handleImportOpenChange = (open: boolean) => {
    if (open) {
      dirtyQuartersRef.current.clear();
    }
    setIsImportOpen(open);
  };

  const saveTargets = async () => {
    if (!firestore || !canManageTargets) return;

    if (
      parsedFinancial.ps < 0 ||
      parsedFinancial.mooe < 0 ||
      parsedFinancial.co < 0 ||
      parsedBurTargets.obligation < 0 ||
      parsedBurTargets.obligation > 100 ||
      parsedBurTargets.disbursement < 0 ||
      parsedBurTargets.disbursement > 100
    ) {
      toast({
        title: 'Invalid targets',
        description: 'Financial targets must be nonnegative. BUR targets must be between 0% and 100%.',
        variant: 'destructive',
      });
      return;
    }

    const cleanedPhysicalTargets = physicalTargets
      .filter(
        (row) =>
          row.indicator.trim() ||
          toFiniteNumber(row.baseline) > 0 ||
          toFiniteNumber(row.target) > 0 ||
          toFiniteNumber(row.actual) > 0,
      )
      .map(physicalTargetToModel);

    setIsSavingTargets(true);
    try {
      await setDoc(
        doc(firestore, 'gaaBurTargets', String(selectedYear)),
        {
          year: selectedYear,
          financial: parsedFinancial,
          burTargets: parsedBurTargets,
          physicalTargets: cleanedPhysicalTargets,
          updatedAt: serverTimestamp(),
          updatedBy: userProfile?.id || user?.uid || '',
        },
        { merge: true },
      );

      setPhysicalTargets(cleanedPhysicalTargets.map(physicalTargetToForm));
      toast({
        title: 'GAA targets saved',
        description: `Annual targets for ${selectedYear} have been updated.`,
      });
    } catch (error) {
      console.error('Failed to save GAA targets:', error);
      toast({
        title: 'Save failed',
        description: 'Could not save the GAA targets. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingTargets(false);
    }
  };

  const saveQuarterReport = async (quarter: GaaBurQuarter) => {
    if (!firestore || !canEnterActuals) return;

    const form = quarterForms[quarter];
    const allotments = toFiniteNumber(form.allotments);
    const obligations = toFiniteNumber(form.obligations);
    const disbursements = toFiniteNumber(form.disbursements);

    if (allotments < 0 || obligations < 0 || disbursements < 0) {
      toast({
        title: 'Invalid values',
        description: 'BUR amounts cannot be negative.',
        variant: 'destructive',
      });
      return;
    }

    if (allotments > 0 && obligations > allotments) {
      toast({
        title: 'Check obligations',
        description: 'Obligations cannot exceed allotments for the same period.',
        variant: 'destructive',
      });
      return;
    }

    if (obligations > 0 && disbursements > obligations) {
      toast({
        title: 'Check disbursements',
        description: 'Disbursements cannot exceed obligations for the same period.',
        variant: 'destructive',
      });
      return;
    }

    setSavingQuarter(quarter);
    try {
      await setDoc(
        doc(firestore, 'gaaBurReports', `${selectedYear}-Q${quarter}`),
        {
          year: selectedYear,
          quarter,
          allotments,
          obligations,
          disbursements,
          remarks: form.remarks.trim(),
          updatedAt: serverTimestamp(),
          updatedBy: userProfile?.id || user?.uid || '',
        },
        { merge: true },
      );

      dirtyQuartersRef.current.delete(quarter);
      toast({
        title: `Q${quarter} BUR saved`,
        description: `Cumulative BUR actuals for Q${quarter} ${selectedYear} have been updated.`,
      });
    } catch (error) {
      console.error('Failed to save BUR report:', error);
      toast({
        title: 'Save failed',
        description: `Could not save the Q${quarter} BUR report. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setSavingQuarter(null);
    }
  };

  if (isUserLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GAA & BUR Monitoring</CardTitle>
          <CardDescription>You do not have permission to view this module.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">GAA & BUR Monitoring</h1>
          <p className="text-muted-foreground">
            University-wide annual GAA targets, physical performance, and budget utilization.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManageTargets && (
            <Button variant="outline" onClick={() => handleImportOpenChange(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Excel
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total GAA Target"
          value={formatPeso(gaaTotal)}
          description={`PS ${formatPeso(parsedFinancial.ps)} · MOOE ${formatPeso(parsedFinancial.mooe)} · CO ${formatPeso(parsedFinancial.co)}`}
          icon={<Banknote className="h-4 w-4" />}
        />
        <SummaryCard
          title="Latest Allotments"
          value={formatPeso(latestAllotments)}
          description={latestReport ? `As of Q${latestReport.quarter}` : 'No BUR report yet'}
          icon={<Wallet className="h-4 w-4" />}
        />
        <SummaryCard
          title="Obligations"
          value={formatPeso(latestObligations)}
          description={`${formatPercent(latestBur.obligation)} obligation BUR`}
          icon={<CalendarRange className="h-4 w-4" />}
        />
        <SummaryCard
          title="Disbursements"
          value={formatPeso(latestDisbursements)}
          description={`${formatPercent(latestBur.disbursement)} disbursement BUR`}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      <Tabs defaultValue="targets" className="space-y-4">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="targets">GAA Targets &amp; Performance</TabsTrigger>
          <TabsTrigger value="bur">BUR Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="targets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Targets</CardTitle>
              <CardDescription>
                Annual GAA financial targets by expense class. BUR targets are applied to the latest available
                cumulative report.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="gaa-ps">Personnel Services (PS)</Label>
                  <Input
                    id="gaa-ps"
                    type="number"
                    min="0"
                    step="0.01"
                    value={financial.ps}
                    onChange={(event) => setFinancial((previous) => ({ ...previous, ps: event.target.value }))}
                    disabled={!canManageTargets}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gaa-mooe">MOOE</Label>
                  <Input
                    id="gaa-mooe"
                    type="number"
                    min="0"
                    step="0.01"
                    value={financial.mooe}
                    onChange={(event) => setFinancial((previous) => ({ ...previous, mooe: event.target.value }))}
                    disabled={!canManageTargets}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gaa-co">Capital Outlay (CO)</Label>
                  <Input
                    id="gaa-co"
                    type="number"
                    min="0"
                    step="0.01"
                    value={financial.co}
                    onChange={(event) => setFinancial((previous) => ({ ...previous, co: event.target.value }))}
                    disabled={!canManageTargets}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="bur-obligation">Obligation BUR Target (%)</Label>
                  <Input
                    id="bur-obligation"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={burTargets.obligation}
                    onChange={(event) =>
                      setBurTargets((previous) => ({
                        ...previous,
                        obligation: event.target.value,
                      }))
                    }
                    disabled={!canManageTargets}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bur-disbursement">Disbursement BUR Target (%)</Label>
                  <Input
                    id="bur-disbursement"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={burTargets.disbursement}
                    onChange={(event) =>
                      setBurTargets((previous) => ({
                        ...previous,
                        disbursement: event.target.value,
                      }))
                    }
                    disabled={!canManageTargets}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total GAA Target</Label>
                  <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-semibold">
                    {formatPeso(gaaTotal)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Physical Targets &amp; Performance</CardTitle>
                <CardDescription>
                  Track annual physical targets against actual performance. Attainment is actual divided by target.
                </CardDescription>
              </div>
              {canManageTargets && (
                <Button variant="outline" size="sm" onClick={addPhysicalTarget}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Target
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {physicalTargets.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No physical targets yet. Add a target or import the Excel template.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[220px]">Indicator</TableHead>
                        <TableHead className="min-w-[100px]">Baseline</TableHead>
                        <TableHead className="min-w-[100px]">Annual Target</TableHead>
                        <TableHead className="min-w-[100px]">Actual</TableHead>
                        <TableHead className="min-w-[90px]">Unit</TableHead>
                        <TableHead className="min-w-[110px]">Attainment</TableHead>
                        <TableHead className="min-w-[110px]">Status</TableHead>
                        <TableHead className="min-w-[180px]">Remarks</TableHead>
                        <TableHead className="w-[50px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {physicalTargets.map((row) => {
                        const rate = getAttainment(toFiniteNumber(row.actual), toFiniteNumber(row.target));
                        return (
                          <TableRow key={row.id}>
                            <TableCell>
                              <Input
                                value={row.indicator}
                                onChange={(event) => updatePhysicalTarget(row.id, 'indicator', event.target.value)}
                                disabled={!canManageTargets}
                                placeholder="Indicator"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={row.baseline}
                                onChange={(event) => updatePhysicalTarget(row.id, 'baseline', event.target.value)}
                                disabled={!canManageTargets}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={row.target}
                                onChange={(event) => updatePhysicalTarget(row.id, 'target', event.target.value)}
                                disabled={!canManageTargets}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={row.actual}
                                onChange={(event) => updatePhysicalTarget(row.id, 'actual', event.target.value)}
                                disabled={!canManageTargets}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={row.unit}
                                onChange={(event) => updatePhysicalTarget(row.id, 'unit', event.target.value)}
                                disabled={!canManageTargets}
                                placeholder="%"
                              />
                            </TableCell>
                            <TableCell className="font-medium">{formatPercent(rate)}</TableCell>
                            <TableCell>
                              <AttainmentBadge rate={rate} />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={row.remarks}
                                onChange={(event) => updatePhysicalTarget(row.id, 'remarks', event.target.value)}
                                disabled={!canManageTargets}
                                placeholder="Optional"
                              />
                            </TableCell>
                            <TableCell>
                              {canManageTargets && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removePhysicalTarget(row.id)}
                                  aria-label="Remove target"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {canManageTargets && (
                <div className="mt-4 flex justify-end">
                  <Button onClick={saveTargets} disabled={isSavingTargets}>
                    {isSavingTargets ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save GAA Targets
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bur" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Annual BUR Targets vs Performance</CardTitle>
              <CardDescription>
                Performance is based on the latest cumulative quarterly report
                {latestReport ? ` (Q${latestReport.quarter})` : ''}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Annual Target</TableHead>
                    <TableHead>Latest Actual</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Obligation BUR</TableCell>
                    <TableCell>{formatPercent(parsedBurTargets.obligation)}</TableCell>
                    <TableCell>{formatPercent(latestBur.obligation)}</TableCell>
                    <TableCell>{formatPercent(latestBur.obligation - parsedBurTargets.obligation)}</TableCell>
                    <TableCell>
                      <BurStatusBadge actual={latestBur.obligation} target={parsedBurTargets.obligation} />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Disbursement BUR</TableCell>
                    <TableCell>{formatPercent(parsedBurTargets.disbursement)}</TableCell>
                    <TableCell>{formatPercent(latestBur.disbursement)}</TableCell>
                    <TableCell>{formatPercent(latestBur.disbursement - parsedBurTargets.disbursement)}</TableCell>
                    <TableCell>
                      <BurStatusBadge actual={latestBur.disbursement} target={parsedBurTargets.disbursement} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quarterly BUR Reports</CardTitle>
              <CardDescription>
                Enter cumulative year-to-date allotments, obligations, and disbursements for each quarter. BUR is
                computed automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70px]">Quarter</TableHead>
                      <TableHead className="min-w-[150px]">Allotments</TableHead>
                      <TableHead className="min-w-[150px]">Obligations</TableHead>
                      <TableHead className="min-w-[150px]">Disbursements</TableHead>
                      <TableHead className="min-w-[110px]">Obligation BUR</TableHead>
                      <TableHead className="min-w-[110px]">Disbursement BUR</TableHead>
                      <TableHead className="min-w-[180px]">Remarks</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {QUARTERS.map((quarter) => {
                      const form = quarterForms[quarter];
                      const computed = computeBur(
                        toFiniteNumber(form.allotments),
                        toFiniteNumber(form.obligations),
                        toFiniteNumber(form.disbursements),
                      );

                      return (
                        <TableRow key={quarter}>
                          <TableCell className="font-semibold">Q{quarter}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={form.allotments}
                              onChange={(event) => updateQuarterForm(quarter, 'allotments', event.target.value)}
                              disabled={!canEnterActuals}
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={form.obligations}
                              onChange={(event) => updateQuarterForm(quarter, 'obligations', event.target.value)}
                              disabled={!canEnterActuals}
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={form.disbursements}
                              onChange={(event) => updateQuarterForm(quarter, 'disbursements', event.target.value)}
                              disabled={!canEnterActuals}
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{formatPercent(computed.obligation)}</TableCell>
                          <TableCell className="font-medium">{formatPercent(computed.disbursement)}</TableCell>
                          <TableCell>
                            <Input
                              value={form.remarks}
                              onChange={(event) => updateQuarterForm(quarter, 'remarks', event.target.value)}
                              disabled={!canEnterActuals}
                              placeholder="Optional"
                            />
                          </TableCell>
                          <TableCell>
                            {canEnterActuals && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => saveQuarterReport(quarter)}
                                disabled={savingQuarter === quarter}
                              >
                                {savingQuarter === quarter ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                                <span className="sr-only">Save Q{quarter}</span>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>BUR Trend</CardTitle>
              <CardDescription>Computed utilization rates from saved quarterly reports.</CardDescription>
            </CardHeader>
            <CardContent>
              {sortedReports.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No BUR reports saved yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quarter</TableHead>
                      <TableHead>Allotments</TableHead>
                      <TableHead>Obligations</TableHead>
                      <TableHead>Disbursements</TableHead>
                      <TableHead>Obligation BUR</TableHead>
                      <TableHead>Disbursement BUR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedReports.map((report) => {
                      const computed = computeReportBur(report);
                      return (
                        <TableRow key={report.id ?? report.quarter}>
                          <TableCell className="font-semibold">Q{report.quarter}</TableCell>
                          <TableCell>{formatPeso(report.allotments)}</TableCell>
                          <TableCell>{formatPeso(report.obligations)}</TableCell>
                          <TableCell>{formatPeso(report.disbursements)}</TableCell>
                          <TableCell className="font-medium">{formatPercent(computed.obligation)}</TableCell>
                          <TableCell className="font-medium">{formatPercent(computed.disbursement)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <GaaBurImportDialog open={isImportOpen} onOpenChange={handleImportOpenChange} year={selectedYear} />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col items-center space-y-1 pb-2 text-center">
        <div className="text-muted-foreground">{icon}</div>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <div className="text-xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
