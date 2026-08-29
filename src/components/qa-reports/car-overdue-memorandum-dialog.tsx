'use client';

import React, { useMemo, useState } from 'react';
import type { CorrectiveActionRequest, Unit, Campus, Signatories } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Printer,
  Send,
  Download,
  AlertTriangle,
  Building2,
  Clock,
  Check,
  Copy,
  Calendar,
  Sparkles,
  Loader2,
  ListFilter,
  FileCheck2,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/use-notifications';
import { useFirestore, useUser } from '@/firebase/provider';
import { doc, updateDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import { renderToStaticMarkup } from 'react-dom/server';
import { CAROverdueMemorandumTemplate, type OverdueUnitGroup } from './car-overdue-memorandum-template';
import { getNextCarActionInfo, parseCarDate } from '@/lib/car-utils';
import { cn } from '@/lib/utils';

interface CAROverdueMemorandumDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cars: CorrectiveActionRequest[];
  units: Unit[];
  campuses: Campus[];
  signatories?: Signatories;
  year?: number;
  selectedUnitId?: string;
  selectedCarId?: string;
}

export function CAROverdueMemorandumDialog({
  isOpen,
  onOpenChange,
  cars,
  units,
  campuses,
  signatories,
  year = new Date().getFullYear(),
  selectedUnitId,
  selectedCarId,
}: CAROverdueMemorandumDialogProps) {
  const { toast } = useToast();
  const { triggerLocalNotification } = useNotifications();
  const firestore = useFirestore();
  const { userProfile, isAdmin } = useUser();

  // Filter and Targeting Controls
  const [targetScope, setTargetScope] = useState<'all' | 'unit' | 'car'>(
    selectedCarId ? 'car' : selectedUnitId ? 'unit' : 'all',
  );
  const [batchMode, setBatchMode] = useState<'consolidated' | 'individual'>('consolidated');
  const [activeUnitFilter, setActiveUnitFilter] = useState<string>(selectedUnitId || 'all');
  const [activeCarFilter, setActiveCarFilter] = useState<string>(selectedCarId || 'all');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [auditTypeFilter, setAuditTypeFilter] = useState<string>('all');

  const [memoRefNo, setMemoRefNo] = useState<string>(`${year}-${format(new Date(), 'MMdd')}`);
  const [memoDate, setMemoDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(5);
  const [customDirective, setCustomDirective] = useState<string>(
    'Accountable Unit Heads are directed to convene their QMS teams, finalize the root cause statements, and upload committed action plans into the RSU EOMS Submission Portal without further delay.',
  );
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [isNotifying, setIsNotifying] = useState<boolean>(false);
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);
  const campusMap = useMemo(() => new Map(campuses.map((c) => [c.id, c.name])), [campuses]);

  // Compute all overdue CAR items across the dataset
  const overdueItems = useMemo(() => {
    const today = new Date();

    return (cars || [])
      .filter((car) => {
        if (car.status === 'Closed') return false;

        // Campus filter
        if (campusFilter !== 'all' && car.campusId !== campusFilter) return false;

        // Audit type filter
        if (auditTypeFilter !== 'all' && car.auditType !== auditTypeFilter) return false;

        const info = getNextCarActionInfo(car);
        // We consider it overdue if urgency is overdue or if timeLimitForReply is in the past and unreplied
        if (info.urgency === 'overdue') return true;

        const replyDeadline = parseCarDate(car.timeLimitForReply);
        if (
          replyDeadline &&
          replyDeadline < today &&
          (car.status === 'Open' || car.status === 'Awaiting Response/Update')
        ) {
          return true;
        }

        return false;
      })
      .map((car) => {
        const info = getNextCarActionInfo(car);
        const replyDeadline = parseCarDate(car.timeLimitForReply);
        let daysOverdue = 0;

        if (replyDeadline) {
          const diffMs = today.getTime() - replyDeadline.getTime();
          daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }

        return {
          car,
          daysOverdue,
          deadlineStr:
            info.formattedDate !== '--'
              ? info.formattedDate
              : replyDeadline
                ? format(replyDeadline, 'MMM dd, yyyy')
                : 'Past Due',
          actionLabel: info.actionLabel,
        };
      });
  }, [cars, campusFilter, auditTypeFilter]);

  // Group overdue items by Unit
  const overdueUnitGroups = useMemo<OverdueUnitGroup[]>(() => {
    const map = new Map<string, OverdueUnitGroup>();

    overdueItems.forEach((item) => {
      const uId = item.car.unitId || 'unknown';
      const uName = unitMap.get(uId) || 'Unknown Unit';
      const cId = item.car.campusId || 'institutional';
      const cName = campusMap.get(cId) || 'Institutional';

      if (!map.has(uId)) {
        map.set(uId, {
          unitId: uId,
          unitName: uName,
          campusId: cId,
          campusName: cName,
          unitHead: item.car.unitHead,
          supervisingUnitName: item.car.concerningTopManagementName,
          overdueCars: [],
        });
      }

      map.get(uId)!.overdueCars.push(item);
    });

    return Array.from(map.values());
  }, [overdueItems, unitMap, campusMap]);

  // Filter unit groups according to target scope
  const targetUnitGroups = useMemo<OverdueUnitGroup[]>(() => {
    if (targetScope === 'car' && activeCarFilter !== 'all') {
      const singleItem = overdueItems.find((i) => i.car.id === activeCarFilter);
      if (!singleItem) return [];

      const uId = singleItem.car.unitId;
      return [
        {
          unitId: uId,
          unitName: unitMap.get(uId) || 'Unknown Unit',
          campusId: singleItem.car.campusId,
          campusName: campusMap.get(singleItem.car.campusId) || 'Institutional',
          unitHead: singleItem.car.unitHead,
          supervisingUnitName: singleItem.car.concerningTopManagementName,
          overdueCars: [singleItem],
        },
      ];
    }

    if (targetScope === 'unit' && activeUnitFilter !== 'all') {
      return overdueUnitGroups.filter((g) => g.unitId === activeUnitFilter);
    }

    return overdueUnitGroups;
  }, [targetScope, activeUnitFilter, activeCarFilter, overdueUnitGroups, overdueItems, unitMap, campusMap]);

  const activeGroup = targetUnitGroups[activePreviewIndex] || targetUnitGroups[0];
  const isConsolidatedBatch = targetScope === 'all' && batchMode === 'consolidated';

  // Print function
  const handlePrintMemorandum = () => {
    if (targetUnitGroups.length === 0) return;

    try {
      const markup = renderToStaticMarkup(
        <div>
          {isConsolidatedBatch ? (
            <CAROverdueMemorandumTemplate
              allUnitGroups={targetUnitGroups}
              isBatchConsolidated={true}
              memoRefNo={memoRefNo}
              memoDate={memoDate}
              gracePeriodDays={gracePeriodDays}
              customDirective={customDirective}
              signatories={signatories}
              year={year}
            />
          ) : (
            targetUnitGroups.map((group, idx) => (
              <div
                key={group.unitId || idx}
                style={{
                  pageBreakBefore: idx > 0 ? 'always' : 'auto',
                  marginBottom: idx < targetUnitGroups.length - 1 ? '40px' : '0',
                }}
              >
                <CAROverdueMemorandumTemplate
                  unitGroup={group}
                  memoRefNo={memoRefNo}
                  memoDate={memoDate}
                  gracePeriodDays={gracePeriodDays}
                  customDirective={customDirective}
                  signatories={signatories}
                  year={year}
                />
              </div>
            ))
          )}
        </div>,
      );

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(
          `<html><head><title>QA Memorandum - Overdue CAR Responses (${memoRefNo})</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@page { size: 8.5in 11in !important; margin: 0.6in !important; } @media print { body { margin: 0 !important; padding: 0 !important; background: white; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } } body { font-family: ui-sans-serif, system-ui, sans-serif; background: #f9fafb; padding: 30px; color: black; }</style></head><body><div class="no-print mb-6 flex justify-center"><button onclick="window.print()" class="bg-indigo-600 text-white px-8 py-3 rounded shadow-xl hover:bg-indigo-700 font-sans font-black uppercase text-xs tracking-widest transition-all">Click to Print Memorandum (${targetUnitGroups.length} Unit${targetUnitGroups.length > 1 ? 's' : ''})</button></div><div id="print-content">${markup}</div></body></html>`,
        );
        printWindow.document.close();
      }
    } catch (err) {
      console.error('Print generation error:', err);
      toast({
        title: 'Print Error',
        description: 'Unable to open print preview. Please verify popup blocker permissions.',
        variant: 'destructive',
      });
    }
  };

  // Dispatch formal notification
  const handleDispatchNotification = async () => {
    if (!firestore) return;
    setIsNotifying(true);

    try {
      const senderName = userProfile
        ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || userProfile.email
        : 'Quality Assurance Office';

      let notifiedCount = 0;

      for (const group of targetUnitGroups) {
        for (const item of group.overdueCars) {
          const carRef = doc(firestore, 'correctiveActionRequests', item.car.id);
          await updateDoc(carRef, {
            lastNotifiedAt: serverTimestamp(),
            lastNotifiedBy: senderName,
            lastMemorandumRef: memoRefNo,
          });
          notifiedCount++;
        }

        triggerLocalNotification(`[OFFICIAL MEMO: CAR NOTICE] ${group.unitName}`, {
          body: `Official Memorandum (${memoRefNo}) issued for ${group.overdueCars.length} overdue CAR response(s). Compliance deadline: ${gracePeriodDays} days.`,
          category: 'car',
          link: `/qa-reports?tab=car`,
        });
      }

      toast({
        title: 'Memorandum Dispatched Successfully!',
        description: `Official CAR response reminder memorandum issued to ${targetUnitGroups.length} unit(s) (${notifiedCount} CAR records updated).`,
      });
    } catch (err: any) {
      console.error('Error dispatching memorandum notifications:', err);
      toast({
        title: 'Dispatch Failed',
        description: err?.message || 'Could not dispatch notifications.',
        variant: 'destructive',
      });
    } finally {
      setIsNotifying(false);
    }
  };

  // Copy plain text memo
  const handleCopyMemoText = () => {
    if (targetUnitGroups.length === 0) return;

    const recipients = isConsolidatedBatch
      ? targetUnitGroups.map((g) => g.unitName.toUpperCase()).join('\n')
      : activeGroup?.unitName.toUpperCase() || 'ALL UNITS';

    const carsList = isConsolidatedBatch
      ? targetUnitGroups
          .flatMap((g) =>
            g.overdueCars.map(
              (c, i) =>
                `• [${g.unitName}] CAR No: ${c.car.carNumber} | Procedure: ${c.car.procedureTitle || 'General'} | Deadline: ${c.deadlineStr} (${c.daysOverdue} days past due)`,
            ),
          )
          .join('\n')
      : activeGroup?.overdueCars
          .map(
            (c, i) =>
              `${i + 1}. CAR No: ${c.car.carNumber} | Procedure: ${c.car.procedureTitle || 'General'} | Deadline: ${c.deadlineStr} (${c.daysOverdue} days past due)`,
          )
          .join('\n');

    const text = `
QA Memorandum
${memoRefNo}

TO          :   ${recipients}
                This University

FROM        :   ${signatories?.qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)'}
                Head, Quality Management System (QMS)

SUBJECT     :   COMPLIANCE DIRECTIVE: IMMEDIATE SUBMISSION OF ROOT CAUSE ANALYSIS AND CORRECTIVE ACTION PLAN FOR OVERDUE CORRECTIVE ACTION REQUESTS (CAR)

DATE        :   ${format(new Date(memoDate), 'MMMM d, yyyy').toUpperCase()}

--------------------------------------------------------------------------------

In line with the mandatory requirements of ISO 21001:2018 Clause 10.2, ISO 9001:2015 Clause 10.2, and the Romblon State University Educational Organizations Management System (RSU-EOMS) Manual, all accountable academic and administrative units are directed to immediately submit their official Root Cause Analysis (RCA) and Corrective Action Plan (CAP) for nonconformities identified during quality audits.

Please be informed that records in the RSU EOMS Submission Portal indicate that statutory reply deadlines have elapsed without submission of an approved action plan.

ATTACHMENT A: SCHEDULE OF OVERDUE CORRECTIVE ACTION REQUESTS (CAR)
${carsList}

INSTRUCTIONS TO RESPOND IN RSU EOMS SUBMISSION PORTAL:
1. Log in to the RSU EOMS Submission Portal (QA Reports > CAR Registry).
2. Locate your assigned CAR and click "Take Action".
3. Fill in Section B (Root Cause Analysis using 5-Whys or Fishbone).
4. Specify immediate containment and long-term corrective action steps with realistic completion dates.
5. Click "Submit Unit Response".

STRICT COMPLIANCE DEADLINE: ${gracePeriodDays} working days from receipt of this notice.

For your strict compliance and guidance.

Issued by:
${signatories?.qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)'}
Head, Quality Management System (QMS)

Noted by:
${signatories?.qaoDirector || 'SARAH JANE F. FALLARIA'}
Director, Quality Assurance Office
    `.trim();

    navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2500);

    toast({
      title: 'Memorandum Copied to Clipboard',
      description: 'Official notice text copied and ready for email or distribution.',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50 dark:bg-slate-900">
        {/* DIALOG HEADER */}
        <DialogHeader className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-primary/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/20 border border-primary/30 text-indigo-300 shadow-inner">
                <FileText className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  QA Memorandum Generator
                  <Badge
                    variant="outline"
                    className="bg-rose-500/20 text-rose-300 border-rose-400/40 text-[10px] font-black uppercase"
                  >
                    Overdue CAR Compliance
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 font-medium mt-0.5">
                  Generate official QAO Memorandum with attached schedule of overdue issues, step-by-step submission
                  instructions, and legal directives.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/10 text-white text-xs font-black px-2.5 py-1">
                {overdueItems.length} Overdue Issue{overdueItems.length !== 1 ? 's' : ''} Identified
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* DIALOG BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TOP CONTROLS & SCOPE SELECTOR */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-500">Memorandum Scope</Label>
              <Select value={targetScope} onValueChange={(v: any) => setTargetScope(v)}>
                <SelectTrigger className="h-9 text-xs font-bold">
                  <SelectValue placeholder="Select Scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-bold">
                    All Overdue Units (Batch — {overdueUnitGroups.length} Units)
                  </SelectItem>
                  <SelectItem value="unit" className="text-xs font-bold">
                    Target Specific Unit
                  </SelectItem>
                  <SelectItem value="car" className="text-xs font-bold">
                    Target Specific CAR
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetScope === 'all' && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-500">Batch Format</Label>
                <Select value={batchMode} onValueChange={(v: any) => setBatchMode(v)}>
                  <SelectTrigger className="h-9 text-xs font-bold">
                    <SelectValue placeholder="Batch Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consolidated" className="text-xs font-bold">
                      Master Memorandum (Single List + All Issues)
                    </SelectItem>
                    <SelectItem value="individual" className="text-xs font-bold">
                      Individual Notices (Separate Sheet per Unit)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {targetScope === 'unit' && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-500">Select Unit</Label>
                <Select value={activeUnitFilter} onValueChange={setActiveUnitFilter}>
                  <SelectTrigger className="h-9 text-xs font-bold">
                    <SelectValue placeholder="Select Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All Overdue Units ({overdueUnitGroups.length})
                    </SelectItem>
                    {overdueUnitGroups.map((g) => (
                      <SelectItem key={g.unitId} value={g.unitId} className="text-xs font-medium">
                        {g.unitName} ({g.overdueCars.length} CARs)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {targetScope === 'car' && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-500">Select CAR</Label>
                <Select value={activeCarFilter} onValueChange={setActiveCarFilter}>
                  <SelectTrigger className="h-9 text-xs font-bold">
                    <SelectValue placeholder="Select CAR" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      All Overdue CARs ({overdueItems.length})
                    </SelectItem>
                    {overdueItems.map((item) => (
                      <SelectItem key={item.car.id} value={item.car.id} className="text-xs font-medium">
                        {item.car.carNumber} — {unitMap.get(item.car.unitId) || 'Unit'} ({item.daysOverdue}d Overdue)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-500">Filter by Campus</Label>
              <Select value={campusFilter} onValueChange={setCampusFilter}>
                <SelectTrigger className="h-9 text-xs font-bold">
                  <SelectValue placeholder="All Campuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All Campuses
                  </SelectItem>
                  {campuses.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-500">Audit Type</Label>
              <Select value={auditTypeFilter} onValueChange={setAuditTypeFilter}>
                <SelectTrigger className="h-9 text-xs font-bold">
                  <SelectValue placeholder="All Audit Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-bold">
                    All Audit Types (IQA &amp; EQA)
                  </SelectItem>
                  <SelectItem value="IQA" className="text-xs">
                    Internal Quality Audit (IQA) Only
                  </SelectItem>
                  <SelectItem value="EQA" className="text-xs">
                    External Quality Audit (EQA) Only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* MEMORANDUM PARAMETER CUSTOMIZATION */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-500">Memo Reference Number</Label>
              <Input
                value={memoRefNo}
                onChange={(e) => setMemoRefNo(e.target.value)}
                placeholder="2026-007"
                className="h-9 font-mono text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-500">Issuance Date</Label>
              <Input
                type="date"
                value={memoDate}
                onChange={(e) => setMemoDate(e.target.value)}
                className="h-9 text-xs font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-500">Compliance Grace Period</Label>
              <Select value={gracePeriodDays.toString()} onValueChange={(v) => setGracePeriodDays(parseInt(v, 10))}>
                <SelectTrigger className="h-9 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3" className="text-xs">
                    3 Working Days (Urgent)
                  </SelectItem>
                  <SelectItem value="5" className="text-xs font-bold">
                    5 Working Days (Standard)
                  </SelectItem>
                  <SelectItem value="7" className="text-xs">
                    7 Working Days
                  </SelectItem>
                  <SelectItem value="10" className="text-xs">
                    10 Working Days
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3 space-y-1.5 pt-2 border-t">
              <Label className="text-[10px] font-black uppercase text-slate-500">
                Additional Administrative Directive / Special Instruction (Optional)
              </Label>
              <Textarea
                rows={2}
                value={customDirective}
                onChange={(e) => setCustomDirective(e.target.value)}
                placeholder="Enter specific instruction or administrative remark..."
                className="text-xs leading-relaxed"
              />
            </div>
          </div>

          {/* RECIPIENT PREVIEW SELECTOR (FOR INDIVIDUAL NOTICES) */}
          {targetUnitGroups.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-xl border border-dashed text-muted-foreground">
              <AlertTriangle className="h-10 w-10 mx-auto text-amber-500 mb-2 opacity-60" />
              <h3 className="text-sm font-black uppercase tracking-wide">No Overdue CAR Responses Found</h3>
              <p className="text-xs mt-1">
                There are currently no overdue CAR responses matching the selected filters.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {!isConsolidatedBatch && targetUnitGroups.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 shrink-0 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> Unit Notice:
                  </span>
                  {targetUnitGroups.map((g, idx) => (
                    <Button
                      key={g.unitId || idx}
                      size="sm"
                      variant={activePreviewIndex === idx ? 'default' : 'outline'}
                      onClick={() => setActivePreviewIndex(idx)}
                      className="h-7 text-[10px] font-bold shrink-0"
                    >
                      {g.unitName} ({g.overdueCars.length})
                    </Button>
                  ))}
                </div>
              )}

              {/* LIVE MEMORANDUM DOCUMENT PREVIEW */}
              <div className="border-2 border-slate-300 rounded-xl overflow-hidden shadow-md bg-white">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 border-b flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {isConsolidatedBatch
                      ? `Consolidated Master Memorandum Preview (${targetUnitGroups.length} Units, ${overdueItems.length} Issues)`
                      : `Printable Document Preview: ${activeGroup?.unitName} (${activeGroup?.campusName})`}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyMemoText}
                      className="h-7 text-[10px] font-bold gap-1"
                    >
                      {hasCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      {hasCopied ? 'Copied' : 'Copy Text'}
                    </Button>
                  </div>
                </div>

                <div className="p-4 sm:p-8 overflow-x-auto bg-slate-100/50 flex justify-center">
                  <div className="bg-white shadow-xl rounded-none border border-slate-200 w-full max-w-[8.5in]">
                    {isConsolidatedBatch ? (
                      <CAROverdueMemorandumTemplate
                        allUnitGroups={targetUnitGroups}
                        isBatchConsolidated={true}
                        memoRefNo={memoRefNo}
                        memoDate={memoDate}
                        gracePeriodDays={gracePeriodDays}
                        customDirective={customDirective}
                        signatories={signatories}
                        year={year}
                      />
                    ) : (
                      activeGroup && (
                        <CAROverdueMemorandumTemplate
                          unitGroup={activeGroup}
                          memoRefNo={memoRefNo}
                          memoDate={memoDate}
                          gracePeriodDays={gracePeriodDays}
                          customDirective={customDirective}
                          signatories={signatories}
                          year={year}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DIALOG FOOTER */}
        <DialogFooter className="p-4 bg-white dark:bg-slate-900 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <span>
              Targeting{' '}
              <strong>
                {targetUnitGroups.length} Unit{targetUnitGroups.length !== 1 ? 's' : ''}
              </strong>{' '}
              with{' '}
              <strong>
                {overdueItems.length} Overdue Issue{overdueItems.length !== 1 ? 's' : ''}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs font-bold">
              Close
            </Button>

            {isAdmin && targetUnitGroups.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={isNotifying}
                onClick={handleDispatchNotification}
                className="text-xs font-bold gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                {isNotifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Dispatch Digital Alerts ({targetUnitGroups.length})
              </Button>
            )}

            <Button
              size="sm"
              disabled={targetUnitGroups.length === 0}
              onClick={handlePrintMemorandum}
              className="text-xs font-black uppercase tracking-wider gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF ({targetUnitGroups.length})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
