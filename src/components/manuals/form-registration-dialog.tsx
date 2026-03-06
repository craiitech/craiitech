
'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter 
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
    Loader2, 
    PlusCircle, 
    Trash2, 
    Download, 
    ShieldCheck, 
    Link as LinkIcon, 
    FileText, 
    ListChecks, 
    Send,
    ArrowRight,
    ChevronRight,
    ClipboardCheck,
    CheckCircle2,
    Info
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Unit } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface FormRegistrationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit;
}

const formRequestSchema = z.object({
  scannedRegistrationFormLink: z.string().url('Please provide a valid Google Drive link.'),
  requestedForms: z.array(z.object({
    name: z.string().min(1, 'Title is required'),
    code: z.string().min(1, 'Code is required'),
    link: z.string().url('Invalid link'),
    revision: z.string().min(1, 'Revision is required'),
  })).min(1, 'Register at least one form.'),
});

export function FormRegistrationDialog({ isOpen, onOpenChange, unit }: FormRegistrationDialogProps) {
  const { userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const form = useForm<z.infer<typeof formRequestSchema>>({
    resolver: zodResolver(formRequestSchema),
    defaultValues: {
      scannedRegistrationFormLink: '',
      requestedForms: [{ name: '', code: '', link: '', revision: '00' }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "requestedForms"
  });

  const onSubmit = async (values: z.infer<typeof formRequestSchema>) => {
    if (!firestore || !userProfile) return;
    setIsSubmitting(true);
    try {
      const requestData = {
        ...values,
        unitId: unit.id,
        unitName: unit.name,
        campusId: userProfile.campusId,
        submitterId: userProfile.id,
        submitterName: `${userProfile.firstName} ${userProfile.lastName}`,
        status: 'Submitted',
        comments: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(firestore, 'unitFormRequests'), requestData);
      toast({ title: 'Request Logged', description: 'Your registration request has been sent to QA for initial review.' });
      onOpenChange(false);
      form.reset();
      setStep(1);
    } catch (error) {
      console.error(error);
      toast({ title: 'Submission Failed', description: 'Could not process the request.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
      if (step === 1 && !form.getValues('scannedRegistrationFormLink')) {
          form.setError('scannedRegistrationFormLink', { type: 'manual', message: 'Signed Request Form is mandatory.' });
          return;
      }
      setStep(prev => prev + 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 text-primary mb-1">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Quality Document Control</span>
          </div>
          <DialogTitle className="text-xl">Form Registration Request</DialogTitle>
          <DialogDescription className="text-xs">Follow the multi-stage institutional process to register new or updated controlled forms.</DialogDescription>
        </DialogHeader>

        <div className="bg-muted/30 px-6 py-2 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
                {[1, 2, 3].map(s => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black transition-colors", step === s ? "bg-primary text-white" : step > s ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500")}>
                            {step > s ? <CheckCircle2 className="h-3 w-3" /> : s}
                        </div>
                        <span className={cn("text-[9px] font-black uppercase tracking-widest", step === s ? "text-primary" : "text-muted-foreground")}>
                            {s === 1 ? 'Preparation' : s === 2 ? 'Individual Roster' : 'Verification'}
                        </span>
                        {s < 3 && <ChevronRight className="h-3 w-3 opacity-20" />}
                    </div>
                ))}
            </div>
            <Badge variant="outline" className="h-5 text-[9px] font-black border-primary/20 text-primary bg-white">{unit.name}</Badge>
        </div>

        <div className="flex-1 overflow-hidden bg-white">
          <Form {...form}>
            <form id="reg-form" onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-8 pb-20">
                  {step === 1 && (
                    <div className="space-y-10 animate-in slide-in-from-left-4 duration-500">
                        <div className="space-y-4">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Download className="h-4 w-4" /></div>
                                Step 1: Download & Execute Template
                            </h3>
                            <Card className="border-primary/20 bg-primary/5 shadow-none">
                                <CardContent className="pt-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="space-y-1 text-center md:text-left">
                                        <p className="text-sm font-bold text-slate-800 leading-none">Official Document Registration Form (DRF)</p>
                                        <p className="text-[10px] text-muted-foreground font-medium italic">Requirement under ISO 21001:2018 Clause 7.5.3</p>
                                    </div>
                                    <Button type="button" variant="default" className="shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest px-6" asChild>
                                        <a href="https://drive.google.com/drive/folders/1xabubTGa7ddu05VxiL9zhX6uge_kisN1?usp=drive_link" target="_blank">
                                            <Download className="mr-2 h-4 w-4" /> Download DRF Template
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        <Separator />

                        <div className="space-y-6">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><ClipboardCheck className="h-4 w-4" /></div>
                                Step 2: Upload Scanned Evidence
                            </h3>
                            <FormField control={form.control} name="scannedRegistrationFormLink" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-slate-700">Signed Registration Form Link (GDrive PDF)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground opacity-50" />
                                            <Input {...field} placeholder="https://drive.google.com/..." className="pl-9 h-11 border-primary/20 shadow-sm" />
                                        </div>
                                    </FormControl>
                                    <FormDescription className="text-[10px]">Upload the signed template from Step 1 to your GDrive and paste the link here.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><ListChecks className="h-4 w-4" /></div>
                                Step 3: Populate Unit Form Roster
                            </h3>
                            <Button type="button" size="sm" onClick={() => append({ name: '', code: '', link: '', revision: '00' })} className="h-8 gap-1 font-black text-[10px] uppercase">
                                <PlusCircle className="h-3.5 w-3.5" /> Add Individual Form
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <Card key={field.id} className="relative overflow-hidden group border-primary/10 shadow-sm hover:border-primary/30 transition-all">
                                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <CardContent className="pt-6 p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                            <div className="md:col-span-3">
                                                <FormField control={form.control} name={`requestedForms.${index}.code`} render={({ field: inputField }) => (
                                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Form Code</FormLabel><FormControl><Input {...inputField} placeholder="e.g. QAO-01-001" className="h-9 text-xs font-mono font-bold" /></FormControl></FormItem>
                                                )} />
                                            </div>
                                            <div className="md:col-span-5">
                                                <FormField control={form.control} name={`requestedForms.${index}.name`} render={({ field: inputField }) => (
                                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Form Title</FormLabel><FormControl><Input {...inputField} placeholder="Official Title" className="h-9 text-xs" /></FormControl></FormItem>
                                                )} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <FormField control={form.control} name={`requestedForms.${index}.revision`} render={({ field: inputField }) => (
                                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground">Revision</FormLabel><FormControl><Input {...inputField} placeholder="00" className="h-9 text-xs font-mono" /></FormControl></FormItem>
                                                )} />
                                            </div>
                                            <div className="md:col-span-2">
                                                <FormField control={form.control} name={`requestedForms.${index}.link`} render={({ field: inputField }) => (
                                                    <FormItem><FormLabel className="text-[10px] font-black uppercase text-muted-foreground">File Link</FormLabel><FormControl><Input {...inputField} placeholder="GDrive Link" className="h-9 text-xs" /></FormControl></FormItem>
                                                )} />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="text-center space-y-3 pb-6 border-b">
                            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Send className="h-8 w-8 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Verification Readiness</h3>
                            <p className="text-sm text-muted-foreground max-sm mx-auto font-medium">Please review your entries before submitting to the Quality Assurance Office.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-muted/20 rounded-xl border border-dashed flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-primary opacity-40" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Official Request Document</p>
                                        <p className="text-xs font-bold text-primary truncate max-w-[300px]">{form.getValues('scannedRegistrationFormLink')}</p>
                                    </div>
                                </div>
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1">Form Registry Preview ({fields.length} Items)</p>
                                <div className="border rounded-xl overflow-hidden shadow-sm">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead className="text-[9px] font-black uppercase py-2 pl-6">Code</TableHead>
                                                <TableHead className="text-[9px] font-black uppercase py-2">Title</TableHead>
                                                <TableHead className="text-right text-[9px] font-black uppercase py-2 pr-6">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fields.map((f, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="font-mono text-[10px] font-bold py-3 pl-6">{f.code || 'TBA'}</TableCell>
                                                    <TableCell className="text-[11px] font-bold text-slate-700">{f.name || 'Untitled Form'}</TableCell>
                                                    <TableCell className="text-right pr-6"><Badge variant="secondary" className="h-4 text-[8px] font-black uppercase bg-primary/5 text-primary border-none">Ready</Badge></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-blue-800 leading-relaxed font-medium italic">
                                Once submitted, this request will undergo validation by the QA Head and final enrollment by the University President. You can monitor the progress bar in your dashboard.
                            </p>
                        </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
                <div className="flex w-full items-center justify-between">
                    <Button type="button" variant="ghost" className="font-black text-[10px] uppercase tracking-widest" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Discard</Button>
                    <div className="flex gap-2">
                        {step > 1 && (
                            <Button type="button" variant="outline" className="font-black text-[10px] uppercase tracking-widest h-10 px-6" onClick={() => setStep(prev => prev - 1)} disabled={isSubmitting}>
                                Previous Stage
                            </Button>
                        )}
                        {step < 3 ? (
                            <Button type="button" onClick={nextStep} className="font-black text-[10px] uppercase tracking-widest h-10 px-8">
                                Next Stage <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button type="submit" form="reg-form" disabled={isSubmitting} className="min-w-[180px] shadow-xl shadow-primary/20 font-black uppercase text-[10px] tracking-widest h-10">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4 mr-1.5" />}
                                Submit to QA Office
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
