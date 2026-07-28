'use client';

/**
 * @fileOverview GAD Plan and Budget (GPB) management tab.
 */

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
  ShieldCheck,
  FileText,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from '@/firebase/firestore-wrapper';
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
  gadActivityName: z.string().min(1, 'Required'),
  pap: z.string().min(1, 'Required'),
  performanceIndicators: z.string().min(1, 'Required'),
  targets: z.string().min(1, 'Required'),
  budget: z.coerce.number().min(0),
  sourceOfBudget: z.string().min(1, 'Required'),
  responsibleOfficeId: z.string().min(1, 'Required'),
  campusId: z.string().min(1, 'Required'),
  category: z
    .enum(['CLIENT-FOCUSED ACTIVITIES', 'ORGANIZATION-FOCUSED ACTIVITIES', 'ATTRIBUTED PROGRAM'])
    .default('CLIENT-FOCUSED ACTIVITIES'),
  hgdgScore: z.coerce.number().min(0).max(20).optional(),
  psCost: z.coerce.number().min(0).optional(),
  mooeCost: z.coerce.number().min(0).optional(),
  coCost: z.coerce.number().min(0).optional(),
  implementationStatus: z
    .enum(['Done', 'Partially Done', 'On-going', 'Yet to be implemented', 'Not Done'])
    .default('Done'),
  actualResult: z.string().optional(),
  actualCost: z.coerce.number().min(0).optional(),
  varianceRemarks: z.string().optional(),
});

export function GADPlansTab({ plans, campuses, units, selectedYear, selectedUnitId }: GADPlansTabProps) {
  const { userProfile, isAdmin, userRole, user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<GADPlan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<GADPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);
  const campusMap = useMemo(() => new Map(campuses.map((c) => [c.id, c.name])), [campuses]);

  const gadSettingsRef = useMemoFirebase(
    () => (firestore && userProfile ? doc(firestore, 'system', 'gadSettings') : null),
    [firestore, userProfile],
  );
  const { data: gadSettings } = useDoc<GadSettings>(gadSettingsRef);

  const signatoryRef = useMemoFirebase(
    () => (firestore && userProfile ? doc(firestore, 'system', 'signatories') : null),
    [firestore, userProfile],
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const isGadLeader = useMemo(
    () => !!(gadSettings?.leadershipUnitId && userProfile?.unitId === gadSettings.leadershipUnitId),
    [gadSettings, userProfile],
  );

  const canManage =
    isAdmin ||
    isGadLeader ||
    userRole?.toLowerCase().includes('coordinator') ||
    userRole?.toLowerCase().includes('director');

  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      campusId: userProfile?.campusId || '',
      responsibleOfficeId: userProfile?.unitId || '',
      budget: 0,
      sourceOfBudget: 'GAA',
    },
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
      const payload = {
        ...values,
        year: selectedYear,
        unitId: values.responsibleOfficeId,
        responsibleOffice: unitMap.get(values.responsibleOfficeId) || 'UNIT',
        updatedAt: serverTimestamp(),
      };

      const data = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== undefined));

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
      console.error(e);
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

  const handleDelete = async () => {
    if (!firestore || !deletingPlan || !canManage) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'gadPlans', deletingPlan.id));
      toast({
        title: 'GPB Entry Removed',
        description: `"${deletingPlan.gadActivityName || deletingPlan.genderIssue}" has been permanently deleted.`,
      });
      setDeletingPlan(null);
    } catch (e) {
      toast({
        title: 'Delete Failed',
        description: 'Could not remove this entry. Check your permissions.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
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
        />,
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
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-slate-200">
            Annual GAD Plan & Budget (GPB)
          </h3>
          <p className="text-xs text-muted-foreground font-medium">
            Strategic roadmap for institutional gender-responsive activities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            variant="outline"
            className="h-10 px-4 font-black uppercase text-[10px] bg-white border-primary/20 text-primary shadow-sm gap-2"
          >
            <Printer className="h-4 w-4" /> PRINT GPB
          </Button>
          {canManage && (
            <Button
              onClick={() => {
                setEditingPlan(null);
                form.reset({
                  campusId: userProfile?.campusId || '',
                  responsibleOfficeId: userProfile?.unitId || '',
                  budget: 0,
                  sourceOfBudget: 'GAA',
                  actualResult: '',
                  actualCost: undefined,
                  varianceRemarks: '',
                });
                setIsDialogOpen(true);
              }}
              className="h-10 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add GPB Entry
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-lg border-primary/10 overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="h-[60dvh]">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="pl-8 py-4 text-[10px] font-black uppercase w-[14%]">
                    Gender Issue / GAD Mandate
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase w-[6%]">Category</TableHead>
                  <TableHead className="text-[10px] font-black uppercase w-[11%]">GAD Activity / PAP</TableHead>
                  <TableHead className="text-[10px] font-black uppercase w-[11%]">
                    Objective / Indicators & Targets
                  </TableHead>
                  <TableHead className="text-[10px] font-black uppercase w-[11%]">Cause of Issue</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase w-[10%]">Budget & Source</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase w-[8%]">Actual Result</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase w-[8%]">Actual Cost</TableHead>
                  <TableHead className="text-[10px] font-black uppercase w-[10%]">Variance / Remarks</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase w-[7%]">Status</TableHead>
                  <TableHead className="text-right pr-8 text-[10px] font-black uppercase w-[7%]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id} className="hover:bg-muted/20 transition-colors group">
                    <TableCell className="pl-8 py-5">
                      <div className="space-y-1 max-w-xs">
                        <p className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-tight uppercase group-hover:text-primary transition-colors">
                          {plan.genderIssue}
                        </p>
                        {plan.causeOfIssue && (
                          <p className="text-[9px] text-muted-foreground italic line-clamp-2">{plan.causeOfIssue}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[7px] font-black uppercase tracking-wider whitespace-nowrap',
                          plan.category === 'CLIENT-FOCUSED ACTIVITIES' && 'border-blue-200 bg-blue-50 text-blue-700',
                          plan.category === 'ORGANIZATION-FOCUSED ACTIVITIES' &&
                            'border-amber-200 bg-amber-50 text-amber-700',
                          plan.category === 'ATTRIBUTED PROGRAM' && 'border-violet-200 bg-violet-50 text-violet-700',
                          !plan.category && 'border-slate-200 bg-slate-50 text-slate-500',
                        )}
                      >
                        {plan.category === 'CLIENT-FOCUSED ACTIVITIES'
                          ? 'CLIENT'
                          : plan.category === 'ORGANIZATION-FOCUSED ACTIVITIES'
                            ? 'ORG'
                            : plan.category === 'ATTRIBUTED PROGRAM'
                              ? 'ATTR'
                              : 'GPB'}
                      </Badge>
                      {plan.hgdgScore != null && (
                        <p className="text-[8px] font-bold text-violet-600 mt-1">HGDG: {plan.hgdgScore}/20</p>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="font-bold text-xs">{plan.gadActivityName || plan.pap}</p>
                      <p className="text-[9px] text-muted-foreground italic mt-0.5 line-clamp-2">{plan.pap}</p>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <p className="font-bold text-[10px] text-primary leading-tight">{plan.objective}</p>
                        <p className="font-bold text-slate-700 dark:text-slate-300 text-[10px]">{plan.targets}</p>
                        <p className="text-[9px] text-muted-foreground italic leading-tight">
                          {plan.performanceIndicators}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-[10px] italic text-muted-foreground leading-snug line-clamp-3">
                        {plan.causeOfIssue}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-primary tabular-nums">
                          ₱{plan.budget.toLocaleString()}
                        </span>
                        <Badge
                          variant="outline"
                          className="h-4 text-[7px] font-black uppercase border-none bg-primary/5 text-primary mt-1"
                        >
                          {plan.sourceOfBudget}
                        </Badge>
                        {plan.psCost || plan.mooeCost || plan.coCost ? (
                          <div className="text-[8px] font-mono text-muted-foreground mt-1 space-y-0.5">
                            {plan.psCost ? <span>PS: ₱{plan.psCost.toLocaleString()}</span> : null}
                            {plan.mooeCost ? (
                              <span>
                                {plan.psCost ? ' | ' : ''}MOOE: ₱{plan.mooeCost.toLocaleString()}
                              </span>
                            ) : null}
                            {plan.coCost ? (
                              <span>
                                {plan.psCost || plan.mooeCost ? ' | ' : ''}CO: ₱{plan.coCost.toLocaleString()}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <p className="text-[10px] leading-snug line-clamp-2">{plan.actualResult || '—'}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xs font-black tabular-nums">
                        {plan.actualCost != null ? `₱${plan.actualCost.toLocaleString()}` : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-[9px] italic text-muted-foreground leading-snug line-clamp-2">
                        {plan.varianceRemarks || '—'}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[8px] font-black uppercase',
                          plan.implementationStatus === 'Done' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                          plan.implementationStatus === 'Partially Done' &&
                            'border-amber-200 bg-amber-50 text-amber-700',
                          plan.implementationStatus === 'On-going' && 'border-blue-200 bg-blue-50 text-blue-700',
                          plan.implementationStatus === 'Yet to be implemented' &&
                            'border-slate-200 bg-slate-50 text-slate-500',
                          plan.implementationStatus === 'Not Done' && 'border-red-200 bg-red-50 text-red-700',
                        )}
                      >
                        {plan.implementationStatus === 'Yet to be implemented'
                          ? 'PENDING'
                          : plan.implementationStatus === 'Partially Done'
                            ? 'PARTIAL'
                            : plan.implementationStatus || 'DONE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          onClick={() => handleEdit(plan)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingPlan(plan)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-[8px] text-muted-foreground mt-1 truncate max-w-[100px]">
                        {plan.responsibleOffice}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
                {plans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="h-40 text-center opacity-20">
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
            <p className="text-[11px] text-muted-foreground italic leading-relaxed">
              <strong>PCW Alignment:</strong> The GAD Plan and Budget (GPB) is the primary instrument used to capture
              the university's intent to address identified gender issues. All unit plans must be verified against the
              official Procedure Manual.
            </p>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl h-[85dvh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 border-b bg-slate-50 dark:bg-slate-800/50 shrink-0">
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
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2">
                      <Info className="h-4 w-4" /> Issue Identification
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="genderIssue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase">Gender Issue / GAD Mandate</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={3}
                                placeholder="Identify the client-focused or organization-focused gender issue..."
                                className="bg-slate-50 dark:bg-slate-800/50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="causeOfIssue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase">Cause of Gender Issue</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={3}
                                placeholder="What underlying factors contribute to this issue?"
                                className="bg-slate-50 dark:bg-slate-800/50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-dashed">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 border-b pb-2">
                      <Target className="h-4 w-4" /> Objective & Activity
                    </h4>
                    <FormField
                      control={form.control}
                      name="objective"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black uppercase">GAD Result / GAD Objective</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Specific goal to address the issue..."
                              className="bg-slate-50 dark:bg-slate-800/50"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="gadActivityName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase">GAD Activity</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Specific activity name (e.g. Conduct GAD Orientation)"
                                className="bg-slate-50 dark:bg-slate-800/50"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pap"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase">
                              Relevant Organization MFO/PAP or PPA
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g. MFO1: Research Services – GAD-Related Research Output"
                                className="bg-slate-50 dark:bg-slate-800/50 font-bold"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="performanceIndicators"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase">
                              Performance Indicators / Targets
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="How will success be measured?"
                                className="bg-slate-50 dark:bg-slate-800/50"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="targets"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase">Targets</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Quantifiable goal (e.g. 50 participants)"
                                className="bg-slate-50 dark:bg-slate-800/50"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-dashed">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-700 flex items-center gap-2 border-b pb-2">
                      <Gavel className="h-4 w-4" /> GAD Category & HGDG
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase">PCW Category</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11 font-bold">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent modal={false}>
                                <SelectItem value="CLIENT-FOCUSED ACTIVITIES">Client-Focused Activities</SelectItem>
                                <SelectItem value="ORGANIZATION-FOCUSED ACTIVITIES">
                                  Organization-Focused Activities
                                </SelectItem>
                                <SelectItem value="ATTRIBUTED PROGRAM">Attributed Program (HGDG)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-[10px]">
                              Classify the entry per PCW standard categories.
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                      {form.watch('category') === 'ATTRIBUTED PROGRAM' && (
                        <FormField
                          control={form.control}
                          name="hgdgScore"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase">HGDG Score (0-20)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  max={20}
                                  {...field}
                                  className="h-11 bg-violet-50/30 border-violet-100 font-mono font-black"
                                />
                              </FormControl>
                              <FormDescription className="text-[10px]">
                                Score from HGDG design checklist (only for Attributed Programs).
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-dashed">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-2 border-b pb-2">
                      <Landmark className="h-4 w-4" /> Fiscal Provisioning
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="budget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase">
                              Total Agency Approved Budget (₱)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                className="h-11 bg-emerald-50/30 border-emerald-100 font-mono font-black text-lg"
                              />
                            </FormControl>
                            {gadSettings?.institutionalTotalBudget && (
                              <FormDescription className="text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-2 mt-1">
                                <Calculator className="h-3 w-3" />
                                Min Target (5%): ₱
                                {((gadSettings.institutionalTotalBudget || 0) * 0.05).toLocaleString()}
                                {watchBudget >= (gadSettings.institutionalTotalBudget || 0) * 0.05 ? (
                                  <Badge className="bg-emerald-600 h-3 text-[7px]">GOAL MET</Badge>
                                ) : (
                                  <Badge variant="destructive" className="h-3 text-[7px]">
                                    UNDER TARGET
                                  </Badge>
                                )}
                              </FormDescription>
                            )}
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sourceOfBudget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase">Source of Funds</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11 font-bold">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent modal={false}>
                                <SelectItem value="GAA">GAA (General Appropriations)</SelectItem>
                                <SelectItem value="Trust Fund">Trust Fund</SelectItem>
                                <SelectItem value="Income">Institutional Income</SelectItem>
                                <SelectItem value="COB">Corporate Operating Budget (COB)</SelectItem>
                                <SelectItem value="ODA">Official Development Assistance (ODA)</SelectItem>
                                <SelectItem value="Others">Others / External</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border">
                      <FormField
                        control={form.control}
                        name="psCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase">Personnel Services (PS)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                placeholder="0"
                                className="h-9 font-mono font-bold bg-white text-xs"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="mooeCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase">MOOE</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                placeholder="0"
                                className="h-9 font-mono font-bold bg-white text-xs"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="coCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase">Capital Outlay (CO)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                placeholder="0"
                                className="h-9 font-mono font-bold bg-white text-xs"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-dashed">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700 flex items-center gap-2 border-b pb-2">
                      <ShieldCheck className="h-4 w-4" /> Status & Implementation
                    </h4>
                    <FormField
                      control={form.control}
                      name="implementationStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black uppercase">Implementation Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 font-bold">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent modal={false}>
                              <SelectItem value="Done">Done</SelectItem>
                              <SelectItem value="Partially Done">Partially Done</SelectItem>
                              <SelectItem value="On-going">On-going</SelectItem>
                              <SelectItem value="Yet to be implemented">Yet to be implemented</SelectItem>
                              <SelectItem value="Not Done">Not Done</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-[10px]">
                            Current implementation status of this GPB entry.
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-6 pt-6 border-t border-dashed">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-sky-700 flex items-center gap-2 border-b pb-2">
                      <FileText className="h-4 w-4" /> Actual Accomplishment
                    </h4>
                    <FormField
                      control={form.control}
                      name="actualResult"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black uppercase">
                            Actual Result (Outputs/Outcomes)
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={2}
                              placeholder="What was actually achieved?"
                              className="bg-sky-50/30 dark:bg-sky-800/20 border-sky-100"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="actualCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase">
                              Actual Cost / Expenditure (₱)
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                placeholder="0"
                                className="h-11 bg-sky-50/30 border-sky-100 font-mono font-black text-lg"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="varianceRemarks"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase">Variance / Remarks</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={2}
                                placeholder="Explain any variance between planned budget and actual cost..."
                                className="bg-sky-50/30 dark:bg-sky-800/20 border-sky-100"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-dashed">
                    <FormField
                      control={form.control}
                      name="campusId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black uppercase">Location / Site</FormLabel>
                          <Select
                            onValueChange={(val) => {
                              field.onChange(val);
                              form.setValue('responsibleOfficeId', '');
                            }}
                            value={field.value}
                            disabled={!isAdmin && !isGadLeader && !!userProfile?.campusId}
                          >
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select Site" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent modal={false}>
                              {campuses.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="responsibleOfficeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black uppercase">Responsible Unit/Office</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!watchCampusId}>
                            <FormControl>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select Unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent modal={false}>
                              {units
                                .filter((u) => u.campusIds?.includes(watchCampusId))
                                .map((u) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-slate-50 dark:bg-slate-800/50 shrink-0 gap-2 sm:gap-0">
            <div className="flex w-full items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                onClick={() => setIsDialogOpen(false)}
              >
                Discard
              </Button>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  form="plan-form"
                  disabled={isSubmitting}
                  className="min-w-[180px] shadow-xl shadow-primary/20 font-black uppercase text-[10px] h-11"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 mr-1.5" />
                  )}
                  {editingPlan ? 'Save Changes' : 'Register Plan Entry'}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
