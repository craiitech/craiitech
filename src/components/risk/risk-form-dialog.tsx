'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import type { Risk, User as AppUser, Unit, Campus } from '@/lib/types';
import { Loader2, AlertCircle, Sparkles, FileText, HelpCircle, ListChecks, CalendarIcon, ShieldCheck, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { suggestRiskTreatment } from '@/ai/flows/suggest-treatment-flow';
import { Badge } from '../ui/badge';
import { saveRiskAdmin } from '@/lib/actions';
import { ScrollArea } from '../ui/scroll-area';

interface RiskFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  risk: Risk | null;
  unitUsers: AppUser[];
  allUnits: Unit[];
  allCampuses: Campus[];
  isMandatory?: boolean;
  registryLink?: string | null;
}

const months = [
  { value: '0', label: 'January' }, { value: '1', label: 'February' }, { value: '2', label: 'March' },
  { value: '3', label: 'April' }, { value: '4', label: 'May' }, { value: '5', label: 'June' },
  { value: '6', label: 'July' }, { value: '7', label: 'August' }, { value: '8', label: 'September' },
  { value: '9', label: 'October' }, { value: '10', label: 'November' }, { value: '11', label: 'December' },
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

const formSchema = z.object({
  year: z.number().int(),
  objective: z.string().min(1, 'Objective is required'),
  type: z.enum(['Risk', 'Opportunity']),
  description: z.string().min(1, 'Description is required'),
  currentControls: z.string().min(1, 'Current controls are required.'),
  likelihood: z.number().min(1).max(5),
  consequence: z.number().min(1).max(5),
  treatmentAction: z.string().optional(),
  responsiblePersonId: z.string().optional(),
  targetYear: z.string().optional(),
  targetMonth: z.string().optional(),
  targetDay: z.string().optional(),
  status: z.enum(['Open', 'In Progress', 'Closed']),
  postTreatmentLikelihood: z.number().optional(),
  postTreatmentConsequence: z.number().optional(),
  postTreatmentEvidence: z.string().optional(),
  postTreatmentDateImplemented: z.date().optional(),
  oapNo: z.string().optional(),
  resourcesNeeded: z.string().optional(),
  updates: z.string().optional(),
  preparedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  adminCampusId: z.string().optional(),
  adminUnitId: z.string().optional(),
}).superRefine((data, ctx) => {
    const magnitude = (data.likelihood || 0) * (data.consequence || 0);
    const rating = getRating(magnitude);
    if (rating === 'Medium' || rating === 'High') {
        if (!data.treatmentAction) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Action Plan is required for Medium/High ratings.', path: ['treatmentAction'] });
        if (!data.responsiblePersonId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Accountable Person is required for Medium/High ratings.', path: ['responsiblePersonId'] });
        if (!data.targetYear || !data.targetMonth || !data.targetDay) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A complete Target Date is required.', path: ['targetDay'] });
    }
    if (data.status === 'Closed') {
        if (!data.postTreatmentLikelihood || !data.postTreatmentConsequence) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Post-treatment analysis is required to close a risk.', path: ['postTreatmentLikelihood'] });
        if (!data.postTreatmentEvidence) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Evidence is required to close a risk.', path: ['postTreatmentEvidence'] });
        if (!data.postTreatmentDateImplemented) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Date is required to close a risk.', path: ['postTreatmentDateImplemented'] });
    }
});

const likelihoodOptions = [
  { value: 1, label: '1 - Rare' }, { value: 2, label: '2 - Unlikely' }, { value: 3, label: '3 - Possible' }, { value: 4, label: '4 - Likely' }, { value: 5, label: '5 - Almost Certain' },
];

const consequenceOptions = [
  { value: 1, label: '1 - Insignificant' }, { value: 2, label: '2 - Minor' }, { value: 3, label: '3 - Moderate' }, { value: 4, label: '4 - Major' }, { value: 5, label: '5 - Catastrophic' },
];

const getRating = (magnitude: number): string => {
  if (magnitude >= 15) return 'High';
  if (magnitude >= 5) return 'Medium';
  return 'Low';
};

export function RiskFormDialog({ isOpen, onOpenChange, risk, unitUsers, allUnits, allCampuses, isMandatory, registryLink }: RiskFormDialogProps) {
  const { userProfile, isAdmin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { logSessionActivity } = useSessionActivity();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      year: new Date().getFullYear(),
      objective: '',
      type: 'Risk',
      description: '',
      currentControls: '',
      treatmentAction: '',
      status: 'Open',
    },
  });

  const selectedAdminCampusId = form.watch('adminCampusId');
  const selectedAdminUnitId = form.watch('adminUnitId');

  useEffect(() => {
    if (risk) {
      const targetDate = risk.targetDate?.toDate();
      const dateImplemented = risk.postTreatment?.dateImplemented?.toDate();
      form.reset({
        ...risk,
        likelihood: risk.preTreatment.likelihood,
        consequence: risk.preTreatment.consequence,
        targetYear: targetDate ? String(targetDate.getFullYear()) : undefined,
        targetMonth: targetDate ? String(targetDate.getMonth()) : undefined,
        targetDay: targetDate ? String(targetDate.getDate()) : undefined,
        postTreatmentLikelihood: risk.postTreatment?.likelihood,
        postTreatmentConsequence: risk.postTreatment?.consequence,
        postTreatmentEvidence: risk.postTreatment?.evidence || '',
        postTreatmentDateImplemented: dateImplemented,
        adminCampusId: risk.campusId,
        adminUnitId: risk.unitId,
      });
    } else {
      form.reset({
        year: new Date().getFullYear(),
        objective: '',
        type: 'Risk',
        status: 'Open',
        adminCampusId: userProfile?.campusId || '',
        adminUnitId: userProfile?.unitId || '',
      });
    }
  }, [risk, isOpen, form, userProfile]);

  const likelihood = form.watch('likelihood');
  const consequence = form.watch('consequence');
  const riskType = form.watch('type');
  const description = form.watch('description');
  const objective = form.watch('objective');
  const magnitude = likelihood && consequence ? likelihood * consequence : 0;
  const rating = getRating(magnitude);
  
  const showActionPlan = rating === 'Medium' || rating === 'High';
  const isStepDisabled = isAdmin && !selectedAdminUnitId;

  const filteredUnits = useMemo(() => {
    if (!isAdmin || !selectedAdminCampusId) return allUnits;
    return allUnits.filter(u => u.campusIds?.includes(selectedAdminCampusId));
  }, [isAdmin, selectedAdminCampusId, allUnits]);

  const filteredUsers = useMemo(() => {
    const targetUnitId = isAdmin ? selectedAdminUnitId : userProfile?.unitId;
    if (!targetUnitId) return [];
    return unitUsers.filter(u => u.unitId === targetUnitId);
  }, [isAdmin, selectedAdminUnitId, userProfile, unitUsers]);

  const handleAISuggest = async () => {
    if (!description || !objective) {
        toast({ title: "Insufficient Data", description: "Please fill in the Objective and Description first.", variant: "destructive" });
        return;
    }
    setIsSuggesting(true);
    try {
        const result = await suggestRiskTreatment({ type: riskType, description, objective });
        const currentAction = form.getValues('treatmentAction') || '';
        form.setValue('treatmentAction', currentAction + (currentAction ? '\n\n' : '') + "**AI Suggestions:**\n" + result.suggestions);
        toast({ title: "Suggestions Ready", description: "AI recommendations added." });
    } catch(e) {
        toast({ title: "AI Error", description: "Could not generate suggestions.", variant: "destructive" });
    } finally {
        setIsSuggesting(false);
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !userProfile) return;
    setIsSubmitting(true);
    
    const responsiblePerson = filteredUsers.find(u => u.id === values.responsiblePersonId);
    let targetDateValue: Date | null = null;
    if (values.targetYear && values.targetMonth && values.targetDay) {
        targetDateValue = new Date(Number(values.targetYear), Number(values.targetMonth), Number(values.targetDay));
    }

    const targetUnitId = isAdmin ? values.adminUnitId : userProfile.unitId;
    const targetCampusId = isAdmin ? values.adminCampusId : userProfile.campusId;

    const riskData: any = {
      ...values,
      unitId: targetUnitId,
      campusId: targetCampusId,
      preTreatment: { likelihood: values.likelihood, consequence: values.consequence, magnitude, rating },
      postTreatment: values.status === 'Closed' && values.postTreatmentLikelihood && values.postTreatmentConsequence ? {
        likelihood: values.postTreatmentLikelihood,
        consequence: values.postTreatmentConsequence,
        magnitude: postTreatmentLikelihood && values.postTreatmentConsequence ? values.postTreatmentLikelihood * values.postTreatmentConsequence : 0,
        rating: getRating(values.postTreatmentLikelihood * (values.postTreatmentConsequence || 0)),
        evidence: values.postTreatmentEvidence || '',
        dateImplemented: values.postTreatmentDateImplemented || null,
      } : risk?.postTreatment || null,
      responsiblePersonId: values.responsiblePersonId || '',
      responsiblePersonName: responsiblePerson ? `${responsiblePerson.firstName} ${responsiblePerson.lastName}` : '',
      targetDate: targetDateValue,
    };

    try {
        if (isAdmin) {
            await saveRiskAdmin(riskData, risk?.id);
            logSessionActivity(`Admin ${risk ? 'updated' : 'created'} risk entry`, { action: 'admin_save_risk', details: { riskId: risk?.id }});
        } else {
            if (risk) {
                const riskRef = doc(firestore, 'risks', risk.id);
                await setDoc(riskRef, { ...riskData, createdAt: risk.createdAt, updatedAt: serverTimestamp() }, { merge: true });
            } else {
                const riskRef = collection(firestore, 'risks');
                await addDoc(riskRef, { ...riskData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            }
        }
        toast({ title: 'Success', description: 'Risk/Opportunity has been saved.' });
        onOpenChange(false);
    } catch (error: any) {
        console.error("Error saving risk:", error);
        toast({ title: 'Error', description: error.message || 'Could not save the entry.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const previewEmbedUrl = registryLink ? registryLink.replace('/view', '/preview').replace('?usp=sharing', '') : null;

  return (
    <Dialog open={isOpen} onOpenChange={isMandatory ? undefined : onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl h-[95vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 border-b shrink-0 bg-card">
            <div className="flex items-center gap-2">
                <DialogTitle className="text-xl">{risk ? 'Edit' : 'Log New'} Risk or Opportunity</DialogTitle>
                {isMandatory && <Badge variant="destructive">Required Action</Badge>}
                {isAdmin && <Badge variant="secondary">Admin Overdrive Mode</Badge>}
            </div>
            <DialogDescription className="mt-1">
                {isAdmin ? "As an administrator, you can encode risk information for any unit." : "Fill out your unit's risk or opportunity details."}
            </DialogDescription>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Left Panel: The Form */}
            <div className="flex-1 flex flex-col min-w-0 border-r">
                <ScrollArea className="flex-1">
                    <Form {...form}>
                        <form id="risk-form" onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
                            {isAdmin && (
                                <Card className="border-orange-500/50 bg-orange-50/5">
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                                            <ShieldCheck className="h-5 w-5" />
                                            Administration: Assign to Unit
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="adminCampusId" render={({ field }) => (
                                            <FormItem><FormLabel>Campus</FormLabel>
                                                <Select onValueChange={(v) => { field.onChange(v); form.setValue('adminUnitId', ''); }} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Campus" /></SelectTrigger></FormControl>
                                                    <SelectContent>{allCampuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="adminUnitId" render={({ field }) => (
                                            <FormItem><FormLabel>Unit</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value} disabled={!selectedAdminCampusId}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger></FormControl>
                                                    <SelectContent>{filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                    </CardContent>
                                </Card>
                            )}

                            <div className={cn("space-y-6 transition-opacity duration-300", isStepDisabled && "opacity-40 pointer-events-none")}>
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Step 1: Identification</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField control={form.control} name="type" render={({ field }) => (
                                            <FormItem className="space-y-3"><FormLabel>Type</FormLabel>
                                                <FormControl><RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center space-x-4" disabled={isStepDisabled}>
                                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Risk" /></FormControl><Label className="font-normal">Risk</Label></FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Opportunity" /></FormControl><Label className="font-normal">Opportunity</Label></FormItem>
                                                </RadioGroup></FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="objective" render={({ field }) => (<FormItem><FormLabel>Process Objective</FormLabel><FormControl><Input {...field} disabled={isStepDisabled} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} disabled={isStepDisabled} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={form.control} name="currentControls" render={({ field }) => (<FormItem><FormLabel>Current Controls</FormLabel><FormControl><Textarea {...field} disabled={isStepDisabled} /></FormControl><FormMessage /></FormItem>)} />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Step 2: Analysis</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="likelihood" render={({ field }) => (
                                                <FormItem><FormLabel>Likelihood (1-5)</FormLabel>
                                                    <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)} disabled={isStepDisabled}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                                        <SelectContent>{likelihoodOptions.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="consequence" render={({ field }) => (
                                                <FormItem><FormLabel>Consequence (1-5)</FormLabel>
                                                    <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)} disabled={isStepDisabled}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                                        <SelectContent>{consequenceOptions.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 rounded-md border p-4 bg-muted/50">
                                            <div><span className="font-medium">Magnitude:</span> {magnitude}</div>
                                            <div><span className="font-medium">Rating:</span> {rating}</div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {showActionPlan && (
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                            <CardTitle className="text-lg">Step 3: Action Plan</CardTitle>
                                            <Button type="button" variant="outline" size="sm" onClick={handleAISuggest} disabled={isSuggesting || isStepDisabled} className="h-8">
                                                {isSuggesting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                                                AI Suggest
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <FormField control={form.control} name="treatmentAction" render={({ field }) => (<FormItem><FormLabel>Treatment Plan</FormLabel><FormControl><Textarea {...field} rows={6} disabled={isStepDisabled} /></FormControl><FormMessage /></FormItem>)} />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField control={form.control} name="responsiblePersonId" render={({ field }) => (
                                                    <FormItem><FormLabel>Accountable Person</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value} disabled={isStepDisabled || filteredUsers.length === 0}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder={isAdmin && !selectedAdminUnitId ? "Select Unit First" : "Select Person"} /></SelectTrigger></FormControl>
                                                            <SelectContent>{filteredUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    <FormMessage /></FormItem>
                                                )} />
                                                <div className="space-y-2">
                                                    <FormLabel>Target Date</FormLabel>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <FormField control={form.control} name="targetMonth" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value} disabled={isStepDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger></FormControl><SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                                        <FormField control={form.control} name="targetDay" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value} disabled={isStepDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger></FormControl><SelectContent>{days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                                        <FormField control={form.control} name="targetYear" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value} disabled={isStepDisabled}><FormControl><SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger></FormControl><SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Step 4: Status</CardTitle></CardHeader>
                                    <CardContent>
                                         <FormField control={form.control} name="status" render={({ field }) => (
                                            <FormItem><FormLabel>Overall Status</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value} disabled={isStepDisabled}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                                    <SelectContent><SelectItem value="Open">Open</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Closed">Closed</SelectItem></SelectContent>
                                                </Select>
                                            <FormMessage /></FormItem>
                                        )} />
                                    </CardContent>
                                </Card>
                            </div>
                        </form>
                    </Form>
                </ScrollArea>
            </div>

            {/* Right Panel: Reference Sidebar */}
            <div className="hidden lg:flex w-96 flex-col bg-muted/20">
                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-6">
                        {previewEmbedUrl && (
                            <Card className="border-primary/20 bg-muted/30">
                                <CardHeader className="py-3 px-4">
                                    <CardTitle className="text-xs flex items-center gap-2">
                                        <FileText className="h-3 w-3 text-primary" />
                                        Reference Document
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 aspect-[3/4]">
                                    <iframe src={previewEmbedUrl} className="h-full w-full border-none" allow="autoplay"></iframe>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader className="py-3 px-4">
                                <CardTitle className="text-xs flex items-center gap-2">
                                    <Info className="h-3 w-3" />
                                    Risk Assessment Criteria
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0 text-[11px] space-y-4">
                                <div>
                                    <p className="font-bold text-primary mb-1 uppercase tracking-tighter">Likelihood Scale</p>
                                    <ul className="space-y-1">
                                        <li><strong>5 - Almost Certain:</strong> Expected to occur in most circumstances (monthly).</li>
                                        <li><strong>4 - Likely:</strong> Will probably occur in most circumstances (6 months).</li>
                                        <li><strong>3 - Possible:</strong> Might occur at some time (annually).</li>
                                        <li><strong>2 - Unlikely:</strong> Could occur at some time (every 2-5 years).</li>
                                        <li><strong>1 - Rare:</strong> May occur only in exceptional circumstances (+5 years).</li>
                                    </ul>
                                </div>
                                <div>
                                    <p className="font-bold text-primary mb-1 uppercase tracking-tighter">Consequence Scale</p>
                                    <ul className="space-y-1">
                                        <li><strong>5 - Catastrophic:</strong> Disaster; Threatens survival of unit.</li>
                                        <li><strong>4 - Major:</strong> Serious impact on objectives; significant rework.</li>
                                        <li><strong>3 - Moderate:</strong> Noticeable impact; extra effort to recover.</li>
                                        <li><strong>2 - Minor:</strong> Slight impact; easily managed locally.</li>
                                        <li><strong>1 - Insignificant:</strong> No discernible impact on quality.</li>
                                    </ul>
                                </div>
                                <div className="pt-2 border-t">
                                    <p className="font-bold mb-1 uppercase tracking-tighter">Rating Matrix (Key)</p>
                                    <div className="grid grid-cols-3 gap-1">
                                        <div className="bg-green-100 text-green-800 p-1 text-center rounded font-bold">1-4 Low</div>
                                        <div className="bg-orange-100 text-orange-800 p-1 text-center rounded font-bold">5-14 Med</div>
                                        <div className="bg-red-100 text-red-800 p-1 text-center rounded font-bold">15-25 High</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>
            </div>
        </div>

        <div className="p-6 border-t shrink-0 bg-card">
            <DialogFooter className="gap-2 sm:gap-0">
                {!isMandatory && (
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                )}
                <Button 
                    form="risk-form"
                    type="submit" 
                    disabled={isSubmitting || (isAdmin && !selectedAdminUnitId)}
                >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {risk ? 'Save Changes' : 'Log Risk Entry'}
                </Button>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
