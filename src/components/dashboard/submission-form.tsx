
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, XCircle, Loader2, HelpCircle } from 'lucide-react';
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
import { validateGoogleDriveLinkAccessibility } from '@/ai/flows/validate-google-drive-link-accessibility';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import type { Unit, Submission, Comment } from '@/lib/types';
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
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';


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

interface SubmissionFormProps {
  reportType: string;
  year: number;
  cycleId: 'first' | 'final';
  onSuccess?: () => void;
}

export function SubmissionForm({
  reportType,
  year,
  cycleId,
  onSuccess,
}: SubmissionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const { toast } = useToast();
  const { user, userProfile, userRole } = useUser();
  const firestore = useFirestore();
  const { logSessionActivity } = useSessionActivity();
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const checklistItems = [
    { id: 'correctDoc', label: `Is this the correct "${reportType}" for the ${cycleId} cycle for year ${year}?` },
    { id: 'year', label: 'Is the Year in the document correct?' },
    { id: 'cycle', label: 'Is the Submission Cycle in the document correct?' },
    { id: 'date', label: 'Is the Date in the "Updated as of" section correct?' },
    { id: 'contents', label: 'Are the Contents in the document correct and complete?' },
    { id: 'signed', label: 'Is the document properly signed?' },
  ];
  
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>(
    checklistItems.reduce((acc, item) => ({ ...acc, [item.id]: false }), {})
  );

  const isChecklistComplete = Object.values(checkedState).every(Boolean);

  const handleCheckboxChange = (id: string) => {
    setCheckedState(prevState => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  };

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  const form = useForm<z.infer<typeof submissionSchema>>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      googleDriveLink: '',
      comments: '',
    },
  });

  const handleLinkChange = (link: string) => {
    if (link && link.startsWith('https://drive.google.com/')) {
      const embedUrl = link.replace('/view', '/preview').replace('?usp=sharing', '');
      setPreviewUrl(embedUrl);
    } else {
      setPreviewUrl('');
    }
  };
  
  const googleDriveLinkValue = form.watch('googleDriveLink');
  useEffect(() => {
    handleLinkChange(googleDriveLinkValue);
  }, [googleDriveLinkValue]);


  useEffect(() => {
    const fetchExistingSubmission = async () => {
        if (!firestore || !user) return;
        setValidationStatus('idle'); // Reset on change
        form.reset({ googleDriveLink: '', comments: '' }); // Clear form
        setCheckedState(checklistItems.reduce((acc, item) => ({ ...acc, [item.id]: false }), {})); // Reset checklist
        
        const q = query(
            collection(firestore, 'submissions'),
            where('userId', '==', user.uid),
            where('reportType', '==', reportType),
            where('year', '==', year),
            where('cycleId', '==', cycleId)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const existingData = querySnapshot.docs[0].data() as Submission;
            if (existingData.googleDriveLink) {
              form.setValue('googleDriveLink', existingData.googleDriveLink);
              handleLinkValidation(existingData.googleDriveLink);
            }
        }
    }
    fetchExistingSubmission();
  }, [firestore, user, reportType, year, cycleId]);


  const handleLinkValidation = async (link: string) => {
    if (!link.startsWith('https://drive.google.com/') || !z.string().url().safeParse(link).success) {
      setValidationStatus('idle');
      return;
    }

    setValidationStatus('validating');

    try {
      const result = await validateGoogleDriveLinkAccessibility({
        googleDriveLink: link,
      });
      if (result.isAccessible) {
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
      const reason = 'Could not validate the link. Please check the format and try again.';
      form.setError('googleDriveLink', {
        type: 'manual',
        message: reason,
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof submissionSchema>) => {
    if (!user || !firestore || !userProfile) {
      toast({ title: 'Error', description: 'You must be logged in to submit.', variant: 'destructive' });
      return;
    }
    if (!units) {
      toast({ title: 'Error', description: 'Could not load unit data. Please try again.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    
    const submissionCollectionRef = collection(firestore, 'submissions');

    const q = query(
        submissionCollectionRef,
        where('userId', '==', user.uid),
        where('reportType', '==', reportType),
        where('year', '==', year),
        where('cycleId', '==', cycleId)
    );
    
    const querySnapshot = await getDocs(q);
    const unitName = units.find((u) => u.id === userProfile.unitId)?.name || 'Unknown Unit';

    const newComment: Comment | null = values.comments ? {
        text: values.comments,
        authorId: user.uid,
        authorName: userProfile.firstName + ' ' + userProfile.lastName,
        createdAt: new Date(),
        authorRole: userRole || 'User',
    } : null;

    if (!querySnapshot.empty) {
        const existingDocRef = doc(firestore, 'submissions', querySnapshot.docs[0].id);
        const updateData: any = {
          googleDriveLink: values.googleDriveLink,
          statusId: 'submitted',
          submissionDate: new Date(),
        };

        if (newComment) {
            updateData.comments = arrayUnion(newComment);
        }
        
        try {
            await updateDoc(existingDocRef, updateData)
            const logMessage = `Updated submission: ${reportType}`;
            logSessionActivity(logMessage, {
                action: 'update_submission',
                details: { submissionId: existingDocRef.id, reportType },
            });
            toast({
                title: 'Submission Updated!',
                description: `Your '${reportType}' report has been updated.`,
            });
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error updating submission:', error);
            const permissionError = new FirestorePermissionError({
                path: existingDocRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSubmitting(false);
        }

    } else {
        const newSubmissionData: any = {
            googleDriveLink: values.googleDriveLink,
            reportType,
            year,
            cycleId,
            userId: user.uid,
            campusId: userProfile.campusId,
            unitId: userProfile.unitId,
            unitName: unitName,
            statusId: 'submitted',
            submissionDate: serverTimestamp(),
            comments: newComment ? [newComment] : [],
        };
        
        try {
            const docRef = await addDoc(submissionCollectionRef, newSubmissionData);
            const logMessage = `Created new submission: ${reportType}`;
            logSessionActivity(logMessage, {
            action: 'create_submission',
            details: { submissionId: docRef.id, reportType },
            });
            toast({
                title: 'Submission Successful!',
                description: `Your '${reportType}' report has been submitted.`,
            });
            if (onSuccess) onSuccess();
        } catch(error) {
            console.error('Error creating submission:', error);
            const permissionError = new FirestorePermissionError({
                path: submissionCollectionRef.path,
                operation: 'create',
                requestResourceData: newSubmissionData,
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setIsSubmitting(false);
        }
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="aspect-video w-full rounded-lg border bg-muted mb-6">
            {previewUrl ? (
                <iframe src={previewUrl} className="h-full w-full" allow="autoplay"></iframe>
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
                    onBlur={(e) => {
                      field.onBlur();
                      handleLinkValidation(e.target.value);
                    }}
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
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
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
                        checked={checkedState[item.id]}
                        onCheckedChange={() => handleCheckboxChange(item.id)}
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
            !isChecklistComplete
          }
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Report'
          )}
        </Button>
      </form>
    </Form>
  );
}

    