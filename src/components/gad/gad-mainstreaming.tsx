'use client';

import { useState, useMemo, useEffect } from 'react';
import type {
  Unit,
  Campus,
  GADMainstreamingChecklist,
  Signatories,
  GadSettings,
  CMOSubmission,
  CMOSubmissionItem,
  CMOMovRecord,
  CMOValidatorAssessment,
  CMOResponseValue,
  CMOMovType,
  CMOValidatorSeat,
  CMOSubmissionStatus,
  QualityObjectiveItem,
} from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  Target,
  Info,
  History,
  Loader2,
  Printer,
  FileText,
  FileBarChart,
  Plus,
  ExternalLink,
  Eye,
  Trash2,
  AlertTriangle,
  Award,
  Scale,
  BookOpen,
  Microscope,
  Handshake,
  Sparkles,
  Check,
  Lock,
  Send,
  UserCheck,
  Link2,
} from 'lucide-react';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp, collection, query, where } from '@/firebase/firestore-wrapper';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { renderToStaticMarkup } from 'react-dom/server';
import { GADUnitMainstreamingReportTemplate, GADInstitutionalMainstreamingReportTemplate } from './gad-print-templates';
import {
  CMO_2015_INDICATORS,
  CMO_VALIDATOR_SEATS,
  calculateCmoItemScore,
  computeCmoSubmissionTotals,
} from '@/lib/cmo-2015-indicators';

interface GADMainstreamingProps {
  units: Unit[];
  selectedYear: number;
}

export const CMO_2015_MAINSTREAMING_CRITERIA = [
  // 1. Policy & Governance (Art. V & VI)
  {
    id: 'policy-1',
    category: 'Policy & Governance',
    cmoRef: 'CMO 1 s. 2015 Art. V',
    label: 'GAD Focal Point System (GFPS) / designated unit coordinators are active with defined terms of reference.',
  },
  {
    id: 'policy-2',
    category: 'Policy & Governance',
    cmoRef: 'CMO 1 s. 2015 Art. VI',
    label:
      'Gender-responsive unit policies and gender-fair language standards are formally implemented and communicated.',
  },
  {
    id: 'policy-3',
    category: 'Policy & Governance',
    cmoRef: 'CMO 1 s. 2015 Art. VI (CODI)',
    label:
      'Functional Committee on Decorum and Investigation (CODI) or referral mechanism against sexual harassment (RA 7877 / RA 11313).',
  },

  // 2. Instruction & Curriculum (Art. VII Sec. A)
  {
    id: 'instruction-1',
    category: 'Instruction & Curriculum',
    cmoRef: 'CMO 1 s. 2015 Art. VII.A',
    label:
      'Curricula, syllabi, and instructional materials undergo gender-sensitivity review to eliminate sexist stereotypes.',
  },
  {
    id: 'instruction-2',
    category: 'Instruction & Curriculum',
    cmoRef: 'CMO 1 s. 2015 Art. VII.A',
    label: 'Integration of gender equality, human rights, and women empowerment concepts into academic course modules.',
  },

  // 3. Research & Extension (Art. VII Sec. B & C)
  {
    id: 'research-1',
    category: 'Research & Extension',
    cmoRef: 'CMO 1 s. 2015 Art. VII.B',
    label: 'Production and dissemination of gender-focused or sex-differentiated research studies.',
  },
  {
    id: 'extension-1',
    category: 'Research & Extension',
    cmoRef: 'CMO 1 s. 2015 Art. VII.C',
    label:
      'Community extension programs designed to address gender issues of marginalized sectors (solo parents, PWDs, IP, women).',
  },

  // 4. Enabling Facilities & Work-Life Support (Art. VIII)
  {
    id: 'facility-1',
    category: 'Enabling Facilities',
    cmoRef: 'CMO 1 s. 2015 Art. VIII & RA 10028',
    label: 'Presence of functional lactation stations, child-minding areas, or gender-responsive restrooms.',
  },
  {
    id: 'facility-2',
    category: 'Enabling Facilities',
    cmoRef: 'CMO 1 s. 2015 Art. VIII',
    label: 'Safe, well-lit, and accessible physical environment adhering to gender-sensitive campus safety guidelines.',
  },

  // 5. Sex-Disaggregated Data & Budgeting (Art. IX & X)
  {
    id: 'data-1',
    category: 'SDD & Planning',
    cmoRef: 'CMO 1 s. 2015 Art. IX',
    label:
      'Active collection, maintenance, and analysis of Sex-Disaggregated Data (SDD) in student and personnel registries.',
  },
  {
    id: 'data-2',
    category: 'SDD & Planning',
    cmoRef: 'CMO 1 s. 2015 Art. X',
    label:
      'Annual GAD Plan and Budget (GPB) is formulated with at least 5% budget allocation and verified against the SDD baseline.',
  },
];

function getDrivePreviewUrl(url: string): string {
  if (!url) return '';
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return url;
}

export function GADMainstreaming({ units, selectedYear }: GADMainstreamingProps) {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const gadSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'gadSettings') : null),
    [firestore],
  );
  const { data: gadSettings } = useDoc<GadSettings>(gadSettingsRef);

  const isGadCoordinator = !!(
    userProfile?.unitId &&
    gadSettings?.leadershipUnitId &&
    userProfile.unitId === gadSettings.leadershipUnitId
  );

  const isLeadership =
    isAdmin ||
    isGadCoordinator ||
    userRole === 'Auditor' ||
    userRole?.toLowerCase().includes('vice president') ||
    userRole === 'Campus Director' ||
    userRole === 'Campus ODIMO';

  const canValidate = isAdmin || isGadCoordinator || userRole === 'Auditor';

  const [selectedUnitId, setSelectedUnitId] = useState<string>(userProfile?.unitId || '');
  const [activeView, setActiveView] = useState<'cmo-20-rubric' | 'enabling-checklist'>('cmo-20-rubric');
  const [sectionFilter, setSectionFilter] = useState<
    'ALL' | 'CURRICULUM' | 'RESEARCH' | 'EXTENSION' | 'EOMS_SYNCED' | 'MISSING_MOV'
  >('ALL');
  const [isSaving, setIsSaving] = useState(false);

  // MOV Attachment Modal State
  const [movModalIndicatorId, setMovModalIndicatorId] = useState<number | null>(null);
  const [movType, setMovType] = useState<CMOMovType>('PRIMARY');
  const [movCategory, setMovCategory] = useState('');
  const [movFileName, setMovFileName] = useState('');
  const [movFileUrl, setMovFileUrl] = useState('');
  const [selectedEomsQomId, setSelectedEomsQomId] = useState<string>('none');

  // Document Preview Modal State
  const [previewMov, setPreviewMov] = useState<CMOMovRecord | null>(null);

  // Validator Drawer State
  const [openValidatorItem, setOpenValidatorItem] = useState<number | null>(null);
  const [activeValidatorSeat, setActiveValidatorSeat] = useState<CMOValidatorSeat>('PDPMED_1');
  const [validatorResponse, setValidatorResponse] = useState<CMOResponseValue>('YES');
  const [validatorRemarks, setValidatorRemarks] = useState<string>('');
  const [isSavingValidation, setIsSavingValidation] = useState(false);

  const visibleUnits = useMemo(() => {
    if (isAdmin || isGadCoordinator || userRole === 'Auditor') return units;
    if (userRole === 'Campus Director' || userRole === 'Campus ODIMO') {
      return units.filter((u) => u.campusIds?.includes(userProfile?.campusId || ''));
    }
    return units.filter((u) => u.id === userProfile?.unitId);
  }, [units, isAdmin, isGadCoordinator, userRole, userProfile]);

  useEffect(() => {
    if (!selectedUnitId && visibleUnits.length > 0) {
      setSelectedUnitId(userProfile?.unitId || visibleUnits[0].id);
    }
  }, [visibleUnits, userProfile, selectedUnitId]);

  const selectedUnitObj = useMemo(() => units.find((u) => u.id === selectedUnitId), [units, selectedUnitId]);

  // 1. Legacy 11-Item Enabling Mechanisms Checklist (`gadMainstreaming`)
  const checklistId = `${selectedUnitId}-${selectedYear}`;
  const checklistRef = useMemoFirebase(
    () => (firestore && selectedUnitId ? doc(firestore, 'gadMainstreaming', checklistId) : null),
    [firestore, selectedUnitId, checklistId],
  );
  const { data: checklist, isLoading: isLoadingChecklist } = useDoc<GADMainstreamingChecklist>(checklistRef);

  const allChecklistsQuery = useMemoFirebase(
    () =>
      firestore && isLeadership
        ? query(collection(firestore, 'gadMainstreaming'), where('year', '==', selectedYear))
        : null,
    [firestore, isLeadership, selectedYear],
  );
  const { data: allChecklists } = useCollection<GADMainstreamingChecklist>(allChecklistsQuery);

  // 2. CMO No. 1, s. 2015 20-Item Submission (`cmoSubmissions/${unitId}_${year}`)
  const submissionId = `${selectedUnitId}_${selectedYear}`;
  const submissionRef = useMemoFirebase(
    () => (firestore && selectedUnitId ? doc(firestore, 'cmoSubmissions', submissionId) : null),
    [firestore, selectedUnitId, submissionId],
  );
  const { data: cmoSubmission, isLoading: isLoadingSubmission } = useDoc<CMOSubmission>(submissionRef);

  // 3. Validator Assessments for this unit & year (`cmoValidatorAssessments`)
  const validatorAssessmentsQuery = useMemoFirebase(
    () =>
      firestore && selectedUnitId
        ? query(collection(firestore, 'cmoValidatorAssessments'), where('submissionId', '==', submissionId))
        : null,
    [firestore, selectedUnitId, submissionId],
  );
  const { data: validatorAssessments } = useCollection<CMOValidatorAssessment>(validatorAssessmentsQuery);

  // 4. Unit EOMS Action Plans with GAD Component (`qualityObjectives`) for quick MOV linking
  const unitEomsGadQuery = useMemoFirebase(
    () =>
      firestore && selectedUnitId
        ? query(
            collection(firestore, 'qualityObjectives'),
            where('unitId', '==', selectedUnitId),
            where('year', '==', selectedYear),
          )
        : null,
    [firestore, selectedUnitId, selectedYear],
  );
  const { data: unitQomItems } = useCollection<QualityObjectiveItem>(unitEomsGadQuery);

  const gadTaggedEomsItems = useMemo(() => {
    return (unitQomItems || []).filter((item) => item.hasGadComponent);
  }, [unitQomItems]);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const signatoriesRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore],
  );
  const { data: signatories } = useDoc<Signatories>(signatoriesRef);

  // Local state for 20-Item CMO Rubric
  const [itemsState, setItemsState] = useState<Record<number, CMOSubmissionItem>>({});
  const [movsList, setMovsList] = useState<CMOMovRecord[]>([]);

  useEffect(() => {
    if (cmoSubmission) {
      setItemsState(cmoSubmission.items || {});
      setMovsList(cmoSubmission.movs || []);
    } else {
      setItemsState({});
      setMovsList([]);
    }
  }, [cmoSubmission, selectedUnitId, selectedYear]);

  // Computed CMO 1 s. 2015 Totals (Raw /20, Compliance %, 40% EOMS Weight)
  const cmoTotals = useMemo(() => computeCmoSubmissionTotals(itemsState), [itemsState]);

  const submissionStatus: CMOSubmissionStatus = cmoSubmission?.status || 'DRAFT';
  const isLockedForFocal = submissionStatus !== 'DRAFT' && !canValidate;

  // Enabling checklist state
  const [localScores, setLocalScores] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (checklist?.scores) {
      setLocalScores(checklist.scores);
    } else {
      setLocalScores({});
    }
  }, [checklist]);

  const handleToggleCriterion = (id: string) => {
    setLocalScores((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveEnablingChecklist = async () => {
    if (!firestore || !selectedUnitId) return;
    setIsSaving(true);
    try {
      await setDoc(
        doc(firestore, 'gadMainstreaming', checklistId),
        {
          id: checklistId,
          unitId: selectedUnitId,
          year: selectedYear,
          scores: localScores,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      toast({ title: 'Checklist Saved', description: 'Enabling Mechanisms compliance matrix updated.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save assessment.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Handlers for 20-Descriptor CMO No. 1, s. 2015 Rubric ---
  const handleSelectItemResponse = (indicatorId: number, response: CMOResponseValue) => {
    if (isLockedForFocal) return;
    const score = calculateCmoItemScore(indicatorId, response);
    setItemsState((prev) => ({
      ...prev,
      [indicatorId]: {
        ...(prev[indicatorId] || { indicatorId }),
        indicatorId,
        selfResponse: response,
        selfScore: score,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const handleToggleItem8Sub = (subCode: '8a' | '8b') => {
    if (isLockedForFocal) return;
    setItemsState((prev) => {
      const current = prev[8] || { indicatorId: 8, selfScore: 0, subResponses: {} };
      const subs = { ...(current.subResponses || {}), [subCode]: !current.subResponses?.[subCode] };
      const countTrue = (subs['8a'] ? 1 : 0) + (subs['8b'] ? 1 : 0);
      const selfResponse: CMOResponseValue = countTrue === 2 ? 'YES' : countTrue === 1 ? 'PARTIAL' : 'NO';
      const selfScore = calculateCmoItemScore(8, selfResponse);
      return {
        ...prev,
        8: {
          ...current,
          subResponses: subs,
          selfResponse,
          selfScore,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const handleRemarksChange = (indicatorId: number, remarks: string) => {
    if (isLockedForFocal) return;
    setItemsState((prev) => ({
      ...prev,
      [indicatorId]: {
        ...(prev[indicatorId] || { indicatorId, selfScore: 0 }),
        selfRemarks: remarks,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const persistCmoSubmission = async (
    nextItems: Record<number, CMOSubmissionItem>,
    nextMovs: CMOMovRecord[],
    nextStatus: CMOSubmissionStatus = submissionStatus,
  ) => {
    if (!firestore || !selectedUnitId) return;
    setIsSaving(true);
    try {
      const totals = computeCmoSubmissionTotals(nextItems);
      const payload: Partial<CMOSubmission> = {
        id: submissionId,
        unitId: selectedUnitId,
        unitName: selectedUnitObj?.name || '',
        campusId: selectedUnitObj?.campusIds?.[0] || userProfile?.campusId || '',
        year: selectedYear,
        status: nextStatus,
        items: nextItems,
        movs: nextMovs,
        ...totals,
        updatedAt: serverTimestamp(),
      };
      if (nextStatus === 'SUBMITTED' && submissionStatus === 'DRAFT') {
        payload.submittedBy = userProfile?.id || '';
        payload.submittedByName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim();
        payload.submittedAt = serverTimestamp();
      }
      if (nextStatus === 'FINALIZED') {
        payload.finalizedBy = userProfile?.id || '';
        payload.finalizedByName = `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim();
        payload.finalizedAt = serverTimestamp();
      }
      await setDoc(doc(firestore, 'cmoSubmissions', submissionId), payload, { merge: true });
      toast({
        title: 'CMO No. 1, s. 2015 Assessment Saved',
        description: `Raw Score: ${totals.rawScoreSelf.toFixed(2)}/20.00 • EOMS Weighted (40%): ${totals.weightedScoreSelf.toFixed(2)}%`,
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Could not save CMO No. 1, s. 2015 assessment.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitForValidation = async () => {
    // Hard Guardrail per docs/GAD.md: Any item scored PARTIAL or YES must have at least 1 PRIMARY MOV attached
    const missingPrimaryMovItems: string[] = [];
    for (const ind of CMO_2015_INDICATORS) {
      const item = itemsState[ind.id];
      if (item?.selfResponse === 'PARTIAL' || item?.selfResponse === 'YES') {
        const primaryMovs = movsList.filter((m) => m.indicatorId === ind.id && m.movType === 'PRIMARY');
        if (primaryMovs.length === 0) {
          missingPrimaryMovItems.push(`#${ind.itemCode} (${ind.title})`);
        }
      }
    }

    if (missingPrimaryMovItems.length > 0) {
      toast({
        title: 'Primary MOV Required Before Submission',
        description: `CMO No. 1, s. 2015 requires at least 1 Primary MOV for every PARTIAL or YES claim. Missing on: ${missingPrimaryMovItems.slice(0, 3).join(', ')}${missingPrimaryMovItems.length > 3 ? ` (+${missingPrimaryMovItems.length - 3} more)` : ''}.`,
        variant: 'destructive',
      });
      return;
    }

    await persistCmoSubmission(itemsState, movsList, 'SUBMITTED');
  };

  const handleOpenMovModal = (indicatorId: number) => {
    const ind = CMO_2015_INDICATORS.find((i) => i.id === indicatorId);
    setMovModalIndicatorId(indicatorId);
    setMovType('PRIMARY');
    setMovCategory(ind?.primaryMovRequirements?.[0] || 'Official Means of Verification');
    setMovFileName('');
    setMovFileUrl('');
    setSelectedEomsQomId('none');
  };

  const handleAddMovRecord = async () => {
    if (!movModalIndicatorId || !selectedUnitId || !firestore) return;
    if (!movFileUrl.trim() || !movFileName.trim()) {
      toast({
        title: 'Missing Details',
        description: 'Please provide both a document title and a valid Google Drive / Cloud link.',
        variant: 'destructive',
      });
      return;
    }

    const movId = `mov_${selectedUnitId}_${selectedYear}_ind${movModalIndicatorId}_${Date.now()}`;
    const newMov: CMOMovRecord = {
      id: movId,
      submissionId,
      indicatorId: movModalIndicatorId,
      unitId: selectedUnitId,
      campusId: selectedUnitObj?.campusIds?.[0] || userProfile?.campusId || '',
      year: selectedYear,
      movType,
      documentCategory: movCategory || 'Official Document',
      fileName: movFileName.trim(),
      fileUrl: movFileUrl.trim(),
      sourceType: selectedEomsQomId !== 'none' ? 'EOMS_MATRIX_SYNC' : 'MANUAL',
      sourceQomId: selectedEomsQomId !== 'none' ? selectedEomsQomId : undefined,
      uploadedBy: userProfile?.id || '',
      uploadedByName: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || 'Unit GAD Focal',
      uploadedAt: new Date().toISOString(),
    };

    const nextMovs = [...movsList, newMov];
    setMovsList(nextMovs);
    await setDoc(doc(firestore, 'cmoMovRecords', movId), newMov, { merge: true });
    await persistCmoSubmission(itemsState, nextMovs);
    setMovModalIndicatorId(null);
  };

  const handleDeleteMovRecord = async (movId: string) => {
    if (isLockedForFocal || !firestore) return;
    const nextMovs = movsList.filter((m) => m.id !== movId);
    setMovsList(nextMovs);
    try {
      await deleteDoc(doc(firestore, 'cmoMovRecords', movId));
    } catch {
      // ignore if not in top-level collection
    }
    await persistCmoSubmission(itemsState, nextMovs);
  };

  const handleSaveValidatorSeatScore = async (indicatorId: number, applyAsConsensus: boolean) => {
    if (!firestore || !selectedUnitId || !canValidate) return;
    setIsSavingValidation(true);
    try {
      const seatMeta = CMO_VALIDATOR_SEATS.find((s) => s.seat === activeValidatorSeat)!;
      const valScore = calculateCmoItemScore(indicatorId, validatorResponse);
      const assessmentId = `${submissionId}_${indicatorId}_${activeValidatorSeat}`;

      const assessmentDoc: CMOValidatorAssessment = {
        id: assessmentId,
        submissionId,
        unitId: selectedUnitId,
        campusId: selectedUnitObj?.campusIds?.[0] || '',
        year: selectedYear,
        indicatorId,
        validatorUid: userProfile?.id || '',
        validatorName: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || seatMeta.label,
        validatorTier: seatMeta.tier,
        validatorSeat: activeValidatorSeat,
        validatedResponse: validatorResponse,
        validatedScore: valScore,
        validatorRemarks: validatorRemarks.trim(),
        assessedAt: new Date().toISOString(),
      };

      await setDoc(doc(firestore, 'cmoValidatorAssessments', assessmentId), assessmentDoc, { merge: true });

      if (applyAsConsensus) {
        const nextItems: Record<number, CMOSubmissionItem> = {
          ...itemsState,
          [indicatorId]: {
            ...(itemsState[indicatorId] || { indicatorId, selfScore: 0 }),
            finalValidatedResponse: validatorResponse,
            finalValidatedScore: valScore,
            validatorConsensusRemarks: `[${seatMeta.shortLabel}] ${validatorRemarks.trim()}`,
            updatedAt: new Date().toISOString(),
          },
        };
        setItemsState(nextItems);
        const nextStatus =
          submissionStatus === 'DRAFT' || submissionStatus === 'SUBMITTED'
            ? seatMeta.tier === 'EXTERNAL'
              ? 'EXTERNAL_VALIDATION'
              : 'INTERNAL_VALIDATION'
            : submissionStatus;
        await persistCmoSubmission(nextItems, movsList, nextStatus);
      } else {
        toast({
          title: `${seatMeta.shortLabel} Assessment Logged`,
          description: `Descriptor #${indicatorId} scored ${valScore.toFixed(2)} pts (${validatorResponse}).`,
        });
      }
    } catch (err) {
      toast({
        title: 'Validation Error',
        description: 'Could not save validator assessment.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingValidation(false);
    }
  };

  // Filtered 20 descriptors
  const filteredIndicators = useMemo(() => {
    return CMO_2015_INDICATORS.filter((ind) => {
      if (sectionFilter === 'CURRICULUM') return ind.category === 'CURRICULUM';
      if (sectionFilter === 'RESEARCH') return ind.category === 'RESEARCH';
      if (sectionFilter === 'EXTENSION') return ind.category === 'EXTENSION';
      if (sectionFilter === 'EOMS_SYNCED') {
        return movsList.some((m) => m.indicatorId === ind.id && m.sourceType === 'EOMS_MATRIX_SYNC');
      }
      if (sectionFilter === 'MISSING_MOV') {
        const item = itemsState[ind.id];
        const hasClaim = item?.selfResponse === 'PARTIAL' || item?.selfResponse === 'YES';
        const hasPrimary = movsList.some((m) => m.indicatorId === ind.id && m.movType === 'PRIMARY');
        return hasClaim && !hasPrimary;
      }
      return true;
    });
  }, [sectionFilter, movsList, itemsState]);

  const completedCount = useMemo(() => Object.values(localScores).filter(Boolean).length, [localScores]);
  const maturityScore = Math.round((completedCount / CMO_2015_MAINSTREAMING_CRITERIA.length) * 100);
  const categories = useMemo(() => Array.from(new Set(CMO_2015_MAINSTREAMING_CRITERIA.map((c) => c.category))), []);

  const handlePrintUnitReport = () => {
    if (!selectedUnitId) return;
    const unitObj = units.find((u) => u.id === selectedUnitId);
    if (!unitObj) return;
    const campusObj = campuses?.find((c) => unitObj?.campusIds?.includes(c.id));
    try {
      const htmlContent = renderToStaticMarkup(
        <GADUnitMainstreamingReportTemplate
          unit={unitObj}
          campusName={campusObj?.name || 'Main Campus'}
          year={selectedYear}
          scores={localScores}
          criteria={CMO_2015_MAINSTREAMING_CRITERIA}
          signatories={signatories || undefined}
          gadSettings={gadSettings || undefined}
        />,
      );
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(
          `<!DOCTYPE html><html><head><title>CMO 1 s. 2015 GAD Assessment - ${unitObj?.name}</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@media print { body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; } @page { size: portrait; margin: 10mm; } }</style></head><body class="bg-white">${htmlContent}<script>window.onload = () => { setTimeout(() => { window.print(); }, 500); };</script></body></html>`,
        );
        printWindow.document.close();
      }
    } catch {
      toast({ title: 'Print Error', description: 'Could not generate unit report.', variant: 'destructive' });
    }
  };

  const handlePrintInstitutionalReport = () => {
    if (!allChecklists) return;
    try {
      const htmlContent = renderToStaticMarkup(
        <GADInstitutionalMainstreamingReportTemplate
          year={selectedYear}
          units={units}
          campuses={campuses || []}
          allChecklists={allChecklists}
          criteria={CMO_2015_MAINSTREAMING_CRITERIA}
          signatories={signatories || undefined}
          gadSettings={gadSettings || undefined}
        />,
      );
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(
          `<!DOCTYPE html><html><head><title>Institutional CMO 1 s. 2015 GAD Matrix - FY ${selectedYear}</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@media print { body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; } @page { size: landscape; margin: 10mm; } }</style></head><body class="bg-white">${htmlContent}<script>window.onload = () => { setTimeout(() => { window.print(); }, 500); };</script></body></html>`,
        );
        printWindow.document.close();
      }
    } catch {
      toast({ title: 'Print Error', description: 'Could not generate institutional matrix.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Unit Selector Sidebar */}
        <Card className="lg:col-span-1 shadow-sm border-primary/10 h-fit">
          <CardHeader className="pb-3 bg-muted/30 border-b">
            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Unit Registry ({visibleUnits.length})
            </CardTitle>
            <CardDescription className="text-[10px]">
              Select a unit to evaluate CMO No. 1, s. 2015 compliance.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[520px]">
              <div className="divide-y">
                {visibleUnits.map((u) => {
                  const isSelected = selectedUnitId === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUnitId(u.id)}
                      className={cn(
                        'w-full text-left p-3.5 transition-all flex items-center justify-between group hover:bg-primary/5',
                        isSelected ? 'bg-primary/10 border-l-4 border-primary font-bold' : 'opacity-80',
                      )}
                    >
                      <div className="min-w-0 pr-2">
                        <p
                          className={cn(
                            'text-xs truncate',
                            isSelected ? 'text-primary font-black' : 'text-foreground font-medium',
                          )}
                        >
                          {u.name}
                        </p>
                        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">
                          {u.category || 'Academic / Admin'}
                        </span>
                      </div>
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5',
                          isSelected ? 'text-primary' : 'text-muted-foreground/40',
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Main Assessment Workspace */}
        <div className="lg:col-span-3 space-y-6">
          {/* Top Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white p-4 rounded-xl shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-violet-500 text-white text-[10px] font-black uppercase tracking-wider">
                  CHED CMO No. 01, s. 2015
                </Badge>
                <Badge variant="outline" className="border-white/20 text-white text-[10px] font-bold">
                  FY {selectedYear} • {selectedUnitObj?.name || 'Select Unit'}
                </Badge>
              </div>
              <h3 className="text-base font-black tracking-tight mt-1">
                GAD Compliance, Tripartite Assessment & Multi-Validator Scoring Engine
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={activeView === 'cmo-20-rubric' ? 'default' : 'outline'}
                onClick={() => setActiveView('cmo-20-rubric')}
                className={cn(
                  'h-8 text-[11px] font-black uppercase tracking-wider',
                  activeView === 'cmo-20-rubric'
                    ? 'bg-violet-600 hover:bg-violet-700 text-white'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20',
                )}
              >
                <Scale className="h-3.5 w-3.5 mr-1.5" />
                20-Item Tripartite Rubric (40% EOMS)
              </Button>
              <Button
                size="sm"
                variant={activeView === 'enabling-checklist' ? 'default' : 'outline'}
                onClick={() => setActiveView('enabling-checklist')}
                className={cn(
                  'h-8 text-[11px] font-black uppercase tracking-wider',
                  activeView === 'enabling-checklist'
                    ? 'bg-violet-600 hover:bg-violet-700 text-white'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20',
                )}
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                11-Item Readiness Checklist
              </Button>
            </div>
          </div>

          {activeView === 'cmo-20-rubric' ? (
            <>
              {/* Sticky Real-Time CMO 1 s. 2015 & 40% EOMS Weighted Scorecard */}
              <Card className="border-violet-500/30 bg-gradient-to-r from-violet-950/95 via-slate-900 to-indigo-950/95 text-white shadow-xl">
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-widest text-violet-300 block">
                        Self-Assessment Raw Score
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-2xl font-black text-white">{cmoTotals.rawScoreSelf.toFixed(2)}</span>
                        <span className="text-xs font-bold text-slate-400">/ 20.00 pts</span>
                      </div>
                      <p className="text-[10px] text-slate-300 mt-1">
                        Compliance Rate:{' '}
                        <strong className="text-white">{cmoTotals.complianceRateSelf.toFixed(1)}%</strong>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-violet-500/15 border border-violet-400/30">
                      <span className="text-[10px] font-black uppercase tracking-widest text-violet-200 block">
                        EOMS Weighted Score (40%)
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-2xl font-black text-amber-300">
                          {cmoTotals.weightedScoreSelf.toFixed(2)}%
                        </span>
                        <span className="text-[10px] font-bold text-violet-200">of 40.00% Max</span>
                      </div>
                      <p className="text-[10px] text-violet-200/80 mt-1">Formula: (Raw / 20) × 100 × 40%</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 block">
                        Validated GADtimpala Score
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-2xl font-black text-emerald-300">
                          {cmoTotals.rawScoreValidated.toFixed(2)}
                        </span>
                        <span className="text-xs font-bold text-emerald-200/70">/ 20.00 pts</span>
                      </div>
                      <p className="text-[10px] text-emerald-200 mt-1">
                        Validated EOMS (40%): <strong>{cmoTotals.weightedScoreValidated.toFixed(2)}%</strong>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                          Workflow State
                        </span>
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/40 text-[9px] font-black">
                          {submissionStatus}
                        </Badge>
                      </div>
                      <div className="text-[10px] space-y-0.5 text-slate-300 mt-1">
                        <div className="flex justify-between">
                          <span>I. Curriculum (Max 8):</span>
                          <strong className="text-white">{cmoTotals.sectionScores.curriculum.self.toFixed(2)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>II. Research (Max 10):</span>
                          <strong className="text-white">{cmoTotals.sectionScores.research.self.toFixed(2)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>III. Extension (Max 2):</span>
                          <strong className="text-white">{cmoTotals.sectionScores.extension.self.toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Bar inside Scorecard */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant={sectionFilter === 'ALL' ? 'default' : 'ghost'}
                        onClick={() => setSectionFilter('ALL')}
                        className="h-7 text-[10px] font-bold"
                      >
                        All 20 Items
                      </Button>
                      <Button
                        size="sm"
                        variant={sectionFilter === 'CURRICULUM' ? 'default' : 'ghost'}
                        onClick={() => setSectionFilter('CURRICULUM')}
                        className="h-7 text-[10px] font-bold"
                      >
                        <BookOpen className="h-3 w-3 mr-1" />
                        I. Curriculum (1–7)
                      </Button>
                      <Button
                        size="sm"
                        variant={sectionFilter === 'RESEARCH' ? 'default' : 'ghost'}
                        onClick={() => setSectionFilter('RESEARCH')}
                        className="h-7 text-[10px] font-bold"
                      >
                        <Microscope className="h-3 w-3 mr-1" />
                        II. Research (8–18)
                      </Button>
                      <Button
                        size="sm"
                        variant={sectionFilter === 'EXTENSION' ? 'default' : 'ghost'}
                        onClick={() => setSectionFilter('EXTENSION')}
                        className="h-7 text-[10px] font-bold"
                      >
                        <Handshake className="h-3 w-3 mr-1" />
                        III. Extension (19–20)
                      </Button>
                      <Button
                        size="sm"
                        variant={sectionFilter === 'EOMS_SYNCED' ? 'default' : 'ghost'}
                        onClick={() => setSectionFilter('EOMS_SYNCED')}
                        className="h-7 text-[10px] font-bold text-emerald-300"
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        EOMS Matrix Synced
                      </Button>
                      <Button
                        size="sm"
                        variant={sectionFilter === 'MISSING_MOV' ? 'default' : 'ghost'}
                        onClick={() => setSectionFilter('MISSING_MOV')}
                        className="h-7 text-[10px] font-bold text-amber-300"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Missing Primary MOV
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSaving || isLockedForFocal}
                        onClick={() => persistCmoSubmission(itemsState, movsList, submissionStatus)}
                        className="h-8 text-[11px] font-black bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        Save Draft
                      </Button>
                      {submissionStatus === 'DRAFT' && (
                        <Button
                          size="sm"
                          disabled={isSaving}
                          onClick={handleSubmitForValidation}
                          className="h-8 text-[11px] font-black bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          Submit for GFPS Validation
                        </Button>
                      )}
                      {canValidate && submissionStatus !== 'FINALIZED' && (
                        <Button
                          size="sm"
                          disabled={isSaving}
                          onClick={() => persistCmoSubmission(itemsState, movsList, 'FINALIZED')}
                          className="h-8 text-[11px] font-black bg-amber-500 hover:bg-amber-600 text-slate-950"
                        >
                          <Lock className="h-3.5 w-3.5 mr-1.5" />
                          Finalize & Lock Consensus
                        </Button>
                      )}
                      {canValidate && submissionStatus === 'FINALIZED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isSaving}
                          onClick={() => persistCmoSubmission(itemsState, movsList, 'INTERNAL_VALIDATION')}
                          className="h-8 text-[11px] font-black border-amber-400/50 text-amber-300"
                        >
                          Re-open Validation
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 20-Item Rubric List */}
              {isLoadingSubmission ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredIndicators.map((ind) => {
                    const item = itemsState[ind.id];
                    const itemMovs = movsList.filter((m) => m.indicatorId === ind.id);
                    const primaryMovs = itemMovs.filter((m) => m.movType === 'PRIMARY');
                    const additionalMovs = itemMovs.filter((m) => m.movType === 'ADDITIONAL');
                    const itemAssessments = (validatorAssessments || []).filter((a) => a.indicatorId === ind.id);
                    const needsPrimaryMovWarning =
                      (item?.selfResponse === 'PARTIAL' || item?.selfResponse === 'YES') && primaryMovs.length === 0;
                    const hasDiscrepancy =
                      item?.finalValidatedScore !== undefined && item.finalValidatedScore !== (item.selfScore || 0);

                    return (
                      <Card
                        key={ind.id}
                        className={cn(
                          'shadow-sm transition-all border-l-4',
                          item?.selfResponse === 'YES'
                            ? 'border-l-emerald-600'
                            : item?.selfResponse === 'PARTIAL'
                              ? 'border-l-amber-500'
                              : 'border-l-slate-300 dark:border-l-slate-700',
                        )}
                      >
                        <CardHeader className="pb-3 bg-muted/20 border-b">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              <Badge className="bg-slate-900 text-white font-black text-xs px-2.5 py-0.5 shrink-0">
                                #{ind.itemCode}
                              </Badge>
                              <div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge variant="outline" className="text-[9px] font-black uppercase">
                                    {ind.category}
                                  </Badge>
                                  <Badge variant="secondary" className="text-[9px] font-black">
                                    Max: {ind.maxScore.toFixed(2)} {ind.maxScore > 1 ? 'pts' : 'pt'}
                                  </Badge>
                                  {needsPrimaryMovWarning && (
                                    <Badge variant="destructive" className="text-[9px] font-black">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Primary MOV Required
                                    </Badge>
                                  )}
                                  {hasDiscrepancy && (
                                    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] font-black">
                                      Validator Adjusted: {item?.finalValidatedScore?.toFixed(2)} pt
                                    </Badge>
                                  )}
                                </div>
                                <CardTitle className="text-sm font-black mt-1">{ind.title}</CardTitle>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <span className="text-[9px] font-black uppercase text-muted-foreground block">
                                  Self Score
                                </span>
                                <span className="text-base font-black text-primary">
                                  {(item?.selfScore ?? 0).toFixed(2)} / {ind.maxScore.toFixed(2)}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setOpenValidatorItem(openValidatorItem === ind.id ? null : ind.id)}
                                className="h-8 text-[10px] font-black uppercase"
                              >
                                <UserCheck className="h-3.5 w-3.5 mr-1 text-violet-600" />
                                Validators ({itemAssessments.length}/9)
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                            {/* Left Column: Rubric Selector & Remarks (7 cols) */}
                            <div className="lg:col-span-7 space-y-3">
                              <p className="text-xs text-muted-foreground leading-relaxed">{ind.description}</p>

                              {/* Special Sub-indicator Checkboxes for Descriptor 8 (8a & 8b) */}
                              {ind.id === 8 && ind.subIndicators && (
                                <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/20 space-y-2">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-300 block">
                                    Descriptor 8 Sub-Indicators (0.50 pt each)
                                  </span>
                                  {ind.subIndicators.map((sub) => {
                                    const checked = !!item?.subResponses?.[sub.code];
                                    return (
                                      <label
                                        key={sub.code}
                                        className="flex items-center gap-2.5 text-xs font-medium cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          disabled={isLockedForFocal}
                                          onChange={() => handleToggleItem8Sub(sub.code as '8a' | '8b')}
                                          className="rounded border-slate-300"
                                        />
                                        <span>{sub.label}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}

                              {/* 3-Tier Scoring Selector: NO / PARTIAL / YES */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {(['NO', 'PARTIAL', 'YES'] as CMOResponseValue[]).map((resp) => {
                                  const rubric = ind.scoringRubric[resp];
                                  const isSelected = (item?.selfResponse || 'NO') === resp;
                                  return (
                                    <button
                                      key={resp}
                                      type="button"
                                      disabled={isLockedForFocal}
                                      onClick={() => handleSelectItemResponse(ind.id, resp)}
                                      className={cn(
                                        'p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between',
                                        isSelected
                                          ? resp === 'YES'
                                            ? 'bg-emerald-500/10 border-emerald-600 ring-1 ring-emerald-600'
                                            : resp === 'PARTIAL'
                                              ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500'
                                              : 'bg-slate-200/70 dark:bg-slate-800 border-slate-500'
                                          : 'hover:bg-muted/50 border-border opacity-80',
                                      )}
                                    >
                                      <div className="flex items-center justify-between w-full mb-1">
                                        <span className="text-[11px] font-black uppercase">{resp}</span>
                                        <Badge variant="outline" className="text-[10px] font-black">
                                          {rubric.score.toFixed(2)} pt
                                        </Badge>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground leading-snug">{rubric.label}</p>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Self-Assessment Remarks */}
                              <div className="space-y-1">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground">
                                  Self-Assessment Narrative / Implementation Notes
                                </Label>
                                <Textarea
                                  rows={2}
                                  disabled={isLockedForFocal}
                                  placeholder="Describe how your unit complied with this CMO No. 1, s. 2015 requirement..."
                                  value={item?.selfRemarks || ''}
                                  onChange={(e) => handleRemarksChange(ind.id, e.target.value)}
                                  className="text-xs"
                                />
                              </div>
                            </div>

                            {/* Right Column: Primary & Additional MOV Repository (5 cols) */}
                            <div className="lg:col-span-5 flex flex-col justify-between p-3.5 rounded-xl bg-muted/30 border space-y-3">
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5" />
                                    Means of Verification ({itemMovs.length})
                                  </span>
                                  {!isLockedForFocal && (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleOpenMovModal(ind.id)}
                                      className="h-7 text-[10px] font-black"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Attach MOV
                                    </Button>
                                  )}
                                </div>

                                {/* Required MOV Guide */}
                                <div className="p-2.5 rounded-lg bg-background border text-[10px] space-y-1">
                                  <p className="font-black uppercase text-slate-700 dark:text-slate-300">
                                    Required Primary MOVs:
                                  </p>
                                  <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
                                    {ind.primaryMovRequirements.map((req, idx) => (
                                      <li key={idx}>{req}</li>
                                    ))}
                                  </ul>
                                </div>

                                {/* Attached MOV Items */}
                                {itemMovs.length === 0 ? (
                                  <div className="p-4 text-center border border-dashed rounded-lg text-[11px] text-muted-foreground">
                                    No MOV documents attached yet.
                                  </div>
                                ) : (
                                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                                    {itemMovs.map((mov) => (
                                      <div
                                        key={mov.id}
                                        className="p-2 rounded-lg bg-background border flex items-center justify-between gap-2 text-xs"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5">
                                            <Badge
                                              className={cn(
                                                'text-[8px] font-black px-1.5 py-0',
                                                mov.movType === 'PRIMARY'
                                                  ? 'bg-emerald-600 text-white'
                                                  : 'bg-slate-600 text-white',
                                              )}
                                            >
                                              {mov.movType}
                                            </Badge>
                                            {mov.sourceType === 'EOMS_MATRIX_SYNC' && (
                                              <Badge
                                                variant="outline"
                                                className="text-[8px] font-black border-violet-500/40 text-violet-600"
                                              >
                                                EOMS Matrix Synced
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="font-bold truncate mt-0.5">{mov.fileName}</p>
                                          <p className="text-[10px] text-muted-foreground truncate">
                                            {mov.documentCategory}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7"
                                            title="Preview MOV Document"
                                            onClick={() => setPreviewMov(mov)}
                                          >
                                            <Eye className="h-3.5 w-3.5 text-primary" />
                                          </Button>
                                          <a
                                            href={mov.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 hover:bg-muted rounded"
                                            title="Open in New Tab"
                                          >
                                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                          </a>
                                          {!isLockedForFocal && (
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-7 w-7 text-destructive"
                                              onClick={() => handleDeleteMovRecord(mov.id)}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expandable Multi-Validator Matrix Drawer (Internal PDPMED 1-3, NMFO & External PCW 1-4, CHED) */}
                          {openValidatorItem === ind.id && (
                            <div className="mt-4 pt-4 border-t space-y-4 bg-slate-50/70 dark:bg-slate-900/50 -mx-4 -mb-4 p-4 rounded-b-xl">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-violet-700 dark:text-violet-300">
                                    <Award className="h-4 w-4" />
                                    Multi-Seat Validator Assessment Matrix — Descriptor #{ind.itemCode}
                                  </h4>
                                  <p className="text-[10px] text-muted-foreground">
                                    Internal Validators (PDPMED 1–3, NMFO/TSRCD/SCD) & External Validators (PCW 1–4,
                                    CHED)
                                  </p>
                                </div>
                                {item?.validatorConsensusRemarks && (
                                  <Badge variant="outline" className="text-[10px] font-bold">
                                    Consensus Note: {item.validatorConsensusRemarks}
                                  </Badge>
                                )}
                              </div>

                              {/* 9-Seat Comparison Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-9 gap-2">
                                {CMO_VALIDATOR_SEATS.map((seatObj) => {
                                  const found = itemAssessments.find((a) => a.validatorSeat === seatObj.seat);
                                  return (
                                    <div
                                      key={seatObj.seat}
                                      onClick={() => {
                                        if (canValidate) {
                                          setActiveValidatorSeat(seatObj.seat);
                                          if (found) {
                                            setValidatorResponse(found.validatedResponse);
                                            setValidatorRemarks(found.validatorRemarks);
                                          }
                                        }
                                      }}
                                      className={cn(
                                        'p-2 rounded-lg border text-center cursor-pointer transition-all',
                                        activeValidatorSeat === seatObj.seat && canValidate
                                          ? 'ring-2 ring-violet-600 border-violet-600 bg-violet-500/10'
                                          : found
                                            ? 'bg-emerald-500/5 border-emerald-500/30'
                                            : 'bg-background opacity-75',
                                      )}
                                    >
                                      <span className="text-[9px] font-black uppercase block truncate">
                                        {seatObj.shortLabel}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-[8px] px-1 py-0 my-0.5 uppercase text-muted-foreground"
                                      >
                                        {seatObj.tier}
                                      </Badge>
                                      {found ? (
                                        <div>
                                          <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                            {found.validatedScore.toFixed(2)} pt
                                          </p>
                                          <p className="text-[9px] font-bold">{found.validatedResponse}</p>
                                        </div>
                                      ) : (
                                        <p className="text-[10px] text-muted-foreground italic mt-1">Pending</p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Validator Scoring Input Form (For GFPS Secretariat / Validators / Admin) */}
                              {canValidate && (
                                <div className="p-3.5 rounded-xl bg-background border space-y-3">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                      <Label className="text-[10px] font-black uppercase">Validator Seat</Label>
                                      <Select
                                        value={activeValidatorSeat}
                                        onValueChange={(v) => setActiveValidatorSeat(v as CMOValidatorSeat)}
                                      >
                                        <SelectTrigger className="h-8 text-xs mt-1">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {CMO_VALIDATOR_SEATS.map((s) => (
                                            <SelectItem key={s.seat} value={s.seat} className="text-xs">
                                              [{s.tier}] {s.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div>
                                      <Label className="text-[10px] font-black uppercase">Validated Rating</Label>
                                      <Select
                                        value={validatorResponse}
                                        onValueChange={(v) => setValidatorResponse(v as CMOResponseValue)}
                                      >
                                        <SelectTrigger className="h-8 text-xs mt-1">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="NO" className="text-xs">
                                            NO ({ind.scoringRubric.NO.score.toFixed(2)} pt)
                                          </SelectItem>
                                          <SelectItem value="PARTIAL" className="text-xs">
                                            PARTIAL ({ind.scoringRubric.PARTIAL.score.toFixed(2)} pt)
                                          </SelectItem>
                                          <SelectItem value="YES" className="text-xs">
                                            YES ({ind.scoringRubric.YES.score.toFixed(2)} pt)
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div>
                                      <Label className="text-[10px] font-black uppercase">
                                        Validator Findings / Remarks
                                      </Label>
                                      <Input
                                        value={validatorRemarks}
                                        onChange={(e) => setValidatorRemarks(e.target.value)}
                                        placeholder="Enter validation observation..."
                                        className="h-8 text-xs mt-1"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={isSavingValidation}
                                      onClick={() => handleSaveValidatorSeatScore(ind.id, false)}
                                      className="h-7 text-[10px] font-bold"
                                    >
                                      Record Seat Score Only
                                    </Button>
                                    <Button
                                      size="sm"
                                      disabled={isSavingValidation}
                                      onClick={() => handleSaveValidatorSeatScore(ind.id, true)}
                                      className="h-7 text-[10px] font-black bg-violet-600 hover:bg-violet-700 text-white"
                                    >
                                      {isSavingValidation && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                      Save & Apply as Final Validated Score
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* Tab 2: Legacy 11-Item Enabling Mechanisms Checklist */
            <Card className="shadow-md border-primary/10">
              <CardHeader className="bg-primary/5 border-b pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg font-black uppercase tracking-tight">
                        {selectedUnitObj?.name || 'Select a Unit'} — Enabling Mechanisms Checklist
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      CMO No. 1, s. 2015 Institutional Readiness & Enabling Mechanisms Self-Assessment for{' '}
                      <strong>AY {selectedYear}</strong>.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end bg-background px-4 py-2 rounded-xl border shadow-sm">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        Readiness Index
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-primary">{maturityScore}%</span>
                        <span className="text-[10px] font-bold text-muted-foreground">
                          ({completedCount}/{CMO_2015_MAINSTREAMING_CRITERIA.length})
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrintUnitReport}
                        disabled={!selectedUnitId}
                        className="h-8 text-[10px] font-black uppercase tracking-wider gap-1.5 bg-background shadow-sm"
                      >
                        <Printer className="h-3.5 w-3.5 text-violet-600" />
                        Print Unit Assessment
                      </Button>
                      {isLeadership && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrintInstitutionalReport}
                          className="h-8 text-[10px] font-black uppercase tracking-wider gap-1.5 bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100 shadow-sm"
                        >
                          <FileBarChart className="h-3.5 w-3.5 text-violet-700" />
                          Print Institutional Matrix
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingChecklist ? (
                  <div className="h-64 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-8">
                    {categories.map((category) => (
                      <div key={category} className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary border-b pb-1.5 flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {category}
                        </h4>
                        <div className="grid grid-cols-1 gap-2.5">
                          {CMO_2015_MAINSTREAMING_CRITERIA.filter((c) => c.category === category).map((item) => {
                            const isChecked = !!localScores[item.id];
                            return (
                              <div
                                key={item.id}
                                onClick={() => handleToggleCriterion(item.id)}
                                className={cn(
                                  'p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 select-none',
                                  isChecked
                                    ? 'bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-800'
                                    : 'bg-card hover:bg-muted/30 border-border',
                                )}
                              >
                                <div
                                  className={cn(
                                    'h-5 w-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition-colors',
                                    isChecked
                                      ? 'bg-emerald-600 border-emerald-600 text-white'
                                      : 'border-slate-300 bg-white dark:bg-slate-900',
                                  )}
                                >
                                  {isChecked && <CheckCircle2 className="h-3.5 w-3.5" />}
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] font-black uppercase px-1.5 py-0 h-4"
                                    >
                                      {item.cmoRef}
                                    </Badge>
                                  </div>
                                  <p
                                    className={cn(
                                      'text-xs leading-relaxed font-medium',
                                      isChecked
                                        ? 'text-emerald-950 dark:text-emerald-200 font-bold'
                                        : 'text-foreground',
                                    )}
                                  >
                                    {item.label}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/20 border-t px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                  <History className="h-3.5 w-3.5" />
                  {checklist?.updatedAt ? (
                    <span>Last updated: {format(checklist.updatedAt.toDate(), 'PPP p')}</span>
                  ) : (
                    <span>No baseline recorded for {selectedYear}</span>
                  )}
                </div>
                <Button
                  onClick={handleSaveEnablingChecklist}
                  disabled={isSaving || !selectedUnitId}
                  className="w-full sm:w-auto font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20"
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Readiness Checklist
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>

      {/* Attach MOV Dialog */}
      <Dialog open={movModalIndicatorId !== null} onOpenChange={(open) => !open && setMovModalIndicatorId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-black">
              Attach Means of Verification (MOV) — Descriptor #{movModalIndicatorId}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload or link a Google Drive evidence document, or import directly from your Unit EOMS Action Plan
              Matrix.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {gadTaggedEomsItems.length > 0 && (
              <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 space-y-2">
                <Label className="text-[11px] font-black uppercase text-violet-700 dark:text-violet-300">
                  Quick-Fill from Unit EOMS Action Plan Matrix (GAD Component PPAs)
                </Label>
                <Select
                  value={selectedEomsQomId}
                  onValueChange={(val) => {
                    setSelectedEomsQomId(val);
                    const found = gadTaggedEomsItems.find((i) => i.id === val);
                    if (found) {
                      setMovFileName(`${found.taskText} — EOMS Deliverable Evidence`);
                      if (found.movLink) setMovFileUrl(found.movLink);
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Select a GAD-tagged EOMS Action Plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">
                      — Manual MOV Entry —
                    </SelectItem>
                    {gadTaggedEomsItems.map((item) => (
                      <SelectItem key={item.id} value={item.id} className="text-xs">
                        {item.taskText} ({item.gadCategory || 'GAD PPA'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">MOV Classification</Label>
                <Select value={movType} onValueChange={(v) => setMovType(v as CMOMovType)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIMARY" className="text-xs font-bold">
                      PRIMARY MOV (Mandatory for Scoring)
                    </SelectItem>
                    <SelectItem value="ADDITIONAL" className="text-xs">
                      ADDITIONAL / Supporting MOV
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Document Category</Label>
                <Input
                  value={movCategory}
                  onChange={(e) => setMovCategory(e.target.value)}
                  placeholder="e.g., BOR Resolution, Approved Syllabus"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Document Title / Description</Label>
              <Input
                value={movFileName}
                onChange={(e) => setMovFileName(e.target.value)}
                placeholder="e.g., BOR Res. No. 42 s. 2026 Approving Gender-Responsive BSIT Curriculum"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Google Drive / Official Repository URL</Label>
              <Input
                value={movFileUrl}
                onChange={(e) => setMovFileUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className="h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setMovModalIndicatorId(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddMovRecord} className="font-bold">
              Attach & Save MOV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Built-in MOV Document Preview Modal */}
      <Dialog open={!!previewMov} onOpenChange={(open) => !open && setPreviewMov(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-black flex items-center gap-2">
              <Badge className="bg-emerald-600 text-white text-[10px]">{previewMov?.movType}</Badge>
              {previewMov?.fileName}
            </DialogTitle>
            <DialogDescription className="text-xs flex items-center justify-between">
              <span>{previewMov?.documentCategory}</span>
              {previewMov?.fileUrl && (
                <a
                  href={previewMov.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline flex items-center gap-1 font-bold"
                >
                  Open Original Link <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 w-full rounded-lg border overflow-hidden bg-slate-950/5">
            {previewMov?.fileUrl && (
              <iframe
                src={getDrivePreviewUrl(previewMov.fileUrl)}
                className="w-full h-full border-0"
                title={previewMov.fileName}
                allow="autoplay"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
