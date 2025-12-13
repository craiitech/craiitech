
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Submission } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SubmissionForm } from '@/components/dashboard/submission-form';
import { CheckCircle, Circle, ChevronDown, ChevronUp, MessageSquare, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FeedbackDialog } from '@/components/dashboard/feedback-dialog';
import { Progress } from '@/components/ui/progress';
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
import { SubmissionChecklist } from '@/components/dashboard/submission-checklist';


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
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackToShow, setFeedbackToShow] = useState('');
  const [isChecklistComplete, setIsChecklistComplete] = useState(false);


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

  const { submissionStatusMap, submissionProgress } = useMemo(() => {
    if (!submissions) {
      return { 
        submissionStatusMap: new Map<string, Submission>(),
        submissionProgress: 0 
      };
    }
    const statusMap = new Map(submissions.map((s) => [s.reportType, s]));
    const progress = (statusMap.size / submissionTypes.length) * 100;
    return {
      submissionStatusMap: statusMap,
      submissionProgress: progress,
    };
  }, [submissions]);

  const handleLinkChange = (link: string) => {
    if (link && link.startsWith('https://drive.google.com/')) {
      const embedUrl = link.replace('/view', '/preview').replace('?usp=sharing', '');
      setPreviewUrl(embedUrl);
    } else {
      setPreviewUrl('');
    }
  };

  const handleFormSuccess = () => {
    setActiveReport(null); 
  };
  
  const handleViewFeedback = (comments: any) => {
    if (Array.isArray(comments) && comments.length > 0) {
      setFeedbackToShow(comments[comments.length - 1]?.text || 'No comment text found.');
    } else {
      setFeedbackToShow('No feedback provided.');
    }
    setIsFeedbackDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Submission</h2>
        <p className="text-muted-foreground">Select a report to submit for the chosen year and cycle.</p>
      </div>
      
       <Card>
        <CardHeader>
          <CardTitle>Submission Progress</CardTitle>
           <CardDescription>
            You have completed {submissionStatusMap.size} of {submissionTypes.length} required submissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-4 w-full" />
          ) : (
            <Progress value={submissionProgress} className="w-full" />
          )}
        </CardContent>
      </Card>


      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* --- LEFT COLUMN: CHECKLIST --- */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Submission Checklist</CardTitle>
              <CardDescription>Select the year and cycle to view submission status.</CardDescription>
              <div className="flex items-center gap-4 pt-2">
                <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                  <SelectTrigger className="w-[120px]">
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
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">First Submission</SelectItem>
                    <SelectItem value="final">Final Submission</SelectItem>
                  </SelectContent>
                </Select>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="link" className="p-0 h-auto">
                            <HelpCircle className="mr-2 h-4 w-4"/>
                            How to get Google Drive link
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
                                Paste the copied link into the "Google Drive Link" field in the submission form on this page.
                            </li>
                        </ol>
                        <AlertDialogFooter>
                             <AlertDialogAction>Got it!</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
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
                  const isExpanded = activeReport === reportType;

                  return (
                    <Collapsible
                      key={reportType}
                      open={isExpanded}
                      onOpenChange={(isOpen) => {
                        setActiveReport(isOpen ? reportType : null);
                        if (!isOpen) {
                          setIsChecklistComplete(false); // Reset checklist on collapse
                        }
                      }}
                      className="rounded-lg border"
                    >
                      <CollapsibleTrigger asChild>
                         <div role="button" className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 rounded-t-lg cursor-pointer">
                            <div className="flex flex-1 items-center gap-3">
                              {submission ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                              <span className="font-medium flex-1">{reportType}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {submission && (
                                <div className="flex items-center gap-2">
                                  <Badge variant={statusVariant[submission.statusId] ?? 'secondary'} className="capitalize">
                                    {submission.statusId}
                                  </Badge>
                                  {submission.statusId === 'submitted' && (
                                    <p className="text-sm text-muted-foreground hidden md:block">
                                      Awaiting Review
                                    </p>
                                  )}
                                  {submission.statusId === 'rejected' && submission.comments && (
                                    <div onClick={(e) => { e.stopPropagation(); handleViewFeedback(submission.comments); }}>
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="h-8 w-8 flex items-center justify-center">
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                <span className="sr-only">Toggle</span>
                              </div>
                            </div>
                          </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="p-4 pt-0">
                        <p className="mb-4 text-sm text-muted-foreground">
                          {submission
                            ? 'You have already submitted this report for the selected period. You can update it by submitting again.'
                            : 'Fill out the form below to submit this report.'}
                        </p>
                        <SubmissionForm
                          reportType={reportType}
                          year={selectedYear}
                          cycleId={selectedCycle}
                          onLinkChange={handleLinkChange}
                          onSuccess={handleFormSuccess}
                          isChecklistComplete={isChecklistComplete}
                          key={`${reportType}-${selectedYear}-${selectedCycle}`}
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* --- RIGHT COLUMN: PREVIEW & CHECKLIST --- */}
        <div className="space-y-4">
            {activeReport && (
              <>
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Document Preview</CardTitle>
                  <CardDescription>A preview of the Google Drive link will be shown here.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video w-full rounded-lg border bg-muted">
                    {previewUrl ? (
                      <iframe src={previewUrl} className="h-full w-full" allow="autoplay"></iframe>
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <p>Enter a valid Google Drive link to see a preview.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
               <SubmissionChecklist
                  reportType={activeReport}
                  cycle={selectedCycle}
                  year={selectedYear}
                  onChecklistChange={setIsChecklistComplete}
                />
              </>
            )}
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
