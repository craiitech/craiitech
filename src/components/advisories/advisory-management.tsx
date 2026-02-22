
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Trash2, Edit, Megaphone, Globe, Building2, ExternalLink, Hash } from 'lucide-react';
import type { QaAdvisory, Unit, Campus } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const advisorySchema = z.object({
  controlNumber: z.string().regex(/^\d{4}-\d{3}$/, 'Control number must follow format yyyy-###'),
  subject: z.string().min(5, 'Subject must be at least 5 characters.'),
  releaseDate: z.string().min(1, 'Release date is required.'),
  googleDriveLink: z.string().url('Please enter a valid Google Drive link.'),
  scope: z.enum(['University-Wide', 'Specific Unit']),
  targetUnitId: z.string().optional(),
});

export function AdvisoryManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAdvisory, setEditingAdvisory] = useState<QaAdvisory | null>(null);

  const advisoriesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'qaAdvisories') : null), [firestore]);
  const { data: advisories, isLoading: isLoadingAdvisories } = useCollection<QaAdvisory>(advisoriesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  const form = useForm<z.infer<typeof advisorySchema>>({
    resolver: zodResolver(advisorySchema),
    defaultValues: { 
        controlNumber: `${new Date().getFullYear()}-001`,
        scope: 'University-Wide',
        releaseDate: format(new Date(), 'yyyy-MM-dd')
    },
  });

  const watchScope = form.watch('scope');

  const onSubmit = async (values: z.infer<typeof advisorySchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const dataToSave = {
        ...values,
        releaseDate: Timestamp.fromDate(new Date(values.releaseDate)),
        updatedAt: serverTimestamp(),
      };

      if (editingAdvisory) {
        await updateDoc(doc(firestore, 'qaAdvisories', editingAdvisory.id), dataToSave);
        toast({ title: 'Advisory Updated', description: 'Communication record has been modified.' });
      } else {
        await addDoc(collection(firestore, 'qaAdvisories'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
        toast({ title: 'Advisory Logged', description: 'New communication released to the portal.' });
      }
      setIsDialogOpen(false);
      form.reset();
      setEditingAdvisory(null);
    } catch (error) {
      toast({ title: 'Submission Failed', description: 'Could not save the advisory.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore || !window.confirm('Delete this advisory record permanently?')) return;
    try {
      await deleteDoc(doc(firestore, 'qaAdvisories', id));
      toast({ title: 'Advisory Removed', description: 'The record has been deleted.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete record.', variant: 'destructive' });
    }
  };

  const handleEdit = (advisory: QaAdvisory) => {
    setEditingAdvisory(advisory);
    const dateStr = advisory.releaseDate?.toDate ? format(advisory.releaseDate.toDate(), 'yyyy-MM-dd') : format(new Date(advisory.releaseDate), 'yyyy-MM-dd');
    form.reset({
      ...advisory,
      releaseDate: dateStr,
    });
    setIsDialogOpen(true);
  };

  const unitMap = useMemo(() => new Map(units?.map(u => [u.id, u.name])), [units]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Communication Logging (QA Advisories)
          </CardTitle>
          <CardDescription>Official registry of directives released by the QA Office.</CardDescription>
        </div>
        <Button onClick={() => { setEditingAdvisory(null); form.reset({ controlNumber: `${new Date().getFullYear()}-001`, scope: 'University-Wide', releaseDate: format(new Date(), 'yyyy-MM-dd') }); setIsDialogOpen(true); }} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" /> Log New Advisory
        </Button>
      </CardHeader>
      <CardContent>
        {isLoadingAdvisories ? (
          <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase">Control No.</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Subject & Target</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Release Date</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {advisories?.map((adv) => (
                  <TableRow key={adv.id}>
                    <TableCell className="font-mono text-xs font-bold text-primary">{adv.controlNumber}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs">{adv.subject}</span>
                        <span className="text-[9px] text-muted-foreground uppercase flex items-center gap-1 mt-0.5">
                          {adv.scope === 'University-Wide' ? (
                            <><Globe className="h-2.5 w-2.5" /> Institutional Access</>
                          ) : (
                            <><Building2 className="h-2.5 w-2.5" /> {unitMap.get(adv.targetUnitId!) || 'Specific Unit'}</>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {adv.releaseDate?.toDate ? format(adv.releaseDate.toDate(), 'PPP') : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(adv)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(adv.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAdvisory ? 'Update' : 'Register'} QA Advisory</DialogTitle>
            <DialogDescription>Capture metadata for the official communication.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="controlNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase">Control Number</FormLabel>
                    <FormControl><Input {...field} placeholder="yyyy-###" className="font-mono bg-slate-50" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="releaseDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase">Date of Release</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              
              <FormField control={form.control} name="subject" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase">Communication Subject</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g., Submission Deadline for FY 2025" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="scope" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase">Target Accessibility Scope</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="University-Wide">University-Wide (Institutional)</SelectItem>
                      <SelectItem value="Specific Unit">Specific Unit / Office Only</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              {watchScope === 'Specific Unit' && (
                <FormField control={form.control} name="targetUnitId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase">Target Recipient Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {units?.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="googleDriveLink" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold uppercase">Google Drive PDF Link</FormLabel>
                  <FormControl><Input {...field} placeholder="https://drive.google.com/..." /></FormControl>
                  <FormDescription className="text-[9px]">Ensure sharing is 'Anyone with the link can view'.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="shadow-lg shadow-primary/20 font-black uppercase text-xs">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  {editingAdvisory ? 'Save Updates' : 'Publish Advisory'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
