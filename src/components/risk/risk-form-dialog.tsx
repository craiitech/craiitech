
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
  FormDescription,
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
import { doc, serverTimestamp, collection, query, where, getDocs, setDoc, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import type { Risk, User as AppUser, Unit, Campus } from '@/lib/types';
import { Loader2, Sparkles, FileText, HelpCircle, ShieldCheck, Info, BookOpen, Calculator, FileSearch, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { saveRiskAdmin, getOfficialServerTime } from '@/lib/actions';
import { ScrollArea } from '../ui/scroll-area';
import { suggestRiskTreatment } from '@/ai/flows/suggest-treatment-flow';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface RiskFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  risk: Risk | null;
  unitUsers: AppUser[];
  allUnits: Unit[];
  allCampuses: Campus[];
  isMandatory?: boolean;
  registryLink?: string | null;
  defaultYear?: number;
}

const months = [
  { value: '0', label: 'January' }, { value: '1', label: 'February' }, { value: '2', label: 'March' },
  { value: '3', label: 'April' }, { value: '4', label: 'May' }, { value: '5', label: 'June' },
  { value: '6', label: 'July' }, { value: '7', label: 'August' }, { value: '8', label: 'September' },
  { value: '9', label: 'October' }, { value: '10', label: 'November' }, { value: '11', label: 'December' },
];
const currentYear = new Date().getFullYear();
const yearsList = Array.from({ length: 10 }, (_, i) => String(currentYear - 5 + i));
const daysList = Array.from({ length: 31 }, (_, i) => String(i + 1));

const getRating = (magnitude: number): string => {
  if (magnitude >= 10) return 'High';
  if (magnitude >= 5) return 'Medium';
  return 'Low';
};

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
  postTreatmentLikelihood: z.coerce.number().optional(),
  postTreatmentConsequence: z.coerce.number().optional(),
  postTreatmentEvidence: z.string().optional(),
  postTreatmentDateImplemented: z.string().optional(),
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
    }
});

const likelihoodOptions = [
  { value: 1, label: '1 - Rare' }, { value: 2, label: '2 - Unlikely' }, { value: 3, label: '3 - Possible' }, { value: 4, label: '4 - Likely' }, { value: 5, label: '5 - Almost Certain' },
];

const consequenceOptions = [
  { value: 1, label: '1 - Insignificant' }, { value: 2, label: '2 - Minor' }, { value: 3, label: '3 - Moderate' }, { value: 4, label: '4 - Major' }, { value: 5, label: '5 - Catastrophic' },
];

export function RiskFormDialog({ isOpen, onOpenChange, risk, unitUsers, allUnits, allCampuses, isMandatory, registryLink, defaultYear }: RiskFormDialogProps) {
  const { user, userProfile, isAdmin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [autoRegistryLink, setAutoRegistryLink] = useState<string | null>(null);
  const { logSessionActivity } = useSessionActivity();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      year: defaultYear || new Date().getFullYear(),
      objective: '',
      type: 'Risk',
      description: '',
      currentControls: '',
      likelihood: 1,
      consequence: 1,
      treatmentAction: '',
      status: 'Open',
      adminCampusId: '',
      adminUnitId: '',
    },
  });

  const selectedAdminCampusId = form.watch('adminCampusId');
  const selectedAdminUnitId = form.watch('adminUnitId');
  const currentFormYear = form.watch('year');
  const workflowStatus = form.watch('status');

  useEffect(() => {
    if (risk) {
      const targetDate = risk.targetDate?.toDate?.() || risk.targetDate;
      const dateImplemented = risk.postTreatment?.dateImplemented || '';
      form.reset({
        ...risk,
        objective: risk.objective || '',
        description: risk.description || '',
        currentControls: risk.currentControls || '',
        treatmentAction: risk.treatmentAction || '',
        likelihood: risk.preTreatment.likelihood,
        consequence: risk.preTreatment.consequence,
        targetYear: targetDate instanceof Date ? String(targetDate.getFullYear()) : undefined,
        targetMonth: targetDate instanceof Date ? String(targetDate.getMonth()) : undefined,
        targetDay: targetDate instanceof Date ? String(targetDate.getDate()) : undefined,
        postTreatmentLikelihood: risk.postTreatment?.likelihood,
        postTreatmentConsequence: risk.postTreatment?.consequence,
        postTreatmentEvidence: risk.postTreatment?.evidence || '',
        postTreatmentDateImplemented: dateImplemented,
        adminCampusId: risk.campusId || '',
        adminUnitId: risk.unitId || '',
      });
    } else {
      form.reset({
        year: defaultYear || new Date().getFullYear(),
        objective: '',
        type: 'Risk',
        description: '',
        currentControls: '',
        likelihood: 1,
        consequence: 1,
        treatmentAction: '',
        status: 'Open',
        adminCampusId: userProfile?.campusId || '',
        adminUnitId: userProfile?.unitId || '',
      });
    }
  }, [risk, isOpen, form, userProfile, defaultYear]);

  useEffect(() => {
    if (!isAdmin || !selectedAdminUnitId || !firestore || !isOpen) {
        setAutoRegistryLink(null);
        return;
    }

    const fetchRORLink = async () => {
        setIsFetchingLink(true);
        try {
            const q = query(
                collection(firestore, 'submissions'),
                where('unitId', '==', selectedAdminUnitId),
                where('reportType', '==', 'Risk and Opportunity Registry'),
                where('year', '==', currentFormYear)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                const docs = snap.docs.map(d => d.data());
                const preferred = docs.find(d => d.cycleId === 'final') || docs[0];
                setAutoRegistryLink(preferred.googleDriveLink);
            } else {
                setAutoRegistryLink(null);
            }
        } catch (error) {
            console.error("Error fetching auto-registry link:", error);
            setAutoRegistryLink(null);
        } finally {
            setIsFetchingLink(false);
        }
    };

    fetchRORLink();
  }, [isAdmin, selectedAdminUnitId, currentFormYear, firestore, isOpen]);

  const likelihood = form.watch('likelihood');
  const consequence = form.watch('consequence');
  const riskType = form.watch('type');
  const description = form.watch('description');
  const objective = form.watch('objective');
  const ptLikelihood = form.watch('postTreatmentLikelihood');
  const ptConsequence = form.watch('postTreatmentConsequence');

  const magnitude = likelihood && consequence ? likelihood * consequence : 0;
  const rating = getRating(magnitude);
  
  const ptMagnitude = ptLikelihood && ptConsequence ? ptLikelihood * ptConsequence : 0;
  const ptRating = getRating(ptMagnitude);

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
    if (!user || !firestore || !userProfile) return;
    setIsSubmitting(true);
    
    const responsiblePerson = filteredUsers.find(u => u.id === values.responsiblePersonId);
    let targetDateValue: Date | null = null;
    if (values.targetYear && values.targetMonth && values.targetDay) {
        targetDateValue = new Date(Number(values.targetYear), Number(values.targetMonth), Number(values.targetDay));
    }

    const targetUnitId = isAdmin ? values.adminUnitId! : userProfile.unitId;
    const targetCampusId = isAdmin ? values.adminCampusId! : userProfile.campusId;

    const riskData: any = {
      objective: values.objective,
      type: values.type,
      description: values.description,
      currentControls: values.currentControls,
      status: values.status,
      year: values.year,
      unitId: targetUnitId,
      campusId: targetCampusId,
      userId: risk?.userId || user.uid,
      preTreatment: { 
        likelihood: values.likelihood, 
        consequence: values.consequence, 
        magnitude, 
        rating 
      },
      treatmentAction: values.treatmentAction || '',
      responsiblePersonId: values.responsiblePersonId || '',
      responsiblePersonName: responsiblePerson ? `${responsiblePerson.firstName} ${responsiblePerson.lastName}` : '',
      targetDate: targetDateValue,
      oapNo: values.oapNo || '',
      resourcesNeeded: values.resourcesNeeded || '',
      updates: values.updates || '',
      preparedBy: values.preparedBy || '',
      approvedBy: values.approvedBy || '',
    };

    if (values.status === 'Closed' && values.postTreatmentLikelihood && values.postTreatmentConsequence) {
        riskData.postTreatment = {
            likelihood: values.postTreatmentLikelihood,
            consequence: values.postTreatmentConsequence,
            magnitude: ptMagnitude,
            rating: ptRating,
            evidence: values.postTreatmentEvidence || '',
            dateImplemented: values.postTreatmentDateImplemented || '',
        };
    } else if (risk?.postTreatment) {
        riskData.postTreatment = risk.postTreatment;
    }

    if (isAdmin) {
        saveRiskAdmin(riskData, risk?.id)
            .then(() => {
                logSessionActivity(`Admin ${risk ? 'updated' : 'created'} risk entry`, { action: 'admin_save_risk', details: { riskId: risk?.id }});
                toast({ title: 'Success', description: 'Risk/Opportunity has been saved.' });
                onOpenChange(false);
            })
            .catch((error: any) => {
                console.error("Admin Risk Save Error:", error);
                toast({ title: 'Error', description: error.message || 'Could not save the entry.', variant: 'destructive'});
            })
            .finally(() => {
                setIsSubmitting(false);
            });
    } else {
        const finalData = {
            ...riskData,
            updatedAt: serverTimestamp(),
        };

        if (risk) {
            const riskRef = doc(firestore, 'risks', risk.id);
            setDoc(riskRef, { ...finalData, createdAt: risk.createdAt }, { merge: true })
                .then(() => {
                    toast({ title: 'Success', description: 'Risk/Opportunity has been saved.' });
                    onOpenChange(false);
                })
                .catch((serverError) => {
                    console.error("Firestore Save Error:", serverError);
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: riskRef.path,
                        operation: 'update',
                        requestResourceData: finalData,
                    }));
                })
                .finally(() => {
                    setIsSubmitting(false);
                });
        } else {
            const riskColRef = collection(firestore, 'risks');
            addDoc(riskColRef, { ...finalData, createdAt: serverTimestamp() })
                .then(() => {
                    toast({ title: 'Success', description: 'Risk/Opportunity has been saved.' });
                    onOpenChange(false);
                })
                .catch((serverError) => {
                    console.error("Firestore Create Error:", serverError);
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: riskColRef.path,
                        operation: 'create',
                        requestResourceData: finalData,
                    }));
                })
                .finally(() => {
                    setIsSubmitting(false);
                });
        }
    }
  };

  const activeLink = registryLink || autoRegistryLink;
  const previewEmbedUrl = activeLink ? activeLink.replace('/view', '/preview').replace('?usp=sharing', '') : null;

  return (
    <Dialog open={isOpen} onOpenChange={isMandatory ? undefined : onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl h-[95vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 border-b shrink-0 bg-card">
            <div className="flex items-center gap-2 text-primary mb-1">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-widest">EOMS Compliance Register</span>
            </div>
            <div className="flex items-center gap-2">
                <DialogTitle className="text-xl">{risk ? 'Edit' : 'Log New'} Risk or Opportunity</DialogTitle>
                {isMandatory && <Badge variant="destructive">Required Action</Badge>}
                {isAdmin && <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">Admin Overdrive Mode</Badge>}
            </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 border-r bg-background">
                <ScrollArea className="flex-1">
                    <Form {...form}>
                        <form id="risk-form" onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
                            {isAdmin && (
                                <Card className="border-orange-500/50 bg-orange-50/5 shadow-sm">
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
                                            <Calculator className="h-4 w-4" />
                                            Admin: Scoping & Year Verification
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField control={form.control} name="adminCampusId" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs">Campus</FormLabel>
                                                <Select onValueChange={(v) => { field.onChange(v); form.setValue('adminUnitId', ''); }} value={field.value || ''}>
                                                    <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Pick Campus" /></SelectTrigger></FormControl>
                                                    <SelectContent>{allCampuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="adminUnitId" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs">Unit</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || ''} disabled={!selectedAdminCampusId}>
                                                    <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Pick Unit" /></SelectTrigger></FormControl>
                                                    <SelectContent>{filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="year" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs">Academic Year</FormLabel>
                                                <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>{yearsList.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                    </CardContent>
                                </Card>
                            )}

                            <div className={cn("space-y-6 transition-opacity duration-300", isStepDisabled && "opacity-20 pointer-events-none")}>
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold flex items-center gap-2"><div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">1</div> Identification</h3>
                                    <Card>
                                        <CardContent className="space-y-4 pt-6">
                                            {!isAdmin && (
                                                <FormField control={form.control} name="year" render={({ field }) => (
                                                    <FormItem className="mb-4"><FormLabel>Target Year</FormLabel>
                                                        <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>{yearsList.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                            )}
                                            <FormField control={form.control} name="type" render={({ field }) => (
                                                <FormItem className="space-y-3"><FormLabel>Entry Type</FormLabel>
                                                    <FormControl><RadioGroup onValueChange={field.onChange} value={field.value || 'Risk'} className="flex items-center space-x-4">
                                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Risk" /></FormControl><Label className="font-normal cursor-pointer">Risk</Label></FormItem>
                                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="Opportunity" /></FormControl><Label className="font-normal cursor-pointer">Opportunity</Label></FormItem>
                                                    </RadioGroup></FormControl>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="objective" render={({ field }) => (<FormItem><FormLabel>Process Objective</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="What is the unit trying to achieve?" /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Detailed Description</FormLabel><FormControl><Textarea {...field} value={field.value || ''} placeholder="Describe the risk or opportunity..." /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="currentControls" render={({ field }) => (<FormItem><FormLabel>Existing Controls</FormLabel><FormControl><Textarea {...field} value={field.value || ''} placeholder="What are you currently doing to manage this?" /></FormControl><FormMessage /></FormItem>)} />
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold flex items-center gap-2"><div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">2</div> Analysis & Scoring</h3>
                                    <Card>
                                        <CardContent className="space-y-4 pt-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField control={form.control} name="likelihood" render={({ field }) => (
                                                    <FormItem><FormLabel>Likelihood</FormLabel>
                                                        <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ''}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Score 1-5" /></SelectTrigger></FormControl>
                                                            <SelectContent>{likelihoodOptions.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="consequence" render={({ field }) => (
                                                    <FormItem><FormLabel>Consequence</FormLabel>
                                                        <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ''}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Score 1-5" /></SelectTrigger></FormControl>
                                                            <SelectContent>{consequenceOptions.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                            </div>
                                            <div className="flex items-center justify-between rounded-md border p-4 bg-muted/30">
                                                <div className="flex items-center gap-2">
                                                    <Calculator className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">Magnitude: <span className="font-bold">{magnitude}</span></span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium">Final Rating:</span>
                                                    <Badge variant={rating === 'High' ? 'destructive' : rating === 'Medium' ? 'secondary' : 'default'} className={cn(rating === 'Medium' && "bg-orange-500 hover:bg-orange-600 text-white")}>
                                                        {rating}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {showActionPlan && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold flex items-center gap-2"><div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">3</div> Risk Treatment Action Plan</h3>
                                        <Card className="border-primary/20">
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 bg-primary/5">
                                                <div className="space-y-1">
                                                    <CardTitle className="text-base">Mitigation Strategy</CardTitle>
                                                    <CardDescription className="text-xs">Required for Medium and High risk entries.</CardDescription>
                                                </div>
                                                <Button type="button" variant="secondary" size="sm" onClick={handleAISuggest} disabled={isSuggesting} className="h-8 shadow-sm">
                                                    {isSuggesting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                                                    Gemini AI Suggest
                                                </Button>
                                            </CardHeader>
                                            <CardContent className="space-y-4 pt-6">
                                                <FormField control={form.control} name="treatmentAction" render={({ field }) => (<FormItem><FormLabel>Treatment Plan / Action</FormLabel><FormControl><Textarea {...field} value={field.value || ''} rows={6} placeholder="Describe the specific actions to be taken..." /></FormControl><FormMessage /></FormItem>)} />
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <FormField control={form.control} name="responsiblePersonId" render={({ field }) => (
                                                        <FormItem><FormLabel>Accountable Person</FormLabel>
                                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Select from list" /></SelectTrigger></FormControl>
                                                                <SelectContent>{filteredUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>)}</SelectContent>
                                                            </Select>
                                                        <FormMessage /></FormItem>
                                                    )} />
                                                    <div className="space-y-2">
                                                        <FormLabel>Target Date</FormLabel>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <FormField control={form.control} name="targetMonth" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="px-2"><SelectValue placeholder="Mo" /></SelectTrigger></FormControl><SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                                            <FormField control={form.control} name="targetDay" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="px-2"><SelectValue placeholder="Day" /></SelectTrigger></FormControl><SelectContent>{daysList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                                            <FormField control={form.control} name="targetYear" render={({ field }) => (<FormItem><Select onValueChange={field.onChange} value={field.value || ''}><FormControl><SelectTrigger className="px-2"><SelectValue placeholder="Yr" /></SelectTrigger></FormControl><SelectContent>{yearsList.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold flex items-center gap-2"><div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">4</div> Monitoring Status</h3>
                                    <Card>
                                        <CardContent className="pt-6">
                                             <FormField control={form.control} name="status" render={({ field }) => (
                                                <FormItem><FormLabel>Overall Workflow Status</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || 'Open'}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger></FormControl>
                                                        <SelectContent><SelectItem value="Open">Open (Pending)</SelectItem><SelectItem value="In Progress">In Progress (Active Treatment)</SelectItem><SelectItem value="Closed">Closed (Resolved/Mitigated)</SelectItem></SelectContent>
                                                    </Select>
                                                <FormMessage /></FormItem>
                                            )} />
                                        </CardContent>
                                    </Card>
                                </div>

                                {workflowStatus === 'Closed' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <h3 className="text-lg font-bold flex items-center gap-2 text-green-600"><div className="bg-green-600 text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">5</div> Post-Treatment Analysis</h3>
                                        <Card className="border-green-200 bg-green-50/10">
                                            <CardContent className="space-y-6 pt-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <FormField control={form.control} name="postTreatmentLikelihood" render={({ field }) => (
                                                        <FormItem><FormLabel>New Likelihood (Post-Treatment)</FormLabel>
                                                            <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ''}>
                                                                <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Score 1-5" /></SelectTrigger></FormControl>
                                                                <SelectContent>{likelihoodOptions.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name="postTreatmentConsequence" render={({ field }) => (
                                                        <FormItem><FormLabel>New Consequence (Post-Treatment)</FormLabel>
                                                            <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value ? String(field.value) : ''}>
                                                                <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Score 1-5" /></SelectTrigger></FormControl>
                                                                <SelectContent>{consequenceOptions.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )} />
                                                </div>
                                                <div className="flex items-center justify-between rounded-md border p-4 bg-green-50/50">
                                                    <div className="flex items-center gap-2">
                                                        <Calculator className="h-4 w-4 text-green-700" />
                                                        <span className="text-sm font-medium text-green-800">New Magnitude: <span className="font-bold">{ptMagnitude}</span></span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-green-800">Residual Rating:</span>
                                                        <Badge className="bg-green-600 text-white">{ptRating}</Badge>
                                                    </div>
                                                </div>
                                                <FormField control={form.control} name="postTreatmentEvidence" render={({ field }) => (
                                                    <FormItem><FormLabel>Proof of Treatment / Results</FormLabel>
                                                        <FormControl><Textarea {...field} value={field.value || ''} placeholder="Describe the outcome and results of the implemented mitigation..." className="bg-white" /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="postTreatmentDateImplemented" render={({ field }) => (
                                                    <FormItem><FormLabel>Actual Date Completed</FormLabel>
                                                        <FormControl><Input {...field} type="text" placeholder="e.g., October 15, 2025" className="bg-white" /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        </form>
                    </Form>
                </ScrollArea>
            </div>

            <div className="hidden lg:flex w-[450px] flex-col bg-muted/10 border-l overflow-hidden">
                <div className="p-4 border-b bg-card shrink-0">
                    <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        Compliance Reference
                    </h3>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-6 space-y-6">
                        <Card className="border-primary/30 shadow-md">
                            <CardHeader className="py-3 px-4 bg-primary/5">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-xs flex items-center gap-2">
                                            <FileText className="h-3 w-3 text-primary" />
                                            Unit Registry Document
                                        </CardTitle>
                                        <Badge variant="outline" className="text-[9px] h-4 py-0 flex items-center gap-1 font-mono">
                                            <Calendar className="h-2 w-2" />
                                            Year: {currentFormYear}
                                        </Badge>
                                    </div>
                                    {isFetchingLink && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {previewEmbedUrl ? (
                                    <div className="aspect-[3/4]">
                                        <iframe src={previewEmbedUrl} className="h-full w-full border-none" allow="autoplay"></iframe>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-muted-foreground border-t bg-muted/5">
                                        <FileSearch className="h-10 w-10 mb-2 opacity-20" />
                                        <p className="text-xs font-semibold">No Document Found</p>
                                        <p className="text-[10px] mt-1">
                                            The unit has not submitted a Registry for {currentFormYear}.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-blue-200 shadow-sm">
                            <CardHeader className="py-3 px-4 bg-blue-50">
                                <CardTitle className="text-xs flex items-center gap-2 text-blue-800">
                                    <Info className="h-3 w-3" />
                                    ISO Scoring Guide
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-3 text-[11px] space-y-4">
                                <div>
                                    <p className="font-bold text-primary mb-1 uppercase tracking-tighter">Likelihood (L)</p>
                                    <ul className="space-y-1.5 list-disc pl-3">
                                        <li><strong>5:</strong> Expected to occur in most circumstances.</li>
                                        <li><strong>4:</strong> Will probably occur in most circumstances.</li>
                                        <li><strong>3:</strong> Might occur at some time (annual).</li>
                                        <li><strong>2:</strong> Could occur at some time (every 2-5 yrs).</li>
                                        <li><strong>1:</strong> Rare; exceptional circumstances.</li>
                                    </ul>
                                </div>
                                <div className="pt-2 border-t border-blue-100">
                                    <p className="font-bold text-primary mb-1 uppercase tracking-tighter">Consequence (C)</p>
                                    <ul className="space-y-1.5 list-disc pl-3">
                                        <li><strong>5:</strong> Catastrophic; unit survival at risk.</li>
                                        <li><strong>4:</strong> Major; serious impact on objectives.</li>
                                        <li><strong>3:</strong> Moderate; noticeable impact.</li>
                                        <li><strong>2:</strong> Minor; easily managed locally.</li>
                                        <li><strong>1:</strong> Insignificant; no discernible impact.</li>
                                    </ul>
                                </div>
                                <div className="pt-2 border-t border-blue-100">
                                    <p className="font-bold text-primary mb-1 uppercase tracking-tighter">Rating Scale (L x C)</p>
                                    <ul className="space-y-1.5 list-disc pl-3">
                                        <li><strong>10 - 25:</strong> High Priority</li>
                                        <li><strong>5 - 9:</strong> Medium Priority</li>
                                        <li><strong>1 - 4:</strong> Low Priority</li>
                                    </ul>
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
                    className="px-8"
                >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {risk ? 'Update Database Entry' : 'Log Register Entry'}
                </Button>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
