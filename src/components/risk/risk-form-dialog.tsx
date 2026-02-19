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
import { doc, serverTimestamp, collection, setDoc, addDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import type { Risk, User as AppUser, Unit, Campus } from '@/lib/types';
import { Loader2, Sparkles, ShieldCheck, Info, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { suggestRiskTreatment } from '@/ai/flows/suggest-treatment-flow';

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
  const { logSessionActivity } = useSessionActivity();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  
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

  useEffect(() => {
    if (risk) {
      const targetDate = risk.targetDate?.toDate?.() || risk.targetDate;
      form.reset({
        year: risk.year,
        objective: risk.objective || '',
        type: risk.type || 'Risk',
        description: risk.description || '',
        currentControls: risk.currentControls || '',
        likelihood: risk.preTreatment.likelihood,
        consequence: risk.preTreatment.consequence,
        treatmentAction: risk.treatmentAction || '',
        status: risk.status || 'Open',
        responsiblePersonId: risk.responsiblePersonId || '',
        targetYear: targetDate instanceof Date ? String(targetDate.getFullYear()) : undefined,
        targetMonth: targetDate instanceof Date ? String(targetDate.getMonth()) : undefined,
        targetDay: targetDate instanceof Date ? String(targetDate.getDate()) : undefined,
        postTreatmentLikelihood: risk.postTreatment?.likelihood,
        postTreatmentConsequence: risk.postTreatment?.consequence,
        postTreatmentEvidence: risk.postTreatment?.evidence || '',
        postTreatmentDateImplemented: risk.postTreatment?.dateImplemented || '',
        oapNo: risk.oapNo || '',
        resourcesNeeded: risk.resourcesNeeded || '',
        updates: risk.updates || '',
        preparedBy: risk.preparedBy || '',
        approvedBy: risk.approvedBy || '',
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

  const likelihoodValue = form.watch('likelihood');
  const consequenceValue = form.watch('consequence');
  const riskTypeValue = form.watch('type');
  const descriptionValue = form.watch('description');
  const objectiveValue = form.watch('objective');
  const ptLikelihood = form.watch('postTreatmentLikelihood');
  const ptConsequence = form.watch('postTreatmentConsequence');

  const magnitude = likelihoodValue * consequenceValue;
  const rating = getRating(magnitude);
  const ptMagnitude = ptLikelihood && ptConsequence ? ptLikelihood * ptConsequence : 0;
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
        let targetDateISO: string | null = null;
        if (values.targetYear && values.targetMonth && values.targetDay) {
            const date = new Date(Number(values.targetYear), Number(values.targetMonth), Number(values.targetDay));
            targetDateISO = date.toISOString();
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
          userId: risk?.userId || user.uid,
          preTreatment: { 
            likelihood: Number(values.likelihood), 
            consequence: Number(values.consequence), 
            magnitude: Number(magnitude), 
            rating: String(rating) 
          },
          treatmentAction: values.treatmentAction || '',
          responsiblePersonId: values.responsiblePersonId || '',
          responsiblePersonName: responsiblePerson ? `${responsiblePerson.firstName} ${responsiblePerson.lastName}` : '',
          targetDate: targetDateISO ? Timestamp.fromDate(new Date(targetDateISO)) : null,
          oapNo: values.oapNo || '',
          resourcesNeeded: values.resourcesNeeded || '',
          updates: values.updates || '',
          preparedBy: values.preparedBy || '',
          approvedBy: values.approvedBy || '',
          updatedAt: serverTimestamp(),
        };

        if (values.status === 'Closed' && values.postTreatmentLikelihood && values.postTreatmentConsequence) {
            riskData.postTreatment = {
                likelihood: Number(values.postTreatmentLikelihood),
                consequence: Number(values.postTreatmentConsequence),
                magnitude: Number(ptMagnitude),
                rating: String(ptRating),
                evidence: values.postTreatmentEvidence || '',
                dateImplemented: values.postTreatmentDateImplemented || '',
            };
        }

        if (risk) {
            const riskRef = doc(firestore, 'risks', risk.id);
            await setDoc(riskRef, riskData, { merge: true });
            toast({ title: 'Success', description: 'Entry updated.' });
        } else {
            const riskColRef = collection(firestore, 'risks');
            await addDoc(riskColRef, { ...riskData, createdAt: serverTimestamp() });
            toast({ title: 'Success', description: 'Entry registered.' });
        }
        onOpenChange(false);
    } catch (error) {
        console.error("Error:", error);
        toast({ title: 'Error', description: 'Could not save the assessment record.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={isMandatory ? undefined : onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl h-[95vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 border-b shrink-0 bg-card shadow-sm">
            <div className="flex items-center gap-2 text-primary mb-1">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Risk & Opportunity Registry</span>
            </div>
            <DialogTitle className="text-xl">
              {risk ? 'Edit' : 'Log New'} Assessment Record
            </DialogTitle>
        </div>
        <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 border-r bg-background">
                <ScrollArea className="flex-1">
                    <Form {...form}>
                        <form id="risk-form" onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-8">
                            {/* --- Identification Section --- */}
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

                            {/* --- Analysis Section --- */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">2</div>
                                    Risk Analysis
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
                                                {likelihoodOptions.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
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
                                                {consequenceOptions.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
                                              </SelectContent>
                                            </Select>
                                          </FormItem>
                                        )} />
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-md border">
                                        <div className="text-sm font-medium">Magnitude (L x C): <span className="font-bold text-lg">{magnitude}</span></div>
                                        <Badge 
                                            variant={rating === 'High' ? 'destructive' : rating === 'Medium' ? 'secondary' : 'default'}
                                            className="h-7 px-4 text-xs font-bold uppercase"
                                        >
                                            {rating} RATING
                                        </Badge>
                                    </div>
                                </CardContent>
                              </Card>
                            </div>

                            {/* --- Action Plan Section --- */}
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

                            {/* --- Monitoring Section --- */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <div className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center text-xs">4</div>
                                    Monitoring & Updates
                                </h3>
                                <Card className="border-blue-200">
                                    <CardContent className="space-y-4 pt-6">
                                        <FormField
                                            control={form.control}
                                            name="updates"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-bold">Monitoring Notes / Updates</FormLabel>
                                                    <FormControl>
                                                        <Textarea 
                                                            {...field} 
                                                            value={field.value || ''} 
                                                            rows={4} 
                                                            placeholder="Record progress or evidence of actions taken..." 
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="status"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-bold">Status</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Open">Open</SelectItem>
                                                            <SelectItem value="In Progress">In Progress</SelectItem>
                                                            <SelectItem value="Closed">Closed</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        </form>
                    </Form>
                </ScrollArea>
            </div>
            
            {/* --- Right Reference Panel --- */}
            <div className="hidden lg:flex w-[400px] flex-col bg-muted/10 border-l shrink-0">
                <div className="p-4 border-b font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2 bg-white">
                  <Info className="h-4 w-4" /> Assessment Reference
                </div>
                <ScrollArea className="flex-1 p-6 space-y-6">
                    <Card className="border-blue-200 shadow-sm overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-blue-50 border-b">
                          <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-800">Magnitude Guide</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-1 gap-1.5 text-[10px] font-bold">
                                <div className="p-2 rounded bg-red-50 border border-red-100 text-red-700 uppercase">High (10-25) - Action Mandatory</div>
                                <div className="p-2 rounded bg-amber-50 border border-amber-100 text-amber-700 uppercase">Medium (5-9) - Action Mandatory</div>
                                <div className="p-2 rounded bg-green-50 border border-green-100 text-green-700 uppercase">Low (1-4) - Monitor Only</div>
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
        <div className="p-6 border-t shrink-0 bg-card">
            <DialogFooter className="gap-2 sm:gap-0">
                {!isMandatory && (
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                )}
                <Button 
                    form="risk-form" 
                    type="submit" 
                    disabled={isSubmitting}
                    className="min-w-[150px] shadow-lg shadow-primary/20"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {risk ? 'Save Updates' : 'Log Assessment'}
                </Button>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
