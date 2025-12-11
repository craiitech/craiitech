'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { validateGoogleDriveLinkAccessibility } from '@/ai/flows/validate-google-drive-link-accessibility';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const submissionSchema = z.object({
  cycleId: z.enum(['first', 'final']),
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

export function SubmissionForm({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationStatus, setValidationStatus] =
    useState<ValidationStatus>('idle');
  const [validationMessage, setValidationMessage] = useState('');
  const { toast } = useToast();
  const { user, userProfile } = useUser();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof submissionSchema>>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      cycleId: 'first',
      googleDriveLink: '',
      comments: '',
    },
  });

  const handleLinkValidation = async (link: string) => {
    if (
      !link.startsWith('https://drive.google.com/') ||
      !z.string().url().safeParse(link).success
    ) {
      setValidationStatus('idle');
      return;
    }

    setValidationStatus('validating');
    setValidationMessage('');

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
        setValidationMessage(reason);
        form.setError('googleDriveLink', {
          type: 'manual',
          message: reason,
        });
      }
    } catch (error) {
      setValidationStatus('invalid');
      const reason =
        'Could not validate the link. Please check the format and try again.';
      setValidationMessage(reason);
      form.setError('googleDriveLink', {
        type: 'manual',
        message: reason,
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof submissionSchema>) => {
    if (!user || !firestore || !userProfile) {
        toast({ title: 'Error', description: 'You must be logged in to submit.', variant: 'destructive'});
        return;
    }

    setIsSubmitting(true);
    try {
        const submissionCollectionRef = collection(firestore, 'users', user.uid, 'submissions');
        await addDoc(submissionCollectionRef, {
            ...values,
            userId: user.uid,
            campusId: userProfile.campusId,
            unitId: userProfile.unitId,
            statusId: 'submitted', // Initial status
            submissionDate: serverTimestamp(),
        });
        toast({
            title: 'Submission Successful!',
            description: `Your report has been submitted.`,
        });
        setIsSubmitting(false);
        form.reset();
        setValidationStatus('idle');
        if (onSuccess) {
            onSuccess();
        }
    } catch (error) {
        console.error("Error submitting report: ", error);
        toast({ title: 'Submission Failed', description: 'Could not submit your report.', variant: 'destructive'});
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="cycleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Submission Cycle</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a cycle" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="first">First Submission</SelectItem>
                  <SelectItem value="final">Final Submission</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="googleDriveLink"
          render={({ field }) => (
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
              {validationStatus === 'invalid' && validationMessage ? (
                 <FormDescription className="text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {validationMessage}
                </FormDescription>
              ) : (
                <FormDescription>
                    The AI validator will check if the link is accessible upon losing focus.
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
