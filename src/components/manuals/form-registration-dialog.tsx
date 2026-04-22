
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle 
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, 
    PlusCircle, 
    Trash2, 
    Download, 
    ShieldCheck, 
    Link as LinkIcon, 
    FileText, 
    Send,
    ChevronRight,
    CheckCircle2,
    Info,
    FilePlus,
    LayoutList,
    AlertCircle,
    Gavel
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { UnitFormRequest, UnitFormRequestStatus } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { getOfficialServerTime } from '@/lib/actions';
import { format } from 'date-fns';

interface FormRegistrationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  unit: { id: string; name: string; category: string; isShared?: boolean };
  request?: UnitFormRequest | null;
}

const formRequestSchema = z.object({
  scannedRegistrationFormLink: z.string().url('Please provide a valid Google Drive link for the DRF.'),
  isDraft: z.boolean().default(false),
  requestedForms: z.array(z.object({
    name: z.string().min(1, 'Title is required'),
    code: z.string().min(1, 'Code is required'),
    link: z.string().url('Invalid Google Drive link for this form'),
    revision: z.string().min(1, 'Revision is required'),
  })).min(1, 'Please register at least one form in this request.'),
});

export function FormRegistrationDialog({ isOpen, onOpenChange, unit, request }: FormRegistrationDialogProps) {
  const { userProfile, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const form = useForm<z.infer<typeof formRequestSchema>>({
    resolver: zodResolver(formRequestSchema),
    defaultValues: {
      scannedRegistrationFormLink: '',
      isDraft: false,
      requestedForms: [{ name: '', code: '', link: '', revision: '00' }],
    }
  });

  const isDraftValue = form.watch('isDraft');

  useEffect(() => {
    if (isOpen && request) {
        form.reset({
            scannedRegistrationFormLink: request.scannedRegistrationFormLink,
            isDraft: request.isDraft ?? false,
            requestedForms: request.requestedForms.map(f => ({
                name: f.name,
                code: f.code,
                link: f.link,
                revision: f.revision
            }))
        });
        setStep(2); 
    } else if (isOpen && !request) {
        form.reset({
            scannedRegistrationFormLink: '',
            isDraft: false,
            requestedForms: [{ name: '', code: '', link: '', revision: '00' }],
        });
        setStep(1);
    }
  }, [isOpen, request, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "requestedForms"
  });

  const onSubmit = async (values: z.infer<typeof formRequestSchema>) => {
    if (!firestore || !userProfile || !unit) return;
    setIsSubmitting(true);
    try {
      let phDate: Date;
      try {
        const serverTime = await getOfficialServerTime();
        phDate = new Date(serverTime.iso);
      } catch (e) {
        phDate = new Date();
      }
      
      const unitCode = unit.isShared ? 'ACAD' : (unit.id ? unit.id.substring(0, 8).toUpperCase() : 'UNIT');
      const controlNumber = `RSU-DRF-${unitCode}-${format(phDate, 'yyyyMMdd-HHmm')}`;

      const sanitizedForms = values.requestedForms.map(f => ({
          name: f.name,
          code: f.code,
          link: f.link,
          revision: f.revision
      }));

      if (request) {
          const requestRef = doc(firestore, 'unitFormRequests', request.id);
          await updateDoc(requestRef, {
              scannedRegistrationFormLink: values.scannedRegistrationFormLink,
              isDraft: values.isDraft,
              requestedForms: sanitizedForms,
              status: 'Submitted' as UnitFormRequestStatus,
              updatedAt: serverTimestamp(),
          });
          toast({ title: 'Request Resubmitted', description: 'Your corrections have been logged.' });
      } else {
          const requestData = {
            scannedRegistrationFormLink: values.scannedRegistrationFormLink,
            isDraft: values.isDraft,
            requestedForms: sanitizedForms,
            unitId: unit.isShared ? 'academic-shared' : unit.id,
            unitName: unit.name,
            campusId: userProfile.campusId || '',
            submitterId: userProfile.id,
            submitterName: `${userProfile.firstName} ${userProfile.lastName}`,
            status: 'Submitted' as UnitFormRequestStatus,
            controlNumber,
            comments: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          await addDoc(collection(firestore, 'unitFormRequests'), requestData);
          toast({ title: 'Request Logged', description: `DRF request ${controlNumber} has been sent for review.` });
      }
      
      onOpenChange(false);
      form.reset();
      setStep(1);
    } catch (error) {
      console.error("Form Registration Error:", error);
      toast({ title: 'Submission Failed', description: 'Could not process the registration request.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);

  const StepGuidance = ({ step, isDraft }: { step: number, isDraft: boolean }) => {
    let content = null;
    
    if (step === 1) {
      content = isDraft ? (
        <div className="space-y-1">
          <p className="font-black text-blue-800 uppercase text-[10px] tracking-widest">Draft Protocol: Preparation</p>
          <p className="text-[11px] text-blue-700 leading-relaxed">Download the template and define your intended form codes and titles. <strong>Signatures are NOT required</strong> for preliminary content audits.</p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Final Protocol: Preparation</p>
          <p className="text-[11px] text-slate-600 leading-relaxed">Secure official signatures from the Unit Head on the printed DRF. <strong>All signatures must be visible</strong> on the scanned copy to qualify for registration.</p>
        </div>
      );
    } else if (step === 2) {
      content = isDraft ? (
        <div className="space-y-1">
          <p className="font-black text-blue-800 uppercase text-[10px] tracking-widest">Draft Protocol: Uploading</p>
          <p className="text-[11px] text-blue-700 leading-relaxed">Paste the links to your working documents. Ensure the Quality Assurance Office has "Editor" or "Viewer" access to suggest corrections directly.</p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Final Protocol: Uploading</p>
          <p className="text-[11px] text-slate-600 leading-relaxed">Upload the signed DRF (PDF) and the final versions of your forms. Ensure links are set to <strong>"Anyone with the link can view"</strong> for institutional verification.</p>
        </div>
      );
    } else if (step === 3) {
      content = isDraft ? (
        <div className="space-y-1">
          <p className="font-black text-blue-800 uppercase text-[10px] tracking-widest">Draft Protocol: Final Review</p>
          <p className="text-[11px] text-blue-700 leading-relaxed">Confirm that you are submitting a <strong>Preliminary Draft</strong>. This will trigger a content check. Forms will NOT be enrolled in the roster until a Final submission is made.</p>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Final Protocol: Final Review</p>
          <p className="text-[11px] text-slate-600 leading-relaxed">Confirm that all signatures are present and all links are accessible. Approval of this request will <strong>officially enroll these forms</strong> into your unit's controlled roster.</p>
        </div>
      );
    }

    return (
      <div className={cn(
        "mt-10 p-4 rounded-xl border flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500",
        isDraft ? "bg-blue-50 border-blue-100" : "bg-slate-50 border-slate-200"
      )}>
        {isDraft ? <LayoutList className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" /> : <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />}
        {content}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 text-primary mb-1">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Document Control</span>
          </div>
          <DialogTitle className="text-xl">
            {request ? 'Edit & Resubmit Request' : 'Form Registration Request'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {request ? 'Update your application based on review feedback.' : 'Register new or revised controlled forms.'}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/30 px-6 py-2 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
                {[1, 2, 3].map(s => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black transition-colors", step === s ? "bg-primary text-white" : step > s ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500")}>
                            {step > s ? <CheckCircle2 className="h-3 w-3" /> : s}
                        </div>
                        <span className={cn("text-[9px] font-black uppercase tracking-widest", step === s ? "text-primary" : "text-muted-foreground")}>
                            {s === 1 ? 'Step 1: Prep' : s === 2 ? 'Step 2: Upload' : 'Step 3: Review'}
                        </span>
                        {s < 3 && <ChevronRight className="h-3 w-3 opacity-20" />}
                    </div>
                ))}
            </div>
            <Badge variant="outline" className="h-5 text-[9px] font-black border-primary/20 text-primary bg-white uppercase">{unit.name}</Badge>
        </div>

        <div className="flex-1 overflow-hidden bg-white">
          <Form {...form}>
            <form id="reg-form" onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-8 pb-12">
                  {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
                        <div className="space-y-4">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Download className="h-4 w-4" /></div>
                                1. Prepare Document Registration Form (DRF)
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed pl-11 font-medium">
                                Obtain the official DRF template. For **Final** submissions, ensure it is signed by the Unit Head. For **Draft** submissions, signatures are not required.
                            </p>
                            <Card className="border-primary/20 bg-primary/5 shadow-none ml-11">
                                <CardContent className="pt-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="space-y-1">
                                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Official DRF Template</p>
                                        <p className="text-[10px] text-muted-foreground font-medium italic">Standardized Institutional Form</p>
                                    </div>
                                    <Button type="button" variant="default" size="sm" className="font-black uppercase text-[10px] tracking-widest h-9" asChild>
                                        <a href="https://drive.google.com/file/d/1yPdJGXQT1yhyXkENhtDHLaIMlxTnHYx3/view?usp=sharing" target="_blank" rel="noopener noreferrer">
                                            <Download className="mr-2 h-4 w-4" /> Download Template
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-10 animate-in fade-in duration-500">
                        <section className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Send className="h-4 w-4" /></div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">2. Submission Type & Evidence</h3>
                            </div>
                            
                            <div className="pl-11 space-y-6">
                                <FormField control={form.control} name="isDraft" render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel className="text-[10px] font-black uppercase text-primary">Registration Type</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={(v) => field.onChange(v === 'true')} value={field.value ? 'true' : 'false'} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className={cn("flex items-center space-x-2 border p-4 rounded-xl cursor-pointer hover:bg-muted/50", field.value && "bg-blue-50 border-blue-200 shadow-sm")}>
                                                    <RadioGroupItem value="true" id="drf-draft" />
                                                    <Label htmlFor="drf-draft" className="flex-1 cursor-pointer">
                                                        <p className="text-sm font-bold flex items-center gap-2"><LayoutList className="h-4 w-4 text-blue-600" /> Preliminary Draft</p>
                                                        <p className="text-[10px] text-muted-foreground">For content checking. No signatures needed.</p>
                                                    </Label>
                                                </div>
                                                <div className={cn("flex items-center space-x-2 border p-4 rounded-xl cursor-pointer hover:bg-muted/50", !field.value && "bg-green-50 border-green-200 shadow-sm")}>
                                                    <RadioGroupItem value="false" id="drf-final" />
                                                    <Label htmlFor="drf-final" className="flex-1 cursor-pointer">
                                                        <p className="text-sm font-bold flex items-center gap-2"><FileText className="h-4 w-4 text-green-600" /> Final Registration</p>
                                                        <p className="text-[10px] text-muted-foreground">Signed PDF for official enrollment.</p>
                                                    </Label>
                                                </div>
                                            </RadioGroup>
                                        </FormControl>
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="scannedRegistrationFormLink" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[10px] font-black uppercase text-slate-700">Google Drive Link: DRF Document</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-50" />
                                                <Input {...field} placeholder="https://drive.google.com/..." className="pl-9 h-11 border-primary/20 bg-slate-50 shadow-inner" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </section>

                        <Separator className="ml-11" />

                        <section className="space-y-6">
                            <div className="flex items-center justify-between pl-11">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><FilePlus className="h-4 w-4" /></div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">3. Individual Forms Roster</h3>
                                </div>
                                <Button type="button" size="sm" onClick={() => append({ name: '', code: '', link: '', revision: '00' })} className="h-8 font-black text-[10px] uppercase gap-1.5 shadow-sm">
                                    <PlusCircle className="h-3.5 w-3.5" /> Add Form
                                </Button>
                            </div>
                            
                            <div className="space-y-3 ml-11">
                                {fields.map((field, index) => (
                                    <Card key={field.id} className="relative group border-primary/10 hover:border-primary/30 transition-all bg-muted/5">
                                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={() => remove(index)} disabled={fields.length === 1}><Trash2 className="h-4 w-4" /></Button>
                                        <CardContent className="p-4 pt-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                            <div className="md:col-span-3">
                                                <FormField control={form.control} name={`requestedForms.${index}.code`} render={({ field: inputField }) => (
                                                    <FormItem><FormLabel className="text-[9px] font-black uppercase text-muted-foreground">Form Code</FormLabel><FormControl><Input {...inputField} placeholder="QAO-01-001" className="h-8 text-[10px] bg-white font-mono" /></FormControl></FormItem>
                                                )} />
                                            </div>
                                            <div className="md:col-span-5">
                                                <FormField control={form.control} name={`requestedForms.${index}.name`} render={({ field: inputField }) => (
                                                    <FormItem><FormLabel className="text-[9px] font-black uppercase text-muted-foreground">Official Title</FormLabel><FormControl><Input {...inputField} placeholder="e.g. Daily Activity Log" className="h-8 text-[10px] bg-white" /></FormControl></FormItem>
                                                )} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <FormField control={form.control} name={`requestedForms.${index}.revision`} render={({ field: inputField }) => (
                                                    <FormItem><FormLabel className="text-[9px] font-black uppercase text-muted-foreground">Rev No.</FormLabel><FormControl><Input {...inputField} placeholder="00" className="h-8 text-[10px] bg-white" /></FormControl></FormItem>
                                                )} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <FormField control={form.control} name={`requestedForms.${index}.link`} render={({ field: inputField }) => (
                                                    <FormItem><FormLabel className="text-[9px] font-black uppercase text-muted-foreground">File Link</FormLabel><FormControl><Input {...inputField} className="h-8 text-[10px] bg-white" /></FormControl></FormItem>
                                                )} />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </section>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="text-center space-y-3 pb-8 border-b">
                            <div className="mx-auto h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                                <Send className="h-10 w-10" />
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Institutional Review Prep</h3>
                            <p className="text-sm text-muted-foreground max-w-lg mx-auto font-medium">Please verify the summary below. All links must be accessible to the Quality Assurance Office.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="p-5 rounded-2xl border bg-muted/20 flex items-center justify-between shadow-inner">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-white border border-primary/10 flex items-center justify-center">
                                        {isDraftValue ? <LayoutList className="h-6 w-6 text-blue-600" /> : <FileText className="h-6 w-6 text-green-600" />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">DRF Evidence Status</p>
                                        <p className="text-sm font-bold text-slate-900">{isDraftValue ? 'PRELIMINARY DRAFT' : 'FINAL SIGNED DOCUMENT'}</p>
                                    </div>
                                </div>
                                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Roster Summary ({fields.length} Items)</p>
                                <div className="border rounded-2xl overflow-hidden shadow-lg">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead className="text-[10px] font-black uppercase py-3 pl-6">Code</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase py-3">Official Title</TableHead>
                                                <TableHead className="text-right text-[10px] font-black uppercase py-3 pr-6">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fields.map((f, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-mono text-[11px] font-black py-4 pl-6 text-primary">{f.code || 'TBA'}</TableCell>
                                                    <TableCell className="text-xs font-bold text-slate-700">{f.name || 'Untitled Form'}</TableCell>
                                                    <TableCell className="text-right pr-6"><Badge variant="secondary" className="h-5 text-[8px] font-black uppercase bg-primary/5 text-primary">READY</Badge></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>
                  )}

                  {/* STEP GUIDANCE SECTION */}
                  <div className="px-1">
                      <StepGuidance step={step} isDraft={isDraftValue} />
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
                <div className="flex w-full items-center justify-between">
                    <button type="button" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-rose-600 transition-colors" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Discard Request</button>
                    <div className="flex gap-2">
                        {step > 1 && <Button type="button" variant="outline" className="font-black text-[10px] uppercase h-10 px-6" onClick={() => setStep(prev => prev - 1)} disabled={isSubmitting}>Back</Button>}
                        {step < 3 ? (
                            <Button type="button" onClick={nextStep} className="font-black text-[10px] uppercase h-10 px-8 shadow-md">Next Stage <ChevronRight className="ml-1.5 h-4 w-4" /></Button>
                        ) : (
                            <Button type="submit" form="reg-form" disabled={isSubmitting} className="min-w-[200px] shadow-xl shadow-primary/20 font-black uppercase text-[10px] h-10">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin mr-2" /> : <Send className="mr-2 h-4 w-4 mr-1.5" />}
                                Submit Application
                            </Button>
                        )}
                    </div>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
