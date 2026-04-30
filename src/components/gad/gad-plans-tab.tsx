
'use client';

import { useState, useMemo } from 'react';
import type { GADPlan, Campus, Unit, GadSettings, Signatories } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, 
    PlusCircle, 
    Edit, 
    Trash2, 
    Printer, 
    Target, 
    Info, 
    Save, 
    ChevronRight,
    Gavel,
    Landmark,
    Calculator,
    ShieldCheck
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { renderToStaticMarkup } from 'react-dom/server';
import { GADPlanReportTemplate } from './gad-print-templates';

interface GADPlansTabProps {
  plans: GADPlan[];
  campuses: Campus[];
  units: Unit[];
  selectedYear: number;
  selectedUnitId: string;
}

const planSchema = z.object({
  genderIssue: z.string().min(5, 'Required'),
  causeOfIssue: z.string().min(5, 'Required'),
  objective: z.string().min(5, 'Required'),
  pap: z.string().min(1, 'Required'),
  performanceIndicators: z.string().min(1, 'Required'),
  targets: z.string().min(1, 'Required'),
  budget: z.coerce.number().min(0),
  sourceOfBudget: z.string().min(1, 'Required'),
  responsibleOfficeId: z.string().min(1, 'Required'),
  campusId: z.string().min(1, 'Required'),
});

export function GADPlansTab({ plans, campuses, units, selectedYear, selectedUnitId }: GADPlansTabProps) {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<GADPlan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = isAdmin || userRole?.toLowerCase().includes('coordinator') || userRole?.toLowerCase().includes('director');

  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

  const gadSettingsRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'gadSettings') : null), [firestore]);
  const { data: gadSettings } = useDoc<GadSettings>(gadSettingsRef);

  const signatoryRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'signatories') : null), [firestore]);
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: { 
        campusId: userProfile?.campusId || '', 
        responsibleOfficeId: userProfile?.unitId || '',
        budget: 0,
        sourceOfBudget: 'GAA'
    }
  });

  const watchBudget = form.watch('budget') || 0;
  const watchCampusId = form.watch('campusId');
  
  const minRequiredBudget = useMemo(() => {
    return (gadSettings?.institutionalTotalBudget || 0) * 0.05;
  }, [gadSettings]);

  const onSubmit = async (values: z.infer<typeof planSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const data = {
        ...values,
        year: selectedYear,
        unitId: values.responsibleOfficeId,
        responsibleOffice: unitMap.get(values.responsibleOfficeId) || 'UNIT',
        updatedAt: serverTimestamp(),
      };

      if (editingPlan) {
        await updateDoc(doc(firestore, 'gadPlans', editingPlan.id), data);
        toast({ title: 'Plan Item Updated' });
      } else {
        await addDoc(collection(firestore, 'gadPlans'), { ...data, createdAt: serverTimestamp(), status: 'Finalized' });
        toast({ title: 'Plan Registered', description: 'New GPB entry added to the registry.' });
      }
      setIsDialogOpen(false);
      form.reset();
    } catch (e) {
      toast({ title: 'Submission Error', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (plan: GADPlan) => {
    setEditingPlan(plan);
    form.reset({
        ...plan,
        responsibleOfficeId: plan.unitId,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !isAdmin || !window.confirm('Delete this plan entry permanently?')) return;
    try {
      await deleteDoc(doc(firestore, 'gadPlans', id));
      toast({ title: 'Record Removed' });
    } catch (e) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handlePrint = () => {
    if (!plans.length) return;
    
    const unitName = selectedUnitId === 'all' ? 'UNIVERSITY-WIDE' : unitMap.get(selectedUnitId) || 'UNIT';
    const campusName = selectedUnitId === 'all' ? 'Institutional' : campusMap.get(userProfile?.campusId || '') || 'RSU';

    try {
        const reportHtml = renderToStaticMarkup(
            <GADPlanReportTemplate 
                data={plans}
                unitName={unitName}
                campusName={campusName}
                year={selectedYear}
                signatories={signatories || undefined}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <html>
                <head>
                    <title>GAD Plan and Budget - ${unitName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @media print { 
                            @page { size: landscape; margin: 0.5in; }
                            body { margin: 0; padding: 0; background: white; } 
                            .no-print { display: none !important; }
                        }
                        body { font-family: serif; background: #f9fafb; padding: 40px; color: black; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print GAD Plan</button>
                    </div>
                    <div id="print-content">
                        ${reportHtml}
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">Annual GAD Plan & Budget (GPB)</h3>
            <p className="text-xs text-muted-foreground font-medium">Strategic roadmap for institutional gender-responsive activities.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={handlePrint} variant="outline" className="h-10 px-4 font-black uppercase text-[10px] bg-white border-primary/20 text-primary shadow-sm gap-2">
                <Printer className="h-4 w-4" /> PRINT GPB
            </Button>
            {canManage && (
                <Button onClick={() => { setEditingPlan(null); form.reset({ campusId: userProfile?.campusId || '', responsibleOfficeId: userProfile?.unitId || '', budget: 0, sourceOfBudget: 'GAA' }); setIsDialogOpen(true); }} className="h-10 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add GPB Entry
                </Button>
            )}
        </div>
      </div>

      <Card className="shadow-lg border-primary/10 overflow-hidden">
          <CardContent className="p-0">
              <ScrollArea className="h-[60vh]">
                  <Table>
                      <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow>
                              <TableHead className="pl-8 py-4 text-[10px] font-black uppercase">Gender Issue / Objective</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Activity (PAP)</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Indicators & Targets</TableHead>
                              <TableHead className="text-right text-[10px] font-black uppercase">Allocation</TableHead>
                              <TableHead className="text-right pr-8 text-[10px] font-black uppercase">Action</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {plans.map(plan => (
                              <TableRow key={plan.id} className="hover:bg-muted/20 transition-colors group">
                                  <TableCell className="pl-8 py-5">
                                      <div className="space-y-1 max-w-xs">
                                          <p className="font-bold text-sm text-slate-900 leading-tight uppercase group-hover:text-primary transition-colors">{plan.genderIssue}</p>
                                          <p className="text-[10px] text-muted-foreground font-medium italic">Obj: {plan.objective}</p>
                                      </div>
                                  </TableCell>
                                  <TableCell className="max-w-xs font-bold text-xs">{plan.pap}</TableCell>
                                  <TableCell>
                                      <div className="space-y-1 text-xs">
                                          <p className="font-bold text-slate-700">{plan.targets}</p>
                                          <p className="text-[10px] text-muted-foreground italic leading-tight">{plan.performanceIndicators}</p>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                      <div className="flex flex-col items-end">
                                          <span className="text-xs font-black text-primary tabular-nums">₱{plan.budget.toLocaleString()}</span>
                                          <Badge variant="outline" className="h-4 text-[8px] font-black uppercase border-none bg-primary/5 text-primary mt-1">{plan.sourceOfBudget}</Badge>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-right pr-8">
                                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleEdit(plan)}><Edit className="h-4 w-4" /></Button>
                                          {isAdmin && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(plan.id)}><Trash2 className="h-4 w-4" /></Button>}
                                      </div>
                                  </TableCell>
                              </TableRow>
                          ))}
                          {plans.length === 0 && (
                              <TableRow>
                                  <TableCell colSpan={5} className="h-40 text-center opacity-20">
                                      <Target className="h-10 w-10 mx-auto mb-2" />
                                      <p className="text-[10px] font-black uppercase tracking-widest">No plan entries recorded</p>
                                  </TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              </ScrollArea>
          </CardContent>
          <CardFooter className="bg-muted/5 border-t py-4 px-8">
                <div className="flex items-start gap-4">
                    <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                        <strong>PCW Alignment:</strong> The GAD Plan and Budget (GPB) is the primary instrument used to capture the university's intent to address identified gender issues. All unit plans must be verified against the official Procedure Manual.
                    </p>
                </div>
          </CardFooter>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
            <div className="flex items-center gap-2 text-primary mb-1">
                <Target className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Institutional GPB Registry</span>
            </div>
            <DialogTitle>{editingPlan ? 'Update' : 'Register'} GAD Plan Entry</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 bg-white">
            <div className="p-8">
                <Form {...form}>
                    <form id="plan-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2"><Info className="h-4 w-4" /> Issue Identification</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="genderIssue" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-black uppercase">Gender Issue</FormLabel><FormControl><Textarea {...field} rows={3} placeholder="Identify the client-focused or organization-focused gender issue..." className="bg-slate-50" /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="causeOfIssue" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-black uppercase">Cause of Issue</FormLabel><FormControl><Textarea {...field} rows={3} placeholder="What underlying factors contribute to this issue?" className="bg-slate-50" /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </div>

                        <div className="space-y-6 pt-6 border-t border-dashed">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2"><Target className="h-4 w-4" /> Objective & Activity</h4>
                            <FormField control={form.control} name="objective" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-black uppercase">GAD Objective</FormLabel><FormControl><Input {...field} placeholder="Specific goal to address the issue..." className="bg-slate-50" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="pap" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-black uppercase">Program/Activity/Project (PAP)</FormLabel><FormControl><Input {...field} placeholder="Name of the activity..." className="bg-slate-50 font-bold" /></FormControl><FormMessage /></FormItem>
                            )} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="performanceIndicators" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-black uppercase">Performance Indicators</FormLabel><FormControl><Input {...field} placeholder="How will success be measured?" className="bg-slate-50" /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="targets" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-black uppercase">Targets</FormLabel><FormControl><Input {...field} placeholder="Quantifiable goal (e.g. 50 participants)" className="bg-slate-50" /></FormControl></FormItem>
                                )} />
                            </div>
                        </div>

                        <div className="space-y-6 pt-6 border-t border-dashed">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-2 border-b pb-2"><Landmark className="h-4 w-4" /> Fiscal Provisioning</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="budget" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-black uppercase">GAD Budget Allocation (₱)</FormLabel><FormControl><Input type="number" {...field} className="h-11 bg-emerald-50/30 border-emerald-100 font-mono font-black text-lg" /></FormControl>
                                        {gadSettings?.institutionalTotalBudget && (
                                            <FormDescription className="text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-2 mt-1">
                                                <Calculator className="h-3 w-3" />
                                                Min Target (5%): ₱{minRequiredBudget.toLocaleString()}
                                                {watchBudget >= minRequiredBudget ? <Badge className="bg-emerald-600 h-3 text-[7px]">GOAL MET</Badge> : <Badge variant="destructive" className="h-3 text-[7px]">UNDER TARGET</Badge>}
                                            </FormDescription>
                                        )}
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="sourceOfBudget" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-black uppercase">Source of Funds</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-11 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="GAA">GAA (General Appropriations)</SelectItem><SelectItem value="Trust Fund">Trust Fund</SelectItem><SelectItem value="Income">Institutional Income</SelectItem><SelectItem value="Others">Others / External</SelectItem></SelectContent></Select></FormItem>
                                )} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-dashed">
                            <FormField control={form.control} name="campusId" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-black uppercase">Location / Site</FormLabel><Select onValueChange={(val) => { field.onChange(val); form.setValue('responsibleOfficeId', ''); }} value={field.value} disabled={!isAdmin && !!userProfile?.campusId}><FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select Site" /></SelectTrigger></FormControl><SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></FormItem>
                            )} />
                            <FormField control={form.control} name="responsibleOfficeId" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-black uppercase">Responsible Office</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!watchCampusId}><FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select Unit" /></SelectTrigger></FormControl><SelectContent>{units.filter(u => u.campusIds?.includes(watchCampusId)).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></FormItem>
                            )} />
                        </div>
                    </form>
                </Form>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
            <div className="flex w-full items-center justify-between">
                <Button type="button" variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground" onClick={() => setIsDialogOpen(false)}>Discard</Button>
                <Button type="submit" form="plan-form" disabled={isSubmitting} className="min-w-[180px] shadow-xl shadow-primary/20 font-black uppercase text-[10px] h-11">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-1.5" />}
                    {editingPlan ? 'Save Changes' : 'Register Plan Entry'}
                </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

```
  <change>
    <file>src/components/gad/gad-print-templates.tsx</file>
    <content><![CDATA[
'use client';

import React from 'react';
import type { GADPlan, GADActivity, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface GADPlanReportTemplateProps {
  data: GADPlan[];
  unitName: string;
  campusName: string;
  year: number;
  signatories?: Signatories;
}

interface GADAccomplishmentReportTemplateProps {
  data: any[]; // Extended with actuals
  unitName: string;
  campusName: string;
  year: number;
  signatories?: Signatories;
}

/**
 * GAD PLAN AND BUDGET (GPB) PRINT TEMPLATE
 * PCW Standard Landscape Format
 */
export function GADPlanReportTemplate({ data, unitName, campusName, year, signatories }: GADPlanReportTemplateProps) {
  const directorName = signatories?.qaoDirector || '____________________';

  return (
    <div className="p-4 text-black bg-white max-w-[11in] mx-auto font-sans leading-tight">
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-lg font-bold uppercase">Romblon State University</h1>
        <h2 className="text-md font-bold uppercase mt-1">ANNUAL GAD PLAN AND BUDGET (GPB)</h2>
        <p className="text-sm font-black mt-1">FISCAL YEAR: {year}</p>
        <p className="text-xs italic mt-2 uppercase">{unitName} - {campusName}</p>
      </div>

      <table className="w-full border-collapse border-[1.5px] border-black text-[9px]">
        <thead>
          <tr className="bg-slate-100 text-center font-black uppercase">
            <th className="border border-black p-2 w-[15%]">Gender Issue / GAD Mandate</th>
            <th className="border border-black p-2 w-[15%]">Cause of Gender Issue</th>
            <th className="border border-black p-2 w-[15%]">GAD Objective</th>
            <th className="border border-black p-2 w-[15%]">Relevant GAD PAP</th>
            <th className="border border-black p-2 w-[15%]">Performance Indicators / Targets</th>
            <th className="border border-black p-2 w-[10%]">GAD Budget</th>
            <th className="border border-black p-2 w-[15%]">Source of Budget / Office</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={i} className="align-top">
              <td className="border border-black p-2 font-bold">{item.genderIssue}</td>
              <td className="border border-black p-2 italic">{item.causeOfIssue}</td>
              <td className="border border-black p-2">{item.objective}</td>
              <td className="border border-black p-2 font-black uppercase">{item.pap}</td>
              <td className="border border-black p-2">
                <p className="font-bold underline">{item.performanceIndicators}</p>
                <p className="mt-1 italic">{item.targets}</p>
              </td>
              <td className="border border-black p-2 text-right font-black tabular-nums">₱{item.budget.toLocaleString()}</td>
              <td className="border border-black p-2 text-center font-bold">
                <p>{item.sourceOfBudget}</p>
                <p className="mt-2 text-[8px] opacity-60">RESP: {item.responsibleOffice}</p>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={7} className="border border-black p-8 text-center text-slate-400 italic">No plan entries defined for this unit.</td></tr>
          )}
        </tbody>
      </table>

      <div className="mt-12 grid grid-cols-3 gap-16 px-10 text-[10px] font-black uppercase">
          <div className="text-center">
              <p className="text-left mb-8 opacity-60">Prepared by:</p>
              <div className="border-b border-black pb-1">GAD COORDINATOR</div>
              <p className="mt-1 text-[8px]">Unit Level</p>
          </div>
          <div className="text-center">
              <p className="text-left mb-8 opacity-60">Reviewed by:</p>
              <div className="border-b border-black pb-1">QAO / GAD DIRECTOR</div>
          </div>
          <div className="text-center">
              <p className="text-left mb-8 opacity-60">Approved by:</p>
              <div className="border-b border-black pb-1 font-black text-primary">{directorName}</div>
              <p className="mt-1 text-[8px]">UNIVERSITY AUTHORITY</p>
          </div>
      </div>

      <div className="mt-12 text-[8px] text-slate-400 italic border-t pt-2 flex justify-between">
          <span>Official RSU GAD Document | Ref: QAO-GPB-{year}</span>
          <span>Generated via RSU EOMS Portal</span>
      </div>
    </div>
  );
}

/**
 * GAD ACCOMPLISHMENT REPORT (GAD AR) PRINT TEMPLATE
 */
export function GADAccomplishmentReportTemplate({ data, unitName, campusName, year, signatories }: GADAccomplishmentReportTemplateProps) {
  const directorName = signatories?.qaoDirector || '____________________';

  return (
    <div className="p-4 text-black bg-white max-w-[11in] mx-auto font-sans leading-tight">
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-lg font-bold uppercase">Romblon State University</h1>
        <h2 className="text-md font-bold uppercase mt-1">ANNUAL GAD ACCOMPLISHMENT REPORT (GAD AR)</h2>
        <p className="text-sm font-black mt-1">FISCAL YEAR: {year}</p>
        <p className="text-xs italic mt-2 uppercase">{unitName} - {campusName}</p>
      </div>

      <table className="w-full border-collapse border-[1.5px] border-black text-[8px]">
        <thead>
          <tr className="bg-slate-100 text-center font-black uppercase">
            <th className="border border-black p-1 w-[12%]">GAD PAP</th>
            <th className="border border-black p-1 w-[12%]">Target Output</th>
            <th className="border border-black p-1 w-[12%]">Actual Accomplishment</th>
            <th className="border border-black p-1 w-[12%]">Planned Budget</th>
            <th className="border border-black p-1 w-[12%]">Actual Expenditure</th>
            <th className="border border-black p-1 w-[15%]">Actual Reach (M/F)</th>
            <th className="border border-black p-1 w-[25%]">Variance / Remarks</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={i} className="align-top">
              <td className="border border-black p-1 font-black uppercase">{item.pap}</td>
              <td className="border border-black p-1">{item.targets}</td>
              <td className="border border-black p-1 font-bold italic">{item.actualOutput || 'Verified Operational'}</td>
              <td className="border border-black p-1 text-right tabular-nums font-bold">₱{item.budget.toLocaleString()}</td>
              <td className="border border-black p-1 text-right tabular-nums font-black text-emerald-700">₱{item.actualBudget.toLocaleString()}</td>
              <td className="border border-black p-1 text-center font-black">
                M: {item.actualMale} | F: {item.actualFemale}
              </td>
              <td className="border border-black p-1 italic text-slate-600 leading-relaxed">
                {item.varianceBudget !== 0 && `Budget Variance: ₱${Math.abs(item.varianceBudget).toLocaleString()} (${item.varianceBudget < 0 ? 'Over' : 'Under'} spend). `}
                {item.varianceAnalysis}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-12 grid grid-cols-3 gap-16 px-10 text-[10px] font-black uppercase">
          <div className="text-center">
              <p className="text-left mb-8 opacity-60">Prepared by:</p>
              <div className="border-b border-black pb-1">GAD COORDINATOR</div>
          </div>
          <div className="text-center">
              <p className="text-left mb-8 opacity-60">Verified by:</p>
              <div className="border-b border-black pb-1">GAD OFFICE DIRECTOR</div>
          </div>
          <div className="text-center">
              <p className="text-left mb-8 opacity-60">Approved by:</p>
              <div className="border-b border-black pb-1 font-black text-primary">{directorName}</div>
          </div>
      </div>

      <div className="mt-12 text-[8px] text-slate-400 italic border-t pt-2 flex justify-between">
          <span>Official RSU GAD Document | Ref: QAO-AR-{year}</span>
          <span>Generated via RSU EOMS Portal</span>
      </div>
    </div>
  );
}
