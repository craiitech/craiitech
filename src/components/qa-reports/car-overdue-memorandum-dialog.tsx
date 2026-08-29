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
import { Checkbox } from '@/components/ui/checkbox';
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
  Activity,
  UserCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/use-notifications';
import { useFirestore, useUser } from '@/firebase/provider';
import { doc, updateDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CAROverdueMemorandumTemplate,
  type OverdueUnitGroup,
  type CommunicationType,
} from './car-overdue-memorandum-template';
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
  const [communicationType, setCommunicationType] = useState<CommunicationType>('QA Memorandum');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'ongoing' | 'for_action' | 'verification'>('all');
  const [paperSize, setPaperSize] = useState<'folio' | 'letter' | 'a4'>('folio');
  const [activeUnitFilter, setActiveUnitFilter] = useState<string>(selectedUnitId || 'all');
  const [activeCarFilter, setActiveCarFilter] = useState<string>(selectedCarId || 'all');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [auditTypeFilter, setAuditTypeFilter] = useState<string>('all');

  // Signatory and Document Controls
  const [includeNoted, setIncludeNoted] = useState<boolean>(true);
  const [selectedQaoDirector, setSelectedQaoDirector] = useState<string>(
    signatories?.qaoDirector || 'SARAH JANE F. FALLARIA',
  );
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

        // CAR Status filter (OPEN, ONGOING, FOR ACTION, VERIFICATION)
        if (statusFilter === 'open' && car.status !== 'Open') return false;
        if (statusFilter === 'ongoing' && car.status !== 'In Progress' && car.status !== 'Awaiting Response/Update')
          return false;
        if (statusFilter === 'for_action' && car.status !== 'Open' && car.status !== 'Awaiting Response/Update')
          return false;
        if (statusFilter === 'verification' && car.status !== 'For Final Verification') return false;

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
  }, [cars, campusFilter, auditTypeFilter, statusFilter]);

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

  // Print function with exact paper dimensions
  const handlePrintMemorandum = () => {
    if (targetUnitGroups.length === 0) return;

    const pageSizeCss =
      paperSize === 'folio'
        ? 'size: 8.5in 13in !important;'
        : paperSize === 'a4'
          ? 'size: 8.27in 11.69in !important;'
          : 'size: 8.5in 11in !important;';

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
              paperSize={paperSize}
              statusCategory={statusFilter}
              communicationType={communicationType}
              includeNoted={includeNoted}
              selectedQaoDirector={selectedQaoDirector}
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
                  paperSize={paperSize}
                  statusCategory={statusFilter}
                  communicationType={communicationType}
                  includeNoted={includeNoted}
                  selectedQaoDirector={selectedQaoDirector}
                />
              </div>
            ))
          )}
        </div>,
      );

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const isReportOnly = communicationType === 'Report Only';
        printWindow.document.open();
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${isReportOnly ? 'Overdue CAR Report' : communicationType} - Overdue CAR Responses (${memoRefNo})</title>
              <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
              <style>
                @page { 
                  ${pageSizeCss} 
                  margin: 0 !important; 
                }
                * { box-sizing: border-box !important; }
                body { 
                  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
                  background: #e2e8f0; 
                  padding: 24px 0; 
                  margin: 0;
                  color: black; 
                }
                .memo-root-document { 
                  margin: 0 auto !important; 
                  width: 8.5in !important; 
                }
                .memo-page-1, .memo-attachment-page {
                  width: 8.5in !important;
                  min-height: ${paperSize === 'folio' ? '13in' : paperSize === 'a4' ? '11.69in' : '11in'} !important;
                  background: white !important;
                  position: relative !important;
                  box-sizing: border-box !important;
                  padding: 0.35in 0.45in 0.75in 0.45in !important;
                  margin: 0 auto 30px auto !important;
                  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12) !important;
                }
                .memo-footer-banner {
                  position: absolute !important;
                  bottom: 0.25in !important;
                  left: 0.45in !important;
                  right: 0.45in !important;
                }
                @media print { 
                  html, body { 
                    margin: 0 !important; 
                    padding: 0 !important; 
                    background: white !important; 
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important; 
                  } 
                  .no-print { display: none !important; } 
                  #print-content { padding: 0 !important; margin: 0 !important; width: 100% !important; }
                  .memo-root-document { padding: 0 !important; margin: 0 !important; width: 100% !important; }
                  .memo-page-1 {
                    page-break-after: always !important;
                    break-after: page !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    position: relative !important;
                    box-sizing: border-box !important;
                    padding: 0.35in 0.45in 0.75in 0.45in !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    width: 8.5in !important;
                    height: ${paperSize === 'folio' ? '13in' : paperSize === 'a4' ? '11.69in' : '11in'} !important;
                    max-height: ${paperSize === 'folio' ? '13in' : paperSize === 'a4' ? '11.69in' : '11in'} !important;
                    overflow: hidden !important;
                  }
                  .memo-attachment-page {
                    page-break-before: always !important;
                    break-before: page !important;
                    position: relative !important;
                    box-sizing: border-box !important;
                    padding: 0.35in 0.45in 0.75in 0.45in !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    width: 8.5in !important;
                    min-height: ${paperSize === 'folio' ? '13in' : paperSize === 'a4' ? '11.69in' : '11in'} !important;
                  }
                  .memo-footer-banner {
                    position: absolute !important;
                    bottom: 0.25in !important;
                    left: 0.45in !important;
                    right: 0.45in !important;
                  }
                } 
                table { border-collapse: collapse !important; width: 100% !important; }
                td, th { overflow: hidden; word-wrap: break-word; }
              </style>
            </head>
            <body>
              <div class="no-print mb-6 flex justify-center">
                <button onclick="window.print()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-black px-8 py-3 rounded-lg shadow-xl uppercase text-xs tracking-widest transition-all">
                  Click to Print ${communicationType} (${paperSize.toUpperCase()} Format)
                </button>
              </div>
              <div id="print-content">
                ${markup}
              </div>
            </body>
          </html>
        `);
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
          body: `Official ${communicationType} (${memoRefNo}) issued for ${group.overdueCars.length} overdue CAR response(s). Compliance deadline: ${gracePeriodDays} days.`,
          category: 'car',
          link: `/qa-reports?tab=car`,
        });
      }

      toast({
        title: 'Document Dispatched Successfully!',
        description: `Official ${communicationType} issued to ${targetUnitGroups.length} unit(s) (${notifiedCount} CAR records updated).`,
      });
    } catch (err: any) {
      console.error('Error dispatching notifications:', err);
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
                `• [${g.unitName}] CAR No: ${c.car.carNumber} (${c.car.status.toUpperCase()}) | Procedure: ${c.car.procedureTitle || 'General'} | Deadline: ${c.deadlineStr} (${c.daysOverdue} days past due)`,
            ),
          )
          .join('\n')
      : activeGroup?.overdueCars
          .map(
            (c, i) =>
              `${i + 1}. CAR No: ${c.car.carNumber} (${c.car.status.toUpperCase()}) | Procedure: ${c.car.procedureTitle || 'General'} | Deadline: ${c.deadlineStr} (${c.daysOverdue} days past due)`,
          )
          .join('\n');

    const subjectLine =
      statusFilter === 'open'
        ? 'COMPLIANCE DIRECTIVE: IMMEDIATE SUBMISSION OF ROOT CAUSE ANALYSIS & ACTION PLAN FOR OVERDUE OPEN CAR(S)'
        : statusFilter === 'ongoing'
          ? 'COMPLIANCE DIRECTIVE: STATUS UPDATE & EVIDENCE SUBMISSION FOR OVERDUE ON-GOING CAR(S)'
          : statusFilter === 'for_action'
            ? 'COMPLIANCE DIRECTIVE: IMMEDIATE ACTION & COMPLIANCE ON OVERDUE CORRECTIVE ACTION REQUESTS (CAR)'
            : statusFilter === 'verification'
              ? 'COMPLIANCE DIRECTIVE: IMMEDIATE EVIDENCE SUBMISSION FOR CARS PENDING FINAL QUALITY VERIFICATION'
              : 'COMPLIANCE DIRECTIVE: IMMEDIATE SUBMISSION OF ROOT CAUSE ANALYSIS AND CORRECTIVE ACTION PLAN FOR OVERDUE CORRECTIVE ACTION REQUESTS (CAR)';

    const notedHeader = includeNoted
      ? `\n\nNOTED       :   ${selectedQaoDirector || signatories?.qaoDirector || 'SARAH JANE F. FALLARIA'}\n                Director, Quality Assurance Office`
      : '';

    const notedSignatory = includeNoted
      ? `\n\nNoted by:\n${selectedQaoDirector || signatories?.qaoDirector || 'SARAH JANE F. FALLARIA'}\nDirector, Quality Assurance Office`
      : '';

    const isReportOnly = communicationType === 'Report Only';

    const text = isReportOnly
      ? `
ROMBLON STATE UNIVERSITY
QUALITY ASSURANCE OFFICE
SCHEDULE OF OVERDUE CORRECTIVE ACTION REQUESTS (CAR)
Date Printed/Updated: ${format(new Date(memoDate), 'MMMM d, yyyy').toUpperCase()}
Target Units        : ${recipients}
Total Overdue Items : ${overdueItems.length}

--------------------------------------------------------------------------------
ITEMIZED INVENTORY:
${carsList}
--------------------------------------------------------------------------------

Certified Accurate by:
${signatories?.qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)'}
Head, Quality Management System (QMS)${notedSignatory}
      `.trim()
      : `
${communicationType}
${memoRefNo}

TO          :   ${recipients}
                This University

FROM        :   ${signatories?.qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)'}
                Head, Quality Management System (QMS)${notedHeader}

SUBJECT     :   ${subjectLine}

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
Head, Quality Management System (QMS)${notedSignatory}
    `.trim();

    navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2500);

    toast({
      title: `${isReportOnly ? 'CAR Report' : communicationType} Copied to Clipboard`,
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
                  {communicationType} Generator
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40 text-[10px] font-black uppercase"
                  >
                    1-Page Folio (8.5&quot; &times; 13&quot;) Standard
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 font-medium mt-0.5">
                  Official RSU Folio letterhead with Vision, Mission, Quality Policy, Core Values sidebar, and
                  Attachment A issues schedule.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/10 text-white text-xs font-black px-2.5 py-1">
                {overdueItems.length} Overdue Issue{overdueItems.length !== 1 ? 's' : ''} Listed
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* DIALOG BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TOP CONTROLS & SCOPE SELECTOR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-500">Document Scope</Label>
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

            {/* CAR STATUS SELECTOR (OPEN, ONGOING, FOR ACTION, VERIFICATION) */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-500">CAR Status</Label>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="h-9 text-xs font-bold">
                  <SelectValue placeholder="CAR Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs font-bold">
                    All Active Overdue (Open &amp; Ongoing)
                  </SelectItem>
                  <SelectItem value="open" className="text-xs font-bold text-amber-700">
                    OPEN CARs (Initial Response Pending)
                  </SelectItem>
                  <SelectItem value="ongoing" className="text-xs font-bold text-blue-700">
                    ONGOING CARs (In Progress / Action Committed)
                  </SelectItem>
                  <SelectItem value="for_action" className="text-xs font-bold text-indigo-700">
                    FOR ACTION (Awaiting Updates)
                  </SelectItem>
                  <SelectItem value="verification" className="text-xs font-bold text-purple-700">
                    FOR FINAL VERIFICATION
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
                      Master Document (Single List + Attachment)
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
              <Label className="text-[10px] font-black uppercase text-slate-500">Paper Size</Label>
              <Select value={paperSize} onValueChange={(v: any) => setPaperSize(v)}>
                <SelectTrigger className="h-9 text-xs font-bold">
                  <SelectValue placeholder="Paper Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="folio" className="text-xs font-bold">
                    Folio (8.5&quot; &times; 13&quot;) — Official Standard
                  </SelectItem>
                  <SelectItem value="letter" className="text-xs">
                    Letter (8.5&quot; &times; 11&quot;)
                  </SelectItem>
                  <SelectItem value="a4" className="text-xs">
                    A4 (8.27&quot; &times; 11.69&quot;)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-500">Filter Campus</Label>
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
                    All Types (IQA &amp; EQA)
                  </SelectItem>
                  <SelectItem value="IQA" className="text-xs">
                    IQA Only
                  </SelectItem>
                  <SelectItem value="EQA" className="text-xs">
                    EQA Only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* MEMORANDUM PARAMETER CUSTOMIZATION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm items-start">
            {/* COMMUNICATION TYPE SELECTOR */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-500">Communication Type</Label>
              <Select value={communicationType} onValueChange={(v: any) => setCommunicationType(v)}>
                <SelectTrigger className="h-9 text-xs font-bold">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QA Memorandum" className="text-xs font-bold">
                    QA Memorandum
                  </SelectItem>
                  <SelectItem value="QA Office Memorandum" className="text-xs font-bold">
                    QA Office Memorandum
                  </SelectItem>
                  <SelectItem value="QA Office Order" className="text-xs font-bold">
                    QA Office Order
                  </SelectItem>
                  <SelectItem value="QA Advisory" className="text-xs font-bold">
                    QA Advisory
                  </SelectItem>
                  <SelectItem value="QA Communication" className="text-xs font-bold">
                    QA Communication
                  </SelectItem>
                  <SelectItem value="Report Only" className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                    Report Only (Table Only)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* REFERENCE NUMBER */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-500">Reference Number</Label>
              <Input
                value={memoRefNo}
                onChange={(e) => setMemoRefNo(e.target.value)}
                placeholder="2026-007"
                className="h-9 font-mono text-xs font-bold"
              />
            </div>

            {/* NOTED BY CHECKBOX & QA DIRECTOR DROPDOWN (RIGHT AFTER REF NO) */}
            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="needs-noted"
                  checked={includeNoted}
                  onCheckedChange={(checked) => setIncludeNoted(Boolean(checked))}
                />
                <label
                  htmlFor="needs-noted"
                  className="text-xs font-black uppercase cursor-pointer select-none text-slate-800 dark:text-slate-200 flex items-center gap-1"
                >
                  <UserCheck className="h-3.5 w-3.5 text-primary" />
                  Needs &quot;NOTED BY&quot;
                </label>
              </div>

              {includeNoted ? (
                <div className="space-y-1 mt-1">
                  <Label className="text-[9px] font-bold uppercase text-slate-500">QA Director</Label>
                  <Select value={selectedQaoDirector} onValueChange={setSelectedQaoDirector}>
                    <SelectTrigger className="h-7 text-[11px] font-bold">
                      <SelectValue placeholder="Select QA Director" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SARAH JANE F. FALLARIA" className="text-xs font-bold">
                        SARAH JANE F. FALLARIA
                      </SelectItem>
                      <SelectItem value="DR. SARAH JANE F. FALLARIA" className="text-xs">
                        DR. SARAH JANE F. FALLARIA
                      </SelectItem>
                      {signatories?.qaoDirector &&
                        signatories.qaoDirector !== 'SARAH JANE F. FALLARIA' &&
                        signatories.qaoDirector !== 'DR. SARAH JANE F. FALLARIA' && (
                          <SelectItem value={signatories.qaoDirector} className="text-xs font-bold">
                            {signatories.qaoDirector}
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-[9.5px] text-slate-400 italic m-0 pt-0.5">Directly issued by QMS Head only</p>
              )}
            </div>

            {/* ISSUANCE DATE */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-500">Issuance Date</Label>
              <Input
                type="date"
                value={memoDate}
                onChange={(e) => setMemoDate(e.target.value)}
                className="h-9 text-xs font-bold"
              />
            </div>

            {/* COMPLIANCE GRACE PERIOD */}
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

            <div className="md:col-span-5 space-y-1.5 pt-2 border-t">
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
                There are currently no overdue CAR responses matching the selected filters (Status:{' '}
                <span className="font-bold uppercase text-slate-800 dark:text-slate-200">{statusFilter}</span>).
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
                    {communicationType === 'Report Only'
                      ? `Consolidated Overdue CAR Report (${targetUnitGroups.length} Units, ${overdueItems.length} Issues)`
                      : isConsolidatedBatch
                        ? `Consolidated Folio ${communicationType} (${targetUnitGroups.length} Units, ${overdueItems.length} Issues)`
                        : `Printable Folio Preview: ${activeGroup?.unitName} (${activeGroup?.campusName})`}
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
                        paperSize={paperSize}
                        statusCategory={statusFilter}
                        communicationType={communicationType}
                        includeNoted={includeNoted}
                        selectedQaoDirector={selectedQaoDirector}
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
                          paperSize={paperSize}
                          statusCategory={statusFilter}
                          communicationType={communicationType}
                          includeNoted={includeNoted}
                          selectedQaoDirector={selectedQaoDirector}
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
              </strong>{' '}
              • Type: <strong className="text-primary">{communicationType}</strong> • Noted by:{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {includeNoted ? selectedQaoDirector : 'None (Direct Issue)'}
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
              Print / Save PDF ({paperSize.toUpperCase()})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
