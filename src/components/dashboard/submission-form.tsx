'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, XCircle, Loader2, HelpCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, arrayUnion, getDoc } from 'firebase/firestore';
import type { Unit, Submission, Comment, User as AppUser, Campus } from '@/lib/types';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useMemoFirebase, useCollection } from '@/firebase';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useRouter } from 'next/navigation';
import { debounce } from 'lodash';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { generateControlNumber } from '@/lib/utils';
import { Badge } from '../ui/badge';


const submissionSchema = z.object({
  googleDriveLink: z
    .string()
    .url('Please enter a valid URL')
    .refine(
      (url) => url.startsWith('https://drive.google.com/'),
      'URL must be a Google Drive link'
    ),
  comments: z.string().optional(),
});

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';
type RiskRating = 'low' | 'medium-high' | null;

interface SubmissionFormProps {
  reportType: string;
  year: number;
  cycleId: 'first' | 'final';
  onSuccess?: () => void;
}

const baseChecklistItems = [
    { id: 'year', label: 'Is the Year in the document correct?' },
    { id: 'cycle', label: 'Is the Submission Cycle in the document correct?' },
    { id: 'date', label: 'Is the Date in the "Updated as of" section correct?' },
    { id: 'contents', label: 'Are the Contents in the document correct and complete?' },
    { id: 'signed', label: 'Is the document properly signed?' },
];

export function SubmissionForm({
  reportType,
  year,
  cycleId,
  onSuccess,
}: SubmissionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const { toast } = useToast();
  const { user, userProfile, userRole, isAdmin } = useUser();
  const firestore = useFirestore();
  const { logSessionActivity } = useSessionActivity();
  const router = useRouter();
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [riskRating, setRiskRating] = useState<RiskRating>(null);
  const [isRiskDialogOpen, setIsRiskDialogOpen] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
  const [originalSubmitter, setOriginalSubmitter] = useState<AppUser | null>(null);

  const isRorForm = reportType === 'Risk and Opportunity Registry Form';

  const checklistItems = useMemo(() => {
    const dynamicBaseItems = [
      { id: 'correctDoc', label: `Is this the correct "${reportType}" for the ${cycleId} cycle for year ${year}?` },
      ...baseChecklistItems
    ];
    if (isRorForm && riskRating === 'medium-high') {
      return [
        ...dynamicBaseItems,
        { id: 'actionPlan', label: 'I acknowledge that a "Risk and Opportunity Action Plan" document must also be submitted for Medium/High rated risks.' }
      ];
    }
    return dynamicBaseItems;
  }, [isRorForm, riskRating, reportType, year, cycleId]);


  const [checkedState, setCheckedState] = useState<Record<string, boolean>>(
    checklistItems.reduce((acc, item) => ({ ...acc, [item.id]: false }), {})
  );

  useEffect(() => {
    setCheckedState(checklistItems.reduce((acc, item) => ({...acc, [item.id]: false}), {}));
  }, [checklistItems]);


  const isChecklistComplete = useMemo(() => {
    if (isRorForm && !riskRating) return false;
    return Object.values(checkedState).every(Boolean);
  }, [checkedState, isRorForm, riskRating]);

  const handleCheckboxChange = (id: string) => {
    setCheckedState(prevState => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  };

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const form = useForm<z.infer<typeof submissionSchema>>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      googleDriveLink: '',
      comments: '',
    },
  });

  const handleLinkValidation = async (link: string) => {
    if (!link.startsWith('https://drive.google.com/') || !z.string().url().safeParse(link).success) {
      setValidationStatus('idle');
      return;
    }

    setValidationStatus('validating');

    try {
      const response = await fetch('/api/validate-drive-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link }),
      });
      
      const result = await response.json();

      if (response.ok && result.isAccessible) {
        setValidationStatus('valid');
        form.clearErrors('googleDriveLink');
      } else {
        setValidationStatus('invalid');
        const reason = result.reason || 'Link is not accessible.';
        form.setError('googleDriveLink', {
          type: 'manual',
          message: reason,
        });
      }
    } catch (error) {
      setValidationStatus('invalid');
      const reason = 'Could not validate the link. Please check the sharing permissions.';
      form.setError('googleDriveLink', {
        type: 'manual',
        message: reason,
      });
    }
  };

  const debouncedValidation = useCallback(debounce(handleLinkValidation, 500), []);
  
  const googleDriveLinkValue = form.watch('googleDriveLink');

  useEffect(() => {
    if (googleDriveLinkValue) {
      const embedUrl = googleDriveLinkValue.replace('/view', '/preview').replace('?usp=sharing', '');
      setPreviewUrl(embedUrl);
      debouncedValidation(googleDriveLinkValue);
    } else {
      setPreviewUrl('');
      setValidationStatus('idle');
    }
  }, [googleDriveLinkValue, debouncedValidation]);


  useEffect(() => {
    const fetchExistingSubmission = async () => {
        if (!firestore || !userProfile?.unitId) return;
        setValidationStatus('idle');
        setRiskRating(null);
        setExistingSubmission(null);
        setOriginalSubmitter(null);
        form.reset({ googleDriveLink: '', comments: '' });
        setCheckedState(checklistItems.reduce((acc, item) => ({ ...acc, [item.id]: false }), {}));
        
        const q = query(
            collection(firestore, 'submissions'),
            where('unitId', '==', userProfile.unitId),
            where('reportType', '==', reportType),
            where('year', '==', year),
            where('cycleId', '==', cycleId)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const existingData = querySnapshot.docs[0].data() as Submission;
            setExistingSubmission({ ...existingData, id: querySnapshot.docs[0].id });
            
            if (existingData.googleDriveLink) {
              form.setValue('googleDriveLink', existingData.googleDriveLink);
            }
            if (existingData.riskRating) {
                setRiskRating(existingData.riskRating);
            }

            if (existingData.userId !== user?.uid) {
                const submitterRef = doc(firestore, 'users', existingData.userId);
                const submitterSnap = await getDoc(submitterRef);
                if (submitterSnap.exists()) {
                    setOriginalSubmitter(submitterSnap.data() as AppUser);
                }
            }
        }
    }
    fetchExistingSubmission();
  }, [firestore, user, userProfile?.unitId, reportType, year, cycleId]);

  const canUpdateExisting = useMemo(() => {
    if (!existingSubmission || !user || !userRole) return true;
    if (existingSubmission.userId === user.uid) return true;
    if (userRole === 'Unit ODIMO' || isAdmin) return true;
    return false;
  }, [existingSubmission, user, userRole, isAdmin]);

  const onSubmit = async (values: z.infer<typeof submissionSchema>) => {
    if (!user || !firestore || !userProfile || !units || !campuses) {
      toast({ title: 'Error', description: 'Data is still loading.', variant: 'destructive' });
      return;
    }

    const unit = units.find((u) => u.id === userProfile.unitId);
    
    if (!unit) {
        toast({ title: 'Profile Error', description: 'Your assigned unit could not be found.', variant: 'destructive' });
        return;
    }

    setIsSubmitting(true);
    
    const newComment: Comment | null = values.comments ? {
        text: values.comments,
        authorId: user.uid,
        authorName: userProfile.firstName + ' ' + userProfile.lastName,
        createdAt: new Date(),
        authorRole: userRole || 'User',
    } : null;

    let submissionSuccess = false;

    if (existingSubmission) {
        // Increment revision ONLY if it was previously rejected
        const newRevision = existingSubmission.statusId === 'rejected' 
          ? (existingSubmission.revision || 0) + 1 
          : (existingSubmission.revision || 0);
        
        const now = new Date();
        const newControlNumber = generateControlNumber(unit.name, newRevision, reportType, now);

        const existingDocRef = doc(firestore, 'submissions', existingSubmission.id);
        const updateData: any = {
          googleDriveLink: values.googleDriveLink,
          statusId: 'submitted',
          submissionDate: now,
          unitName: unit.name,
          userId: user.uid,
          revision: newRevision,
          controlNumber: newControlNumber,
        };

        if (isRorForm) {
            updateData.riskRating = riskRating;
        }

        if (newComment) {
            updateData.comments = arrayUnion(newComment);
        }
        
        try {
            await updateDoc(existingDocRef, updateData)
            logSessionActivity(`Updated unit submission (Rev ${newRevision}): ${reportType}`, {
                action: 'update_submission',
                details: { submissionId: existingDocRef.id, reportType, revision: newRevision },
            });
            toast({
                title: 'Submission Updated!',
                description: `Revision ${newRevision} submitted for '${reportType}'.`,
            });
            submissionSuccess = true;
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error updating submission:', error);
            toast({ title: 'Error', description: 'Could not update submission.', variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }

    } else {
        const initialRevision = 0;
        const now = new Date();
        const initialControlNumber = generateControlNumber(unit.name, initialRevision, reportType, now);

        const newSubmissionData: any = {
            googleDriveLink: values.googleDriveLink,
            reportType,
            year,
            cycleId,
            userId: user.uid,
            campusId: userProfile.campusId,
            unitId: userProfile.unitId,
            unitName: unit.name,
            statusId: 'submitted',
            submissionDate: now,
            comments: newComment ? [newComment] : [],
            revision: initialRevision,
            controlNumber: initialControlNumber,
        };
        
        if (isRorForm) {
            newSubmissionData.riskRating = riskRating;
        }

        try {
            const docRef = await addDoc(collection(firestore, 'submissions'), newSubmissionData);
            logSessionActivity(`Created new unit submission (Rev 0): ${reportType}`, {
                action: 'create_submission',
                details: { submissionId: docRef.id, reportType, controlNumber: initialControlNumber },
            });
            toast({
                title: 'Submission Successful!',
                description: `New report '${reportType}' submitted under Revision 0.`,
            });
            submissionSuccess = true;
            if (onSuccess) onSuccess();
        } catch(error) {
            console.error('Error creating submission:', error);
            toast({ title: 'Error', description: 'Could not create submission.', variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    }

    if (submissionSuccess && isRorForm && riskRating === 'medium-high') {
        setIsRiskDialogOpen(true);
    }
  };

  const renderValidationIcon = () => {
    switch (validationStatus) {
      case 'validating':
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!canUpdateExisting && originalSubmitter && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Submission Already Exists</AlertTitle>
                <AlertDescription>
                    This report was already submitted by <strong>{originalSubmitter.firstName} {originalSubmitter.lastName}</strong>. 
                    As a Unit Coordinator, you cannot overwrite their submission. Please contact them or your <strong>Unit ODIMO</strong> if an update is needed.
                </AlertDescription>
            </Alert>
        )}

        {existingSubmission && (
          <div className="bg-muted p-4 rounded-lg flex justify-between items-center border">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Document Control Number</p>
              <p className="font-mono text-sm">{existingSubmission.controlNumber}</p>
            </div>
            <Badge variant="secondary">Revision {String(existingSubmission.revision || 0).padStart(2, '0')}</Badge>
          </div>
        )}

        <div className="aspect-video w-full rounded-lg border bg-muted mb-6">
            {previewUrl ? (
                <iframe src={previewUrl} className="h-full w-full" allow="autoplay" title="File Preview"></iframe>
            ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground p-4 text-center">
                    <p>A preview of your Google Drive file will appear here.</p>
                </div>
            )}
        </div>
        
        <FormField
          control={form.control}
          name="googleDriveLink"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Google Drive Link</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    placeholder="https://drive.google.com/..."
                    {...field}
                    disabled={!canUpdateExisting}
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    {renderValidationIcon()}
                  </div>
                </div>
              </FormControl>
              {!fieldState.error && (
                 <FormDescription className="flex items-center gap-1">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="link" className="p-0 h-auto text-xs">
                                <HelpCircle className="mr-1 h-3 w-3"/>
                                How to get the correct link?
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>How to Get Your Google Drive File Link</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Follow these steps to ensure your file is shared correctly for submission.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
                                <li>Open your file in Google Drive.</li>
                                <li>Click the blue <strong>"Share"</strong> button in the top right corner.</li>
                                <li>
                                    In the popup window, find the <strong>"General access"</strong> section. If it says "Restricted", click on it.
                                </li>
                                <li>
                                    Select <strong>"Anyone with the link"</strong> from the dropdown menu. This is critical for the QA Office to be able to view your file.
                                </li>
                                 <li>
                                    To the right of "Anyone with the link", ensure the role is set to <strong>"Viewer"</strong>.
                                 </li>
                                <li>
                                    Finally, click the <strong>"Copy link"</strong> button. The link is now copied to your clipboard.
                                </li>
                                <li>
                                    Paste the copied link into the "Google Drive Link" field in the submission form.
                                </li>
                            </ol>
                            <AlertDialogFooter>
                                 <AlertDialogAction>Got it!</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comments (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any relevant comments for the approvers"
                  {...field}
                  disabled={!canUpdateExisting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isRorForm && (
          <Card>
            <CardHeader>
                <CardTitle className="text-base">Risk Rating</CardTitle>
                <CardDescription className="text-xs">
                    Please specify the overall risk rating from your registry form.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <RadioGroup
                    onValueChange={(value: RiskRating) => setRiskRating(value)}
                    value={riskRating ?? ""}
                    className="flex items-center space-x-4"
                    disabled={!canUpdateExisting}
                >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="low" /></FormControl>
                        <Label className="font-normal">Low</Label>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="medium-high" /></FormControl>
                        <Label className="font-normal">Medium / High</Label>
                    </FormItem>
                </RadioGroup>
            </CardContent>
          </Card>
        )}
        
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Final Check</CardTitle>
                <CardDescription className="text-xs">
                    Please confirm the following details before submitting.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {checklistItems.map(item => (
                <div key={item.id} className="flex items-start space-x-3">
                    <Checkbox
                        id={`${reportType}-${item.id}`}
                        checked={checkedState[item.id] || false}
                        onCheckedChange={() => handleCheckboxChange(item.id)}
                        disabled={!canUpdateExisting}
                    />
                    <Label htmlFor={`${reportType}-${item.id}`} className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {item.label}
                    </Label>
                </div>
                ))}
            </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full"
          disabled={
            isSubmitting ||
            validationStatus === 'validating' ||
            validationStatus === 'invalid' ||
            !isChecklistComplete ||
            !canUpdateExisting
          }
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            existingSubmission 
              ? (existingSubmission.statusId === 'rejected' ? 'Resubmit (Next Revision)' : 'Update Unit Submission')
              : 'Submit Unit Report'
          )}
        </Button>
      </form>
    </Form>
    <AlertDialog open={isRiskDialogOpen} onOpenChange={setIsRiskDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Next Step: Log Your Risk</AlertDialogTitle>
                <AlertDialogDescription>
                    Because your unit has submitted a Medium or High-rated risk, you must now formally log it in the Risk Register to create an action plan.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogAction onClick={() => router.push('/risk-register?openForm=true')}>
                    Continue to Risk Register
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
