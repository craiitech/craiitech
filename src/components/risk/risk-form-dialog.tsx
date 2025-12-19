
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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { Risk, User as AppUser } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, HelpCircle, ListChecks } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { Separator } from '../ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';

interface RiskFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  risk: Risk | null;
  unitUsers: AppUser[];
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
const months = [
  { value: '0', label: 'January' }, { value: '1', label: 'February' }, { value: '2', label: 'March' },
  { value: '3', label: 'April' }, { value: '4', label: 'May' }, { value: '5', label: 'June' },
  { value: '6', label: 'July' }, { value: '7', label: 'August' }, { value: '8', label: 'September' },
  { value: '9', label: 'October' }, { value: '10', label: 'November' }, { value: '11', label: 'December' },
];
const days = Array.from({ length: 31 }, (_, i) => String(i + 1));


const formSchema = z.object({
  year: z.number().int().min(new Date().getFullYear() - 5).max(new Date().getFullYear() + 5),
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
}).superRefine((data, ctx) => {
    const magnitude = (data.likelihood || 0) * (data.consequence || 0);
    const rating = getRating(magnitude);
    if (rating === 'Medium' || rating === 'High') {
        if (!data.treatmentAction) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Action Plan is required for Medium and High ratings.',
                path: ['treatmentAction'],
            });
        }
        if (!data.responsiblePersonId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Accountable Person is required for Medium and High ratings.',
                path: ['responsiblePersonId'],
            });
        }
        if (!data.targetYear || !data.targetMonth || !data.targetDay) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'A complete Target Date is required for Medium and High ratings.',
                path: ['targetDay'],
            });
        }
    }
    if (data.status === 'Closed') {
        if (!data.postTreatmentLikelihood || !data.postTreatmentConsequence) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Post-treatment analysis is required to close a risk.',
                path: ['postTreatmentLikelihood'],
            });
        }
         if (!data.postTreatmentEvidence) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Evidence of implementation is required to close a risk.',
                path: ['postTreatmentEvidence'],
            });
        }
         if (!data.postTreatmentDateImplemented) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Date of implementation is required to close a risk.',
                path: ['postTreatmentDateImplemented'],
            });
        }
    }
});

const likelihoodOptions = [
  { value: 1, label: '1 - Rare' },
  { value: 2, label: '2 - Unlikely' },
  { value: 3, label: '3 - Possible' },
  { value: 4, label: '4 - Likely' },
  { value: 5, label: '5 - Almost Certain' },
];

const consequenceOptions = [
  { value: 1, label: '1 - Insignificant' },
  { value: 2, label: '2 - Minor' },
  { value: 3, label: '3 - Moderate' },
  { value: 4, label: '4 - Major' },
  { value: 5, label: '5 - Catastrophic' },
];

const getRating = (magnitude: number): string => {
  if (magnitude >= 15) return 'High';
  if (magnitude >= 5) return 'Medium';
  return 'Low';
};

const CriteriaTable = ({ title, criteria }: { title: string, criteria: { level: string, descriptor: string }[] }) => (
    <div className="mb-4">
        <h4 className="font-semibold text-sm mb-2">{title}</h4>
        <div className="border rounded-lg text-xs">
            <div className="grid grid-cols-[1fr_2fr] font-medium bg-muted/50">
                <div className="p-2 border-b border-r">Level</div>
                <div className="p-2 border-b">Descriptor</div>
            </div>
            {criteria.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_2fr]">
                    <div className="p-2 border-b border-r">{item.level}</div>
                    <div className="p-2 border-b">{item.descriptor}</div>
                </div>
            ))}
        </div>
    </div>
);

const likelihoodCriteria = [
    { level: "5 - Almost Certain", descriptor: "Is expected to occur in most circumstances" },
    { level: "4 - Likely", descriptor: "Will probably occur in most circumstances" },
    { level: "3 - Possible", descriptor: "Might occur at some time" },
    { level: "2 - Unlikely", descriptor: "Could occur at some time" },
    { level: "1 - Rare", descriptor: "May occur only in exceptional circumstances" },
];

const consequenceCriteria = [
    { level: "5 - Catastrophic", descriptor: "May result to long-term interruption of business operations; May cause a total collapse of the university's quality management system" },
    { level: "4 - Major", descriptor: "May result to short-term interruption of business operations; May affect the entire quality management system" },
    { level: "3 - Moderate", descriptor: "May affect some parts of the quality management system" },
    { level: "2 - Minor", descriptor: "Requires minor amendment in some of the university's processes" },
    { level: "1 - Insignificant", descriptor: "Can be managed by routine procedures; has no effect on the quality management system" },
];


const GuideContent = () => (
    <div className="space-y-4 text-xs">
        <div>
            <h4 className="font-semibold text-sm">6.1.1. Risk/Opportunity Description</h4>
            <p className="text-muted-foreground">Define the risk/opportunity area, and briefly describe the risk/opportunity event and its consequences. What can go wrong (risk) or what can happen (opportunity)? What are the impacts/consequences if it does go wrong (risk) or it actually happens (opportunity)?</p>
        </div>
        <div>
            <h4 className="font-semibold text-sm">6.1.3. Current Controls/Situation</h4>
            <p className="text-muted-foreground">Describe any existing policy, procedure, practice, or mechanism that acts to minimize the risk or maximize the opportunity. What is in place now that reduces the likelihood of this risk occurring or its impact if it does occur? What is being done to maximize the benefits of the opportunity if it does occur?</p>
        </div>
         <div>
            <h4 className="font-semibold text-sm">6.1.4. Likelihood & 6.1.5. Consequence</h4>
            <p className="text-muted-foreground">Rate the level of likelihood and consequence from 1 to 5 based on the appropriate criteria. How likely is this to occur and how significant would the impact be?</p>
        </div>
         <div>
            <h4 className="font-semibold text-sm">6.1.6. Risk/Opportunity Magnitude</h4>
            <p className="text-muted-foreground">Multiply the rating for Likelihood and Consequence. The product is used to determine whether the risk level is high, medium, or low.</p>
        </div>
         <div>
            <h4 className="font-semibold text-sm">6.1.7. Treatment Plan</h4>
            <p className="text-muted-foreground">Describe the actions for those risks/opportunities requiring further treatment (i.e., for Medium and High ratings).</p>
        </div>
         <div>
            <h4 className="font-semibold text-sm">6.1.8. Responsible</h4>
            <p className="text-muted-foreground">Identify the office, department, or unit responsible for implementing the treatment plan.</p>
        </div>
        <div>
            <h4 className="font-semibold text-sm">6.1.9. Target Date</h4>
            <p className="text-muted-foreground">Define the target date of implementation of the treatment plan.</p>
        </div>
        <div>
            <h4 className="font-semibold text-sm">6.1.10. Risk/Opportunity Rating After Treatment</h4>
            <p className="text-muted-foreground">Evaluate the risk/opportunity after completion of the treatment plan by reassessing using the criteria for the likelihood of occurrence and consequence. (This is done on the detail page after the action plan is implemented).</p>
        </div>
    </div>
);


export function RiskFormDialog({ isOpen, onOpenChange, risk, unitUsers }: RiskFormDialogProps) {
  const { userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { logSessionActivity } = useSessionActivity();
  const [sidePanelView, setSidePanelView] = useState<'criteria' | 'guide'>('criteria');

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
      oapNo: '',
      resourcesNeeded: '',
      updates: '',
      preparedBy: '',
      approvedBy: '',
    },
  });

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
        postTreatmentEvidence: risk.postTreatment?.evidence,
        postTreatmentDateImplemented: dateImplemented,
        oapNo: risk.oapNo || '',
        resourcesNeeded: risk.resourcesNeeded || '',
        updates: risk.updates || '',
        preparedBy: risk.preparedBy || '',
        approvedBy: risk.approvedBy || '',
      });
    } else {
      form.reset({
        year: new Date().getFullYear(),
        objective: '',
        type: 'Risk',
        description: '',
        currentControls: '',
        treatmentAction: '',
        status: 'Open',
        likelihood: undefined,
        consequence: undefined,
        responsiblePersonId: undefined,
        targetYear: undefined,
        targetMonth: undefined,
        targetDay: undefined,
        postTreatmentLikelihood: undefined,
        postTreatmentConsequence: undefined,
        postTreatmentEvidence: undefined,
        postTreatmentDateImplemented: undefined,
        oapNo: '',
        resourcesNeeded: '',
        updates: '',
        preparedBy: '',
        approvedBy: '',
      });
    }
  }, [risk, isOpen, form]);

  const likelihood = form.watch('likelihood');
  const consequence = form.watch('consequence');
  const status = form.watch('status');
  const magnitude = likelihood && consequence ? likelihood * consequence : 0;
  const rating = getRating(magnitude);
  
  const showActionPlan = rating === 'Medium' || rating === 'High';
  const showPostTreatment = status === 'Closed';
  
  const postTreatmentLikelihood = form.watch('postTreatmentLikelihood');
  const postTreatmentConsequence = form.watch('postTreatmentConsequence');
  const postTreatmentMagnitude = postTreatmentLikelihood && postTreatmentConsequence ? postTreatmentLikelihood * postTreatmentConsequence : 0;
  const postTreatmentRating = getRating(postTreatmentMagnitude);


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore || !userProfile) return;
    setIsSubmitting(true);
    
    const responsiblePerson = unitUsers.find(u => u.id === values.responsiblePersonId);

    let targetDateValue: Date | null = null;
    if (values.targetYear && values.targetMonth && values.targetDay) {
        targetDateValue = new Date(Number(values.targetYear), Number(values.targetMonth), Number(values.targetDay));
    }

    const riskData: Omit<Risk, 'id' | 'createdAt'> = {
      ...values,
      unitId: userProfile.unitId,
      campusId: userProfile.campusId,
      preTreatment: {
        likelihood: values.likelihood,
        consequence: values.consequence,
        magnitude,
        rating,
      },
      postTreatment: values.status === 'Closed' && values.postTreatmentLikelihood && values.postTreatmentConsequence ? {
        likelihood: values.postTreatmentLikelihood,
        consequence: values.postTreatmentConsequence,
        magnitude: postTreatmentMagnitude,
        rating: postTreatmentRating,
        evidence: values.postTreatmentEvidence || '',
        dateImplemented: values.postTreatmentDateImplemented || null,
      } : risk?.postTreatment || undefined,
      responsiblePersonId: values.responsiblePersonId || '',
      responsiblePersonName: responsiblePerson ? `${responsiblePerson.firstName} ${responsiblePerson.lastName}` : '',
      targetDate: targetDateValue,
      updatedAt: serverTimestamp(),
    };

    try {
        if (risk) {
            const riskRef = doc(firestore, 'risks', risk.id);
            await setDoc(riskRef, { ...riskData, createdAt: risk.createdAt }, { merge: true });
            logSessionActivity('Updated risk entry', { action: 'update_risk', details: { riskId: risk.id }});
            toast({ title: 'Success', description: 'Risk/Opportunity entry has been updated.' });
        } else {
            const riskRef = collection(firestore, 'risks');
            const newDoc = await addDoc(riskRef, { ...riskData, createdAt: serverTimestamp() });
            logSessionActivity('Created risk entry', { action: 'create_risk', details: { riskId: newDoc.id }});
            toast({ title: 'Success', description: 'New Risk/Opportunity has been logged.' });
        }
        onOpenChange(false);
    } catch (error) {
        console.error("Error saving risk:", error);
        toast({ title: 'Error', description: 'Could not save the entry.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{risk ? 'Edit' : 'Log New'} Risk or Opportunity</DialogTitle>
          <div className="flex justify-between items-center">
            <DialogDescription>
              Fill out the details below. Use the guide on the right for help.
            </DialogDescription>
            <div className="flex items-center gap-4 text-sm">
                <Button variant="link" size="sm" onClick={() => setSidePanelView('criteria')} className={cn("p-0 h-auto", {"font-bold text-primary": sidePanelView === 'criteria'})}>
                    <ListChecks className="mr-1 h-4 w-4" />
                    Rating Criteria
                </Button>
                <Button variant="link" size="sm" onClick={() => setSidePanelView('guide')} className={cn("p-0 h-auto", {"font-bold text-primary": sidePanelView === 'guide'})}>
                     <HelpCircle className="mr-1 h-4 w-4" />
                    Field Guide
                </Button>
            </div>
          </div>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <ScrollArea className="h-[70vh] pr-6">
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Step 1: Identification</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField control={form.control} name="type" render={({ field }) => (
                                            <FormItem className="space-y-3">
                                            <FormLabel>Type of Entry</FormLabel>
                                            <FormControl>
                                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4">
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl><RadioGroupItem value="Risk" /></FormControl>
                                                        <Label className="font-normal">Risk</Label>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl><RadioGroupItem value="Opportunity" /></FormControl>
                                                        <Label className="font-normal">Opportunity</Label>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="objective" render={({ field }) => (
                                            <FormItem><FormLabel>Related Process/Function Objective</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                        
                                        <FormField control={form.control} name="description" render={({ field }) => (
                                            <FormItem><FormLabel>Description of Risk/Opportunity</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />

                                        <FormField control={form.control} name="currentControls" render={({ field }) => (
                                            <FormItem><FormLabel>Current Controls/Situation</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </CardContent>
                                </Card>

                                 <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Step 2: Analysis</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="likelihood" render={({ field }) => (
                                                <FormItem><FormLabel>Likelihood (Pre-Treatment)</FormLabel>
                                                    <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select likelihood" /></SelectTrigger></FormControl>
                                                        <SelectContent>{likelihoodOptions.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                <FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name="consequence" render={({ field }) => (
                                                <FormItem><FormLabel>Consequence (Pre-Treatment)</FormLabel>
                                                    <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select consequence" /></SelectTrigger></FormControl>
                                                        <SelectContent>{consequenceOptions.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                <FormMessage /></FormItem>
                                            )} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 rounded-md border p-4 bg-muted/50">
                                            <div><span className="font-medium">Calculated Magnitude:</span> {magnitude}</div>
                                            <div><span className="font-medium">Calculated Rating:</span> {rating}</div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {showActionPlan && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">Step 3: Action Plan</CardTitle>
                                            <CardDescription>An action plan is required for Medium and High ratings.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <FormField control={form.control} name="treatmentAction" render={({ field }) => (
                                                <FormItem><FormLabel>Action Plan / Treatment</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            
                                            <FormField control={form.control} name="resourcesNeeded" render={({ field }) => (
                                                <FormItem><FormLabel>Resources Needed (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                            )} />
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField control={form.control} name="responsiblePersonId" render={({ field }) => (
                                                    <FormItem><FormLabel>Accountable Person</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a person" /></SelectTrigger></FormControl>
                                                            <SelectContent>{unitUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    <FormMessage /></FormItem>
                                                )} />
                                                <div className="space-y-2">
                                                    <FormLabel>Target Completion Date</FormLabel>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <FormField control={form.control} name="targetMonth" render={({ field }) => (
                                                            <FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger></FormControl><SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                                        )} />
                                                        <FormField control={form.control} name="targetDay" render={({ field }) => (
                                                            <FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger></FormControl><SelectContent>{days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                                        )} />
                                                        <FormField control={form.control} name="targetYear" render={({ field }) => (
                                                            <FormItem><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger></FormControl><SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                                        )} />
                                                    </div>
                                                    <FormMessage>{form.formState.errors.targetDay?.message}</FormMessage>
                                                </div>
                                            </div>
                                             <FormField control={form.control} name="updates" render={({ field }) => (
                                                <FormItem><FormLabel>Progress Updates (Optional)</FormLabel><FormControl><Textarea {...field} placeholder="Document any progress made on the action plan here."/></FormControl><FormMessage /></FormItem>
                                            )} />
                                        </CardContent>
                                    </Card>
                                )}

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Step 4: Status</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                         <FormField control={form.control} name="status" render={({ field }) => (
                                            <FormItem><FormLabel>Overall Status</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Open">Open</SelectItem>
                                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                                        <SelectItem value="Closed">Closed</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            <FormMessage /></FormItem>
                                        )} />
                                    </CardContent>
                                </Card>

                                {showPostTreatment && (
                                     <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">Step 5: Post-Treatment Analysis</CardTitle>
                                            <CardDescription>Re-evaluate the risk after implementing the action plan.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <FormField control={form.control} name="postTreatmentEvidence" render={({ field }) => (
                                                <FormItem><FormLabel>Evidence of Implementation</FormLabel>
                                                    <FormControl><Textarea {...field} placeholder="Describe the evidence that supports the closure of this risk (e.g., 'Updated SOP document, training records, system logs')." /></FormControl>
                                                    <FormDescription className="text-xs">Reminder: Please document and file this evidence in the Document Control Center.</FormDescription>
                                                <FormMessage /></FormItem>
                                            )} />
                                            <FormField
                                                control={form.control}
                                                name="postTreatmentDateImplemented"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-col">
                                                    <FormLabel>Date Implemented</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                            variant={"outline"}
                                                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                            {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormField control={form.control} name="postTreatmentLikelihood" render={({ field }) => (
                                                    <FormItem><FormLabel>Likelihood (Post-Treatment)</FormLabel>
                                                        <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Select new likelihood" /></SelectTrigger></FormControl>
                                                            <SelectContent>{likelihoodOptions.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    <FormMessage /></FormItem>
                                                )} />
                                                <FormField control={form.control} name="postTreatmentConsequence" render={({ field }) => (
                                                    <FormItem><FormLabel>Consequence (Post-Treatment)</FormLabel>
                                                        <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Select new consequence" /></SelectTrigger></FormControl>
                                                            <SelectContent>{consequenceOptions.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    <FormMessage /></FormItem>
                                                )} />
                                            </div>
                                            <FormMessage>{form.formState.errors.postTreatmentLikelihood?.message}</FormMessage>

                                            <div className="grid grid-cols-2 gap-4 rounded-md border p-4 bg-muted/50">
                                                <div><span className="font-medium">New Magnitude:</span> {postTreatmentMagnitude}</div>
                                                <div><span className="font-medium">New Rating:</span> {postTreatmentRating}</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                    <div className="md:col-span-1">
                        <Card className="sticky top-0">
                             <CardHeader>
                                <CardTitle className="text-base">
                                     {sidePanelView === 'criteria' ? 'Rating Criteria' : 'Field Guide'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[65vh] pr-2">
                                     {sidePanelView === 'criteria' ? (
                                        <>
                                            <CriteriaTable title="Likelihood" criteria={likelihoodCriteria} />
                                            <CriteriaTable title="Consequence" criteria={consequenceCriteria} />
                                        </>
                                     ) : (
                                        <GuideContent />
                                     )}
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <DialogFooter className="pt-6">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {risk ? 'Save Changes' : 'Log Entry'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
