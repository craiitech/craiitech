
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Submission } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SubmissionForm } from '@/components/dashboard/submission-form';
import { CheckCircle, Circle, HelpCircle, Download, FileCheck, Scan, Link as LinkIcon, AlertCircle, XCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FeedbackDialog } from '@/components/dashboard/feedback-dialog';
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
import Link from 'next/link';
import { cn } from '@/lib/utils';


export const submissionTypes = [
  'Operational Plans',
  'Objectives Monitoring',
  'Risk and Opportunity Registry Form',
  'Risk and Opportunity Action Plan',
  'Updated Needs and Expectation of Interested Parties',
  'SWOT Analysis',
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear + i - 2);

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive',
    submitted: 'outline'
}


export default function NewSubmissionPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedCycle, setSelectedCycle] = useState<'first' | 'final'>('first');
  const [selectedReport, setSelectedReport] = useState<string>(submissionTypes[0]);
  
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackToShow, setFeedbackToShow] = useState('');


  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'submissions'),
      where('userId', '==', user.uid),
      where('year', '==', selectedYear),
      where('cycleId', '==', selectedCycle)
    );
  }, [firestore, user, selectedYear, selectedCycle]);

  const { data: submissions, isLoading } = useCollection<Submission>(submissionsQuery);

  const submissionStatusMap = useMemo(() => {
    if (!submissions) {
      return new Map<string, Submission>();
    }
    return new Map(submissions.map((s) => [s.reportType, s]));
  }, [submissions]);

  const handleFormSuccess = () => {
    // This function is called when a form is successfully submitted.
    // It can be used to refetch data or update UI if needed.
    // For now, the real-time listener of useCollection handles the update automatically.
  };
  
  const handleViewFeedback = (comments: any) => {
    if (Array.isArray(comments) && comments.length > 0) {
      setFeedbackToShow(comments[comments.length - 1]?.text || 'No comment text found.');
    } else {
      setFeedbackToShow('No feedback provided.');
    }
    setIsFeedbackDialogOpen(true);
  };
  
  const getIconForStatus = (status?: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'submitted':
        return <Circle className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };


  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Submission</h2>
        <p className="text-muted-foreground">Select a report to submit for the chosen year and cycle.</p>
      </div>

       <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* --- LEFT COLUMN: CHECKLIST & INSTRUCTIONS --- */}
        <div className="lg:col-span-1 space-y-4">
            <Card>
                <CardHeader>
                <CardTitle>Submission Status</CardTitle>
                <CardDescription>Select the year and cycle to view submission status.</CardDescription>
                <div className="flex flex-col items-stretch gap-2 pt-2 md:flex-row md:items-center">
                    <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                    <SelectTrigger>
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                            {year}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <Select value={selectedCycle} onValueChange={(value: 'first' | 'final') => setSelectedCycle(value)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Cycle" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="first">First Submission</SelectItem>
                        <SelectItem value="final">Final Submission</SelectItem>
                    </SelectContent>
                    </Select>
                </div>
                </CardHeader>
                <CardContent className="space-y-2">
                {isLoading ? (
                    <div className="space-y-4">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                    ))}
                    </div>
                ) : (
                    submissionTypes.map((reportType) => {
                    const submission = submissionStatusMap.get(reportType);
                    const isSelected = selectedReport === reportType;
                    return (
                        <div
                            key={reportType}
                            role="button"
                            onClick={() => setSelectedReport(reportType)}
                            className={cn(
                                "flex w-full items-center justify-between p-3 text-left rounded-lg cursor-pointer border transition-colors",
                                isSelected ? "bg-muted ring-2 ring-primary" : "hover:bg-muted/50"
                            )}
                        >
                            <div className="flex flex-1 items-center gap-3">
                                {getIconForStatus(submission?.statusId)}
                                <span className="font-medium flex-1">{reportType}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {submission && (
                                    <Badge variant={statusVariant[submission.statusId]} className="capitalize">
                                        {submission.statusId}
                                    </Badge>
                                )}
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </div>
                    );
                    })
                )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>General Instructions</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-4">
                     <div className="flex items-start gap-3">
                        <Download className="h-5 w-5 text-primary flex-shrink-0 mt-1"/>
                        <div>
                            <span className="font-semibold">1. Download Templates:</span> All report templates are available in the official EOMS Google Drive folder. 
                            <Button variant="link" asChild className="p-0 h-auto ml-1">
                                <Link href="https://drive.google.com/drive/folders/1xabubTGa7ddu05VxiL9zhX6uge_kisN1?usp=drive_link" target="_blank">Access templates here.</Link>
                            </Button>
                        </div>
                    </div>
                     <div className="flex items-start gap-3">
                        <FileCheck className="h-5 w-5 text-primary flex-shrink-0 mt-1"/>
                        <div>
                            <span className="font-semibold">2. Complete Staff Work (CSW):</span> Ensure your report is finalized and adheres to the Complete Staff Work format before submission.
                        </div>
                    </div>
                     <div className="flex items-start gap-3">
                        <Scan className="h-5 w-5 text-primary flex-shrink-0 mt-1"/>
                        <div>
                            <span className="font-semibold">3. Upload and Share:</span> Scan the signed, final document and upload it to your unit's Google Drive. Set the sharing permission to "Anyone with the link can view".
                        </div>
                    </div>
                     <div className="flex items-start gap-3">
                        <LinkIcon className="h-5 w-5 text-primary flex-shrink-0 mt-1"/>
                        <div>
                            <span className="font-semibold">4. Copy and Submit Link:</span> Copy the sharing link from Google Drive and paste it into the submission form. Use the helper button below the form for a guide.
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* --- RIGHT COLUMN: PREVIEW & FORM --- */}
        <div className="lg:col-span-2">
            <Card className="lg:sticky top-20">
                <CardHeader>
                    <CardTitle>Submit: {selectedReport}</CardTitle>
                    <CardDescription>
                        {submissionStatusMap.get(selectedReport)
                            ? `You have already submitted this report. You can update it by submitting again.`
                            : `Fill out the form below to submit this report.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SubmissionForm
                        reportType={selectedReport}
                        year={selectedYear}
                        cycleId={selectedCycle}
                        onSuccess={handleFormSuccess}
                        key={`${selectedReport}-${selectedYear}-${selectedCycle}`}
                    />
                </CardContent>
            </Card>
        </div>
      </div>
      <FeedbackDialog 
        isOpen={isFeedbackDialogOpen}
        onOpenChange={setIsFeedbackDialogOpen}
        feedback={feedbackToShow}
      />
    </div>
  );
}
