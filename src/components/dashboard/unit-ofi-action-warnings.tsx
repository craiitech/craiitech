'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { AuditFinding, AuditPlan, AuditSchedule, EqaOfiMonitoring, IqaOfiActionUpdate } from '@/lib/types';
import { collection } from '@/firebase/firestore-wrapper';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, ClipboardList } from 'lucide-react';
import { buildUnitEqaOfiWarnings, buildUnitIqaOfiWarnings, type UnitOfiActionWarning } from './unit-ofi-warnings-data';

interface UnitOfiActionWarningsProps {
  schedules: AuditSchedule[] | null;
  findings: AuditFinding[] | null;
  plans: AuditPlan[] | null;
  isLoading?: boolean;
}

function OfiWarningAlert({
  title,
  description,
  items,
  actionHref,
  actionLabel,
  icon,
}: {
  title: string;
  description: string;
  items: UnitOfiActionWarning[];
  actionHref: string;
  actionLabel: string;
  icon: React.ReactNode;
}) {
  return (
    <Alert className="relative overflow-hidden animate-warning-banner border-amber-300 bg-amber-50/80 shadow-sm [&>svg]:text-amber-600">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 animate-warning-stripes opacity-40" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent animate-warning-shimmer"
      />
      {icon}
      <AlertTitle className="relative z-10 font-black uppercase tracking-tight text-amber-900">{title}</AlertTitle>
      <AlertDescription className="relative z-10 space-y-3">
        <p className="text-xs font-medium text-amber-900/80">{description}</p>
        <ul className="space-y-1.5">
          {items.slice(0, 3).map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2 rounded-lg border border-amber-200/80 bg-white/70 px-3 py-2 text-[10px] font-semibold text-slate-700"
            >
              <span className="mt-0.5 shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-800">
                {item.source}
                {item.year ? ` ${item.year}` : ''}
              </span>
              <span className="line-clamp-2 flex-1">{item.statement}</span>
              <span className="shrink-0 text-[8px] font-black uppercase tracking-wider text-amber-700">
                {item.status}
              </span>
            </li>
          ))}
        </ul>
        {items.length > 3 && (
          <p className="text-[10px] font-bold text-amber-800">+{items.length - 3} more OFI(s) awaiting action.</p>
        )}
        <Button
          asChild
          size="sm"
          className="h-8 bg-amber-600 px-4 text-[10px] font-black uppercase tracking-widest text-white hover:bg-amber-700"
        >
          <Link href={actionHref} className="flex items-center gap-2">
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function UnitOfiActionWarnings({ schedules, findings, plans, isLoading = false }: UnitOfiActionWarningsProps) {
  const { userProfile } = useUser();
  const firestore = useFirestore();
  const unitId = userProfile?.unitId || '';

  const actionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'iqaOfiActions') : null), [firestore]);
  const eqaOfisQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'eqaOfiMonitoring') : null),
    [firestore],
  );

  const { data: actionUpdates, isLoading: isLoadingActions } = useCollection<IqaOfiActionUpdate>(actionsQuery);
  const { data: eqaOfis, isLoading: isLoadingEqaOfis } = useCollection<EqaOfiMonitoring>(eqaOfisQuery);

  const iqaWarnings = useMemo(
    () =>
      buildUnitIqaOfiWarnings({
        unitId,
        schedules: schedules || [],
        findings: findings || [],
        plans: plans || [],
        actionUpdates: actionUpdates || [],
      }),
    [unitId, schedules, findings, plans, actionUpdates],
  );

  const eqaWarnings = useMemo(() => buildUnitEqaOfiWarnings({ unitId, eqaOfis: eqaOfis || [] }), [unitId, eqaOfis]);

  if (isLoading || isLoadingActions || isLoadingEqaOfis) return null;
  if (!iqaWarnings.length && !eqaWarnings.length) return null;

  return (
    <div className="space-y-3">
      {iqaWarnings.length > 0 && (
        <OfiWarningAlert
          title="Internal OFI Action Entry Required"
          description={`You have ${iqaWarnings.length} internal IQA OFI(s) that still need your unit's action taken and MOV documentation.`}
          items={iqaWarnings}
          actionHref="/qa-reports?tab=iqa&subtab=ofi"
          actionLabel="Enter IQA OFI Action"
          icon={<AlertTriangle className="h-5 w-5 animate-pulse" />}
        />
      )}
      {eqaWarnings.length > 0 && (
        <OfiWarningAlert
          title="External OFI Action Entry Required"
          description={`You have ${eqaWarnings.length} external EQA OFI(s) assigned to your unit that are still open and need action updates or evidence.`}
          items={eqaWarnings}
          actionHref="/qa-reports?tab=eqa&subtab=ofi"
          actionLabel="Enter EQA OFI Action"
          icon={<ClipboardList className="h-5 w-5 animate-pulse" />}
        />
      )}
    </div>
  );
}
