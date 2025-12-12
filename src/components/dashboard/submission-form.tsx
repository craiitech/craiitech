
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
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
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import type { Unit, Submission } from '@/lib/types';

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
  onLinkChange: (link: string) => void;
}

export function SubmissionForm({
  reportType,
  year,
  cycleId,
  onSuccess,
  onLinkChange,
}: SubmissionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const { toast } = useToast();
  const { user, userProfile } = useUser();
  const firestore = useFirestore();

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  const form = useForm<z.infer<typeof submissionSchema>>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      googleDriveLink: '',
      comments: '',
    },
  });

  const googleDriveLinkValue = form.watch('googleDriveLink');
  useEffect(() => {
    onLinkChange(googleDriveLinkValue);
  }, [googleDriveLinkValue, onLinkChange]);


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
    try {
        const unitName = units.find((u) => u.id === userProfile.unitId)?.name || 'Unknown Unit';
        const submissionCollectionRef = collection(firestore, 'users', user.uid, 'submissions');

        // Check for an existing submission to update it
        const q = query(
            submissionCollectionRef,
            where('reportType', '==', reportType),
            where('year', '==', year),
            where('cycleId', '==', cycleId)
        );
        
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Update existing submission
            const existingDocRef = doc(firestore, querySnapshot.docs[0].ref.path);
            await updateDoc(existingDocRef, {
                ...values,
                statusId: 'submitted', // Reset status on update
                submissionDate: serverTimestamp(),
            });
            toast({
                title: 'Submission Updated!',
                description: `Your '${reportType}' report has been updated.`,
            });
        } else {
            // Add new submission
            await addDoc(submissionCollectionRef, {
                ...values,
                reportType,
                year,
                cycleId,
                userId: user.uid,
                campusId: userProfile.campusId,
                unitId: userProfile.unitId,
                unitName: unitName,
                statusId: 'submitted',
                submissionDate: serverTimestamp(),
            });
            toast({
                title: 'Submission Successful!',
                description: `Your '${reportType}' report has been submitted.`,
            });
        }
      
      setIsSubmitting(false);
      form.reset();
      setValidationStatus('idle');
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting report: ', error);
      toast({ title: 'Submission Failed', description: 'Could not submit your report.', variant: 'destructive' });
      setIsSubmitting(false);
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <FormDescription>
                  Make sure the link sharing is set to 'Anyone with the link'.
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
        <Button
          type="submit"
          className="w-full"
          disabled={
            isSubmitting ||
            validationStatus === 'validating' ||
            validationStatus === 'invalid'
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
