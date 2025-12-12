'use client';

import { useState, useMemo } from 'react';
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
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Unit } from '@/lib/types';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear + i - 2);

const submissionSchema = z.object({
  cycleId: z.enum(['first', 'final']),
  year: z.coerce.number(),
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
  onSuccess?: () => void;
}

export function SubmissionForm({
  reportType,
  onSuccess,
}: SubmissionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationStatus, setValidationStatus] =
    useState<ValidationStatus>('idle');
  const [validationMessage, setValidationMessage] = useState('');
  const { toast } = useToast();
  const { user, userProfile } = useUser();
  const firestore = useFirestore();

  const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units'): null, [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  const form = useForm<z.infer<typeof submissionSchema>>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      cycleId: 'first',
      year: currentYear,
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
     if (!units) {
      toast({ title: 'Error', description: 'Could not load unit data. Please try again.', variant: 'destructive'});
      return;
    }

    setIsSubmitting(true);
    try {
        const unitName = units.find(u => u.id === userProfile.unitId)?.name || 'Unknown Unit';
        const submissionCollectionRef = collection(firestore, 'users', user.uid, 'submissions');
        await addDoc(submissionCollectionRef, {
            ...values,
            reportType, // Add the report type to the submission
            userId: user.uid,
            campusId: userProfile.campusId,
            unitId: userProfile.unitId,
            unitName: unitName,
            statusId: 'submitted', // Initial status
            submissionDate: serverTimestamp(),
        });
        toast({
            title: 'Submission Successful!',
            description: `Your '${reportType}' report has been submitted.`,
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
            name="year"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Year</FormLabel>
                <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={String(field.value)}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a year" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {years.map(year => (
                            <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
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
