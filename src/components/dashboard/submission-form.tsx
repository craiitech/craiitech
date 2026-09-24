'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CheckCircle,
  XCircle,
  Loader2,
  HelpCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  FileText,
  LayoutList,
  Info,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  Folder,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Paperclip,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
  getDoc,
  setDoc,
} from '@/firebase/firestore-wrapper';
import type { Unit, Submission, Comment, User as AppUser, Campus, Risk, CampusSetting } from '@/lib/types';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
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
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useRouter } from 'next/navigation';
import { debounce } from 'lodash';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { generateControlNumber, cn, normalizeReportType, extractDriveFolderId } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { getOfficialServerTime } from '@/lib/actions';
import Link from 'next/link';
import { ScrollArea } from '../ui/scroll-area';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';

const submissionSchema = z.object({
  googleDriveLink: z
    .string()
    .url('Please enter a valid URL')
    .refine((url) => url.startsWith('https://drive.google.com/'), 'URL must be a Google Drive link'),
  isDraft: z.boolean().default(false),
  comments: z.string().optional(),
  adminCampusId: z.string().optional(),
  adminUnitId: z.string().optional(),
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

export function SubmissionForm({ reportType, year, cycleId, onSuccess }: SubmissionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const { toast } = useToast();
  const { user, userProfile, userRole, isAdmin, firestore } = useUser();
  const { logSessionActivity } = useSessionActivity();
  const router = useRouter();
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [riskRating, setRiskRating] = useState<RiskRating>(null);
  const [isRiskDialogOpen, setIsRiskDialogOpen] = useState(false);
  const [lastSubmittedLink, setLastSubmittedLink] = useState<string>('');
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
  const [originalSubmitter, setOriginalSubmitter] = useState<AppUser | null>(null);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [firstCycleSubmission, setFirstCycleSubmission] = useState<Submission | null>(null);
  const [isLoadingFirstCycle, setIsLoadingFirstCycle] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const isRorForm = normalizeReportType(reportType) === 'Risk and Opportunity Registry';

  const form = useForm<z.infer<typeof submissionSchema>>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      googleDriveLink: '',
      isDraft: false,
      comments: '',
      adminCampusId: userProfile?.campusId || '',
      adminUnitId: userProfile?.unitId || '',
    },
  });

  const watchAdminCampus = form.watch('adminCampusId');
  const watchAdminUnit = form.watch('adminUnitId');

  const targetUnitId = useMemo(
    () => (isAdmin ? watchAdminUnit : userProfile?.unitId),
    [isAdmin, watchAdminUnit, userProfile?.unitId],
  );
  const targetCampusId = useMemo(
    () => (isAdmin ? watchAdminCampus : userProfile?.campusId),
    [isAdmin, watchAdminCampus, userProfile?.campusId],
  );

  const digitalRisksQuery = useMemoFirebase(() => {
    const tUnitId = isAdmin ? watchAdminUnit : userProfile?.unitId;
    const tCampusId = isAdmin ? watchAdminCampus : userProfile?.campusId;

    if (!firestore || !tUnitId || !tCampusId || !year || !isRorForm) return null;
    return query(
      collection(firestore, 'risks'),
      where('unitId', '==', tUnitId),
      where('campusId', '==', tCampusId),
      where('year', '==', year),
    );
  }, [firestore, watchAdminUnit, watchAdminCampus, userProfile, year, isRorForm, isAdmin]);

  const { data: digitalRisks, isLoading: isLoadingDigitalRisks } = useCollection<Risk>(digitalRisksQuery);

  const hasRisks = useMemo(() => digitalRisks?.some((r) => r.type === 'Risk'), [digitalRisks]);
  const hasOpportunities = useMemo(() => digitalRisks?.some((r) => r.type === 'Opportunity'), [digitalRisks]);
  const isDigitalComplete = useMemo(() => !!(hasRisks && hasOpportunities), [hasRisks, hasOpportunities]);

  const isPostTreatmentIncomplete = useMemo(() => {
    if (!isRorForm || cycleId !== 'final' || !digitalRisks) return false;
    return digitalRisks.some((r) => {
      // If final assessment is marked N/A or the risk is initially Low, it doesn't require treatment/re-assessment
      const isLow =
        r.preTreatment?.rating?.toLowerCase() === 'low' ||
        (r.preTreatment?.magnitude != null && r.preTreatment.magnitude < 5);
      if (r.isFinalAssessmentNA || isLow) return false;

      return !r.postTreatment?.likelihood || !r.postTreatment?.consequence || !r.postTreatment?.evidence;
    });
  }, [isRorForm, cycleId, digitalRisks]);

  const isFirstCycleNotApproved = useMemo(() => {
    if (!isRorForm || cycleId !== 'final') return false;
    if (isLoadingFirstCycle) return false;
    return !firstCycleSubmission || firstCycleSubmission.statusId !== 'approved';
  }, [isRorForm, cycleId, firstCycleSubmission, isLoadingFirstCycle]);

  const previousRisksQuery = useMemoFirebase(() => {
    const tUnitId = isAdmin ? watchAdminUnit : userProfile?.unitId;
    const tCampusId = isAdmin ? watchAdminCampus : userProfile?.campusId;

    if (!firestore || !tUnitId || !tCampusId || !year || year <= 2025 || !isRorForm) return null;
    return query(
      collection(firestore, 'risks'),
      where('unitId', '==', tUnitId),
      where('campusId', '==', tCampusId),
      where('year', '==', year - 1),
    );
  }, [firestore, watchAdminUnit, watchAdminCampus, userProfile, year, isRorForm, isAdmin]);

  const { data: previousRisks, isLoading: isLoadingPreviousRisks } = useCollection<Risk>(previousRisksQuery);

  const unclosedPreviousRisks = useMemo(() => {
    if (!isRorForm || !previousRisks) return [];
    return previousRisks.filter((r) => r.status !== 'Closed');
  }, [isRorForm, previousRisks]);

  const hasUnclosedPreviousRisks = useMemo(() => unclosedPreviousRisks.length > 0, [unclosedPreviousRisks]);

  const unclosedCurrentRisks = useMemo(() => {
    if (!isRorForm || cycleId !== 'final' || !digitalRisks) return [];
    return digitalRisks.filter((r) => r.status !== 'Closed');
  }, [isRorForm, cycleId, digitalRisks]);

  const hasUnclosedCurrentRisks = useMemo(() => unclosedCurrentRisks.length > 0, [unclosedCurrentRisks]);

  const isDraftValue = form.watch('isDraft');

  const checklistItems = useMemo(() => {
    const items = [
      { id: 'correctDoc', label: `Is this the correct "${reportType}" for the ${cycleId} cycle for year ${year}?` },
      { id: 'allDataEntry', label: 'ALL COLUMNS and ROWS in the FORM has Data Entry' },
      ...baseChecklistItems,
    ];

    if (isRorForm) {
      if (cycleId === 'first') {
        items.push({ id: 'blueColumns', label: 'ALL BLUE COLUMNS HAVE DATA ENTRY IN THE FORM' });
      } else if (cycleId === 'final') {
        items.push({ id: 'blueGreenColumns', label: 'BOTH BLUE AND GREEN COLUMNS HAS DATA ENTRY' });
      }

      if (riskRating === 'medium-high') {
        items.push({
          id: 'actionPlan',
          label:
            'I acknowledge that a "Risk and Opportunity Action Plan" document must also be submitted for Medium/High rated risks.',
        });
      }
    }

    return items;
  }, [isRorForm, riskRating, reportType, year, cycleId]);

  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCheckedState((prev) => {
      const newState: Record<string, boolean> = {};
      checklistItems.forEach((item) => {
        newState[item.id] = prev[item.id] || false;
      });
      return newState;
    });
  }, [checklistItems]);

  const isChecklistComplete = useMemo(() => {
    if (isDraftValue) return true;
    if (isRorForm && !riskRating) return false;
    const currentKeys = checklistItems.map((i) => i.id);
    return currentKeys.every((id) => checkedState[id] === true);
  }, [checkedState, isRorForm, riskRating, checklistItems, isDraftValue]);

  const handleCheckboxChange = (id: string) => {
    setCheckedState((prevState) => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  };

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [uploadedFileDetails, setUploadedFileDetails] = useState<{
    fileName: string;
    fileUrl: string;
    folderId: string;
  } | null>(null);
  const [isManualLinkMode, setIsManualLinkMode] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [quickFolderLink, setQuickFolderLink] = useState('');
  const [isSavingQuickFolder, setIsSavingQuickFolder] = useState(false);
  const [pendingFileToUpload, setPendingFileToUpload] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const campusSettingsDocRef = useMemoFirebase(
    () => (firestore && targetCampusId ? doc(firestore, 'campusSettings', targetCampusId) : null),
    [firestore, targetCampusId],
  );
  const { data: targetCampusSetting } = useDoc<CampusSetting>(campusSettingsDocRef);

  const campusDocRef = useMemoFirebase(
    () => (firestore && targetCampusId ? doc(firestore, 'campuses', targetCampusId) : null),
    [firestore, targetCampusId],
  );
  const { data: targetCampusDoc } = useDoc<Campus>(campusDocRef);

  const globalSettingsDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'campusSettings', 'global') : null),
    [firestore],
  );
  const { data: globalSetting } = useDoc<CampusSetting>(globalSettingsDocRef);

  const currentCampusName = useMemo(() => {
    if (!campuses || !targetCampusId) return 'Campus';
    return campuses.find((c) => c.id === targetCampusId)?.name || 'Campus';
  }, [campuses, targetCampusId]);

  const activeCampusDriveFolderUrl = useMemo(() => {
    return targetCampusSetting?.submissionDriveFolderUrl || targetCampusDoc?.submissionDriveFolderUrl || '';
  }, [targetCampusSetting, targetCampusDoc]);

  const handleSaveQuickFolder = async () => {
    if (!firestore || !targetCampusId || !quickFolderLink.trim()) {
      toast({
        title: 'Folder Link Required',
        description: 'Please paste a valid Google Drive folder link.',
        variant: 'destructive',
      });
      return;
    }
    setIsSavingQuickFolder(true);
    try {
      const folderUrl = quickFolderLink.trim();
      const folderId = extractDriveFolderId(folderUrl);
      await setDoc(
        doc(firestore, 'campusSettings', targetCampusId),
        {
          id: targetCampusId,
          submissionDriveFolderUrl: folderUrl,
          submissionDriveFolderId: folderId,
          submissionDriveUpdatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      try {
        await updateDoc(doc(firestore, 'campuses', targetCampusId), {
          submissionDriveFolderUrl: folderUrl,
          submissionDriveFolderId: folderId,
          submissionDriveUpdatedAt: new Date().toISOString(),
        });
      } catch (ce) {
        console.warn('Campus doc update fallback:', ce);
      }
      toast({
        title: 'Site Repository Configured!',
        description: `Official Google Drive folder linked to ${currentCampusName}. Auto-upload is now ready!`,
      });
      setQuickFolderLink('');
      if (pendingFileToUpload) {
        const fileToUpload = pendingFileToUpload;
        setPendingFileToUpload(null);
        await handleFileUpload(fileToUpload, folderUrl);
      }
    } catch (e: any) {
      toast({
        title: 'Error Saving Folder',
        description: e.message || 'Could not save campus folder.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingQuickFolder(false);
    }
  };

  const handleFileUpload = async (file: File, folderUrlOverride?: string) => {
    if (!file) return;

    const folderUrl = folderUrlOverride || activeCampusDriveFolderUrl;

    if (!folderUrl) {
      setPendingFileToUpload(file);
      toast({
        title: 'Campus Folder Needed',
        description: `Please paste the Google Drive folder link for ${currentCampusName} above to upload "${file.name}".`,
      });
      return;
    }

    const OLD_BROKEN_SCRIPT_ID = 'AKfycbzpfF8eVZdOKUkteR_yrnJYrQ-v2t9Gxye-EuXX6IaExDEJHmeBEcN18W0TnvJDstki0Q';
    const rawSettingUrl = globalSetting?.googleScriptWebhookUrl;
    const scriptUrl =
      rawSettingUrl && !rawSettingUrl.includes(OLD_BROKEN_SCRIPT_ID)
        ? rawSettingUrl
        : 'https://script.google.com/macros/s/AKfycbww5SZCg_SUIBP9x-gcuUlTmjiirEPuxgpUKdSYhv-_2j_7hBMPMyR2n7OvmraMfZIRuA/exec';

    setIsUploadingToDrive(true);
    setUploadProgress(`Uploading "${file.name}" to ${currentCampusName} Google Drive...`);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', folderUrl);
      formData.append('scriptUrl', scriptUrl);

      const cleanFileName = previewControlData.controlNum
        ? `${previewControlData.controlNum}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        : file.name;
      formData.append('fileName', cleanFileName);

      const response = await fetch('/api/upload-to-drive', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result || !result.success) {
        throw new Error(result?.error || 'Failed to upload document to campus Google Drive.');
      }

      const driveLink = result.webViewLink || result.fileUrl;
      form.setValue('googleDriveLink', driveLink, { shouldValidate: true });
      setUploadedFileDetails({
        fileName: result.fileName || file.name,
        fileUrl: driveLink,
        folderId: result.folderId,
      });
      setPendingFileToUpload(null);

      toast({
        title: 'Uploaded to Campus Drive!',
        description: `Document has been secured in the ${currentCampusName} Google Drive repository.`,
      });
    } catch (err: any) {
      console.error('File upload error:', err);
      toast({
        title: 'Upload Failed',
        description: err.message || 'Could not complete upload to Google Drive.',
        variant: 'destructive',
        duration: 12000,
      });
    } finally {
      setIsUploadingToDrive(false);
      setUploadProgress('');
    }
  };

  const handleLinkValidation = async (link: string) => {
    if (!link || !link.startsWith('https://drive.google.com/') || !z.string().url().safeParse(link).success) {
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
      if (!firestore || !targetUnitId || !targetCampusId) return;

      const q = query(
        collection(firestore, 'submissions'),
        where('unitId', '==', targetUnitId),
        where('campusId', '==', targetCampusId),
        where('reportType', '==', reportType),
        where('year', '==', year),
        where('cycleId', '==', cycleId),
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const existingData = querySnapshot.docs[0].data() as Submission;
        setExistingSubmission({ ...existingData, id: querySnapshot.docs[0].id });

        if (existingData.googleDriveLink && form.getValues('googleDriveLink') !== existingData.googleDriveLink) {
          form.setValue('googleDriveLink', existingData.googleDriveLink);
        }
        if (existingData.isDraft !== undefined) {
          form.setValue('isDraft', existingData.isDraft);
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
      } else {
        setExistingSubmission(null);
        setRiskRating(null);
        setOriginalSubmitter(null);
        form.reset({
          googleDriveLink: '',
          isDraft: false,
          comments: '',
          adminCampusId: targetCampusId,
          adminUnitId: targetUnitId,
        });
      }
    };
    fetchExistingSubmission();
  }, [firestore, targetUnitId, targetCampusId, reportType, year, cycleId, user, form]);

  useEffect(() => {
    const fetchFirstCycle = async () => {
      if (!firestore || !targetUnitId || !targetCampusId || cycleId !== 'final' || !isRorForm) return;
      setIsLoadingFirstCycle(true);
      try {
        const q = query(
          collection(firestore, 'submissions'),
          where('unitId', '==', targetUnitId),
          where('campusId', '==', targetCampusId),
          where('reportType', '==', reportType),
          where('year', '==', year),
          where('cycleId', '==', 'first'),
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setFirstCycleSubmission({ ...querySnapshot.docs[0].data(), id: querySnapshot.docs[0].id } as Submission);
        } else {
          setFirstCycleSubmission(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingFirstCycle(false);
      }
    };

    fetchFirstCycle();
  }, [firestore, targetUnitId, targetCampusId, reportType, year, cycleId, isRorForm]);

  const canUpdateExisting = useMemo(() => {
    if (!existingSubmission || !user || !userProfile || !userRole) return true;

    // Admins and Unit ODIMOs can always update/override
    if (isAdmin || userRole === 'Unit ODIMO') return true;

    // For Unit Coordinators, allow update if they are the original submitter
    // OR if they belong to the same unit (to allow finishing drafts)
    const isSameUnit = userProfile.unitId === existingSubmission.unitId;
    const isOwner = existingSubmission.userId === user.uid;

    if (userRole === 'Unit Coordinator' && (isOwner || isSameUnit)) return true;

    return false;
  }, [existingSubmission, user, userProfile, userRole, isAdmin]);

  const isSubmissionBlocked = useMemo(() => {
    if (!canUpdateExisting) return true;
    if (isRorForm) {
      if (!isDigitalComplete) return true;
      if (!isLoadingPreviousRisks && hasUnclosedPreviousRisks) return true;
      if (cycleId === 'final' && !isDraftValue) {
        if (isFirstCycleNotApproved) return true;
        if (isPostTreatmentIncomplete) return true;
        if (!isLoadingDigitalRisks && hasUnclosedCurrentRisks) return true;
      }
    }
    return false;
  }, [
    canUpdateExisting,
    isRorForm,
    isDigitalComplete,
    isLoadingPreviousRisks,
    hasUnclosedPreviousRisks,
    cycleId,
    isDraftValue,
    isFirstCycleNotApproved,
    isPostTreatmentIncomplete,
    isLoadingDigitalRisks,
    hasUnclosedCurrentRisks,
  ]);

  const isApprovedDraft = useMemo(() => {
    return !!(existingSubmission?.statusId === 'approved' && existingSubmission?.isDraft);
  }, [existingSubmission]);

  const onSubmit = async (values: z.infer<typeof submissionSchema>) => {
    if (!user || !firestore || !userProfile || !units || !campuses) {
      toast({ title: 'Error', description: 'Data is still loading.', variant: 'destructive' });
      return;
    }

    const unit = units.find((u) => u.id === targetUnitId);

    if (!unit) {
      toast({ title: 'Profile Error', description: 'Assigned unit could not be found.', variant: 'destructive' });
      return;
    }

    if (isRorForm && !isDigitalComplete) {
      toast({
        title: 'Registry Validation Block',
        description:
          'Both individual Risks AND Opportunities must be recorded in the digital register before document submission.',
        variant: 'destructive',
      });
      return;
    }

    if (isRorForm && cycleId === 'final' && !values.isDraft && isPostTreatmentIncomplete) {
      toast({
        title: 'Final Assessment Required',
        description:
          'All digital register entries must be updated with a post-treatment analysis before the final document can be submitted.',
        variant: 'destructive',
      });
      return;
    }

    if (isRorForm && cycleId === 'final' && !values.isDraft && hasUnclosedCurrentRisks) {
      toast({
        title: 'Unclosed Register Entries',
        description:
          'All digital register entries for the current year must be marked as Closed before the final document can be submitted.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const officialTime = await getOfficialServerTime();
    const phDate = new Date(officialTime.iso);

    const newComment: Comment | null = values.comments
      ? {
          text: values.comments,
          authorId: user.uid,
          authorName: userProfile.firstName + ' ' + userProfile.lastName,
          createdAt: new Date(),
          authorRole: userRole || 'User',
        }
      : null;

    let submissionSuccess = false;

    try {
      if (existingSubmission) {
        const newRevision = (existingSubmission.revision || 0) + 1;
        const newControlNumber = generateControlNumber(unit.name, newRevision, reportType, phDate);

        const existingDocRef = doc(firestore, 'submissions', existingSubmission.id);
        const updateData: any = {
          googleDriveLink: values.googleDriveLink,
          isDraft: values.isDraft,
          statusId: 'submitted',
          submissionDate: serverTimestamp(),
          unitName: unit.name,
          userId: user.uid,
          revision: newRevision,
          controlNumber: newControlNumber,
          campusId: targetCampusId,
          unitId: targetUnitId,
        };

        if (isRorForm) {
          updateData.riskRating = riskRating;
        }

        if (uploadedFileDetails) {
          updateData.siteDriveFolderId = uploadedFileDetails.folderId;
          updateData.uploadedFileName = uploadedFileDetails.fileName;
          updateData.uploadedViaSiteRepo = true;
        }

        if (newComment) {
          updateData.comments = arrayUnion(newComment);
        }

        await updateDoc(existingDocRef, updateData);
        logSessionActivity(`Updated unit submission (Rev ${newRevision}): ${reportType}`, {
          action: 'update_submission',
          details: { submissionId: existingDocRef.id, reportType, revision: newRevision, isDraft: values.isDraft },
        });
        toast({
          title: 'Submission Updated!',
          description: `Revision ${newRevision} ${values.isDraft ? '(Draft)' : '(Final)'} submitted for '${reportType}'. ${values.isDraft ? 'Complete all cycle requirements to have a chance to receive a Gold, Silver, or Bronze compliance star!' : 'You now have the chance to receive a Gold, Silver, or Bronze compliance star once verified!'}`,
        });
        submissionSuccess = true;
      } else {
        const initialRevision = 0;
        const initialControlNumber = generateControlNumber(unit.name, initialRevision, reportType, phDate);

        const newSubmissionData: any = {
          googleDriveLink: values.googleDriveLink,
          isDraft: values.isDraft,
          reportType,
          year,
          cycleId,
          userId: user.uid,
          campusId: targetCampusId,
          unitId: targetUnitId,
          unitName: unit.name,
          statusId: 'submitted',
          submissionDate: serverTimestamp(),
          comments: newComment ? [newComment] : [],
          revision: initialRevision,
          controlNumber: initialControlNumber,
        };

        if (isRorForm) {
          newSubmissionData.riskRating = riskRating;
        }

        if (uploadedFileDetails) {
          newSubmissionData.siteDriveFolderId = uploadedFileDetails.folderId;
          newSubmissionData.uploadedFileName = uploadedFileDetails.fileName;
          newSubmissionData.uploadedViaSiteRepo = true;
        }

        const docRef = await addDoc(collection(firestore, 'submissions'), newSubmissionData);
        logSessionActivity(`Created new unit submission (Rev 0): ${reportType}`, {
          action: 'create_submission',
          details: {
            submissionId: docRef.id,
            reportType,
            controlNumber: initialControlNumber,
            isDraft: values.isDraft,
          },
        });
        toast({
          title: 'Submission Successful!',
          description: `New ${values.isDraft ? 'draft' : 'report'} '${reportType}' submitted under Revision 0. ${values.isDraft ? 'Complete all cycle requirements to have a chance to receive a Gold, Silver, or Bronze compliance star!' : 'You now have the chance to receive a Gold, Silver, or Bronze compliance star once verified!'}`,
        });
        submissionSuccess = true;
      }

      setLastSubmittedLink(values.googleDriveLink);
    } catch (error) {
      console.error('Error during submission:', error);
      toast({ title: 'Error', description: 'Could not complete submission.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }

    if (submissionSuccess) {
      if (isRorForm && riskRating === 'medium-high') {
        setIsRiskDialogOpen(true);
      } else {
        if (onSuccess) onSuccess();
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

  const currentUnitName = useMemo(() => {
    if (!units || !targetUnitId) return '...';
    return units.find((u) => u.id === targetUnitId)?.name || '...';
  }, [units, targetUnitId]);

  const previewControlData = useMemo(() => {
    const rev = existingSubmission ? (existingSubmission.revision || 0) + 1 : 0;
    const controlNum = generateControlNumber(currentUnitName, rev, reportType, currentDate || new Date());
    return { rev, controlNum };
  }, [currentUnitName, existingSubmission, reportType, currentDate]);

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {!canUpdateExisting ||
            (originalSubmitter && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Submission Already Exists</AlertTitle>
                <AlertDescription>
                  This report was already submitted by{' '}
                  <strong>
                    {originalSubmitter.firstName} {originalSubmitter.lastName}
                  </strong>
                  . As a Unit Coordinator, you cannot overwrite their submission. Please contact them or your{' '}
                  <strong>Unit ODIMO</strong> if an update is needed.
                </AlertDescription>
              </Alert>
            ))}

          {isApprovedDraft && (
            <Alert className="bg-emerald-50 border-emerald-200 animate-in slide-in-from-top-2 duration-500 shadow-md">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <AlertTitle className="font-black uppercase tracking-tight text-emerald-800">
                Draft Content Cleared!
              </AlertTitle>
              <AlertDescription className="space-y-4 pt-1">
                <p className="text-xs font-bold leading-relaxed text-emerald-700">
                  Your preliminary draft for this report has been approved. You are now required to submit the **FINAL
                  OFFICIAL DOCUMENT** (Signed PDF) to complete the compliance cycle.
                </p>
                <div className="p-3 bg-white/80 rounded-lg border border-emerald-100 flex items-center gap-3">
                  <ArrowRight className="h-4 w-4 text-emerald-600 animate-pulse" />
                  <span className="text-[11px] font-black uppercase text-emerald-800">
                    Instructions: Select "Final (Official Filing)" below.
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Alert className="bg-primary/5 border-primary/20">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle className="text-xs font-black uppercase tracking-tight text-primary">
              Draft System Workflow
            </AlertTitle>
            <AlertDescription className="text-[10px] leading-relaxed font-medium">
              1. <strong>Draft Submission:</strong> Select "Draft" to share a raw Google Doc for content checking. No
              signatures are required.
              <br />
              2. <strong>Feedback Loop:</strong> Check comments and address recommendations in your source document.
              <br />
              3. <strong>Final Submission:</strong> Once cleared, secure signatures, save as PDF, and submit as "Final"
              to complete the Compliance Checklist.
            </AlertDescription>
          </Alert>

          {isRorForm && !isLoadingDigitalRisks && !isDigitalComplete && (
            <Alert
              variant="destructive"
              className="border-destructive/50 bg-destructive/5 animate-in slide-in-from-top-2 duration-500 shadow-lg overflow-hidden"
            >
              <ShieldAlert className="h-5 w-5 text-destructive animate-emergency-flash" />
              <AlertTitle className="font-black uppercase tracking-tight text-destructive animate-emergency-flash">
                Digital Registry Block
              </AlertTitle>
              <AlertDescription className="space-y-4 pt-1">
                <p className="text-xs font-bold leading-relaxed">
                  Institutional quality standards require individual **Risks AND Opportunities** to be encoded digitally
                  in the system BEFORE the formal document can be submitted for **AY {year}**.
                </p>
                <ul className="list-disc pl-5 text-xs font-bold space-y-1">
                  {!hasRisks && <li className="text-destructive">NO RISKS ENCODED</li>}
                  {!hasOpportunities && <li className="text-destructive">NO OPPORTUNITIES ENCODED</li>}
                </ul>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    asChild
                    className="w-full sm:w-auto h-9 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-destructive/20"
                  >
                    <Link href="/risk-register">Go to Risk Register Registry</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsHelpOpen(!isHelpOpen)}
                    className="w-full sm:w-auto h-9 font-black uppercase text-[10px] tracking-widest text-destructive hover:bg-destructive/10"
                  >
                    <HelpCircle className="h-4 w-4 mr-1.5" />
                    Need Help?
                    {isHelpOpen ? <ChevronUp className="ml-1.5 h-3 w-3" /> : <ChevronDown className="ml-1.5 h-3 w-3" />}
                  </Button>
                </div>

                <Collapsible open={isHelpOpen}>
                  <CollapsibleContent className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="mt-4 p-5 rounded-2xl border-2 border-destructive/20 bg-white space-y-4 shadow-inner">
                      <div className="flex items-center gap-2 text-destructive">
                        <ShieldCheck className="h-4 w-4" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest">
                          Protocol: Fulfilling Digital Registry
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex gap-3">
                            <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center text-[10px] font-black text-destructive shrink-0">
                              1
                            </div>
                            <div className="space-y-1">
                              <p className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">
                                Module Access
                              </p>
                              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic">
                                Open the <strong>Risk & Opportunity Registry</strong> from the main menu.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center text-[10px] font-black text-destructive shrink-0">
                              2
                            </div>
                            <div className="space-y-1">
                              <p className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">
                                Balanced Registry
                              </p>
                              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic">
                                Ensure at least one <strong>Risk</strong> and one <strong>Opportunity</strong> are
                                registered for your unit.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex gap-3">
                            <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center text-[10px] font-black text-destructive shrink-0">
                              3
                            </div>
                            <div className="space-y-1">
                              <p className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">
                                Baseline Analysis
                              </p>
                              <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic">
                                For each entry, populate <strong>Section #2 (Initial Baseline)</strong> to match your
                                ROR document exactly.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center text-[10px] font-black text-destructive shrink-0">
                              4
                            </div>
                            <div className="space-y-1">
                              <p className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200">
                                Final Validation
                              </p>
                              <p className="text-[10px] text-slate-900 dark:text-slate-100 leading-relaxed font-bold">
                                Return to this page to complete your document upload once the digital entries are
                                verified.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <div className="pt-2 border-t border-destructive/20 mt-2">
                  <p className="text-[9px] font-black uppercase text-destructive/70 tracking-widest">
                    Registry Search Context:
                  </p>
                  <p className="text-[9px] text-destructive/60 italic">
                    Unit ID: {targetUnitId} | Site ID: {targetCampusId} | Year: {year}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {isRorForm && !isLoadingPreviousRisks && hasUnclosedPreviousRisks && (
            <Alert
              variant="destructive"
              className="border-destructive/50 bg-destructive/5 animate-in slide-in-from-top-2 duration-500 shadow-lg overflow-hidden"
            >
              <ShieldAlert className="h-5 w-5 text-destructive animate-emergency-flash" />
              <AlertTitle className="font-black uppercase tracking-tight text-destructive animate-emergency-flash">
                Unclosed Previous Cycle Risks
              </AlertTitle>
              <AlertDescription className="space-y-4 pt-1">
                <p className="text-xs font-bold leading-relaxed">
                  Institutional quality standards require all Risks and Opportunities from the previous academic year
                  (**AY {year - 1}**) to be marked as **Closed** before you can submit a new registry for **AY {year}**.
                </p>
                <div className="p-3 bg-white/95 rounded-lg border border-destructive/20 max-w-xl">
                  <p className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    Unclosed Register Entries ({unclosedPreviousRisks.length}):
                  </p>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-2">
                    {unclosedPreviousRisks.map((r) => (
                      <div
                        key={r.id}
                        className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-destructive/5 p-2 rounded border border-destructive/10 flex items-start justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <Badge
                            variant="outline"
                            className="text-[8px] font-black tracking-widest uppercase bg-white py-0 h-4 border-destructive/30 text-destructive mb-1"
                          >
                            {r.type}
                          </Badge>
                          <p className="line-clamp-2 text-slate-800 dark:text-slate-200 font-medium italic mt-0.5">
                            "{r.description}"
                          </p>
                        </div>
                        <Badge className="h-4 text-[9px] font-black shrink-0 bg-amber-500 hover:bg-amber-600 border-none text-white">
                          {r.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    asChild
                    className="h-9 px-4 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-destructive/20"
                  >
                    <Link href={`/risk-register?year=${year - 1}`}>Manage AY {year - 1} Risks</Link>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {isRorForm && cycleId === 'final' && !isDraftValue && !isLoadingFirstCycle && isFirstCycleNotApproved && (
            <Alert
              variant="destructive"
              className="border-amber-300 bg-amber-50 animate-in zoom-in duration-500 shadow-md"
            >
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              <AlertTitle className="font-black uppercase text-amber-800 tracking-tight">
                First Cycle Submission Pending Approval
              </AlertTitle>
              <AlertDescription className="space-y-4 pt-1">
                <p className="text-xs font-bold leading-relaxed text-amber-700">
                  The Final Submission for the Risk Registry is <strong>BLOCKED</strong> because the First Cycle
                  submission for **AY {year}** has not been approved by the Quality Assurance Admin yet.
                </p>
                <p className="text-[10px] font-medium italic text-amber-600">
                  Status: {firstCycleSubmission ? `Submitted (Awaiting Approval)` : 'No First Cycle Submission Found'}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {isRorForm && cycleId === 'final' && !isDraftValue && !isLoadingDigitalRisks && isPostTreatmentIncomplete && (
            <Alert
              variant="destructive"
              className="border-rose-300 bg-rose-50 animate-in zoom-in duration-500 shadow-md"
            >
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              <AlertTitle className="font-black uppercase text-rose-800 tracking-tight">
                Final Assessment Audit Gap
              </AlertTitle>
              <AlertDescription className="space-y-4 pt-1">
                <p className="text-xs font-bold leading-relaxed text-rose-700">
                  The Final Submission for the Risk Registry is <strong>BLOCKED</strong> because one or more entries in
                  your digital register are missing their residual impact analysis.
                </p>
                <p className="text-[10px] font-medium italic text-rose-600">
                  System detection: All entries in your digital register must have post-treatment likelihood,
                  consequence, and evidence logged for {year}.
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  asChild
                  className="h-9 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-200"
                >
                  <Link href="/risk-register?highlightSection=4" className="flex items-center gap-2">
                    Complete Digital Updates Now <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isRorForm && cycleId === 'final' && !isDraftValue && !isLoadingDigitalRisks && hasUnclosedCurrentRisks && (
            <Alert
              variant="destructive"
              className="border-rose-300 bg-rose-50 animate-in zoom-in duration-500 shadow-md"
            >
              <ShieldAlert className="h-5 w-5 text-rose-600" />
              <AlertTitle className="font-black uppercase text-rose-800 tracking-tight">
                Unclosed Current Cycle Risks
              </AlertTitle>
              <AlertDescription className="space-y-4 pt-1">
                <p className="text-xs font-bold leading-relaxed text-rose-700">
                  The Final Submission for the Risk Registry is <strong>BLOCKED</strong> because one or more entries in
                  your digital register for the current year (<strong>AY {year}</strong>) are not marked as{' '}
                  <strong>Closed</strong>.
                </p>
                <div className="p-3 bg-white/95 rounded-lg border border-destructive/20 max-w-xl">
                  <p className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    Unclosed Register Entries ({unclosedCurrentRisks.length}):
                  </p>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-2">
                    {unclosedCurrentRisks.map((r) => (
                      <div
                        key={r.id}
                        className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-destructive/5 p-2 rounded border border-destructive/10 flex items-start justify-between gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <Badge
                            variant="outline"
                            className="text-[8px] font-black tracking-widest uppercase bg-white py-0 h-4 border-destructive/30 text-destructive mb-1"
                          >
                            {r.type}
                          </Badge>
                          <p className="line-clamp-2 text-slate-800 dark:text-slate-200 font-medium italic mt-0.5">
                            "{r.description}"
                          </p>
                        </div>
                        <Badge className="h-4 text-[9px] font-black shrink-0 bg-amber-500 hover:bg-amber-600 border-none text-white">
                          {r.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  asChild
                  className="h-9 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-200"
                >
                  <Link href="/risk-register" className="flex items-center gap-2">
                    Close Digital Register Entries <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-muted p-4 rounded-lg flex flex-col gap-2 border border-primary/20">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm font-bold uppercase tracking-wider">Document Control Information</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
                  Upcoming Control No.
                </p>
                <p className="font-mono text-xs mt-1 bg-background/50 p-2 rounded border">
                  {previewControlData.controlNum}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
                  Upcoming Revision
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    Rev {String(previewControlData.rev).padStart(2, '0')}
                  </Badge>
                  {existingSubmission && (
                    <span className="text-[10px] text-destructive font-medium animate-pulse">(Auto-Incremented)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="isDraft"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-primary">
                    Submission Type
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(v) => field.onChange(v === 'true')}
                      value={field.value ? 'true' : 'false'}
                      className="flex flex-col sm:flex-row gap-4"
                      disabled={
                        !canUpdateExisting ||
                        (isRorForm && !isDigitalComplete) ||
                        (isRorForm && !isLoadingPreviousRisks && hasUnclosedPreviousRisks)
                      }
                    >
                      <div
                        className={cn(
                          'flex items-center space-x-2 border p-4 rounded-xl cursor-pointer hover:bg-muted/50',
                          field.value && 'bg-blue-50 border-blue-200 shadow-sm',
                        )}
                      >
                        <RadioGroupItem value="true" id="is-draft" />
                        <Label htmlFor="is-draft" className="flex-1 cursor-pointer">
                          <p className="text-sm font-bold flex items-center gap-2">
                            <LayoutList className="h-4 w-4 text-blue-600" /> Draft (Content Check)
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            For preliminary review. Mandatory updates are bypassed.
                          </p>
                        </Label>
                      </div>
                      <div
                        className={cn(
                          'flex items-center space-x-2 border p-4 rounded-xl cursor-pointer hover:bg-muted/50',
                          !field.value && 'bg-green-50 border-green-200 shadow-sm',
                          !field.value &&
                            isRorForm &&
                            cycleId === 'final' &&
                            isPostTreatmentIncomplete &&
                            'border-destructive/30 bg-rose-50/10',
                        )}
                      >
                        <RadioGroupItem value="false" id="is-final" />
                        <Label htmlFor="is-final" className="flex-1 cursor-pointer">
                          <p className="text-sm font-bold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-green-600" /> Final (Official Filing)
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Signed, scanned PDF. Full compliance checklist active.
                          </p>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="rounded-xl border border-primary/20 bg-muted/20 p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Folder className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-primary">
                      Site Repository: {currentCampusName} Google Drive
                    </span>
                    {activeCampusDriveFolderUrl ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[9px] uppercase tracking-wider"
                      >
                        Connected
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-[9px] uppercase tracking-wider"
                      >
                        Needs Folder Link
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Documents submitted by your unit are permanently archived in the official {currentCampusName} Google
                    Drive repository.
                  </p>
                </div>
              </div>
              {activeCampusDriveFolderUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-7 text-[10px] font-bold text-primary hover:bg-primary/10"
                >
                  <a href={activeCampusDriveFolderUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open Site Drive
                  </a>
                </Button>
              )}
            </div>

            {/* Quick config banner if activeCampusDriveFolderUrl is missing */}
            {!activeCampusDriveFolderUrl && (
              <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-xs font-bold">Set Google Drive Folder for {currentCampusName}</span>
                  </div>
                  <span className="text-[10px] text-amber-700/80 font-medium">One-time Site Setup</span>
                </div>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-tight">
                  Paste the Google Drive folder link for <strong>{currentCampusName}</strong> below. All unit
                  submissions under this site will automatically upload to this folder.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Input
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={quickFolderLink}
                    onChange={(e) => setQuickFolderLink(e.target.value)}
                    className="h-8 text-xs bg-white dark:bg-slate-900 font-mono"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSaveQuickFolder()}
                    disabled={isSavingQuickFolder || !quickFolderLink.trim()}
                    className="h-8 text-xs font-bold shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {isSavingQuickFolder ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Folder className="h-3 w-3 mr-1" />
                    )}
                    Save &amp; Enable Repository
                  </Button>
                </div>
              </div>
            )}

            {/* Always-visible Dropzone */}
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isSubmissionBlocked && !isUploadingToDrive) setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  if (isSubmissionBlocked || isUploadingToDrive) return;
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                onClick={() => {
                  if (!isSubmissionBlocked && !isUploadingToDrive) {
                    fileInputRef.current?.click();
                  }
                }}
                className={cn(
                  'border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer select-none',
                  isDraggingFile
                    ? 'border-primary bg-primary/10 scale-[1.01]'
                    : 'border-primary/30 hover:border-primary hover:bg-primary/5',
                  (isSubmissionBlocked || isUploadingToDrive) && 'opacity-70 cursor-not-allowed',
                  googleDriveLinkValue
                    ? 'bg-emerald-50/40 border-emerald-300 dark:bg-emerald-950/20'
                    : 'bg-white/60 dark:bg-slate-900/40',
                )}
              >
                {isUploadingToDrive ? (
                  <div className="py-3 space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-xs font-black uppercase tracking-wider text-primary">{uploadProgress}</p>
                    <p className="text-[10px] text-muted-foreground animate-pulse">
                      Uploading document directly into {currentCampusName} Google Drive folder...
                    </p>
                  </div>
                ) : googleDriveLinkValue ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FileCheck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {uploadedFileDetails?.fileName || 'Official Document Attached'}
                          </p>
                          <Badge className="bg-emerald-600 text-white text-[9px] font-black h-4 px-1.5 uppercase shrink-0">
                            Secured in Drive
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate max-w-md">
                          Drive Link: {googleDriveLinkValue}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSubmissionBlocked}
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="shrink-0 text-xs font-bold h-8"
                    >
                      <RefreshCw className="h-3 w-3 mr-1.5" />
                      Replace File
                    </Button>
                  </div>
                ) : pendingFileToUpload ? (
                  <div className="py-2 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                      <Paperclip className="h-3.5 w-3.5" />
                      Selected: {pendingFileToUpload.name}
                    </div>
                    <p className="text-xs text-amber-700 font-semibold">
                      Paste the Google Drive folder link above and click "Save &amp; Enable Repository" to complete
                      uploading this file.
                    </p>
                  </div>
                ) : (
                  <div className="py-2 space-y-1">
                    <UploadCloud className="h-10 w-10 text-primary/70 animate-bounce mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Drag &amp; drop your signed PDF here, or{' '}
                      <span className="text-primary underline">browse file</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Accepted: Official PDF (Max 25MB) • Auto-uploaded directly to {currentCampusName} Google Drive
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center px-1">
                <button
                  type="button"
                  onClick={() => setIsManualLinkMode(!isManualLinkMode)}
                  className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  {isManualLinkMode
                    ? '▲ Hide manual Google Drive link'
                    : '▼ Need to manually paste or inspect Google Drive link?'}
                </button>
                {googleDriveLinkValue && (
                  <a
                    href={googleDriveLinkValue}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View in Drive
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Collapsible Manual Google Drive Link field */}
          {isManualLinkMode && (
            <FormField
              control={form.control}
              name="googleDriveLink"
              render={({ field, fieldState }) => (
                <FormItem className="rounded-xl border p-4 bg-muted/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Google Drive Link (Manual / Fallback)
                    </FormLabel>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Auto-populated when file is uploaded
                    </span>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input placeholder="https://drive.google.com/..." {...field} disabled={isSubmissionBlocked} />
                      <div className="absolute inset-y-0 right-3 flex items-center">{renderValidationIcon()}</div>
                    </div>
                  </FormControl>
                  {!fieldState.error && (
                    <FormDescription className="flex items-center gap-1">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="link" className="p-0 h-auto text-xs animate-pulse font-bold text-primary">
                            <HelpCircle className="mr-1 h-3 w-3" />
                            How to get the correct link?
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-md border-primary/20 shadow-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>How to Get Your Google Drive File Link</AlertDialogTitle>
                            <AlertDialogDescription>
                              Follow these steps to ensure your file is shared correctly for submission.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <ScrollArea className="max-h-[400px] pr-4">
                            <ol className="list-decimal space-y-4 pl-5 text-sm text-muted-foreground py-2">
                              <li>Open your file in Google Drive.</li>
                              <li>
                                Click the blue <strong>"Share"</strong> button in the top right corner.
                              </li>
                              <li>
                                In the popup window, find the <strong>"General access"</strong> section. If it says
                                "Restricted", click on it.
                              </li>
                              <li>
                                Select <strong>"Anyone with the link"</strong> from the dropdown menu. This is critical
                                for the Quality Assurance Office to be able to view your file.
                              </li>
                              <li>
                                To the right of "Anyone with the link", ensure the role is set to{' '}
                                <strong>"Viewer"</strong>.
                              </li>
                              <li>
                                Finally, click the <strong>"Copy link"</strong> button. The link is now copied to your
                                clipboard.
                              </li>
                              <li>Paste the copied link into the "Google Drive Link" field in the submission form.</li>
                            </ol>
                          </ScrollArea>
                          <AlertDialogFooter className="border-t pt-4">
                            <AlertDialogAction className="bg-primary font-black uppercase text-[10px] tracking-widest px-10">
                              Got it!
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Live File Preview (Compact when empty, expands to iframe when previewUrl is present) */}
          {previewUrl ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3 w-3 text-primary" />
                  Live Document Preview
                </span>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open Preview in New Tab
                </a>
              </div>
              <div className="aspect-video w-full rounded-xl border bg-muted shadow-sm overflow-hidden">
                <iframe src={previewUrl} className="h-full w-full" allow="autoplay" title="File Preview" />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-center text-muted-foreground flex items-center justify-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Document Preview</p>
                <p className="text-[10px] text-muted-foreground">
                  A live preview of your uploaded PDF will appear here automatically.
                </p>
              </div>
            </div>
          )}
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
                    disabled={isSubmissionBlocked}
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
                  onValueChange={(value: string) => setRiskRating(value as RiskRating)}
                  value={riskRating ?? ''}
                  className="flex items-center space-x-4"
                  disabled={isSubmissionBlocked}
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="low" />
                    </FormControl>
                    <Label className="font-normal">Low</Label>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="medium-high" />
                    </FormControl>
                    <Label className="font-normal">Medium / High</Label>
                  </FormItem>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {!isDraftValue ? (
            <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" /> Final Compliance Checklist
                </CardTitle>
                <CardDescription className="text-xs">
                  Please confirm the following institutional requirements before submitting the final signed record.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start space-x-3 p-2 rounded hover:bg-muted/30 transition-colors"
                  >
                    <Checkbox
                      id={`${reportType}-${item.id}`}
                      checked={checkedState[item.id] || false}
                      onCheckedChange={() => handleCheckboxChange(item.id)}
                      disabled={isSubmissionBlocked}
                    />
                    <Label
                      htmlFor={`${reportType}-${item.id}`}
                      className="text-sm font-normal leading-tight cursor-pointer"
                    >
                      {item.label}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-blue-200 bg-blue-50/20 animate-in fade-in slide-in-from-top-2 duration-500">
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-black uppercase tracking-tight text-blue-800 flex items-center gap-2">
                  <LayoutList className="h-4 w-4" />
                  Draft Review Mode Active
                </CardTitle>
                <CardDescription className="text-[10px] font-bold text-blue-700/70 uppercase tracking-widest">
                  Checklist is bypassed. Focus purely on content checking.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <Button
            type="submit"
            className={cn('w-full shadow-lg', isDraftValue ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : '')}
            disabled={
              isSubmitting ||
              validationStatus === 'validating' ||
              validationStatus === 'invalid' ||
              !isChecklistComplete ||
              isSubmissionBlocked
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : existingSubmission ? (
              `Submit Revision ${String((existingSubmission.revision || 0) + 1).padStart(2, '0')} ${isDraftValue ? '(Draft)' : ''}`
            ) : (
              `Submit Revision 00 ${isDraftValue ? '(Draft)' : ''}`
            )}
          </Button>
        </form>
      </Form>
      <AlertDialog open={isRiskDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mandatory Step: Digital Registry Update</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-2">
              <p className="text-sm font-medium leading-relaxed">
                Because your unit has identified <strong>Medium or High-rated factors</strong> for the Academic Year{' '}
                <strong>{year}</strong>, you must now ensure all individual entries are accurately encoded in the
                official digital register.
              </p>
              <p className="text-xs text-muted-foreground italic">
                "The digital database must maintain a 1:1 parity with your submitted PDF document to satisfy ISO
                21001:2018 traceability requirements."
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() =>
                router.push(
                  `/risk-register?openForm=true&mandatory=true&year=${year}&link=${encodeURIComponent(lastSubmittedLink)}&unitId=${targetUnitId}&campusId=${targetCampusId}`,
                )
              }
            >
              Continue to AY {year} Digital Register
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
