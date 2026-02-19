'use client';

import { useFirestore, useDoc, useMemoFirebase, useCollection, useUser } from '@/firebase';
import { doc, collection, query, where, updateDoc, arrayUnion } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import type { AuditSchedule, AuditFinding, ISOClause, AuditPlan } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Loader2, ArrowLeft, Save, Clock, Building2, User, PlusCircle, Database, Check, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { AuditChecklist } from '@/components/audit/audit-checklist';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuditPrintTemplate } from '@/components/audit/audit-print-template';

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-10 w-64" />
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      <div className="md:col-span-2 space-y-4">
        <Skeleton className="h-96 w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  </div>
);

const summarySchema = z.object({
  summaryCompliance: z.string().optional(),
  summaryOFI: z.string().optional(),
  summaryNC: z.string().optional(),
});

export default function AuditExecutionPage() {
  const { scheduleId } = useParams();
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [isAddClauseOpen, setIsAddClauseOpen] = useState(false);
  const [selectedNewClauses, setSelectedNewClauses] = useState<string[]>([]);

  const scheduleDocRef = useMemoFirebase(
    () => (firestore && scheduleId ? doc(firestore, 'auditSchedules', scheduleId as string) : null),
    [firestore, scheduleId]
  );
  const { data: schedule, isLoading: isLoadingSchedule } = useDoc<AuditSchedule>(scheduleDocRef);

  const planRef = useMemoFirebase(
    () => (firestore && schedule?.auditPlanId ? doc(firestore, 'auditPlans', schedule.auditPlanId) : null),
    [firestore, schedule?.auditPlanId]
  );
  const { data: plan } = useDoc<AuditPlan>(planRef);

  const findingsQuery = useMemoFirebase(
    () => (firestore && scheduleId ? query(collection(firestore, 'auditFindings'), where('auditScheduleId', '==', scheduleId)) : null),
    [firestore, scheduleId]
  );
  const { data: findings, isLoading: isLoadingFindings } = useCollection<AuditFinding>(findingsQuery);
  
  const allIsoClausesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'isoClauses') : null),
    [firestore]
  );
  const { data: allIsoClauses, isLoading: isLoadingClauses } = useCollection<ISOClause>(allIsoClausesQuery);

  const clausesInScope = useMemo(() => {
    if (!allIsoClauses || !schedule?.isoClausesToAudit) return [];
    return allIsoClauses.filter(c => schedule.isoClausesToAudit.includes(c.id));
  }, [allIsoClauses, schedule?.isoClausesToAudit]);

  const unusedClauses = useMemo(() => {
    if (!allIsoClauses || !schedule?.isoClausesToAudit) return [];
    return allIsoClauses.filter(c => !schedule.isoClausesToAudit.includes(c.id));
  }, [allIsoClauses, schedule?.isoClausesToAudit]);

  const form = useForm<z.infer<typeof summarySchema>>({
    resolver: zodResolver(summarySchema),
    defaultValues: {
      summaryCompliance: schedule?.summaryCompliance || '',
      summaryOFI: schedule?.summaryOFI || '',
      summaryNC: schedule?.summaryNC || '',
    },
  });

  useState(() => {
      if (schedule) {
          form.reset({
            summaryCompliance: schedule.summaryCompliance || '',
            summaryOFI: schedule.summaryOFI || '',
            summaryNC: schedule.summaryNC || '',
          });
      }
  }, [schedule, form]);


  const handleSaveSummary = async (values: z.infer<typeof summarySchema>) => {
    if (!scheduleDocRef) return;
    setIsSavingSummary(true);
    try {
        await updateDoc(scheduleDocRef, { ...values, status: 'Completed' });
        toast({ title: "Success", description: "Audit summary saved and marked as Completed." });
    } catch(error) {
        console.error("Error saving summary:", error);
        toast({ title: "Error", description: "Could not save summary.", variant: 'destructive' });
    } finally {
        setIsSavingSummary(false);
    }
  };

  const handleAddClausesToScope = async () => {
    if (!scheduleDocRef || selectedNewClauses.length === 0) return;
    
    setIsSavingSummary(true);
    updateDoc(scheduleDocRef, {
        isoClausesToAudit: arrayUnion(...selectedNewClauses)
    })
    .then(() => {
        toast({ title: "Scope Expanded", description: `${selectedNewClauses.length} clauses added to the checklist.` });
        setSelectedNewClauses([]);
        setIsAddClauseOpen(false);
    })
    .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: scheduleDocRef.path,
            operation: 'update',
            requestResourceData: { isoClausesToAudit: selectedNewClauses }
        }));
    })
    .finally(() => {
        setIsSavingSummary(false);
    });
  };

  const handlePrintLog = () => {
    if (!schedule || !findings || !allIsoClauses) return;

    try {
        const reportHtml = renderToStaticMarkup(
            <AuditPrintTemplate 
                schedule={schedule}
                findings={findings}
                clauses={clausesInScope}
                plan={plan || undefined}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>IQA Evidence Log - ${schedule.targetName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @media print { 
                            body { margin: 0; padding: 0; background: white; } 
                            .no-print { display: none !important; }
                            table { page-break-inside: auto; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                        }
                        body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }
                        .text-center { text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print IQA Report</button>
                    </div>
                    <div id="print-content">
                        ${reportHtml}
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (err) {
        console.error("Print error:", err);
        toast({ title: "Print Failed", description: "Could not generate the print template.", variant: "destructive" });
    }
  };

  const toggleNewClauseSelection = (clauseId: string) => {
    setSelectedNewClauses(prev => 
        prev.includes(clauseId) ? prev.filter(id => id !== clauseId) : [...prev, clauseId]
    );
  };

  const handleFindingSync = (finding: any) => {
    const clauseId = finding.isoClause;
    const type = finding.type;
    // Extract the exact user text from the relevant textbox
    const actualText = type === 'Non-Conformance' ? (finding.ncStatement || finding.description) : finding.description;
    
    if (!actualText) return;

    const formattedEntry = `[Clause ${clauseId}]: ${actualText}`;
    
    const summaryFields: (keyof z.infer<typeof summarySchema>)[] = [
        'summaryCompliance',
        'summaryOFI',
        'summaryNC'
    ];

    let targetFieldName: keyof z.infer<typeof summarySchema> | null = null;
    if (type === 'Compliance') targetFieldName = 'summaryCompliance';
    else if (type === 'Observation for Improvement') targetFieldName = 'summaryOFI';
    else if (type === 'Non-Conformance') targetFieldName = 'summaryNC';

    if (!targetFieldName) return;

    // Remove any existing entry for this clause from ALL fields to handle re-categorization
    summaryFields.forEach(fName => {
        const val = form.getValues(fName) || '';
        const lines = val.split('\n').filter(l => l.trim() !== '');
        const updatedLines = lines.filter(l => !l.startsWith(`[Clause ${clauseId}]`));
        
        // If this is the destination field, add the new/updated entry in toto
        if (fName === targetFieldName) {
            updatedLines.push(formattedEntry);
        }
        
        form.setValue(fName, updatedLines.join('\n'));
    });
  };

  const isLoading = isLoadingSchedule || isLoadingFindings || isLoadingClauses;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!schedule) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Audit Schedule Not Found</h2>
        <p className="text-muted-foreground">The schedule you are looking for does not exist.</p>
        <Button className="mt-4" onClick={() => router.back()}>
          <span>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </span>
        </Button>
      </div>
    );
  }

  const conductDate = schedule.scheduledDate.toDate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
            <h2 className="text-2xl font-bold tracking-tight">IQA - Evidence Log Sheet</h2>
            <p className="text-muted-foreground flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                {schedule.targetName} &bull; {format(conductDate, 'PPP')} @ {format(conductDate, 'hh:mm a')}
            </p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrintLog} className="bg-white shadow-sm font-bold h-9">
                <Printer className="mr-2 h-4 w-4" />
                Print Evidence Log
            </Button>
            <Badge variant={schedule.status === 'Completed' ? 'default' : 'secondary'} className="h-9 px-4 font-black uppercase tracking-widest border-none shadow-sm">
                {schedule.status}
            </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <AuditChecklist 
                scheduleId={schedule.id}
                clausesToAudit={clausesInScope}
                existingFindings={findings || []}
                onFindingSaved={handleFindingSync}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Audit Summary & Final Report</CardTitle>
                    <CardDescription>Consolidate your findings into a high-level summary. Findings are automatically copied here when committed above.</CardDescription>
                </CardHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSaveSummary)}>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="summaryCompliance"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-black uppercase text-emerald-700">Summary of Compliance (C)</FormLabel>
                                        <FormControl><Textarea {...field} rows={4} placeholder="Summarize all instances of standard compliance..." /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="summaryOFI"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-black uppercase text-amber-700">Opportunities for Improvement (OFI)</FormLabel>
                                        <FormControl><Textarea {...field} rows={4} placeholder="Summarize all opportunities for improvement..."/></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="summaryNC"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-black uppercase text-destructive">Non-Compliance / Non-Conformance (NC)</FormLabel>
                                        <FormControl><Textarea {...field} rows={4} placeholder="Summarize all non-conformances..."/></FormControl>
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSavingSummary} className="shadow-lg shadow-primary/20 font-black uppercase tracking-widest">
                                {isSavingSummary && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                <Save className="mr-2 h-4 w-4"/>
                                Finalize Audit Report
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>

        </div>
        <div className="lg:col-span-1">
            <Card className="sticky top-20 shadow-md border-primary/10">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-sm font-black uppercase tracking-widest">Session Dossier</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-6 pt-6">
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Assigned Auditor</p>
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />
                                <span className="text-sm font-bold">{schedule.auditorName || 'Not Assigned'}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Auditee</p>
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                <span className="text-sm font-bold">{schedule.targetName}</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Conduct Schedule</p>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                <span className="text-sm font-bold">{format(conductDate, 'PPp')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <Separator />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase text-primary tracking-widest">Clauses in Scope</p>
                            <Dialog open={isAddClauseOpen} onOpenChange={setIsAddClauseOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 text-[9px] font-black uppercase gap-1 text-primary hover:bg-primary/5 p-0 px-2">
                                        <PlusCircle className="h-3 w-3" /> Add More Clauses
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Add Clauses to Scope</DialogTitle>
                                        <DialogDescription>Select additional standard requirements to verify during this session.</DialogDescription>
                                    </DialogHeader>
                                    <div className="rounded-xl border shadow-sm overflow-hidden bg-background">
                                        <Command className="bg-transparent" filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                                            <div className="flex items-center border-b px-3 bg-white">
                                                <CommandInput placeholder="Search unused clauses..." className="h-10 text-xs" />
                                            </div>
                                            <CommandList className="max-h-[300px]">
                                                <CommandEmpty className="p-4 text-center">
                                                    <Database className="h-8 w-8 mx-auto opacity-10 mb-2" />
                                                    <p className="text-xs font-bold text-muted-foreground uppercase">No unused clauses found</p>
                                                </CommandEmpty>
                                                <CommandGroup>
                                                    {unusedClauses.map(c => {
                                                        const isSelected = selectedNewClauses.includes(c.id);
                                                        return (
                                                            <CommandItem
                                                                key={c.id}
                                                                value={`${c.id} ${c.title}`}
                                                                onSelect={() => toggleNewClauseSelection(c.id)}
                                                                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                                                            >
                                                                <div className={cn(
                                                                    "h-4 w-4 border rounded flex items-center justify-center transition-colors shrink-0",
                                                                    isSelected ? "bg-primary border-primary text-white" : "border-slate-300"
                                                                )}>
                                                                    {isSelected && <Check className="h-3 w-3" />}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-black text-[11px] leading-tight mb-0.5">Clause {c.id}</p>
                                                                    <p className="text-[10px] text-muted-foreground truncate">{c.title}</p>
                                                                </div>
                                                            </CommandItem>
                                                        );
                                                    })}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </div>
                                    <DialogFooter className="pt-4">
                                        <Button variant="outline" size="sm" onClick={() => setIsAddClauseOpen(false)}>Cancel</Button>
                                        <Button size="sm" onClick={handleAddClausesToScope} disabled={selectedNewClauses.length === 0 || isSavingSummary}>
                                            {isSavingSummary && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                            Add {selectedNewClauses.length} Clause(s)
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {schedule.isoClausesToAudit.sort((a,b) => a.localeCompare(b, undefined, { numeric: true })).map(clauseId => (
                                <Badge key={clauseId} variant="outline" className="font-mono text-[10px] border-primary/20 px-2 bg-white">Clause {clauseId}</Badge>
                            ))}
                        </div>
                    </div>
                 </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
