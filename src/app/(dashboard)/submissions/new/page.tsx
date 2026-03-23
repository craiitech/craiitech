'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc } from 'firebase/firestore';
import type { Submission, Comment, Unit, Cycle, Risk } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SubmissionForm } from '@/components/dashboard/submission-form';
import { 
    CheckCircle, 
    Circle, 
    Download, 
    FileCheck, 
    Scan, 
    Link as LinkIcon, 
    AlertCircle, 
    XCircle, 
    ChevronRight, 
    Loader2, 
    ArrowLeft, 
    ShieldAlert, 
    Info, 
    Eye, 
    Image as ImageIcon 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FeedbackDialog } from '@/components/dashboard/feedback-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';


export const submissionTypes = [
  'SWOT Analysis',
  'Needs and Expectation of Interested Parties',
  'Operational Plan',
  'Quality Objectives Monitoring',
  'Risk and Opportunity Registry',
  'Risk and Opportunity Action Plan'
];

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive',
    submitted: 'outline',
    'awaiting approval': 'outline',
    'n/a': 'secondary',
}


export default function NewSubmissionPage() {
  const { user, userProfile, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<'first' | 'final' | null>(null);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackToShow, setFeedbackToShow] = useState('');
  
  const [showUpdateDialog, setShowUpdateDialog] = useState<string | null>(null);
  const [isCarryingOver, setIsCarryingOver] = useState(false);
  const [showFormForUpdate, setShowFormForUpdate] = useState(false);
  
  const cyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
  const { data: allCycles, isLoading: isLoadingCycles } = useCollection<Cycle>(cyclesQuery);

  const years = useMemo(() => {
    if (!allCycles) return [];
    const uniqueYears = [...new Set(allCycles.map(c => c.year))].sort((a, b) => b - a);
    return uniqueYears;
  }, [allCycles]);

  const availableCyclesForYear = useMemo(() => {
    if (!allCycles || !selectedYear) return [];
    return allCycles
        .filter(c => c.year === selectedYear)
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [allCycles, selectedYear]);

  useEffect(() => {
    if (selectedYear) {
        if (selectedCycle) {
            const exists = availableCyclesForYear.some(c => c.name === selectedCycle);
            if (!exists) {
                setSelectedCycle(null);
                setSelectedReport(null);
            }
        }
    } else {
        setSelectedCycle(null);
        setSelectedReport(null);
    }
  }, [selectedYear, availableCyclesForYear, selectedCycle]);


  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.unitId || !userProfile?.campusId || !selectedYear) return null;
    return query(
      collection(firestore, 'submissions'),
      where('unitId', '==', userProfile.unitId),
      where('campusId', '==', userProfile.campusId),
      where('year', '==', selectedYear)
    );
  }, [firestore, userProfile?.unitId, userProfile?.campusId, selectedYear]);

  const { data: rawSubmissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);
  
  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const digitalRisksQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.unitId || !selectedYear) return null;
    return query(
        collection(firestore, 'risks'),
        where('unitId', '==', userProfile.unitId),
        where('year', '==', selectedYear)
    );
  }, [firestore, userProfile?.unitId, selectedYear]);
  const { data: digitalRisks } = useCollection<Risk>(digitalRisksQuery);

  const { firstCycleStatusMap, finalCycleStatusMap } = useMemo(() => {
    if (!rawSubmissions) {
      return { firstCycleStatusMap: new Map(), finalCycleStatusMap: new Map() };
    }

    const normalizedSubmissions = rawSubmissions.map(s => {
        let rType = String(s.reportType || '').trim();
        const lowerType = rType.toLowerCase();
        
        if (lowerType.includes('risk and opportunity registry')) {
            rType = 'Risk and Opportunity Registry';
        } else if (lowerType.includes('operational plan')) {
            rType = 'Operational Plan';
        } else if (lowerType.includes('objectives monitoring')) {
            rType = 'Quality Objectives Monitoring';
        } else if (lowerType.includes('needs and expectation')) {
            rType = 'Needs and Expectation of Interested Parties';
        } else if (lowerType.includes('swot')) {
            rType = 'SWOT Analysis';
        } else if (lowerType.includes('action plan') && lowerType.includes('risk')) {
            rType = 'Risk and Opportunity Action Plan';
        }
        return { ...s, reportType: rType };
    });

    const firstMap = new Map(
      normalizedSubmissions
        .filter(s => s.cycleId === 'first')
        .map((s) => [s.reportType, s])
    );
     const finalMap = new Map(
      normalizedSubmissions
        .filter(s => s.cycleId === 'final')
        .map((s) => [s.reportType, s])
    );

    return { firstCycleStatusMap: firstMap, finalCycleStatusMap: finalMap };
  }, [rawSubmissions]);

  const submissionStatusMap = selectedCycle === 'first' ? firstCycleStatusMap : finalCycleStatusMap;
  
  const specialUpdateReports = ['SWOT Analysis', 'Needs and Expectation of Interested Parties'];

  const isFirstCycleRorComplete = useMemo(() => {
    const docSubmitted = firstCycleStatusMap.has('Risk and Opportunity Registry');
    const hasR = digitalRisks?.some(r => r.type === 'Risk');
    const hasO = digitalRisks?.some(r => r.type === 'Opportunity');
    return docSubmitted && hasR && hasO;
  }, [firstCycleStatusMap, digitalRisks]);

  const isLoading = isLoadingCycles || isLoadingSubmissions || isLoadingUnits;

  const handleSelectReport = (reportType: string) => {
    const isActionPlan = reportType === 'Risk and Opportunity Action Plan';
    const registryFormSubmission = submissionStatusMap.get('Risk and Opportunity Registry');
    const isActionPlanNA = isActionPlan && registryFormSubmission?.riskRating === 'low';
    
    if (isActionPlanNA) return;

    setSelectedReport(reportType);
    setShowFormForUpdate(false); 
    
    if (
      selectedCycle === 'final' &&
      specialUpdateReports.includes(reportType) &&
      firstCycleStatusMap.has(reportType)
    ) {
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
      revision: originalSubmission.revision,
      controlNumber: originalSubmission.controlNumber,
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
    setShowFormForUpdate(false);
    router.push('/submissions');
  };
  
  const getIconForStatus = (status?: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'submitted':
        return <Circle className="h-5 w-5 text-yellow-500" />;
      case 'n/a':
        return <CheckCircle className="h-5 w-5 text-muted-foreground" />;
      default:
        return <XCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };
  
  const getStatusText = (status: string) => {
    return status === 'submitted' ? 'Awaiting Approval' : status;
  }

  const isCycleSelected = selectedYear !== null && selectedCycle !== null;

  const currentTemplate = useMemo(() => {
    if (!selectedReport) return PlaceHolderImages.find(p => p.id === 'general-template');
    
    const mapping: Record<string, string> = {
        'SWOT Analysis': 'swot-template',
        'Needs and Expectation of Interested Parties': 'nep-template',
        'Operational Plan': 'ope-template',
        'Quality Objectives Monitoring': 'qom-template',
        'Risk and Opportunity Registry': 'ror-template',
        'Risk and Opportunity Action Plan': 'roa-template'
    };

    return PlaceHolderImages.find(p => p.id === mapping[selectedReport]) || PlaceHolderImages.find(p => p.id === 'general-template');
  }, [selectedReport]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">New Submission / Resubmission</h2>
          <p className="text-muted-foreground">Select a report to submit for the chosen year and cycle.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                variant="outline"
                className="h-9 font-bold uppercase text-[10px] tracking-widest border-primary/20 text-primary hover:bg-primary/5"
                asChild
            >
                <Link href="https://drive.google.com/drive/folders/1xabubTGa7ddu05VxiL9zhX6uge_kisN1?usp=drive_link" target="_blank">
                    <Download className="mr-2 h-4 w-4" /> Download Templates
                </Link>
            </Button>
            <Button variant="outline" onClick={() => router.push('/submissions')} className="h-9 font-bold uppercase text-[10px] tracking-widest">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
        </div>
      </div>
      
       {selectedCycle === 'final' && selectedReport && specialUpdateReports.includes(selectedReport) && !finalCycleStatusMap.has(selectedReport) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Final Cycle Submission</AlertTitle>
          <AlertDescription>
            For {selectedReport}, if there are no changes from your First Cycle submission, you can choose to carry it over instead of re-uploading.
          </AlertDescription>
        </Alert>
      )}

       <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
            <Card>
                <CardHeader>
                <CardTitle>Submission Status</CardTitle>
                <CardDescription>Select the year and cycle to view submission status.</CardDescription>
                <div className="flex flex-col items-stretch gap-2 pt-2 md:flex-row md:items-center">
                    <Select value={selectedYear ? String(selectedYear) : undefined} onValueChange={(value) => setSelectedYear(Number(value))}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                            {year}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <Select value={selectedCycle ?? undefined} onValueChange={(value: 'first' | 'final') => setSelectedCycle(value)} disabled={!selectedYear}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select Cycle" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableCyclesForYear.map(cycle => (
                            <SelectItem key={cycle.id} value={cycle.name as 'first' | 'final'}>
                                {cycle.name === 'first' ? 'First Submission' : 'Final Submission'}
                            </SelectItem>
                        ))}
                        {selectedYear && availableCyclesForYear.length === 0 && (
                            <div className="p-4 text-sm text-muted-foreground">No cycles defined for this year.</div>
                        )}
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
                ) : isCycleSelected ? (
                    <ScrollArea className="h-[400px] pr-2">
                        <div className="space-y-2">
                            <Tabs value={selectedReport || ""} onValueChange={handleSelectReport}>
                                <TabsList className="flex flex-col w-full h-auto bg-transparent gap-2 animate-tab-highlight rounded-xl p-1">
                                    {submissionTypes.map((reportType) => {
                                    const submission = submissionStatusMap.get(reportType);
                                    const isActionPlan = reportType === 'Risk and Opportunity Action Plan';
                                    const registryFormSubmission = submissionStatusMap.get('Risk and Opportunity Registry');
                                    const isActionPlanNA = isActionPlan && registryFormSubmission?.riskRating === 'low';
                                    const isSelected = selectedReport === reportType;
                                    return (
                                        <TabsTrigger
                                            key={reportType}
                                            value={reportType}
                                            disabled={isActionPlanNA}
                                            className={cn(
                                                "flex w-full items-center justify-between p-3 text-left rounded-lg border transition-colors",
                                                isSelected ? "bg-muted ring-2 ring-primary data-[state=active]:bg-muted data-[state=active]:text-foreground" : "hover:bg-muted/50 bg-white",
                                                isActionPlanNA ? "cursor-not-allowed opacity-50 bg-muted/30" : "cursor-pointer"
                                            )}
                                        >
                                            <div className="flex flex-1 items-center gap-3">
                                                {getIconForStatus(isActionPlanNA ? 'n/a' : submission?.statusId)}
                                                <span className="font-medium text-xs flex-1">{reportType}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isActionPlanNA ? (
                                                    <Badge variant="secondary" className="text-[9px]">N/A</Badge>
                                                ) : submission && (
                                                    <Badge variant={statusVariant[submission.statusId]} className="capitalize text-[9px]">
                                                        {getStatusText(submission.statusId)}
                                                    </Badge>
                                                )}
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        </TabsTrigger>
                                    );
                                    })}
                                </TabsList>
                            </Tabs>
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        {selectedYear && availableCyclesForYear.length > 0 ? "Please select a cycle to begin." : "Please select a year with defined cycles."}
                    </div>
                )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>General Instructions</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-6">
                     <div className="flex items-start gap-3">
                        <Download className="h-5 w-5 text-primary flex-shrink-0 mt-1"/>
                        <div>
                            <span className="font-semibold">1. Download Templates:</span> All report templates are available in the official EOMS Google Drive folder. 
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <Button variant="link" asChild className="p-0 h-auto font-bold">
                                    <Link href="https://drive.google.com/drive/folders/1xabubTGa7ddu05VxiL9zhX6uge_kisN1?usp=drive_link" target="_blank">Access templates</Link>
                                </Button>
                            </div>
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
                            <span className="font-semibold">4. Copy and Submit Link:</span> Copy the sharing link from Google Drive and paste it into the submission form.
                        </div>
                    </div>

                    {/* DYNAMIC TEMPLATE VISUAL GUIDE */}
                    <div className="pt-4 border-t space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <ImageIcon className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Template Visual Guide</span>
                        </div>
                        {selectedReport ? (
                            <div className="space-y-3">
                                <p className="text-[10px] font-bold text-muted-foreground leading-tight italic">Expected format for: {selectedReport}</p>
                                <div className="relative rounded-lg overflow-hidden shadow-md border bg-muted aspect-[1/1.4] w-full group transition-all hover:shadow-lg">
                                    {currentTemplate && (
                                        <Image 
                                            src={currentTemplate.imageUrl} 
                                            alt={currentTemplate.description} 
                                            fill
                                            className="object-contain p-1"
                                            data-ai-hint={currentTemplate.imageHint}
                                        />
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 rounded-lg border border-dashed bg-muted/10 text-center space-y-2">
                                <ImageIcon className="h-8 w-8 mx-auto opacity-10" />
                                <p className="text-[10px] font-medium text-muted-foreground">Select a report type to see the official format sample.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2">
            {isCycleSelected && selectedReport ? (
                selectedReport === 'Risk and Opportunity Action Plan' && !submissionStatusMap.has('Risk and Opportunity Registry') ? (
                    <Card className="lg:sticky top-20 border-destructive/50">
                        <CardHeader className="bg-destructive/5">
                            <CardTitle className="flex items-center gap-2 text-destructive">
                                <AlertCircle className="h-5 w-5" />
                                Registry Required First
                            </CardTitle>
                            <CardDescription>
                                You cannot submit an Action Plan until the <strong>Risk and Opportunity Registry</strong> has been submitted.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Validation Blocked</AlertTitle>
                                <AlertDescription>
                                    The system needs your Registry submission first to determine if this Action Plan is mandatory or if your unit is exempt (Low Risk).
                                </AlertDescription>
                            </Alert>
                            <Button className="mt-6 w-full md:w-auto" onClick={() => setSelectedReport('Risk and Opportunity Registry')}>
                                Go to Registry Submission
                            </Button>
                        </CardContent>
                    </Card>
                ) : (selectedReport === 'Risk and Opportunity Registry' && selectedCycle === 'final' && !isFirstCycleRorComplete) ? (
                    <Card className="lg:sticky top-20 border-destructive/50">
                        <CardHeader className="bg-destructive/5">
                            <CardTitle className="flex items-center gap-2 text-destructive">
                                <ShieldAlert className="h-5 w-5" />
                                First Cycle Requirement Block
                            </CardTitle>
                            <CardDescription>
                                The <strong>Final Submission</strong> for the Risk Registry requires a verified <strong>First Cycle</strong> baseline.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Prerequisite Not Met</AlertTitle>
                                <AlertDescription className="space-y-2">
                                    <p>To continue with the Final Cycle, your unit must have:</p>
                                    <ul className="list-decimal pl-5 font-bold">
                                        <li className={cn(firstCycleStatusMap.has('Risk and Opportunity Registry') ? "text-green-600 line-through" : "")}>Submitted the First Cycle ROR Document</li>
                                        <li className={cn(digitalRisks?.some(r => r.type === 'Risk') ? "text-green-600 line-through" : "")}>Encoded individual **Risks** in the Digital Register</li>
                                        <li className={cn(digitalRisks?.some(r => r.type === 'Opportunity') ? "text-green-600 line-through" : "")}>Encoded individual **Opportunities** in the Digital Register</li>
                                    </ul>
                                </AlertDescription>
                            </Alert>
                            <div className="flex gap-3">
                                <Button className="flex-1" variant="outline" onClick={() => setSelectedCycle('first')}>
                                    Go to First Cycle Submission
                                </Button>
                                <Button className="flex-1" variant="default" asChild>
                                    <Link href="/risk-register">Open Digital Register</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {/* Informative alert for Final Cycle ROR even if not blocked */}
                        {selectedReport === 'Risk and Opportunity Registry' && selectedCycle === 'final' && isFirstCycleRorComplete && (
                            <Alert className="bg-primary/5 border-primary/20 animate-in slide-in-from-top-2 duration-500">
                                <Info className="h-5 w-5 text-primary" />
                                <AlertTitle className="font-black uppercase text-primary tracking-tight">Post-Treatment Update Required</AlertTitle>
                                <AlertDescription className="space-y-4 pt-1">
                                    <p className="text-xs font-bold leading-relaxed">
                                        Before uploading your formal registry document, please ensure each individual entry in the Digital Risk Register has been updated with its **Final Assessment (Post-Treatment Analysis)**.
                                    </p>
                                    <Button size="sm" asChild className="h-8 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                                        <Link href="/risk-register?highlightSection=4">
                                            Update Digital Register Now
                                        </Link>
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        )}

                        <Card className="lg:sticky top-20">
                            <CardHeader>
                                <CardTitle>Submit: {selectedReport}</CardTitle>
                                <CardDescription>
                                    {submissionStatusMap.get(selectedReport)
                                        ? `A report has already been submitted for your unit. You can update it by submitting again.`
                                        : `Fill out the form below to submit this report for your unit.`}
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
                                                    {isCarryingOver && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                )
            ) : (
                 <Card className="lg:sticky top-20 flex items-center justify-center h-96">
                    <div className="text-center text-muted-foreground">
                        <p>Please select a report from the list on the left to start a submission.</p>
                    </div>
                </Card>
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