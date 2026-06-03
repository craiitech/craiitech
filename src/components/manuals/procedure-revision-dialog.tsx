'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
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
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
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
    ClipboardCheck,
    FileSignature,
    Plus
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ProcedureRevisionRequest, ProcedureRevisionRequestStatus } from '@/lib/types';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { getOfficialServerTime } from '@/lib/actions';
import { format } from 'date-fns';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface ProcedureRevisionDialogProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  unit: { id: string; name: string; category: string; isShared?: boolean };
  request?: ProcedureRevisionRequest | null;
  isInline?: boolean;
  onSuccess?: () => void;
}

const revisionRequestSchema = z.object({
  scannedDRRFLink: z.string().url('Please provide a valid Google Drive link for the scanned DRRF.'),
  revisedManualDocxLink: z.string().url('Please provide a valid Google Drive link for the revised Word (.docx) file.'),
  revisedParts: z.array(z.object({
    part: z.string().min(1, 'Please select a procedure part.'),
    itemNumber: z.string().min(1, 'Item number is required.'),
    itemContents: z.string().min(5, 'Item contents/description must be at least 5 characters.'),
  })).min(1, 'Please register at least one part for revision in this request.'),
});

export function ProcedureRevisionDialog({ 
  isOpen = false, 
  onOpenChange, 
  unit, 
  request,
  isInline = false,
  onSuccess
}: ProcedureRevisionDialogProps) {
  const { userProfile, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Fetch dropdown configuration
  const configRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'settings', 'procedureRevisionConfig') : null),
    [firestore]
  );
  const { data: revisionConfig } = useDoc<{ parts: string[] }>(configRef);
  const dropdownParts = useMemo(() => revisionConfig?.parts || [], [revisionConfig]);

  const form = useForm<z.infer<typeof revisionRequestSchema>>({
    resolver: zodResolver(revisionRequestSchema),
    defaultValues: {
      scannedDRRFLink: '',
      revisedManualDocxLink: '',
      revisedParts: [{ part: '', itemNumber: '', itemContents: '' }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "revisedParts"
  });

  const scannedDRRFLinkVal = useWatch({ control: form.control, name: 'scannedDRRFLink' });
  const revisedManualDocxLinkVal = useWatch({ control: form.control, name: 'revisedManualDocxLink' });
  const revisedPartsList = useWatch({ control: form.control, name: 'revisedParts' });

  // Step validation
  const canProceed = useMemo(() => {
    if (step === 1) return true; // Prep step
    if (step === 2) {
      // Validate revised parts input
      return revisedPartsList && revisedPartsList.length > 0 && revisedPartsList.every(p => 
        p.part?.trim().length > 0 && 
        p.itemNumber?.trim().length > 0 && 
        p.itemContents?.trim().length >= 5
      );
    }
    if (step === 3) {
      // Validate Google Drive Links
      const isDrrfValid = !!scannedDRRFLinkVal && scannedDRRFLinkVal.startsWith('https://drive.google.com/');
      const isWordValid = !!revisedManualDocxLinkVal && revisedManualDocxLinkVal.startsWith('https://drive.google.com/');
      return isDrrfValid && isWordValid;
    }
    return true; // Step 4 is review summary
  }, [step, scannedDRRFLinkVal, revisedManualDocxLinkVal, revisedPartsList]);

  useEffect(() => {
    const active = isInline || isOpen;
    if (active && request) {
        form.reset({
            scannedDRRFLink: request.scannedDRRFLink,
            revisedManualDocxLink: request.revisedManualDocxLink,
            revisedParts: request.revisedParts.map(p => ({
                part: p.part,
                itemNumber: p.itemNumber,
                itemContents: p.itemContents
            }))
        });
        setStep(2); 
    } else if (active && !request) {
        form.reset({
            scannedDRRFLink: '',
            revisedManualDocxLink: '',
            revisedParts: [{ part: '', itemNumber: '', itemContents: '' }],
        });
        setStep(1);
    }
  }, [isOpen, request, form, isInline, unit?.id]);

  const handleFinalSubmit = async () => {
    const values = form.getValues();
    if (!firestore || !userProfile || !unit) return;
    
    setIsSubmitting(true);
    setIsConfirmOpen(false);
    
    try {
      let phDate: Date;
      try {
        const serverTime = await getOfficialServerTime();
        phDate = new Date(serverTime.iso);
      } catch (e) {
        phDate = new Date();
      }
      
      const unitCode = unit.isShared ? 'ACAD' : (unit.id ? unit.id.substring(0, 8).toUpperCase() : 'UNIT');
      const controlNumber = `RSU-REV-${unitCode}-${format(phDate, 'yyyyMMdd-HHmm')}`;

      const sanitizedParts = values.revisedParts.map(p => ({
          part: p.part.trim(),
          itemNumber: p.itemNumber.trim(),
          itemContents: p.itemContents.trim()
      }));

      if (request) {
          const requestRef = doc(firestore, 'procedureRevisionRequests', request.id);
          await updateDoc(requestRef, {
              scannedDRRFLink: values.scannedDRRFLink.trim(),
              revisedManualDocxLink: values.revisedManualDocxLink.trim(),
              revisedParts: sanitizedParts,
              status: 'Submitted' as ProcedureRevisionRequestStatus,
              updatedAt: serverTimestamp(),
          });
          toast({ title: 'Revision Request Resubmitted', description: 'Your corrections have been logged.' });
      } else {
          const requestData = {
            scannedDRRFLink: values.scannedDRRFLink.trim(),
            revisedManualDocxLink: values.revisedManualDocxLink.trim(),
            revisedParts: sanitizedParts,
            unitId: unit.isShared ? 'academic-shared' : unit.id,
            unitName: unit.name,
            campusId: userProfile.campusId || '',
            submitterId: userProfile.id,
            submitterName: `${userProfile.firstName} ${userProfile.lastName}`,
            status: 'Submitted' as ProcedureRevisionRequestStatus,
            controlNumber,
            comments: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          await addDoc(collection(firestore, 'procedureRevisionRequests'), requestData);
          toast({ title: 'Revision Request Logged', description: `Revision request ${controlNumber} has been sent for review.` });
      }
      
      if (onSuccess) {
          onSuccess();
      } else if (onOpenChange) {
          onOpenChange(false);
      }
      form.reset();
      setStep(1);
    } catch (error) {
      console.error("Revision Registration Error:", error);
      toast({ title: 'Submission Failed', description: 'Could not process the revision request.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    form.reset({
      scannedDRRFLink: '',
      revisedManualDocxLink: '',
      revisedParts: [{ part: '', itemNumber: '', itemContents: '' }],
    });
    setStep(1);
    if (!isInline && onOpenChange) {
      onOpenChange(false);
    }
  };

  const nextStep = () => {
    if (canProceed) {
        setStep(prev => prev + 1);
    } else {
        toast({ title: 'Step Incomplete', description: 'Please fill out all required fields and provide valid Google Drive links.', variant: 'destructive' });
    }
  };

  const StepGuidance = ({ step }: { step: number }) => {
    let content = null;
    
    if (step === 1) {
      content = (
        <div className="space-y-1">
          <p className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Protocol Stage: Preparation</p>
          <p className="text-[11px] text-slate-600 leading-relaxed">Download the template and print/fill it out. Secure the signature of the Unit Head. Ensure you also prepare the revised Microsoft Word version (.docx) of your procedure manual.</p>
        </div>
      );
    } else if (step === 2) {
      content = (
        <div className="space-y-1">
          <p className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Protocol Stage: Revision Details</p>
          <p className="text-[11px] text-slate-600 leading-relaxed">Select the exact process manual part to revise. Detail the specific item number and write a clear description of the modified contents.</p>
        </div>
      );
    } else if (step === 3) {
      content = (
        <div className="space-y-1">
          <p className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Protocol Stage: Uploading Evidence</p>
          <p className="text-[11px] text-slate-600 leading-relaxed">Provide public Google Drive links to the signed scanned DRRF and the revised manual word file (.docx). Links must be set to <strong>"Anyone with the link can view"</strong>.</p>
        </div>
      );
    } else if (step === 4) {
      content = (
        <div className="space-y-1">
          <p className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Protocol Stage: Final Verification</p>
          <p className="text-[11px] text-slate-600 leading-relaxed">Review the revision summary. Submitting will register this request into the Quality Assurance Office review pipeline.</p>
        </div>
      );
    }

    return (
      <div className="mt-10 p-4 rounded-xl border flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500 bg-slate-50 border-slate-200">
        <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        {content}
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
        <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Download className="h-4 w-4" /></div>
                1. Obtain & Prepare Revision Template (DRRF)
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed pl-11 font-medium">
                Download the official Document Registration and Revision Form (DRRF) template. Print and fill it out, ensuring the Unit Head signs the completed document before scanning.
            </p>
            <Card className="border-primary/20 bg-primary/5 shadow-none ml-11">
                <CardContent className="pt-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-1">
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Official DRRF Template</p>
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
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><FileSignature className="h-4 w-4" /></div>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">2. Specify Revised Manual Parts</h3>
        </div>
        <Button type="button" size="sm" onClick={() => append({ part: '', itemNumber: '', itemContents: '' })} className="h-8 font-black text-[10px] uppercase gap-1.5 shadow-sm">
          <Plus className="h-3.5 w-3.5" /> Add Part
        </Button>
      </div>

      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
        {fields.map((field, index) => (
          <Card key={field.id} className="relative group border-primary/10 hover:border-primary/30 transition-all bg-muted/5">
            {fields.length > 1 && (
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 text-destructive h-7 w-7 hover:bg-destructive/10 hover:text-destructive z-10" 
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <CardContent className="p-4 pt-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              <div className="md:col-span-5">
                <FormField control={form.control} name={`revisedParts.${index}.part`} render={({ field: inputField }) => (
                  <FormItem>
                    <FormLabel className="text-[9px] font-black uppercase text-muted-foreground">Procedure Part / Section</FormLabel>
                    <FormControl>
                      {dropdownParts.length > 0 ? (
                        <Select onValueChange={inputField.onChange} value={inputField.value}>
                          <SelectTrigger className="h-8 text-[11px] bg-white">
                            <SelectValue placeholder="Select Part" />
                          </SelectTrigger>
                          <SelectContent>
                            {dropdownParts.map((part, pIdx) => (
                              <SelectItem key={pIdx} value={part} className="text-xs">{part}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input {...inputField} placeholder="Enter manual section (e.g. Scope)" className="h-8 text-[11px] bg-white" />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="md:col-span-3">
                <FormField control={form.control} name={`revisedParts.${index}.itemNumber`} render={({ field: inputField }) => (
                  <FormItem>
                    <FormLabel className="text-[9px] font-black uppercase text-muted-foreground">Item / Section No.</FormLabel>
                    <FormControl>
                      <Input {...inputField} placeholder="e.g., Sec 3.2" className="h-8 text-[11px] bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="md:col-span-4">
                <FormField control={form.control} name={`revisedParts.${index}.itemContents`} render={({ field: inputField }) => (
                  <FormItem>
                    <FormLabel className="text-[9px] font-black uppercase text-muted-foreground">Description of Change</FormLabel>
                    <FormControl>
                      <Textarea {...inputField} placeholder="Detail the modifications made..." className="min-h-8 text-[11px] bg-white py-1" rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-3 border-b pb-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Send className="h-4 w-4" /></div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">3. Document Upload Links</h3>
        </div>
        
        <div className="space-y-6">
            <FormField control={form.control} name="scannedDRRFLink" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-700">Google Drive Link: Signed scanned DRRF</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-50" />
                            <Input {...field} placeholder="https://drive.google.com/file/d/..." className="pl-9 h-11 border-primary/20 bg-slate-50 shadow-inner text-xs" />
                        </div>
                    </FormControl>
                    <FormDescription className="text-[10px]">Provide the link to the PDF scan of the filled-out, signed DRRF.</FormDescription>
                    <FormMessage />
                </FormItem>
            )} />

            <FormField control={form.control} name="revisedManualDocxLink" render={({ field }) => (
                <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase text-slate-700">Google Drive Link: Revised Word Manual Document (.docx)</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-50" />
                            <Input {...field} placeholder="https://drive.google.com/file/d/..." className="pl-9 h-11 border-primary/20 bg-slate-50 shadow-inner text-xs" />
                        </div>
                    </FormControl>
                    <FormDescription className="text-[10px]">Provide the link to the actual revised Word manual document for text processing.</FormDescription>
                    <FormMessage />
                </FormItem>
            )} />
        </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
        <div className="text-center space-y-3 pb-6 border-b">
            <div className="mx-auto h-20 w-20 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                <Send className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Verify Revision Submission</h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto font-medium">Review the summarized parts below. Make sure both Google Drive links are fully accessible.</p>
        </div>

        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border bg-slate-50/50 shadow-inner">
                    <CardContent className="p-4 space-y-2">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">DRRF Scanned Copy</p>
                        <a href={scannedDRRFLinkVal} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" /> Open DRRF Link
                        </a>
                    </CardContent>
                </Card>
                <Card className="border bg-slate-50/50 shadow-inner">
                    <CardContent className="p-4 space-y-2">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Revised Manual (.docx)</p>
                        <a href={revisedManualDocxLinkVal} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" /> Open Word Manual Link
                        </a>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Revision Parts Summary ({fields.length} Items)</p>
                <div className="border rounded-2xl overflow-hidden shadow-lg bg-white">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="text-[10px] font-black uppercase py-3 pl-6">Section / Part</TableHead>
                                <TableHead className="text-[10px] font-black uppercase py-3 w-[120px]">Item No.</TableHead>
                                <TableHead className="text-[10px] font-black uppercase py-3 pr-6">Changes Detailed</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((f, i) => (
                                <TableRow key={i}>
                                    <TableCell className="text-xs font-black py-4 pl-6 text-primary">{f.part || 'TBA'}</TableCell>
                                    <TableCell className="text-xs font-bold text-slate-700">{f.itemNumber || 'TBA'}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground italic pr-6 max-w-[200px] truncate">{f.itemContents || 'No Description'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    </div>
  );

  const wizardFormContent = (
    <Form {...form}>
      <form id="rev-reg-form" onSubmit={(e) => e.preventDefault()} className="h-full flex flex-col">
        {isInline ? (
          <div className="p-6 pb-12 space-y-6">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            <div className="px-1">
                <StepGuidance step={step} />
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-8 pb-12 space-y-6">
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderStep4()}
              <div className="px-1">
                  <StepGuidance step={step} />
              </div>
            </div>
          </ScrollArea>
        )}

        <div className={cn("p-6 border-t bg-slate-50 shrink-0 flex items-center justify-between", isInline ? "rounded-b-xl" : "")}>
          <button 
            type="button" 
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-rose-600 transition-colors" 
            onClick={handleReset} 
            disabled={isSubmitting}
          >
            {isInline ? 'Reset Form' : 'Discard Application'}
          </button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button 
                type="button" 
                variant="outline" 
                className="font-black text-[10px] uppercase h-10 px-6" 
                onClick={() => setStep(prev => prev - 1)} 
                disabled={isSubmitting}
              >
                Back
              </Button>
            )}
            {step < 4 ? (
              <Button 
                type="button" 
                onClick={nextStep} 
                disabled={!canProceed}
                className={cn(
                  "font-black text-[10px] uppercase h-10 px-8 shadow-md",
                  !canProceed && "opacity-50 grayscale cursor-not-allowed"
                )}
              >
                Next Stage <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                disabled={isSubmitting} 
                className="min-w-[200px] shadow-xl shadow-primary/20 font-black uppercase text-[10px] h-10"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit Revision Application
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );

  const stepsHeader = (
    <div className="bg-muted/30 px-6 py-2.5 border-b flex flex-wrap items-center gap-4 shrink-0">
        {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center gap-2">
                <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black transition-colors", step === s ? "bg-primary text-white" : step > s ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500")}>
                    {step > s ? <CheckCircle2 className="h-3 w-3" /> : s}
                </div>
                <span className={cn("text-[9px] font-black uppercase tracking-widest", step === s ? "text-primary" : "text-muted-foreground")}>
                    {s === 1 ? 'Step 1: Prep' : s === 2 ? 'Step 2: Details' : s === 3 ? 'Step 3: Upload' : 'Step 4: Review'}
                </span>
                {s < 4 && <ChevronRight className="h-3 w-3 opacity-20" />}
            </div>
        ))}
    </div>
  );

  return (
    <>
      {isInline ? (
        <div className="flex flex-col w-full bg-white rounded-xl border shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="p-6 border-b bg-slate-50 shrink-0">
            <div className="flex items-center gap-2 text-primary mb-1">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Procedure Document Control</span>
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
              {request ? 'Edit & Resubmit Revision Request' : 'Procedure Revision Application'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {request ? 'Update your revision details based on comments.' : 'Apply to modify official procedure manual contents.'}
            </p>
          </div>
          {stepsHeader}
          <div className="flex-1 bg-white">
            {wizardFormContent}
          </div>
        </div>
      ) : (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
            <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
              <div className="flex items-center gap-2 text-primary mb-1">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Procedure Document Control</span>
              </div>
              <DialogTitle className="text-xl">
                {request ? 'Edit & Resubmit Revision Request' : 'Procedure Revision Application'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {request ? 'Update your revision details based on comments.' : 'Apply to modify official procedure manual contents.'}
              </DialogDescription>
            </DialogHeader>
            {stepsHeader}
            <div className="flex-1 overflow-hidden bg-white">
              {wizardFormContent}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <div className="flex items-center gap-2 text-primary mb-2">
                      <ClipboardCheck className="h-6 w-6" />
                      <AlertDialogTitle className="font-black uppercase tracking-tight">Institutional Revision Verification</AlertDialogTitle>
                  </div>
                  <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                      By submitting this revision application, you certify that:<br/><br/>
                      1. All Google Drive links are set to <strong>"Anyone with the link can view"</strong>.<br/>
                      2. The DRRF is filled, signed, and scanned appropriately.<br/>
                      3. The revised Microsoft Word manual contains precise updates as listed.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel className="font-bold text-[10px] uppercase">Review Again</AlertDialogCancel>
                  <AlertDialogAction onClick={handleFinalSubmit} className="bg-primary font-black text-[10px] uppercase shadow-lg shadow-primary/20 px-8">
                      Confirm & Submit Application
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
