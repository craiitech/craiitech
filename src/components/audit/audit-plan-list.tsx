
'use client';

import { useMemo, useState } from 'react';
import type { AuditPlan, AuditSchedule, Campus, User, Unit, Signatories, AuditGroup, AuditFinding, ISOClause } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '../ui/button';
import { 
    Edit, 
    CalendarPlus, 
    Building2, 
    ClipboardCheck, 
    Clock, 
    UserCheck, 
    ChevronRight, 
    User as UserIcon, 
    Calendar, 
    ShieldCheck, 
    Flag, 
    ListChecks, 
    Trash2, 
    Globe, 
    Printer, 
    Search, 
    ArrowUpDown, 
    Copy, 
    FileText,
    Plus
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';
import { cn, parseDate } from '@/lib/utils';
import { Timestamp, doc, updateDoc, collection, query, getDocs, orderBy, limit, where } from '@/firebase/firestore-wrapper';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuditPlanPrintTemplate } from './audit-plan-print-template';
import { ConsolidatedAuditReportTemplate } from './consolidated-audit-report-template';
import { AuditPrintTemplate } from './audit-print-template';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AuditPlanListProps {
  plans: AuditPlan[];
  schedules: AuditSchedule[];
  findings: AuditFinding[];
  isoClauses: ISOClause[];
  campuses: Campus[];
  users: User[];
  units: Unit[];
  onEditPlan: (plan: AuditPlan) => void;
  onDeletePlan: (plan: AuditPlan) => void;
  onScheduleAudit: (plan: AuditPlan) => void;
  onEditSchedule: (plan: AuditPlan, schedule: AuditSchedule) => void;
  onDeleteSchedule: (schedule: AuditSchedule) => void;
  onClonePlan: (plan: AuditPlan) => void;
}

type SortKey = 'scheduledDate' | 'processCategory' | 'targetName' | 'status';
type SortConfig = { key: SortKey; direction: 'asc' | 'desc' } | null;

function PlanItineraryRegistry({ 
    plan, 
    schedules,
    isoClauses,
    signatories,
    onEdit, 
    onDelete,
    campusMap
}: { 
    plan: AuditPlan; 
    schedules: AuditSchedule[];
    isoClauses: ISOClause[];
    signatories?: Signatories;
    onEdit: (plan: AuditPlan, s: AuditSchedule) => void;
    onDelete: (s: AuditSchedule) => void;
    campusMap: Map<string, string>;
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'scheduledDate', direction: 'asc' });

    const processedSchedules = useMemo(() => {
        let result = [...schedules];
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(s => 
                s.targetName.toLowerCase().includes(lower) ||
                (s.auditorName || '').toLowerCase().includes(lower) ||
                (s.procedureDescription || '').toLowerCase().includes(lower)
            );
        }
        if (sortConfig) {
            const { key, direction } = sortConfig;
            result.sort((a, b) => {
                let valA: any, valB: any;
                switch(key) {
                    case 'scheduledDate': valA = parseDate(a.scheduledDate).getTime(); valB = parseDate(b.scheduledDate).getTime(); break;
                    case 'processCategory': valA = a.processCategory || ''; valB = b.processCategory || ''; break;
                    case 'targetName': valA = a.targetName || ''; valB = b.targetName || ''; break;
                    case 'status': valA = a.status || ''; valB = b.status || ''; break;
                    default: valA = ''; valB = '';
                }
                if (valA < valB) return direction === 'asc' ? -1 : 1;
                if (valA > valB) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [schedules, searchTerm, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortKey) => (
        <ArrowUpDown className={cn("h-3 w-3 ml-1.5 transition-colors", sortConfig?.key === key ? "text-primary opacity-100" : "opacity-20")} />
    );

    const handlePrintTemplate = (schedule: AuditSchedule) => {
        const clausesInScope = isoClauses.filter(c => schedule.isoClausesToAudit.includes(c.id));
        const campusName = campusMap.get(schedule.campusId) || 'Institutional';
        try {
            const reportHtml = renderToStaticMarkup(<AuditPrintTemplate schedule={schedule} findings={[]} clauses={clausesInScope} signatories={signatories} leadAuditorName={plan.leadAuditorName} campusName={campusName} />);
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(`<html><head><title>Audit Evidence Template - ${schedule.targetName}</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@page { size: 8.5in 13in !important; margin: 0.5in !important; } @media print { body { margin: 0 !important; padding: 0 !important; background: white; width: 100% !important; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } } body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Blank Evidence Log</button></div><div id="print-content">${reportHtml}</div></body></html>`);
                printWindow.document.close();
            }
        } catch (err) { console.error(err); }
    };

    return (
        <div className="space-y-4">
            <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search itinerary..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 text-xs bg-white shadow-sm border-primary/10" /></div>
            <div className="rounded-2xl border bg-white shadow-lg overflow-x-auto">
                {processedSchedules.length > 0 ? (
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="py-4 pl-8"><Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('scheduledDate')}>Timeline & Focus {getSortIcon('scheduledDate')}</Button></TableHead>
                            <TableHead className="text-center"><Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent mx-auto" onClick={() => requestSort('processCategory')}>Process Type {getSortIcon('processCategory')}</Button></TableHead>
                            <TableHead className="text-[10px] font-black uppercase py-4">ISO Clauses</TableHead>
                            <TableHead><Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('targetName')}>Procedure / Personnel {getSortIcon('targetName')}</Button></TableHead>
                            <TableHead className="text-right"><Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent ml-auto" onClick={() => requestSort('status')}>Status {getSortIcon('status')}</Button></TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase py-4 pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processedSchedules.map(schedule => (
                            <TableRow key={schedule.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                <TableCell className="py-6 pl-8"><div className="flex flex-col gap-1.5"><div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-primary" /><span className="font-black text-sm text-slate-800 dark:text-slate-200 tabular-nums">{format(parseDate(schedule.scheduledDate), 'MM/dd/yyyy')}</span></div><div className="flex items-center gap-2 bg-muted/20 w-fit px-2 py-1 rounded border border-slate-100 dark:border-slate-700"><Clock className="h-3 w-3 text-muted-foreground" /><span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-tighter">{format(parseDate(schedule.scheduledDate), 'hh:mm a')} - {format(parseDate(schedule.endScheduledDate), 'hh:mm a')}</span></div></div></TableCell>
                                <TableCell className="py-6 text-center">{schedule.processCategory && <Badge variant="outline" className="text-[9px] font-black uppercase border-primary/20 bg-primary/5 text-primary whitespace-nowrap">{schedule.processCategory.replace(' Processes', '')}</Badge>}</TableCell>
                                <TableCell className="py-6"><div className="flex flex-wrap gap-1 max-w-[180px]">{schedule.isoClausesToAudit.map((cls, clsIdx) => <Badge key={`${schedule.id}-${cls}-${clsIdx}`} variant="outline" className="text-[9px] font-black bg-white border-slate-200 dark:border-slate-700 h-4 px-1">{cls}</Badge>)}</div></TableCell>
                                <TableCell className="py-6">
                                    <div className="space-y-3 max-w-xs">
                                        <div className="p-3 rounded-lg border bg-muted/10 border-dashed group-hover:bg-white transition-colors">
                                            <p className="text-[10px] font-black uppercase text-primary mb-1">Focus Area</p>
                                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">{schedule.procedureDescription || 'No description.'}</p>
                                            {schedule.documents && schedule.documents.length > 0 && (
                                                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-700">
                                                    <FileText className="h-3 w-3 text-primary" />
                                                    <span className="text-[9px] font-bold text-primary uppercase">{schedule.documents.length} Document{schedule.documents.length > 1 ? 's' : ''} Linked</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-[8px] font-bold text-muted-foreground uppercase">Auditor</p>
                                                <div className="flex items-center gap-1"><UserCheck className="h-2.5 w-2.5 text-primary" /><span className="text-[10px] font-black text-slate-700 dark:text-slate-300 truncate">{schedule.auditorName || 'UNASSIGNED'}</span></div>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-muted-foreground uppercase">Auditee</p>
                                                <div className="flex flex-col"><div className="flex items-center gap-1"><Building2 className="h-2.5 w-2.5 text-primary" /><span className="text-[10px] font-black text-slate-700 dark:text-slate-300 truncate">{schedule.targetName}</span></div></div>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right py-6"><Badge className={cn("text-[9px] font-black uppercase border-none px-3 shadow-sm", schedule.status === 'Completed' ? "bg-emerald-600 text-white" : "bg-amber-50 text-amber-950")}>{schedule.status}</Badge></TableCell>
                                <TableCell className="text-right py-6 pr-8 whitespace-nowrap">
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/5" onClick={() => handlePrintTemplate(schedule)} title="Print Evidence Template"><Printer className="h-3.5 w-3.5" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/5" onClick={() => onEdit(plan, schedule)} title="Edit Itinerary"><Edit className="h-3.5 w-3.5" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/5" onClick={() => onDelete(schedule)} title="Delete Session"><Trash2 className="h-3.5 w-3.5" /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 opacity-20"><Clock className="h-12 w-12 text-muted-foreground" /><p className="text-xs font-black uppercase tracking-[0.2em]">Itinerary Provisioning Required</p></div>
                )}
            </div>
        </div>
    );
}

function AddPlanDocumentButton({ plan, onUpdate }: { plan: AuditPlan; onUpdate: (planId: string, docs: any[]) => void }) {
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'manual' | 'comm'>('manual');
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  
  // Communication specifics
  const [comms, setComms] = useState<any[]>([]);
  const [isLoadingComms, setIsLoadingComms] = useState(false);
  const [commId, setCommId] = useState('');
  const [commRefNum, setCommRefNum] = useState('');
  const [commSubject, setCommSubject] = useState('');

  const fetchCommunications = async () => {
    if (comms.length > 0 || isLoadingComms || !firestore) return;
    setIsLoadingComms(true);
    try {
      const q = query(
        collection(firestore, 'communications'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtered = list.filter((c: any) => c.driveLink);
      setComms(filtered);
    } catch (e) {
      console.error("Error fetching comms:", e);
    } finally {
      setIsLoadingComms(false);
    }
  };

  const handleAdd = () => {
    if (!name || !link) return;
    
    if (!link.startsWith('http://') && !link.startsWith('https://')) {
      alert('Please enter a valid Google Drive link or URL starting with http:// or https://');
      return;
    }

    const currentDocs = plan.documents || [];
    const newDoc: any = { name, link };
    if (mode === 'comm' && commId) {
      newDoc.communicationId = commId;
      newDoc.communicationRefNum = commRefNum;
      newDoc.communicationSubject = commSubject;
    }

    onUpdate(plan.id, [...currentDocs, newDoc]);
    setName('');
    setLink('');
    setCommId('');
    setCommRefNum('');
    setCommSubject('');
    setMode('manual');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase gap-1 text-primary hover:bg-primary/5 p-0 px-2 cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> Add Documents
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-black uppercase text-primary">Add Plan Document</DialogTitle>
          <DialogDescription className="text-xs">
            Link a Google Drive folder, document, or checklist to this Audit Plan.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Buttons */}
        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg border gap-1">
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={cn(
              "flex-1 text-[9px] font-black uppercase py-1.5 rounded-md transition-all cursor-pointer",
              mode === 'manual' ? "bg-white text-primary shadow-xs" : "text-muted-foreground hover:text-slate-800 dark:text-slate-200"
            )}
          >
            Manual Link
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('comm');
              fetchCommunications();
            }}
            className={cn(
              "flex-1 text-[9px] font-black uppercase py-1.5 rounded-md transition-all cursor-pointer",
              mode === 'comm' ? "bg-white text-primary shadow-xs" : "text-muted-foreground hover:text-slate-800 dark:text-slate-200"
            )}
          >
            Select from EOMS Comms
          </button>
        </div>

        <div className="space-y-4 py-2">
          {mode === 'comm' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Select EOMS Communication</label>
              <Select 
                onValueChange={(val) => {
                  const comm = comms.find(c => c.id === val);
                  if (comm) {
                    const ref = comm.senderRefNum || (comm.recipientRefNums ? Object.values(comm.recipientRefNums)[0] : '') || 'N/A';
                    setName(`[${comm.kind}] ${comm.subject}`);
                    setLink(comm.driveLink || '');
                    setCommId(comm.id);
                    setCommRefNum(ref);
                    setCommSubject(comm.subject);
                  }
                }}
              >
                <SelectTrigger className="h-10 text-xs font-bold bg-slate-50 dark:bg-slate-800/50">
                  <SelectValue placeholder={isLoadingComms ? "Loading Communications..." : "Link EOMS Memo / Travel Order"} />
                </SelectTrigger>
                <SelectContent className="bg-white border-primary/20 max-h-[200px]">
                  {comms.map(c => {
                    const ref = c.senderRefNum || (c.recipientRefNums ? Object.values(c.recipientRefNums)[0] : '') || 'N/A';
                    return (
                      <SelectItem key={c.id} value={c.id} className="text-xs font-bold uppercase text-slate-800 dark:text-slate-200 truncate">
                        [{c.kind}] {c.subject} ({ref})
                      </SelectItem>
                    );
                  })}
                  {comms.length === 0 && !isLoadingComms && (
                    <div className="p-2 text-center text-xs text-muted-foreground uppercase font-black">No attachable memos found</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Document Title / Name</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Audit Plan Agenda / Google Drive Folder" 
              className="h-10 text-xs font-bold"
              disabled={mode === 'comm'}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Google Drive Link</label>
            <Input 
              value={link} 
              onChange={(e) => setLink(e.target.value)} 
              placeholder="https://drive.google.com/..." 
              className="h-10 text-xs font-medium"
              disabled={mode === 'comm'}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={handleAdd} disabled={!name || !link} className="font-bold uppercase text-xs">
            Add Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AuditPlanList({ 
    plans, 
    schedules, 
    findings,
    isoClauses,
    campuses, 
    onEditPlan, 
    onDeletePlan,
    onScheduleAudit, 
    onEditSchedule,
    onDeleteSchedule,
    onClonePlan
}: AuditPlanListProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const handleUpdateDocuments = async (planId: string, updatedDocs: { name: string; link: string }[]) => {
    if (!firestore) return;
    try {
      const planRef = doc(firestore, 'auditPlans', planId);
      await updateDoc(planRef, {
        documents: updatedDocs
      });
      toast({ title: 'Documents Updated', description: 'Audit Plan reference documents updated successfully.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Could not update plan documents.', variant: 'destructive' });
    }
  };
    
  const campusMap = useMemo(() => {
    const map = new Map(campuses.map(c => [c.id, c.name]));
    map.set('university-wide', 'Institutional');
    return map;
  }, [campuses]);

  const signatoryRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'signatories') : null), [firestore]);
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const handlePrintPlan = (plan: AuditPlan, schedules: AuditSchedule[]) => {
      if (!schedules.length) {
          toast({ title: "Itinerary Empty", description: "Please provision audit sessions before printing the plan.", variant: "destructive" });
          return;
      }
      try {
          const sections = Array.from(new Set(schedules.map(s => s.processCategory).filter(Boolean) as AuditGroup[]));
          const cName = campusMap.get(plan.campusId) || 'UNIVERSITY-WIDE';
          
          const reportsHtml = sections.map(section => {
              const sectionSchedules = schedules.filter(s => s.processCategory === section);
              return renderToStaticMarkup(
                  <div key={section} className="print-page-break mb-12">
                      <AuditPlanPrintTemplate plan={plan} schedules={sectionSchedules} campusName={cName} signatories={signatories || undefined} section={section} />
                  </div>
              );
          }).join('');

          const printWindow = window.open('', '_blank');
          if (printWindow) {
              printWindow.document.open();
              printWindow.document.write(`<html><head><title>Audit Plan - ${plan.auditNumber}</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@media print { body { margin: 0; padding: 0; background: white; } .no-print { display: none !important; } .print-page-break { page-break-after: always; } } body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Detailed Plan</button></div><div id="print-content">${reportsHtml}</div></body></html>`);
              printWindow.document.close();
          }
      } catch (err) { console.error(err); }
  };

  const handlePrintConsolidated = (plan: AuditPlan, schedules: AuditSchedule[]) => {
    if (!schedules.some(s => s.status === 'Completed')) {
        toast({ title: "No Verified Data", description: "A consolidated report requires at least one completed evidence log.", variant: "destructive" });
        return;
    }
    try {
        const cName = campusMap.get(plan.campusId) || 'UNIVERSITY-WIDE';
        const reportHtml = renderToStaticMarkup(<ConsolidatedAuditReportTemplate plan={plan} schedules={schedules} findings={findings} clauses={isoClauses} units={[]} campuses={campuses} signatories={signatories || undefined} campusName={cName} />);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`<html><head><title>Audit Report - ${plan.auditNumber}</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@page { size: 8.5in 13in !important; margin: 0.5in !important; } @media print { body { margin: 0 !important; padding: 0 !important; background: white; } .no-print { display: none !important; } } body { font-family: serif; background: #f9fafb; padding: 40px; color: black; font-size: 11pt; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Report</button></div><div id="print-content">${reportHtml}</div></body></html>`);
            printWindow.document.close();
        }
    } catch (err) { console.error(err); }
  };
  
  const handlePrintAuditTemplate = (plan: AuditPlan, schedules: AuditSchedule[]) => {
      if (!schedules.length) {
          toast({ title: "Itinerary Empty", description: "Please provision audit sessions before printing the template.", variant: "destructive" });
          return;
      }
      try {
          const cName = campusMap.get(plan.campusId) || 'UNIVERSITY-WIDE';
          const reportsHtml = schedules.map(schedule => {
              const clausesInScope = isoClauses.filter(c => schedule.isoClausesToAudit.includes(c.id));
              const campusName = campusMap.get(schedule.campusId) || cName;
              return renderToStaticMarkup(
                  <div key={schedule.id} className="print-page-break mb-12">
                      <AuditPrintTemplate schedule={schedule} findings={[]} clauses={clausesInScope} signatories={signatories || undefined} leadAuditorName={plan.leadAuditorName} campusName={campusName} />
                  </div>
              );
          }).join('');

          const printWindow = window.open('', '_blank');
          if (printWindow) {
              printWindow.document.open();
              printWindow.document.write(`<html><head><title>Audit Evidence Templates - ${plan.auditNumber}</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@page { size: 8.5in 13in !important; margin: 0.5in !important; } @media print { body { margin: 0 !important; padding: 0 !important; background: white; width: 100% !important; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } .print-page-break { page-break-after: always; } } body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Blank Evidence Logs</button></div><div id="print-content">${reportsHtml}</div></body></html>`);
              printWindow.document.close();
          }
      } catch (err) { console.error(err); }
  };
  
  return (
    <div className="space-y-6">
        <Accordion type="multiple" className="w-full space-y-6">
          {plans.map(plan => {
            const planSchedules = schedules.filter(s => s.auditPlanId === plan.id);
            return (
              <AccordionItem value={plan.id} key={plan.id} className="border-none rounded-2xl shadow-xl overflow-hidden bg-background">
                <div className="flex items-center justify-between border-b data-[state=open]:bg-slate-50 dark:bg-slate-800/50 transition-colors pr-10">
                    <AccordionTrigger className="flex-1 hover:no-underline px-8 py-6 border-none [&>svg]:hidden">
                        <div className="flex flex-col md:flex-row md:items-center justify-between w-full text-left gap-6">
                            <div className="space-y-2 min-w-0">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="font-mono text-primary border-primary/30 h-6 px-2 text-[10px] font-black uppercase bg-primary/5">
                                        NO: {plan.auditNumber}
                                    </Badge>
                                    <p className="font-black text-lg text-slate-900 dark:text-slate-100 uppercase tracking-tight truncate">{plan.title}</p>
                                </div>
                                <div className="flex items-center gap-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-primary" /> {campusMap.get(plan.campusId) || '...'}</span>
                                    <span className="flex items-center gap-1.5"><Flag className="h-3.5 w-3.5 text-primary" /> {plan.auditType}</span>
                                </div>
                            </div>
                        </div>
                    </AccordionTrigger>
                    
                    <div className="flex flex-wrap items-center gap-2 z-10" onClick={(e) => e.stopPropagation()}>
                        <Button 
                            asChild 
                            variant="outline" 
                            className="bg-white border-primary/20 text-primary font-black uppercase text-[9px] h-8 gap-2 cursor-pointer shadow-sm hover:bg-primary/5"
                            onClick={() => handlePrintConsolidated(plan, planSchedules)}
                        >
                            <span role="button">
                                <FileText className="h-3.5 w-3.5" /> 
                                Consolidate Results
                            </span>
                        </Button>
                        <Button 
                            asChild 
                            variant="outline" 
                            className="bg-white border-primary/20 text-primary font-black uppercase text-[9px] h-8 gap-2 cursor-pointer shadow-sm hover:bg-primary/5"
                            onClick={() => handlePrintPlan(plan, planSchedules)}
                        >
                            <span role="button">
                                <Printer className="h-3.5 w-3.5" /> 
                                Print Plan
                            </span>
                        </Button>
                        <Button 
                            asChild 
                            variant="outline" 
                            className="bg-white border-primary/20 text-primary font-black uppercase text-[9px] h-8 gap-2 cursor-pointer shadow-sm hover:bg-primary/5"
                            onClick={() => handlePrintAuditTemplate(plan, planSchedules)}
                        >
                            <span role="button">
                                <Printer className="h-3.5 w-3.5" /> 
                                Print Audit Template
                            </span>
                        </Button>
                        <div className="w-px h-6 bg-border mx-1" />
                        <Button 
                            asChild 
                            className="h-8 font-black uppercase text-[9px] gap-2 cursor-pointer shadow-md"
                            onClick={() => onScheduleAudit(plan)}
                        >
                            <span role="button">
                                <CalendarPlus className="h-3.5 w-3.5" /> 
                                Schedule Audit
                            </span>
                        </Button>
                        <Button 
                            asChild 
                            variant="secondary" 
                            className="h-8 font-black uppercase text-[9px] gap-2 cursor-pointer shadow-sm"
                            onClick={() => onClonePlan(plan)}
                        >
                            <span role="button">
                                <Copy className="h-3.5 w-3.5" /> 
                                Clone
                            </span>
                        </Button>
                        <Button 
                            asChild 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-primary cursor-pointer hover:bg-primary/5"
                            onClick={() => onEditPlan(plan)}
                        >
                            <span role="button">
                                <Edit className="h-4 w-4" />
                            </span>
                        </Button>
                        <Button 
                            asChild 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-destructive cursor-pointer hover:bg-destructive/5"
                            onClick={() => onDeletePlan(plan)}
                        >
                            <span role="button">
                                <Trash2 className="h-4 w-4" />
                            </span>
                        </Button>
                    </div>
                </div>
                <AccordionContent className="p-0 bg-white">
                  <div className="p-8 space-y-10">
                    {/* EOMS PLAN REFERENCE DOCUMENTS */}
                    <div className="space-y-4 p-6 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#1B6535] flex items-center gap-2">
                                <FileText className="h-4 w-4 text-[#1B6535]" />
                                Audit Plan Reference Documents
                            </h3>
                            <AddPlanDocumentButton plan={plan} onUpdate={handleUpdateDocuments} />
                        </div>
                        {(!plan.documents || plan.documents.length === 0) ? (
                            <p className="text-xs text-muted-foreground font-semibold italic py-2 pl-1">No reference documents or Google Drive links linked to this Audit Plan yet.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {plan.documents.map((doc, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 border rounded-xl bg-white hover:shadow-md hover:border-primary/20 transition-all group">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="p-2.5 bg-primary/10 text-primary rounded-lg shrink-0">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0 flex flex-col items-start">
                                                <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate uppercase tracking-tight">{doc.name}</p>
                                                {doc.communicationId && (
                                                    <Badge className="bg-emerald-600/10 text-emerald-700 font-black uppercase text-[8px] tracking-widest border-none py-0.5 px-1.5 h-auto my-1 shadow-none select-none">
                                                        EOMS Ref: {doc.communicationRefNum}
                                                    </Badge>
                                                )}
                                                <a 
                                                    href={doc.link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5 mt-0.5 truncate"
                                                >
                                                    Open Google Drive <ChevronRight className="h-3 w-3" />
                                                </a>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:bg-destructive/5 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => {
                                                const updated = plan.documents?.filter((_, i) => i !== idx) || [];
                                                handleUpdateDocuments(plan.id, updated);
                                            }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <PlanItineraryRegistry plan={plan} schedules={planSchedules} isoClauses={isoClauses} signatories={signatories || undefined} onEdit={onEditSchedule} onDelete={onDeleteSchedule} campusMap={campusMap} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
    </div>
  );
}
