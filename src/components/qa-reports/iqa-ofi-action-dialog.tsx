'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import type { IqaOfiActionStatus, IqaOfiActionUpdate, IqaOfiVerificationRole } from '@/lib/types';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { arrayUnion, doc, serverTimestamp, setDoc, updateDoc } from '@/firebase/firestore-wrapper';
import { useToast } from '@/hooks/use-toast';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Link as LinkIcon,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IqaOfiRegisterRow } from './iqa-ofi-register-data';

const actionSchema = z.object({
  actionTaken: z.string().trim().min(5, 'Please describe the action taken.'),
  movLinks: z
    .array(
      z.object({
        title: z.string().trim().min(1, 'MOV title is required.'),
        url: z.string().url('Enter a valid Google Drive folder or file link.'),
      }),
    )
    .min(1, 'Provide at least one means of verification link.'),
});

type ActionFormValues = z.infer<typeof actionSchema>;

interface IqaOfiActionDialogProps {
  row: IqaOfiRegisterRow | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusClasses: Record<IqaOfiActionStatus, string> = {
  'Awaiting Unit Update': 'border-slate-200 bg-slate-50 text-slate-600',
  'For Campus Verification': 'border-amber-200 bg-amber-50 text-amber-700',
  'For QAO Verification': 'border-blue-200 bg-blue-50 text-blue-700',
  'For Admin Approval': 'border-indigo-200 bg-indigo-50 text-indigo-700',
  Verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  'Returned for Revision': 'border-rose-200 bg-rose-50 text-rose-700',
};

function formatDate(value: unknown) {
  if (!value) return 'N/A';
  try {
    if (typeof value === 'object' && value !== null) {
      const timestamp = value as { toDate?: () => Date; seconds?: number };
      if (typeof timestamp.toDate === 'function') return format(timestamp.toDate(), 'MMM dd, yyyy h:mm a');
      if (typeof timestamp.seconds === 'number')
        return format(new Date(timestamp.seconds * 1000), 'MMM dd, yyyy h:mm a');
    }
    const date = value instanceof Date ? value : new Date(value as string | number);
    return Number.isNaN(date.getTime()) ? 'N/A' : format(date, 'MMM dd, yyyy h:mm a');
  } catch {
    return 'N/A';
  }
}

const verificationStages: { role: IqaOfiVerificationRole; label: string }[] = [
  { role: 'Campus Director / ODIMO', label: 'Campus Director / ODIMO' },
  { role: 'Quality Assurance Office', label: 'Quality Assurance Office' },
  { role: 'Administrator', label: 'Administrator' },
];

export function IqaOfiActionDialog({ row, isOpen, onOpenChange }: IqaOfiActionDialogProps) {
  const firestore = useFirestore();
  const { userProfile, userRole, isAdmin } = useUser();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationRemarks, setVerificationRemarks] = useState('');

  const actionRef = useMemoFirebase(
    () => (firestore && row ? doc(firestore, 'iqaOfiActions', row.id) : null),
    [firestore, row],
  );
  const { data: action, isLoading } = useDoc<IqaOfiActionUpdate>(actionRef);

  const roleLower = (userRole || '').toLowerCase();
  const displayName =
    `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || userProfile?.email || 'User';
  const status = action?.status || 'Awaiting Unit Update';
  const isOwnerUnit = !!row && !!userProfile?.unitId && userProfile.unitId === row.unitId;
  const canEdit =
    !!row && (isAdmin || (isOwnerUnit && (status === 'Awaiting Unit Update' || status === 'Returned for Revision')));
  const isCampusVerifier =
    !!row &&
    !!userProfile?.campusId &&
    userProfile.campusId === row.campusId &&
    (roleLower.includes('campus director') || roleLower.includes('campus odimo') || roleLower.includes('odimo'));
  const isQaoVerifier =
    roleLower.includes('quality assurance') ||
    roleLower.includes('qao') ||
    roleLower.includes('qms') ||
    roleLower.includes('quality management');
  const canCampusVerify = status === 'For Campus Verification' && (isCampusVerifier || isAdmin);
  const canQaoVerify = status === 'For QAO Verification' && (isQaoVerifier || isAdmin);
  const canAdminVerify = status === 'For Admin Approval' && isAdmin;

  const form = useForm<ActionFormValues>({
    resolver: zodResolver(actionSchema),
    defaultValues: {
      actionTaken: '',
      movLinks: [{ title: '', url: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'movLinks',
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset({
      actionTaken: action?.actionTaken || '',
      movLinks:
        action?.movLinks && action.movLinks.length > 0
          ? action.movLinks.map((link) => ({ title: link.title, url: link.url }))
          : [{ title: '', url: '' }],
    });
    setVerificationRemarks('');
  }, [isOpen, action, form]);

  const verifications = useMemo(() => action?.verifications || [], [action]);

  const getVerification = (role: IqaOfiVerificationRole) => {
    return [...verifications].reverse().find((entry) => entry.role === role);
  };

  const handleSave = async (values: ActionFormValues) => {
    if (!firestore || !row || !userProfile) return;
    setIsSaving(true);
    try {
      const isResubmission = status === 'Returned for Revision';
      await setDoc(
        doc(firestore, 'iqaOfiActions', row.id),
        {
          id: row.id,
          findingId: row.id,
          year: row.year,
          campusId: row.campusId,
          campusName: row.campus,
          unitId: row.unitId,
          unitName: row.unit,
          actionTaken: values.actionTaken.trim(),
          movLinks: values.movLinks.map((link) => ({ title: link.title.trim(), url: link.url.trim() })),
          status: 'For Campus Verification' as IqaOfiActionStatus,
          verifications: isResubmission ? [] : action?.verifications || [],
          submittedBy: action?.submittedBy || userProfile.id,
          submittedByName: action?.submittedByName || displayName,
          submittedAt: action?.submittedAt || new Date(),
          updatedBy: userProfile.id,
          updatedByName: displayName,
          createdAt: action?.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast({
        title: isResubmission ? 'Action Resubmitted' : 'Action and MOVs Submitted',
        description: 'The update is now queued for campus verification.',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('IQA OFI action save failed:', error);
      toast({ title: 'Save failed', description: 'Could not save the action update.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerification = async (role: IqaOfiVerificationRole, decision: 'Verified' | 'Returned') => {
    if (!firestore || !row || !userProfile || !actionRef) return;
    if (decision === 'Returned' && verificationRemarks.trim().length < 5) {
      toast({
        title: 'Remarks required',
        description: 'Provide remarks when returning the action for revision.',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    const nextStatus: IqaOfiActionStatus =
      decision === 'Returned'
        ? 'Returned for Revision'
        : role === 'Campus Director / ODIMO'
          ? 'For QAO Verification'
          : role === 'Quality Assurance Office'
            ? 'For Admin Approval'
            : 'Verified';

    try {
      await updateDoc(actionRef, {
        status: nextStatus,
        verifications: arrayUnion({
          role,
          decision,
          verifiedBy: userProfile.id,
          verifiedByName: displayName,
          verifiedAt: new Date(),
          remarks: verificationRemarks.trim(),
        }),
        updatedAt: serverTimestamp(),
      });
      setVerificationRemarks('');
      toast({
        title: decision === 'Returned' ? 'Returned for Revision' : 'Verification Recorded',
        description:
          decision === 'Returned'
            ? 'The unit can now update and resubmit the action and MOVs.'
            : `The record has moved to ${nextStatus}.`,
      });
    } catch (error) {
      console.error('IQA OFI verification failed:', error);
      toast({
        title: 'Verification failed',
        description: 'Could not record the verification.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const renderStatusBadge = () => (
    <Badge variant="outline" className={cn('text-[10px] font-black uppercase', statusClasses[status])}>
      {status}
    </Badge>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[92dvh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20 shrink-0 space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">IQA OFI Action & MOV</span>
          </div>
          <DialogTitle className="text-lg leading-snug">{row?.statement || 'OFI Action Update'}</DialogTitle>
          <DialogDescription className="text-xs flex flex-wrap items-center gap-2">
            <span>{row?.campus || 'Campus not recorded'}</span>
            <span>•</span>
            <span>{row?.unit || 'Unit not recorded'}</span>
            <span>•</span>
            <span>Audit Year {row?.year || 'N/A'}</span>
          </DialogDescription>
          <div className="pt-1">{renderStatusBadge()}</div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-5">
            {isLoading ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-primary opacity-30" />
              </div>
            ) : (
              <>
                <Card className="border-primary/10 shadow-sm">
                  <CardHeader className="py-3 border-b bg-muted/10">
                    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <FileCheck2 className="h-4 w-4 text-primary" /> Unit Action & Means of Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="actionTaken"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[10px] font-black uppercase tracking-widest">
                                Action Taken
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  rows={4}
                                  disabled={!canEdit}
                                  placeholder="Describe the action implemented by the office/unit to address this OFI..."
                                  className="resize-none"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest">Means of Verification</p>
                              <p className="text-[10px] text-muted-foreground">
                                Provide Google Drive folder or file links as evidence of implementation.
                              </p>
                            </div>
                            {canEdit && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-[10px] font-black uppercase"
                                onClick={() => append({ title: '', url: '' })}
                              >
                                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add MOV
                              </Button>
                            )}
                          </div>

                          {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                              <div className="md:col-span-4">
                                <FormField
                                  control={form.control}
                                  name={`movLinks.${index}.title`}
                                  render={({ field: inputField }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          {...inputField}
                                          disabled={!canEdit}
                                          placeholder="MOV title (e.g., Action Plan)"
                                          className="h-9 text-xs"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="md:col-span-7">
                                <FormField
                                  control={form.control}
                                  name={`movLinks.${index}.url`}
                                  render={({ field: inputField }) => (
                                    <FormItem>
                                      <FormControl>
                                        <div className="relative">
                                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                          <Input
                                            {...inputField}
                                            disabled={!canEdit}
                                            placeholder="https://drive.google.com/drive/folders/..."
                                            className="h-9 pl-8 text-xs"
                                          />
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="md:col-span-1 flex md:justify-end">
                                {canEdit && fields.length > 1 && (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-9 w-9 text-rose-600 hover:bg-rose-50"
                                    onClick={() => remove(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                                {!canEdit && action?.movLinks?.[index]?.url && (
                                  <Button type="button" size="icon" variant="outline" className="h-9 w-9" asChild>
                                    <a href={action.movLinks[index].url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                          <FormField
                            control={form.control}
                            name="movLinks"
                            render={() => (
                              <FormItem>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {canEdit && (
                          <div className="flex justify-end pt-1">
                            <Button type="submit" disabled={isSaving} className="font-black uppercase text-[10px]">
                              {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="mr-2 h-4 w-4" />
                              )}
                              {status === 'Returned for Revision'
                                ? 'Resubmit for Verification'
                                : 'Submit for Verification'}
                            </Button>
                          </div>
                        )}
                        {!canEdit && (
                          <p className="text-[10px] text-muted-foreground">
                            This action record is read-only. Updates can be made by the owning office/unit while the
                            record is awaiting update or returned for revision.
                          </p>
                        )}
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm">
                  <CardHeader className="py-3 border-b bg-muted/10">
                    <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" /> Verification Trail
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {verificationStages.map((stage) => {
                        const entry = getVerification(stage.role);
                        const isVerified = entry?.decision === 'Verified';
                        const isReturned = entry?.decision === 'Returned';
                        return (
                          <div
                            key={stage.role}
                            className={cn(
                              'rounded-lg border p-3 space-y-1',
                              isVerified
                                ? 'border-emerald-200 bg-emerald-50/60'
                                : isReturned
                                  ? 'border-rose-200 bg-rose-50/60'
                                  : 'border-slate-200 bg-muted/10',
                            )}
                          >
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                              {stage.label}
                            </p>
                            <p className="text-xs font-bold">
                              {isVerified ? 'Verified' : isReturned ? 'Returned' : 'Pending'}
                            </p>
                            {entry && (
                              <p className="text-[10px] text-muted-foreground">
                                {entry.verifiedByName} • {formatDate(entry.verifiedAt)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {(canCampusVerify || canQaoVerify || canAdminVerify) && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest">Verification Remarks</p>
                          <Textarea
                            value={verificationRemarks}
                            onChange={(event) => setVerificationRemarks(event.target.value)}
                            rows={3}
                            placeholder="Remarks for the verification decision..."
                            className="resize-none"
                          />
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isVerifying}
                              onClick={() =>
                                handleVerification(
                                  canCampusVerify
                                    ? 'Campus Director / ODIMO'
                                    : canQaoVerify
                                      ? 'Quality Assurance Office'
                                      : 'Administrator',
                                  'Returned',
                                )
                              }
                              className="text-rose-700 border-rose-200 hover:bg-rose-50"
                            >
                              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Return for Revision
                            </Button>
                            <Button
                              size="sm"
                              disabled={isVerifying}
                              onClick={() =>
                                handleVerification(
                                  canCampusVerify
                                    ? 'Campus Director / ODIMO'
                                    : canQaoVerify
                                      ? 'Quality Assurance Office'
                                      : 'Administrator',
                                  'Verified',
                                )
                              }
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {isVerifying ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              Verify
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    {verifications.length > 0 && (
                      <div className="space-y-2 border-t pt-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Verification History
                        </p>
                        {[...verifications].reverse().map((entry, index) => (
                          <div key={index} className="rounded-md border bg-background p-2.5 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span className="font-bold">
                                {entry.role} — {entry.decision}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{formatDate(entry.verifiedAt)}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {entry.verifiedByName}
                              {entry.remarks ? ` • ${entry.remarks}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t bg-muted/20 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
