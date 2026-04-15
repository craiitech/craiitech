
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
  FormDescription,
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
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, serverTimestamp, collection, setDoc, addDoc, Timestamp, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import type { Risk, User as AppUser, Unit, Campus } from '@/lib/types';
import { Loader2, Sparkles, ShieldCheck, Info, BookOpen, Save, X, ExternalLink, FileSearch, Calendar, ListChecks, PlusCircle, ChevronRight, Activity, TrendingUp, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { suggestRiskTreatment } from '@/ai/flows/suggest-treatment-flow';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useSearchParams } from 'next/navigation';

interface RiskFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  risk: Risk | null;
  unitUsers: AppUser[];
  allUnits: Unit[];
  allCampuses: Campus[];
  isMandatory?: boolean;
  registryLink?: string | null;
  defaultYear?: number;
  defaultUnitId?: string;
  defaultCampusId?: string;
}

const months = [
  { value: '0', label: 'January' }, { value: '1', label: 'February' }, { value: '2', label: 'March' },
  { value: '3', label: 'April' }, { value: '4', label: 'May' }, { value: '5', label: 'June' },
  { value: '6', label: 'July' }, { value: '7', label: 'August' }, { value: '8', label: 'September' },
  { value: '9', label: 'October' }, { value: '10', label: 'November' }, { value: '11', label: 'December' },
];
const currentYear = new Date().getFullYear();
const yearsList = Array.from({ length: 2076 - (currentYear - 10) + 1 }, (_, i) => String(currentYear - 10 + i));
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
  monitoringScore: z.string().optional(),
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
});

/**
 * Institutional Assessment Criteria based on official reference table.
 */
const ASSESSMENT_CRITERIA = {
  likelihood: {
    Risk: [
      { value: 1, label: '1 - Rare (Not known to happen)' },
      { value: 2, label: '2 - Low (Once a year)' },
      { value: 3, label: '3 - Medium (Once per quarter)' },
      { value: 4, label: '4 - High (>Once per quarter)' },
      { value: 5, label: '5 - Very High (Once per month)' },
    ],
    Opportunity: [
      { value: 1, label: '1 - Rare (No chance in 12 mo.)' },
      { value: 2, label: '2 - Low (1-25% chance of success)' },
      { value: 3, label: '3 - Medium (26-50% success)' },
      { value: 4, label: '4 - High (51-75% success)' },
      { value: 5, label: '5 - Very High (>75% success)' },
    ],
  },
  consequence: {
    Risk: [
      { value: 1, label: '1 - Insignificant (Minimal/No impact)' },
      { value: 2, label: '2 - Minor (Noticeable effect)' },
      { value: 3, label: '3 - Significant (Moderate/Claim)' },
      { value: 4, label: '4 - Major (Catastrophic/Legal - Alts avail.)' },
      { value: 5, label: '5 - Catastrophic (Catastrophic/Legal - No Alts)' },
    ],
    Opportunity: [
      { value: 1, label: '1 - Insignificant (No perceived value)' },
      { value: 2, label: '2 - Minor (Slightly improve QMS)' },
      { value: 3, label: '3 - Significant (Considerably improve QMS)' },
      { value: 4, label: '4 - Major (Highly improve QMS)' },
      { value: 5, label: '5 - Catastrophic (Greatly improve QMS)' },
    ],
  }
};

export function RiskFormDialog({ 
  isOpen, 
  onOpenChange, 
  risk: initialRisk, 
  unitUsers, 
  allUnits, 
  allCampuses, 
  isMandatory, 
  registryLink, 
  defaultYear,
  defaultUnitId,
  defaultCampusId
}: RiskFormDialogProps) {
  const { user, userProfile, isAdmin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [activeRisk, setActiveRisk] = useState<Risk | null>(initialRisk);
  
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
      monitoringScore: '',
      status: 'Open',
      adminCampusId: defaultCampusId || userProfile?.campusId || '',
      adminUnitId: defaultUnitId || userProfile?.unitId || '',
    },
  });

  const shouldHighlightFinal = searchParams.get('highlightSection') === '4';

  const watchYear = form.watch('year');
  const selectedAdminCampusId = form.watch('adminCampusId');
  const selectedAdminUnitId = form.watch('adminUnitId');
  const riskTypeValue = form.watch('type');

  const handleLoadRisk = (r: Risk | null) => {
    setActiveRisk(r);
    if (r) {
      const targetDate = r.targetDate?.toDate?.() || r.targetDate;
      form.reset({
        year: r.year,
        objective: r.objective || '',
        type: r.type || 'Risk',
        description: r.description || '',
        currentControls: r.currentControls || '',
        likelihood: r.preTreatment.likelihood,
        consequence: r.preTreatment.consequence,
        treatmentAction: r.treatmentAction || '',
        monitoringScore: r.monitoringScore || '',
        status: r.status || 'Open',
        responsiblePersonId: r.responsiblePersonId || '',
        targetYear: targetDate instanceof Date ? String(targetDate.getFullYear()) : undefined,
        targetMonth: targetDate instanceof Date ? String(targetDate.getMonth()) : undefined,
        targetDay: targetDate instanceof Date ? String(targetDate.getDate()) : undefined,
        postTreatmentLikelihood: r.postTreatment?.likelihood || 1,
        postTreatmentConsequence: r.postTreatment?.consequence || 1,
        postTreatmentEvidence: r.postTreatment?.evidence || '',
        postTreatmentDateImplemented: r.postTreatment?.dateImplemented || '',
        oapNo: r.oapNo || '',
        resourcesNeeded: r.resourcesNeeded || '',
        updates: r.updates || '',
        preparedBy: r.preparedBy || '',
        approvedBy: r.approvedBy || '',
        adminCampusId: r.campusId || '',
        adminUnitId: r.unitId || '',
      });
    } else {
      form.reset({
        year: defaultYear || currentYear,
        objective: form.getValues('objective') || '', 
        type: 'Risk',
        description: '',
        currentControls: '',
        likelihood: 1,
        consequence: 1,
        treatmentAction: '',
        monitoringScore: '',
        status: 'Open',
        adminCampusId: selectedAdminCampusId,
        adminUnitId: selectedAdminUnitId,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
        handleLoadRisk(initialRisk);
    }
  }, [initialRisk, isOpen]);

  /**
   * REINFORCED SIDEBAR QUERY
   * Strictly filters by Campus, Unit, and Year to maintain institutional context integrity.
   */
  const unitRisksQuery = useMemoFirebase(() => {
    const targetUnitId = isAdmin ? selectedAdminUnitId : userProfile?.unitId;
    const targetCampusId = isAdmin ? selectedAdminCampusId : userProfile?.campusId;
    
    if (!firestore || !targetUnitId || !targetCampusId || !isOpen) return null;
    
    return query(
        collection(firestore, 'risks'), 
        where('unitId', '==', targetUnitId),
        where('campusId', '==', targetCampusId),
        where('year', '==', watchYear)
    );
  }, [firestore, selectedAdminUnitId, selectedAdminCampusId, userProfile, watchYear, isOpen, isAdmin]);

  const { data: unitRisks } = useCollection<Risk>(unitRisksQuery);

  const likelihoodValue = form.watch('likelihood');
  const consequenceValue = form.watch('consequence');
  const descriptionValue = form.watch('description');
  const objectiveValue = form.watch('objective');
  const ptLikelihood = form.watch('postTreatmentLikelihood') || 1;
  const ptConsequence = form.watch('postTreatmentConsequence') || 1;

  const magnitude = likelihoodValue * consequenceValue;
  const rating = getRating(magnitude);
  
  const ptMagnitude = ptLikelihood * ptConsequence;
  const ptRating = getRating(ptMagnitude);

  const showActionPlan = rating === 'Medium' || rating === 'High';

  const filteredUsers = useMemo(() => {
    const targetUnitId = isAdmin ? selectedAdminUnitId : userProfile?.unitId;
    if (!targetUnitId) return [];
    return unitUsers.filter(u => u.unitId === targetUnitId);
  }, [isAdmin, selectedAdminUnitId, userProfile, unitUsers]);

  const handleAISuggest = async () => {
    if (!descriptionValue || !objectiveValue) return;
    setIsSuggesting(true);
    try {
        const result = await suggestRiskTreatment({ type: riskTypeValue, description: descriptionValue, objective: objectiveValue });
        const currentAction = form.getValues('treatmentAction') || '';
        form.setValue('treatmentAction', currentAction + (currentAction ? '\n\n' : '') + "**AI Suggestions:**\n" + result.suggestions);
    } catch(e) {
        toast({ title: "AI Error", description: "Could not generate suggestions.", variant: "destructive" });
    } finally {
        setIsSuggesting(false);
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user || !firestore || !userProfile) return;
    setIsSubmitting(true);
    
    try {
        const responsiblePerson = filteredUsers.find(u => u.id === values.responsiblePersonId);
        
        let targetTimestamp: Timestamp | null = null;
        if (values.targetYear && values.targetMonth && values.targetDay) {
            const yearNum = parseInt(values.targetYear);
            const monthNum = parseInt(values.targetMonth);
            const dayNum = parseInt(values.targetDay);
            
            if (!isNaN(yearNum) && !isNaN(monthNum) && !isNaN(dayNum)) {
                const date = new Date(yearNum, monthNum, dayNum);
                if (!isNaN(date.getTime())) {
                    targetTimestamp = Timestamp.fromDate(date);
                }
            }
        }

        const targetUnitId = (isAdmin ? values.adminUnitId : userProfile.unitId) || '';
        const targetCampusId = (isAdmin ? values.adminCampusId : userProfile.campusId) || '';

        const riskData: any = {
          objective: values.objective || '',
          type: values.type || 'Risk',
          description: values.description || '',
          currentControls: values.currentControls || '',
          status: values.status || 'Open',
          year: Number(values.year),
          unitId: targetUnitId,
          campusId: targetCampusId,
          userId: activeRisk?.userId || user.uid,
          preTreatment: { 
            likelihood: Number(values.likelihood), 
            consequence: Number(values.consequence), 
            magnitude: Number(magnitude), 
            rating: String(rating) 
          },
          treatmentAction: values.treatmentAction || '',
          monitoringScore: values.monitoringScore || '',
          responsiblePersonId: values.responsiblePersonId || '',
          responsiblePersonName: responsiblePerson ? `${responsiblePerson.firstName} ${responsiblePerson.lastName}` : (activeRisk?.responsiblePersonName || ''),
          targetDate: targetTimestamp,
          oapNo: values.oapNo || '',
          resourcesNeeded: values.resourcesNeeded || '',
          updates: values.updates || '',
          preparedBy: values.preparedBy || '',
          approvedBy: values.approvedBy || '',
          updatedAt: serverTimestamp(),
        };

        if (values.status === 'Closed' || values.postTreatmentLikelihood) {
            riskData.postTreatment = {
                likelihood: Number(values.postTreatmentLikelihood || 1),
                consequence: Number(values.postTreatmentConsequence || 1),
                magnitude: Number(ptMagnitude),
                rating: String(ptRating),
                evidence: values.postTreatmentEvidence || '',
                dateImplemented: values.postTreatmentDateImplemented || '',
            };
        }

        if (activeRisk) {
            const riskRef = doc(firestore, 'risks', activeRisk.id);
            await setDoc(riskRef, riskData, { merge: true });
            toast({ title: 'Record Updated', description: 'Changes saved.' });
        } else {
            const riskColRef = collection(firestore, 'risks');
            await addDoc(riskColRef, { ...riskData, createdAt: serverTimestamp() });
            toast({ title: 'Record Registered', description: 'New entry added.' });
        }

        if (registryLink) {
            handleLoadRisk(null);
        } else {
            onOpenChange(false);
        }
    } catch (error) {
        console.error("Risk Submit Error:", error);
        toast({ title: 'Update Failed', description: 'Could not save record.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  const previewUrl = useMemo(() => {
    if (!registryLink) return null;
    return registryLink.replace('/view', '/preview').replace('?usp=sharing', '');
  }, [registryLink]);

  return (
    <Dialog open={isOpen} onOpenChange={isMandatory ? undefined : onOpenChange}>
      <DialogContent className={cn("max-w-[95vw] h-[95vh] flex flex-col p-0 overflow-hidden", registryLink ? "lg:max-w-[1600px]" : "lg:max-w-7xl")} onPointerDownOutside={(e) => isMandatory && e.preventDefault()} onEscapeKeyDown={(e) => isMandatory && e.preventDefault()}>
        <div className="p-6 border-b shrink-0 bg-card shadow-sm">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary mb-1">
                        <ShieldCheck className="h-5 w-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Registry Tracking</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <DialogTitle className="text-xl">
                            {activeRisk ? 'Manage' : 'Log New'} Assessment Record
                        </DialogTitle>
                        <Badge variant="secondary" className="h-6 px-3 bg-primary/10 text-primary border-primary/20 font-black text-xs">
                            <Calendar className="h-3 w-3 mr-1.5" />
                            AY {watchYear}
                        </Badge>
                    </div>
                </div>
                {!isMandatory && (
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
        <div className="flex-1 flex overflow-hidden">
            <div className={cn("flex flex-col min-w-0 border-r bg-background", registryLink ? "flex-[1]" : "flex-1")}>
                <ScrollArea className="flex-1">
                    <Form {...form}>
                        <form id="risk-form" onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">1</div>
                                    Identification
                                </h3>
                                <Card>
                                  <CardContent className="space-y-4 pt-6">
                                    <FormField control={form.control} name="type" render={({ field }) => (
                                        <FormItem className="space-y-3">
                                          <FormLabel className="font-bold">Entry Type</FormLabel>
                                          <FormControl>
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center space-x-4">
                                              <div className="flex items-center space-x-2 space-y-0">
                                                <RadioGroupItem value="Risk" id="type-risk" />
                                                <Label htmlFor="type-risk" className="font-normal cursor-pointer">Risk</Label>
                                              </div>
                                              <div className="flex items-center space-x-2 space-y-0">
                                                <RadioGroupItem value="Opportunity" id="type-opportunity" />
                                                <Label htmlFor="type-opportunity" className="font-normal cursor-pointer">Opportunity</Label>
                                              </div>
                                            </RadioGroup>
                                          </FormControl>
                                        </FormItem>
                                    )} />
                                    {isAdmin && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                            <FormField control={form.control} name="adminCampusId" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-black uppercase text-primary">Admin Override: Campus</FormLabel>
                                                    <Select onValueChange={(val) => { field.onChange(val); form.setValue('adminUnitId', ''); }} value={field.value || ''}>
                                                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select Campus" /></SelectTrigger></FormControl>
                                                        <SelectContent>{allCampuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="adminUnitId" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-black uppercase text-primary">Admin Override: Unit</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={!selectedAdminCampusId}>
                                                        <FormControl><SelectTrigger className="h-9"><SelectValue placeholder="Select Unit" /></SelectTrigger></FormControl>
                                                        <SelectContent>{allUnits.filter(u => u.campusIds?.includes(selectedAdminCampusId || '')).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                        </div>
                                    )}
                                    <FormField control={form.control} name="objective" render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="font-bold">Process Objective</FormLabel>
                                        <FormControl>
                                          <Input {...field} value={field.value || ''} placeholder="What goal is being assessed?" />
                                        </FormControl>
                                      </FormItem>
                                    )} />
                                    <FormField control={form.control} name="description" render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="font-bold">Description of {riskTypeValue}</FormLabel>
                                        <FormControl>
                                          <Textarea {...field} value={field.value || ''} placeholder="Explain the potential risk or opportunity in detail." />
                                        </FormControl>
                                      </FormItem>
                                    )} />
                                    <FormField control={form.control} name="currentControls" render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="font-bold">Current Controls / Mechanisms</FormLabel>
                                        <FormControl>
                                          <Textarea {...field} value={field.value || ''} placeholder="What is currently in place to manage this?" />
                                        </FormControl>
                                      </FormItem>
                                    )} />
                                </CardContent>
                              </Card>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">2</div>
                                    {riskTypeValue} Analysis (Initial Baseline)
                                </h3>
                                <Card>
                                  <CardContent className="space-y-4 pt-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="likelihood" render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className="font-bold">Likelihood (L)</FormLabel>
                                            <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                              <FormControl>
                                                <SelectTrigger>
                                                  <SelectValue />
                                                </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                {ASSESSMENT_CRITERIA.likelihood[riskTypeValue].map(o => (
                                                  <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </FormItem>
                                        )} />
                                        <FormField control={form.control} name="consequence" render={({ field }) => (
                                          <FormItem>
                                            <FormLabel className="font-bold">Consequence (C)</FormLabel>
                                            <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                              <FormControl>
                                                <SelectTrigger>
                                                  <SelectValue />
                                                </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                {ASSESSMENT_CRITERIA.consequence[riskTypeValue].map(o => (
                                                  <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </FormItem>
                                        )} />
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-md border">
                                        <div className="text-sm font-medium">Initial Magnitude (L x C): <span className="font-bold text-lg">{magnitude}</span></div>
                                        <Badge 
                                            className={cn(
                                                "h-7 px-4 text-xs font-bold uppercase border-none text-white",
                                                riskTypeValue === 'Risk' ? (
                                                    rating === 'High' ? 'bg-rose-600' : rating === 'Medium' ? 'bg-amber-500' : 'bg-emerald-600'
                                                ) : (
                                                    rating === 'High' ? 'bg-emerald-600' : rating === 'Medium' ? 'bg-amber-500' : 'bg-rose-600'
                                                )
                                            )}
                                        >
                                            {rating} RATING
                                        </Badge>
                                    </div>
                                </CardContent>
                              </Card>
                            </div>

                            {showActionPlan && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">3</div>
                                        Action Plan
                                    </h3>
                                    <Card className="border-primary/20 shadow-md">
                                        <CardHeader className="flex flex-row items-center justify-between py-4 bg-primary/5 border-b">
                                            <CardTitle className="text-base">Treatment Strategy</CardTitle>
                                            <Button 
                                                type="button" 
                                                variant="secondary" 
                                                size="sm" 
                                                onClick={handleAISuggest} 
                                                disabled={isSuggesting}
                                                className="shadow-sm"
                                            >
                                              {isSuggesting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                                              AI Suggest Mitigation
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pt-6">
                                            <FormField control={form.control} name="treatmentAction" render={({ field }) => (
                                              <FormItem>
                                                <FormLabel className="font-bold text-primary">Treatment Action Plan</FormLabel>
                                                <FormControl>
                                                  <Textarea {...field} value={field.value || ''} rows={6} placeholder="How will you mitigate this risk or enhance this opportunity?" />
                                                </FormControl>
                                              </FormItem>
                                            )} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={form.control} name="responsiblePersonId" render={({ field }) => (
                                                  <FormItem>
                                                    <FormLabel className="font-bold">Accountable Person</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                                      <FormControl>
                                                        <SelectTrigger>
                                                          <SelectValue placeholder="Select Accountable Person" />
                                                        </SelectTrigger>
                                                      </FormControl>
                                                      <SelectContent>
                                                        {filteredUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>)}
                                                      </SelectContent>
                                                    </Select>
                                                  </FormItem>
                                                )} />
                                                <div className="space-y-2">
                                                  <FormLabel className="font-bold">Target Date</FormLabel>
                                                  <div className="grid grid-cols-3 gap-2">
                                                    <FormField control={form.control} name="targetMonth" render={({ field }) => (
                                                      <FormItem>
                                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                                          <FormControl>
                                                            <SelectTrigger>
                                                              <SelectValue placeholder="Mo" />
                                                            </SelectTrigger>
                                                          </FormControl>
                                                          <SelectContent>
                                                            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                                          </SelectContent>
                                                        </Select>
                                                      </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name="targetDay" render={({ field }) => (
                                                      <FormItem>
                                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                                          <FormControl>
                                                            <SelectTrigger>
                                                              <SelectValue placeholder="Da" />
                                                            </SelectTrigger>
                                                          </FormControl>
                                                          <SelectContent>
                                                            {daysList.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                                          </SelectContent>
                                                        </Select>
                                                      </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name="targetYear" render={({ field }) => (
                                                      <FormItem>
                                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                                          <FormControl>
                                                            <SelectTrigger>
                                                              <SelectValue placeholder="Yr" />
                                                            </SelectTrigger>
                                                          </FormControl>
                                                          <SelectContent>
                                                            {yearsList.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                                                          </SelectContent>
                                                        </Select>
                                                      </FormItem>
                                                    )} />
                                                  </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            <div className="space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">4</div>
                                    Final Assessment (Post-Treatment Analysis)
                                </h3>
                                <Card className={cn("border-blue-200 bg-blue-50/5 shadow-md transition-all duration-1000", shouldHighlightFinal && "animate-blink-primary")}>
                                    <CardHeader className="bg-blue-50/50 border-b py-4">
                                        <CardTitle className="text-sm font-black uppercase text-blue-800">Final Execution & Impact Verification</CardTitle>
                                        <CardDescription className="text-xs">Re-assess the likelihood and consequence after implementation of the action plan.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6 pt-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField control={form.control} name="updates" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-bold text-blue-700">Implementation/Monitoring Data</FormLabel>
                                                    <FormControl><Textarea {...field} value={field.value || ''} rows={4} placeholder="Record the actual results or findings during monitoring..." className="bg-white border-blue-100" /></FormControl>
                                                    <FormDescription className="text-[9px]">Describe the progress or final status of the treatment action.</FormDescription>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="postTreatmentEvidence" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-bold text-blue-700">Evidence of Implementation</FormLabel>
                                                    <FormControl><Textarea {...field} value={field.value || ''} rows={4} placeholder="Documents, photos, or data verified..." className="bg-white border-blue-100" /></FormControl>
                                                    <FormDescription className="text-[9px]">Identify specific objective evidence collected.</FormDescription>
                                                </FormItem>
                                            )} />
                                        </div>

                                        {showActionPlan && (
                                            <FormField control={form.control} name="monitoringScore" render={({ field }) => (
                                                <FormItem className="animate-in slide-in-from-top-2 duration-300">
                                                    <FormLabel className="font-bold text-blue-700">Treatment Plan Monitoring Score</FormLabel>
                                                    <FormControl>
                                                        <Textarea {...field} value={field.value || ''} rows={3} placeholder="Provide the monitoring score or evaluation of the treatment plan effectiveness..." className="bg-white border-blue-100 italic text-xs" />
                                                    </FormControl>
                                                    <FormDescription className="text-[9px]">Required for Medium/High rated risks to track corrective efficiency.</FormDescription>
                                                </FormItem>
                                            )} />
                                        )}

                                        <Separator />

                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-800 flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4" /> Final {riskTypeValue} Analysis
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField control={form.control} name="postTreatmentLikelihood" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[10px] font-bold uppercase">Residual Likelihood (L)</FormLabel>
                                                        <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                                            <FormControl><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                {ASSESSMENT_CRITERIA.likelihood[riskTypeValue].map(o => (
                                                                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                                <FormField control={form.control} name="postTreatmentConsequence" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-[10px] font-bold uppercase">Residual Consequence (C)</FormLabel>
                                                        <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                                            <FormControl><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                {ASSESSMENT_CRITERIA.consequence[riskTypeValue].map(o => (
                                                                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )} />
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-blue-100 shadow-inner">
                                                <div className="text-sm font-medium">Residual Magnitude: <span className="font-black text-xl tabular-nums">{ptMagnitude}</span></div>
                                                <Badge 
                                                    className={cn(
                                                        "h-8 px-6 text-[10px] font-black uppercase border-none text-white",
                                                        riskTypeValue === 'Risk' ? (
                                                            ptRating === 'High' ? 'bg-rose-600' : ptRating === 'Medium' ? 'bg-amber-500' : 'bg-emerald-600'
                                                        ) : (
                                                            ptRating === 'High' ? 'bg-emerald-600' : ptRating === 'Medium' ? 'bg-amber-500' : 'bg-rose-600'
                                                        )
                                                    )}
                                                >
                                                    {ptRating} RESIDUAL RATING
                                                </Badge>
                                            </div>

                                            {/* Closure / Carry-over Guidance */}
                                            <div className="mt-4 animate-in zoom-in duration-500">
                                                {ptRating === 'Low' ? (
                                                    <Alert className="bg-emerald-50 border-emerald-200">
                                                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                                        <AlertTitle className="text-emerald-800 font-bold uppercase tracking-tight">Mitigation Successful</AlertTitle>
                                                        <AlertDescription className="text-emerald-700 text-xs font-medium">
                                                            The residual rating is now <strong>Low</strong>. You may proceed to change the status to <strong>Closed</strong> below to formally complete this registry entry.
                                                        </AlertDescription>
                                                    </Alert>
                                                ) : (
                                                    <Alert className="bg-amber-50 border-amber-200">
                                                        <ShieldAlert className="h-5 w-5 text-amber-600" />
                                                        <AlertTitle className="text-amber-800 font-bold uppercase tracking-tight">Risk/Opportunity Retains Significance</AlertTitle>
                                                        <AlertDescription className="text-amber-700 text-xs font-medium">
                                                            The residual rating remains <strong>{ptRating}</strong>. This entry should be carried out and baseline-re-analyzed in the **Next Year's** Risk Registry to ensure sustainable control.
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                            <FormField control={form.control} name="status" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-bold text-primary">Update Execution Status</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger className="bg-primary/5 border-primary/20 font-black h-11"><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Open">Open (Analysis Stage)</SelectItem>
                                                            <SelectItem value="In Progress">In Progress (Execution Stage)</SelectItem>
                                                            <SelectItem value="Closed" className="font-bold text-emerald-600">Closed (Mitigation Complete)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="postTreatmentDateImplemented" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-bold uppercase">Date of Closure / Final Update</FormLabel>
                                                    <FormControl><Input {...field} value={field.value || ''} placeholder="e.g. Dec 2024" className="bg-white h-11" /></FormControl>
                                                </FormItem>
                                            )} />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </form>
                    </Form>
                </ScrollArea>
            </div>
            
            <div className={cn("hidden lg:flex flex-col bg-muted/10 border-l shrink-0", registryLink ? "flex-[1.2]" : "w-[400px]")}>
                <div className="p-4 border-b font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-primary" />
                        Institutional Context Registry
                    </div>
                </div>
                
                <ScrollArea className="flex-1 p-6 space-y-6">
                    {unitRisks && unitRisks.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Current Entries ({unitRisks.length})</h4>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-[9px] font-black uppercase gap-1 text-primary hover:bg-primary/5"
                                    onClick={() => handleLoadRisk(null)}
                                >
                                    <PlusCircle className="h-3 w-3" /> New Entry
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {unitRisks.map(r => (
                                    <button 
                                        key={r.id}
                                        type="button"
                                        onClick={() => handleLoadRisk(r)}
                                        className={cn(
                                            "w-full text-left p-3 rounded-xl border transition-all hover:shadow-md group",
                                            activeRisk?.id === r.id 
                                                ? "bg-white border-primary shadow-sm ring-1 ring-primary/20" 
                                                : "bg-background/50 border-transparent text-muted-foreground"
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <Badge variant="outline" className={cn("h-4 text-[8px] font-black px-1.5", activeRisk?.id === r.id ? "border-primary/30 text-primary" : "opacity-50")}>{r.type}</Badge>
                                            <Badge 
                                                className={cn(
                                                    "h-4 text-[8px] font-black border-none px-1.5 shadow-none text-white",
                                                    r.type === 'Risk' ? (
                                                        r.preTreatment.rating === 'High' ? "bg-rose-600" : 
                                                        r.preTreatment.rating === 'Medium' ? "bg-amber-500" : 
                                                        "bg-emerald-600"
                                                    ) : (
                                                        r.preTreatment.rating === 'High' ? "bg-emerald-600" : 
                                                        r.preTreatment.rating === 'Medium' ? "bg-amber-500" : 
                                                        "bg-rose-600"
                                                    )
                                                )}
                                            >
                                                {r.preTreatment.rating}
                                            </Badge>
                                        </div>
                                        <p className={cn("text-[11px] font-bold leading-tight line-clamp-2", activeRisk?.id === r.id ? "text-slate-900" : "text-slate-500")}>
                                            {r.description}
                                        </p>
                                        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[8px] font-black uppercase text-primary">Load for Edit</span>
                                            <ChevronRight className="h-2 w-2 text-primary" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {registryLink && (
                        <Card className="border-primary/20 shadow-sm overflow-hidden flex flex-col h-[500px]">
                            <CardHeader className="py-3 px-4 bg-primary/5 border-b flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileSearch className="h-3.5 w-3.5 text-primary" />
                                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Source Document Preview</CardTitle>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                                    <a href={registryLink} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 relative bg-white">
                                {previewUrl && (
                                    <iframe 
                                        src={previewUrl} 
                                        className="absolute inset-0 w-full h-full border-none"
                                        allow="autoplay"
                                        title="Risk Registry Document Source"
                                    />
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card className="border-blue-200 shadow-sm overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-blue-50 border-b">
                          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-800">Magnitude Guide</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-1 gap-1.5 text-[10px] font-bold">
                                <div className={cn("p-2 rounded border uppercase", riskTypeValue === 'Risk' ? "bg-red-50 border-red-100 text-red-700" : "bg-green-50 border-green-100 text-green-700")}>
                                    High (10-25) - {riskTypeValue === 'Risk' ? 'Action Mandatory' : 'Strategic Target'}
                                </div>
                                <div className="p-2 rounded bg-amber-50 border border-amber-100 text-amber-700 uppercase">Medium (5-9) - Action Mandatory</div>
                                <div className={cn("p-2 rounded border uppercase", riskTypeValue === 'Risk' ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700")}>
                                    Low (1-4) - {riskTypeValue === 'Risk' ? 'Monitor Only' : 'Incidental Gain'}
                                </div>
                            </div>
                            <div className="flex gap-2 text-[10px] pt-2 border-t mt-2">
                              <BookOpen className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                              <p className="leading-tight text-muted-foreground italic">
                                Magnitude is calculated as <strong>Likelihood x Consequence</strong>. High and Medium ratings automatically trigger the Action Plan requirement.
                              </p>
                            </div>
                        </CardContent>
                    </Card>
                </ScrollArea>
            </div>
        </div>
        <div className="p-6 border-t shrink-0 bg-card shadow-inner">
            <DialogFooter className="gap-2 sm:gap-0">
                <Button 
                    variant="secondary" 
                    type="button" 
                    onClick={() => onOpenChange(false)} 
                    className="font-bold text-[10px] uppercase tracking-widest px-6"
                >
                    Close Dialog
                </Button>
                <Button 
                    form="risk-form" 
                    type="submit" 
                    disabled={isSubmitting}
                    className="min-w-[150px] shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4 mr-1.5" />}
                  {activeRisk ? 'Update Registry' : 'Log Assessment'}
                </Button>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
