'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Download,
  ShieldCheck,
  Building2,
  User,
  Calendar,
  FileText,
  Hash,
  Share2,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import type { UnitForm, Unit, Campus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface CrossUnitFormRequestDialogProps {
  form:
    | UnitForm
    | {
        id: string;
        formCode: string;
        formName: string;
        googleDriveLink: string;
        revision?: string;
      }
    | null;
  ownerUnit: {
    id: string;
    name: string;
    category?: string;
    campusIds?: string[];
  } | null;
  campuses?: Campus[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const requestSchema = z.object({
  requesterName: z.string().min(3, 'Requester name is required.'),
  requestDate: z.string().min(1, 'Date is required.'),
  purpose: z.string().min(3, 'Please select or provide the purpose of your request.'),
  remarks: z.string().optional(),
});

export function CrossUnitFormRequestDialog({
  form,
  ownerUnit,
  campuses,
  isOpen,
  onOpenChange,
  onSuccess,
}: CrossUnitFormRequestDialogProps) {
  const { userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestForm = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      requesterName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : '',
      requestDate: format(new Date(), 'yyyy-MM-dd'),
      purpose: 'Inter-unit operational coordination',
      remarks: '',
    },
  });

  useEffect(() => {
    if (userProfile && isOpen) {
      requestForm.setValue('requesterName', `${userProfile.firstName} ${userProfile.lastName}`.trim());
      requestForm.setValue('requestDate', format(new Date(), 'yyyy-MM-dd'));
    }
  }, [userProfile, isOpen, requestForm]);

  const campusMap = new Map(campuses?.map((c) => [c.id, c.name]) || []);
  const ownerCampusName = ownerUnit?.campusIds?.[0] ? campusMap.get(ownerUnit.campusIds[0]) || '' : '';
  const myCampusName = userProfile?.campusId ? campusMap.get(userProfile.campusId) || '' : '';

  const onSubmit = async (values: z.infer<typeof requestSchema>) => {
    if (!firestore || !form || !ownerUnit) return;
    setIsSubmitting(true);

    // Open blank window synchronously to prevent browser popup blocking
    const targetLink = form.googleDriveLink;
    const downloadWindow = window.open('', '_blank');
    if (downloadWindow) {
      downloadWindow.document.title = 'Authorizing Inter-Unit Form Access...';
      downloadWindow.document.body.innerHTML = `
        <div style="font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100dvh; background-color: #f8fafc; color: #0f172a; margin: 0;">
          <div style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; text-transform: uppercase;">Registering Cross-Unit Exchange</div>
          <div style="font-size: 0.875rem; color: #64748b;">Logging mutual transaction and opening repository file...</div>
        </div>
      `;
    }

    try {
      const fullPurpose = values.remarks ? `${values.purpose} - ${values.remarks}` : values.purpose;

      const crossUnitRecord = {
        formId: form.id,
        formCode: form.formCode,
        formName: form.formName,
        formRevision: form.revision || '00',
        googleDriveLink: targetLink,
        requesterId: userProfile?.id || '',
        requesterName: values.requesterName,
        requesterEmail: userProfile?.email || '',
        requesterUnitId: userProfile?.unitId || '',
        requesterUnitName: userProfile?.unitName || 'Institutional Unit',
        requesterCampusId: userProfile?.campusId || '',
        requesterCampusName: myCampusName,
        ownerUnitId: ownerUnit.id,
        ownerUnitName: ownerUnit.name,
        ownerCampusId: ownerUnit.campusIds?.[0] || '',
        ownerCampusName: ownerCampusName,
        purpose: fullPurpose,
        status: 'Fulfilled',
        downloadDate: values.requestDate,
        createdAt: serverTimestamp(),
      };

      // 1. Log to crossUnitFormRequests for mutual unit visibility
      await addDoc(collection(firestore, 'crossUnitFormRequests'), crossUnitRecord);

      // 2. Also log to formDownloadLogs for standard institutional auditing
      await addDoc(collection(firestore, 'formDownloadLogs'), {
        unitId: ownerUnit.id,
        formId: form.id,
        formName: form.formName,
        formCode: form.formCode,
        requesterName: `${values.requesterName} (${userProfile?.unitName || 'Other Unit'})`,
        requestDate: values.requestDate,
        createdAt: serverTimestamp(),
      });

      if (downloadWindow) {
        downloadWindow.location.href = targetLink;
      } else {
        window.open(targetLink, '_blank');
      }

      toast({
        title: 'Form Access Authorized',
        description: `Download logged for ${ownerUnit.name} (Provider) and ${userProfile?.unitName || 'Your Unit'} (Requester).`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      if (downloadWindow) {
        downloadWindow.close();
      }
      toast({
        title: 'Request Failed',
        description: 'Failed to authorize and log the cross-unit form download.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!form || !ownerUnit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-primary/20 shadow-2xl">
        <DialogHeader className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b -m-6 mb-6">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Share2 className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Inter-Unit Quality Forms Exchange</span>
          </div>
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Request Other Unit Form</DialogTitle>
          <DialogDescription className="text-xs">
            Download the official controlled form from <strong>{ownerUnit.name}</strong>. Access is pre-approved through
            their repository and logged for mutual quality tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Form & Unit Details */}
          <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 line-clamp-1">
                    {form.formName}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono font-bold text-muted-foreground">
                  <span className="flex items-center gap-1 text-primary">
                    <Hash className="h-3 w-3" /> {form.formCode}
                  </span>
                  <span>Rev {form.revision || '00'}</span>
                </div>
              </div>
              <Badge
                variant="outline"
                className="bg-emerald-50 border-emerald-200 text-emerald-800 text-[9px] font-bold"
              >
                Pre-Approved Repository
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[11px]">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">
                  Form Owner / Provider:
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3 text-primary" /> {ownerUnit.name}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold block">Requesting Unit:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3 text-indigo-600" /> {userProfile?.unitName || 'Your Unit'}
                </span>
              </div>
            </div>
          </div>

          <Form {...requestForm}>
            <form id="cross-download-form" onSubmit={requestForm.handleSubmit(onSubmit)} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={requestForm.control}
                  name="requesterName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <User className="h-3 w-3 text-primary" /> Requester Full Name
                      </FormLabel>
                      <FormControl>
                        <Input {...field} className="h-9 text-xs font-semibold" placeholder="Your name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={requestForm.control}
                  name="requestDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-primary" /> Request Date
                      </FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-9 text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={requestForm.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                      Purpose of Request / Intended Process Use
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 text-xs font-medium">
                          <SelectValue placeholder="Select purpose..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Inter-unit operational coordination">
                          Inter-unit operational coordination
                        </SelectItem>
                        <SelectItem value="Cross-functional committee / project task">
                          Cross-functional committee / project task
                        </SelectItem>
                        <SelectItem value="Internal EOMS / ISO quality audit preparation">
                          Internal EOMS / ISO quality audit preparation
                        </SelectItem>
                        <SelectItem value="Academic / Curriculum alignment & review">
                          Academic / Curriculum alignment & review
                        </SelectItem>
                        <SelectItem value="Process benchmarking & template reference">
                          Process benchmarking & template reference
                        </SelectItem>
                        <SelectItem value="Inter-office transmittal & endorsement">
                          Inter-office transmittal & endorsement
                        </SelectItem>
                        <SelectItem value="Official administrative reference">
                          Official administrative reference
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={requestForm.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                      Additional Remarks / Specific Project Context (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. For Q4 Departmental Performance Review"
                        className="h-9 text-xs"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          {/* Institutional Transparency Callout */}
          <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-2.5 text-blue-900">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-[10px] leading-relaxed">
              <span className="font-black uppercase tracking-wider block">Automatic Mutual Logging</span>
              No manual waiting period is required. This exchange will be automatically recorded in both your
              unit&apos;s request ledger and <strong>{ownerUnit.name}&apos;s</strong> provided forms ledger for mutual
              operational visibility.
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="font-bold text-[10px] uppercase"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="cross-download-form"
            disabled={isSubmitting}
            className="min-w-[180px] font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 h-9 gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-2 h-3.5 w-3.5" />
            )}
            Download Form Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
