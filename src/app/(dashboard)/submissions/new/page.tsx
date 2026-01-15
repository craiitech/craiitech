
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import type { Submission, Comment, Unit, Cycle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SubmissionForm } from '@/components/dashboard/submission-form';
import { CheckCircle, Circle, HelpCircle, Download, FileCheck, Scan, Link as LinkIcon, AlertCircle, XCircle, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FeedbackDialog } from '@/components/dashboard/feedback-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useRouter } from 'next/navigation';


export const submissionTypes = [
  'Operational Plans',
  'Objectives Monitoring',
  'Risk and Opportunity Registry Form',
  'Risk and Opportunity Action Plan',
  'Updated Needs and Expectation of Interested Parties',
  'SWOT Analysis',
];

const currentYear = new Date().getFullYear();

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive',
    submitted: 'outline',
    'awaiting approval': 'outline'
}


export default function NewSubmissionPage() {
  const { user, userProfile, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedCycle, setSelectedCycle] = useState<'first' | 'final'>('first');
  const [selectedReport, setSelectedReport] = useState<string>(submissionTypes[0]);
  
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackToShow, setFeedbackToShow] = useState('');
  
  // State for the new carry-over logic
  const [showUpdateDialog, setShowUpdateDialog] = useState<string | null>(null);
  const [isCarryingOver, setIsCarryingOver] = useState(false);
  const [showFormForUpdate, setShowFormForUpdate] = useState(false);
  
  const cyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
  const { data: allCycles, isLoading: isLoadingCycles } = useCollection<Cycle>(cyclesQuery);

  const years = useMemo(() => {
    if (!allCycles) return [currentYear];
    const uniqueYears = [...new Set(allCycles.map(c => c.year))];
    return uniqueYears.sort((a, b) => b - a);
  }, [allCycles]);


  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'submissions'),
      where('userId', '==', user.uid),
      where('year', '==', selectedYear)
      // We query for the whole year now
    );
  }, [firestore, user, selectedYear]);

  const { data: submissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);
  
  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const { firstCycleStatusMap, finalCycleStatusMap } = useMemo(() => {
    if (!submissions) {
      return { firstCycleStatusMap: new Map(), finalCycleStatusMap: new Map() };
    }
    const firstMap = new Map(
      submissions
        .filter(s => s.cycleId === 'first')
        .map((s) => [s.reportType, s])
    );
     const finalMap = new Map(
      submissions
        .filter(s => s.cycleId === 'final')
        .map((s) => [s.reportType, s])
    );

    return { firstCycleStatusMap: firstMap, finalCycleStatusMap: finalMap };
  }, [submissions]);

  const submissionStatusMap = selectedCycle === 'first' ? firstCycleStatusMap : finalCycleStatusMap;
  
  const specialUpdateReports = ['SWOT Analysis', 'Updated Needs and Expectation of Interested Parties'];

  const isLoading = isLoadingCycles || isLoadingSubmissions || isLoadingUnits;

  const handleSelectReport = (reportType: string) => {
    setSelectedReport(reportType);
    setShowFormForUpdate(false); // Reset form visibility when changing report
    
    // Check if we need to show the update dialog
    if (
      selectedCycle === 'final' &&
      specialUpdateReports.includes(reportType) &&
      firstCycleStatusMap.has(reportType)
    ) {
      // If a final submission already exists, don't show the dialog
      if (finalCycleStatusMap.has(reportType)) {
        setShowUpdateDialog(null);
      } else {
        setShowUpdateDialog(reportType);
      }
    } else {
      setShowUpdateDialog(null);
    }
  }
  
  const handleCarryOverSubmission = async () => {
    if (!firestore || !userProfile || !user || !selectedReport || !units) {
        toast({ title: "Error", description: "User data is not fully loaded.", variant: "destructive" });
        return;
    };
    
    const originalSubmission = firstCycleStatusMap.get(selectedReport);
    if (!originalSubmission) {
      toast({ title: "Error", description: "Original submission not found.", variant: "destructive" });
      return;
    }
    
    setIsCarryingOver(true);

    const carryOverComment: Comment = {
        text: 'No updates from First Cycle submission. Carried over for final approval.',
        authorId: user.uid,
        authorName: `${userProfile.firstName} ${userProfile.lastName}`,
        authorRole: userRole || 'User',
        createdAt: new Date(),
    };
    
    const unitName = units.find((u) => u.id === userProfile.unitId)?.name || 'Unknown Unit';

    // Construct the new submission data correctly, using the current user's profile info
    const newSubmissionData = {
      userId: user.uid,
      campusId: userProfile.campusId,
      unitId: userProfile.unitId,
      unitName: unitName,
      reportType: originalSubmission.reportType,
      googleDriveLink: originalSubmission.googleDriveLink,
      year: originalSubmission.year,
      cycleId: 'final' as 'first' | 'final',
      statusId: 'submitted',
      submissionDate: new Date(),
      comments: [carryOverComment],
    };

    try {
      const submissionsCollectionRef = collection(firestore, 'submissions');
      await addDoc(submissionsCollectionRef, newSubmissionData);
      toast({ title: "Success", description: "Submission has been carried over and sent for final approval." });
    } catch (error) {
      console.error("Error carrying over submission:", error);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'submissions',
          operation: 'create',
          requestResourceData: newSubmissionData
      }));
    } finally {
      setIsCarryingOver(false);
      setShowUpdateDialog(null);
    }
  }


  const handleFormSuccess = () => {
    setShowFormForUpdate(false); // Hide form after successful submission
    router.push('/submissions'); // Redirect to the main submissions list
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
  
  const getStatusText = (status: string) => {
    return status === 'submitted' ? 'Awaiting Approval' : status;
  }


  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Submission</h2>
        <p className="text-muted-foreground">Select a report to submit for the chosen year and cycle.</p>
      </div>
      
       {selectedCycle === 'final' && specialUpdateReports.includes(selectedReport) && !finalCycleStatusMap.has(selectedReport) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Final Cycle Submission</AlertTitle>
          <AlertDescription>
            For {selectedReport}, if there are no changes from your First Cycle submission, you can choose to carry it over instead of re-uploading.
          </AlertDescription>
        </Alert>
      )}

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
                            onClick={() => handleSelectReport(reportType)}
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
                                        {getStatusText(submission.statusId)}
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
                    {showUpdateDialog === selectedReport && !showFormForUpdate ? (
                        <AlertDialog open={true} onOpenChange={(open) => !open && setShowUpdateDialog(null)}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Update Confirmation</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        A submission for this report was made in the First Cycle. Are there any updates for the Final Cycle?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={handleCarryOverSubmission} disabled={isCarryingOver}>
                                        {isCarryingOver && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        No, No Updates
                                    </AlertDialogCancel>
                                    <AlertDialogAction onClick={() => setShowFormForUpdate(true)}>
                                        Yes, I Have Updates
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    ) : (
                        <SubmissionForm
                            reportType={selectedReport}
                            year={selectedYear}
                            cycleId={selectedCycle}
                            onSuccess={handleFormSuccess}
                            key={`${selectedReport}-${selectedYear}-${selectedCycle}`}
                        />
                    )}
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
