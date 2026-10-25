'use client';

import { Fragment, useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import type {
  ProgramComplianceRecord,
  Campus,
  Unit,
  UnitPersonnelCensus,
  GADSector,
  Employee,
  Signatories,
  GadSettings,
  AcademicProgram,
} from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Chart3DDefs, RenderBar3DLabel, RenderPie3DLabel } from '@/components/ui/chart-3d-defs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  GraduationCap,
  UserCircle,
  School,
  Info,
  Activity,
  PieChart as PieIcon,
  ShieldCheck,
  CalendarRange,
  Briefcase,
  PlusCircle,
  Save,
  Loader2,
  Target,
  Smartphone,
  LayoutList,
  Layers,
  Printer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  addEnrollmentTotals,
  emptyEnrollmentTotals,
  getComplianceEnrollmentSummary,
  getEnrollmentRecordTermSectors,
  getEnrollmentRecordsForYear,
  getUniqueComplianceRecords,
  type EnrollmentTermKey,
  type EnrollmentTotals,
  type EnrollmentTermTotals,
} from '@/lib/enrollment';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  SDDStudentReportTemplate,
  SDDEmployeeReportTemplate,
  type StudentSDDReportData,
  type EmployeeSDDReportData,
  type SDDSectorRow,
  type SDDTermBlock,
  type SDDEmployeeYearBlock,
  type SDDStudentSection,
  type SDDEmployeeSection,
} from './sdd-print-templates';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { UnitSddExplorer } from './unit-sdd-explorer';
import { SDDDecisionSupport } from './sdd-decision-support';

interface SDDHubProps {
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  units: Unit[];
  activities: any[];
  selectedYear: number;
  availableYears?: number[];
  unitName?: string;
  selectedUnitId?: string;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];
const GAD_SECTORS: GADSector[] = [
  'Solo Parent',
  'PWD',
  'Senior Citizen',
  'Youth/Student',
  'Employee',
  'LGBTQA++',
  'Indigenous People',
];

const STUDENT_LEVEL_OPTIONS = [
  { key: 'firstYear', label: 'First Year' },
  { key: 'secondYear', label: 'Second Year' },
  { key: 'thirdYear', label: 'Third Year' },
  { key: 'fourthYear', label: 'Fourth Year' },
] as const;

type StudentLevelKey = (typeof STUDENT_LEVEL_OPTIONS)[number]['key'];
type StudentLevelMode = 'byLevel' | 'selected' | 'overall';

const STUDENT_SOURCE_OPTIONS = [
  { key: 'enrollment', label: 'Enrollment' },
  { key: 'graduation', label: 'Graduation' },
  { key: 'tracer', label: 'Traced' },
  { key: 'board', label: 'Board Passer' },
] as const;

type StudentReportSource = (typeof STUDENT_SOURCE_OPTIONS)[number]['key'];

const STUDENT_SOURCE_META: Record<
  StudentReportSource,
  {
    label: string;
    badge: string;
    baselineTitle: string;
    baselineTotalLabel: string;
    baselineFooter: string;
    tableTitle: string;
    tableDescription: string;
    tableEmpty: string;
    reportTitle: string;
    reportSubtitle: string;
    reportEmpty: string;
    totalLabel: string;
    printEmpty: string;
  }
> = {
  enrollment: {
    label: 'Enrollment',
    badge: '1st Semester Baseline',
    baselineTitle: 'Student Population Baseline (3D)',
    baselineTotalLabel: 'Total Enrolled Baseline',
    baselineFooter:
      'This baseline establishes the verified first-semester student population disaggregated by sex for the selected academic year. Establishing a validated sex-ratio baseline is essential for proportional GAD expenditure attribution, equity audits, and statutory reporting under PCW Memorandum Circular 2011-01.',
    tableTitle: 'Student Population by Academic Year',
    tableDescription: 'Male, female, and total student headcount for each semester per academic year.',
    tableEmpty: 'No academic-year enrollment data recorded',
    reportTitle: 'Sex-Disaggregated Data (SDD) Report — Students',
    reportSubtitle: 'Student enrollment by sex, year level, and vulnerable sector per semester',
    reportEmpty: 'No student enrollment data is available for the selected academic year.',
    totalLabel: 'Enrollees',
    printEmpty: 'There is no student enrollment data to print for the selected period.',
  },
  graduation: {
    label: 'Graduation',
    badge: 'Annual Graduates',
    baselineTitle: 'Graduate Population Baseline (3D)',
    baselineTotalLabel: 'Total Graduates Baseline',
    baselineFooter:
      'This baseline consolidates graduation records disaggregated by sex for the selected academic year. Graduate sex-disaggregated data supports equitable completion reporting, outcomes-based planning, and GAD-responsive academic interventions.',
    tableTitle: 'Graduate Population by Academic Year',
    tableDescription: 'Male, female, and total graduates for each semester per academic year.',
    tableEmpty: 'No academic-year graduation data recorded',
    reportTitle: 'Sex-Disaggregated Data (SDD) Report — Graduates',
    reportSubtitle: 'Graduates by sex and semester',
    reportEmpty: 'No graduation data is available for the selected academic year.',
    totalLabel: 'Graduates',
    printEmpty: 'There is no graduation data to print for the selected period.',
  },
  tracer: {
    label: 'Traced',
    badge: 'Annual Traced Graduates',
    baselineTitle: 'Traced Graduate Baseline (3D)',
    baselineTotalLabel: 'Total Traced Graduates',
    baselineFooter:
      'This baseline consolidates traced graduates disaggregated by sex for the selected academic year. Tracer study participation supports employment outcomes monitoring, curriculum relevance review, and gender-responsive graduate support programs.',
    tableTitle: 'Traced Graduates by Academic Year',
    tableDescription: 'Male, female, and total traced graduates for each semester per academic year.',
    tableEmpty: 'No academic-year tracer data recorded',
    reportTitle: 'Sex-Disaggregated Data (SDD) Report — Traced Graduates',
    reportSubtitle: 'Traced graduates by sex and semester',
    reportEmpty: 'No tracer data is available for the selected academic year.',
    totalLabel: 'Traced Graduates',
    printEmpty: 'There is no tracer data to print for the selected period.',
  },
  board: {
    label: 'Board Passer',
    badge: 'Annual Board Passers',
    baselineTitle: 'Board Passer Baseline (3D)',
    baselineTotalLabel: 'Total Board Passers',
    baselineFooter:
      'This baseline consolidates board examination passers disaggregated by sex for the selected academic year. Board performance data supports equitable licensure outcomes monitoring and gender-responsive academic preparation.',
    tableTitle: 'Board Passers by Academic Year',
    tableDescription: 'Male, female, and total board passers per academic year.',
    tableEmpty: 'No academic-year board passer data recorded',
    reportTitle: 'Sex-Disaggregated Data (SDD) Report — Board Passers',
    reportSubtitle: 'Board passers by sex',
    reportEmpty: 'No board passer data is available for the selected academic year.',
    totalLabel: 'Board Passers',
    printEmpty: 'There is no board passer data to print for the selected period.',
  },
};

type StudentSourceTermKey = EnrollmentTermKey | 'unspecified';
type StudentSourceTermTotals = EnrollmentTermTotals & { unspecified: EnrollmentTotals };

const emptySourceTermTotals = (): StudentSourceTermTotals => ({
  firstSemester: emptyEnrollmentTotals(),
  secondSemester: emptyEnrollmentTotals(),
  midYearTerm: emptyEnrollmentTotals(),
  unspecified: emptyEnrollmentTotals(),
});

function normalizeOutcomeTerm(semester: unknown): StudentSourceTermKey {
  const value = String(semester || '').toLowerCase();
  if (value === 'all') return 'unspecified';
  if (value.includes('mid') || value.includes('summer')) return 'midYearTerm';
  if (value.includes('second') || value.includes('2nd')) return 'secondSemester';
  return 'firstSemester';
}

function getStudentSourceTermTotals(
  record: ProgramComplianceRecord,
  source: StudentReportSource,
  academicYear: number,
): StudentSourceTermTotals {
  if (source === 'enrollment') {
    return { ...getComplianceEnrollmentSummary(record, { academicYear }), unspecified: emptyEnrollmentTotals() };
  }

  const totals = emptySourceTermTotals();
  const addCounts = (termKey: StudentSourceTermKey, male: number, female: number, total = male + female) => {
    const term = totals[termKey];
    term.male += male;
    term.female += female;
    term.total += Math.max(total, male + female);
  };

  if (source === 'graduation') {
    const graduationRecords = Array.isArray(record.graduationRecords) ? record.graduationRecords : [];
    if (graduationRecords.length > 0) {
      graduationRecords.forEach((entry) => {
        const male = Number(entry.maleCount) || 0;
        const female = Number(entry.femaleCount) || 0;
        addCounts(normalizeOutcomeTerm(entry.semester), male, female, Number(entry.count) || 0);
      });
    } else {
      const male = Number(record.stats?.maleGraduates) || 0;
      const female = Number(record.stats?.femaleGraduates) || 0;
      addCounts('unspecified', male, female, Number(record.stats?.graduationCount) || 0);
    }
    return totals;
  }

  if (source === 'tracer') {
    const tracerRecords = Array.isArray(record.tracerRecords) ? record.tracerRecords : [];
    tracerRecords.forEach((entry) => {
      const male = Number(entry.maleTraced) || 0;
      const female = Number(entry.femaleTraced) || 0;
      addCounts(normalizeOutcomeTerm(entry.semester), male, female);
    });
    return totals;
  }

  const boardRecords = Array.isArray(record.boardPerformance) ? record.boardPerformance : [];
  boardRecords.forEach((entry) => {
    const male = Number(entry.malePassers) || 0;
    const female = Number(entry.femalePassers) || 0;
    addCounts('firstSemester', male, female);
  });
  return totals;
}

function AcademicYearSelect({
  value,
  years,
  onChange,
  className,
}: {
  value: number;
  years: number[];
  onChange: (year: number) => void;
  className?: string;
}) {
  return (
    <Select value={String(value)} onValueChange={(next) => onChange(Number(next))}>
      <SelectTrigger
        className={
          className ?? 'h-8 w-[150px] bg-white text-[10px] font-black uppercase tracking-wider border-primary/30'
        }
      >
        <CalendarRange className="mr-1.5 h-3 w-3 shrink-0 text-primary" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={String(year)}>
            AY {year}&ndash;{year + 1}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SDDHub({
  compliances,
  campuses,
  units,
  activities,
  selectedYear,
  availableYears,
  unitName,
  selectedUnitId,
}: SDDHubProps) {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSavingCensus, setIsSaving] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printReportType, setPrintReportType] = useState<'students' | 'employees'>('students');
  const [printMode, setPrintMode] = useState<'range' | 'year' | 'yearSemester'>('year');
  const [printFromYear, setPrintFromYear] = useState(selectedYear);
  const [printToYear, setPrintToYear] = useState(selectedYear);
  const [printYear, setPrintYear] = useState(selectedYear);
  const [printSemester, setPrintSemester] = useState<StudentSourceTermKey>('firstSemester');
  const [printCampusId, setPrintCampusId] = useState('all');
  const [printProgramId, setPrintProgramId] = useState('all');
  const [printStudentType, setPrintStudentType] = useState<'all' | 'undergraduate' | 'graduate'>('all');
  const [printStudentLevelMode, setPrintStudentLevelMode] = useState<StudentLevelMode>('byLevel');
  const [printStudentLevelKey, setPrintStudentLevelKey] = useState<StudentLevelKey>('firstYear');
  const [dashboardYear, setDashboardYear] = useState(selectedYear);
  const [reportSource, setReportSource] = useState<StudentReportSource>('enrollment');

  useEffect(() => {
    setDashboardYear(selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    setPrintFromYear(dashboardYear);
    setPrintToYear(dashboardYear);
    setPrintYear(dashboardYear);
  }, [dashboardYear]);

  const isInstitutionalScope = !selectedUnitId || selectedUnitId === 'all';

  const signatoryRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'signatories') : null), [firestore]);
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const gadSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'gadSettings') : null),
    [firestore],
  );
  const { data: gadSettings } = useDoc<GadSettings>(gadSettingsRef);

  const reportCensusQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const baseRef = collection(firestore, 'unitPersonnelCensus');
    if (isInstitutionalScope) return baseRef;
    if (selectedUnitId) return query(baseRef, where('unitId', '==', selectedUnitId));
    return null;
  }, [firestore, isInstitutionalScope, selectedUnitId]);

  const { data: reportCensuses } = useCollection<UnitPersonnelCensus>(reportCensusQuery);

  const reportCompliancesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const baseRef = collection(firestore, 'programCompliances');
    if (isInstitutionalScope) return baseRef;
    if (selectedUnitId) return query(baseRef, where('unitId', '==', selectedUnitId));
    return null;
  }, [firestore, isInstitutionalScope, selectedUnitId]);

  const { data: reportCompliances } = useCollection<ProgramComplianceRecord>(reportCompliancesQuery);

  const academicProgramsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'academicPrograms') : null),
    [firestore],
  );
  const { data: academicPrograms } = useCollection<AcademicProgram>(academicProgramsQuery);

  const activeProgramIds = useMemo(() => {
    if (!academicPrograms || academicPrograms.length === 0) return undefined;
    return new Set(
      academicPrograms
        .filter((program) => program.isActive === true)
        .map((program) => String(program.id).toLowerCase().trim()),
    );
  }, [academicPrograms]);

  const studentRecordSource = useMemo(() => {
    const source = reportCompliances && reportCompliances.length > 0 ? reportCompliances : compliances;
    if (!activeProgramIds) return source;

    return source.filter((record) =>
      activeProgramIds.has(
        String(record.programId || '')
          .toLowerCase()
          .trim(),
      ),
    );
  }, [reportCompliances, compliances, activeProgramIds]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    (availableYears || []).forEach((year) => years.add(year));
    years.add(selectedYear);
    years.add(dashboardYear);
    reportCompliances?.forEach((record) => {
      const year = Number(record.academicYear);
      if (Number.isFinite(year) && year > 2000) years.add(year);
    });
    reportCensuses?.forEach((record) => {
      const year = Number(record.year);
      if (Number.isFinite(year) && year > 2000) years.add(year);
    });
    for (let offset = -2; offset <= 4; offset++) {
      years.add(selectedYear - offset);
    }
    return Array.from(years)
      .filter((year) => year > 2000)
      .sort((a, b) => b - a);
  }, [availableYears, selectedYear, dashboardYear, reportCompliances, reportCensuses]);

  const printProgramOptions = useMemo(() => {
    if (!academicPrograms) return [];
    const levelRank: Record<AcademicProgram['level'], number> = {
      Undergraduate: 0,
      Graduate: 1,
      TVET: 2,
    };
    return academicPrograms
      .filter(
        (program) =>
          (printCampusId === 'all' || printCampusId === 'institution' || program.campusId === printCampusId) &&
          (printStudentType === 'all' ||
            (printStudentType === 'undergraduate' ? program.level === 'Undergraduate' : program.level === 'Graduate')),
      )
      .sort((a, b) => levelRank[a.level] - levelRank[b.level] || a.name.localeCompare(b.name));
  }, [academicPrograms, printCampusId, printStudentType]);

  useEffect(() => {
    if (printProgramId === 'all' || printProgramId === 'institution') return;
    const selectedProgram = academicPrograms?.find((program) => program.id === printProgramId);
    const matchesStudentType =
      printStudentType === 'all' ||
      (printStudentType === 'undergraduate'
        ? selectedProgram?.level === 'Undergraduate'
        : selectedProgram?.level === 'Graduate');
    if (
      !selectedProgram ||
      !matchesStudentType ||
      (printCampusId !== 'all' && printCampusId !== 'institution' && selectedProgram.campusId !== printCampusId)
    ) {
      setPrintProgramId('all');
    }
  }, [printCampusId, printStudentType, academicPrograms, printProgramId]);

  useEffect(() => {
    if (printReportType === 'employees') setPrintProgramId('all');
  }, [printReportType]);

  const campusNameMap = useMemo(() => new Map(campuses.map((campus) => [campus.id, campus.name])), [campuses]);
  const programNameMap = useMemo(
    () => new Map((academicPrograms || []).map((program) => [program.id, program.name])),
    [academicPrograms],
  );

  // 1. UNIT PERSONNEL CENSUS MODULE
  const censusId = userProfile?.unitId ? `${userProfile.unitId}-${dashboardYear}` : 'none';
  const censusRef = useMemoFirebase(
    () => (firestore && userProfile?.unitId ? doc(firestore, 'unitPersonnelCensus', censusId) : null),
    [firestore, censusId],
  );
  const { data: census, isLoading: isLoadingCensus } = useDoc<UnitPersonnelCensus>(censusRef);

  // Fetch active employees for auto-calculation
  const activePersonnelQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.unitId) return null;
    if (userProfile.campusId) {
      return query(
        collection(firestore, 'unitPersonnel'),
        where('unitId', '==', userProfile.unitId),
        where('campusId', '==', userProfile.campusId),
        where('isActive', '==', true),
      );
    }
    return query(
      collection(firestore, 'unitPersonnel'),
      where('unitId', '==', userProfile.unitId),
      where('isActive', '==', true),
    );
  }, [firestore, userProfile?.unitId, userProfile?.campusId]);

  const { data: unitPersonnel, isLoading: isLoadingPersonnel } = useCollection<Employee>(activePersonnelQuery);

  const [censusForm, setCensusForm] = useState<Partial<UnitPersonnelCensus>>({
    teaching: { male: 0, female: 0, sectors: {} },
    nonTeaching: { male: 0, female: 0, sectors: {} },
  });

  const handleAutoCalculateCensus = () => {
    if (!unitPersonnel || unitPersonnel.length === 0) {
      toast({
        title: 'No Personnel Found',
        description: 'Please add active staff members to your Personnel Registry in CSM settings first.',
        variant: 'destructive',
      });
      return;
    }

    // Initialize census structure with GAD_SECTORS
    const updatedForm = {
      teaching: {
        male: 0,
        female: 0,
        sectors: GAD_SECTORS.reduce(
          (acc, s) => ({ ...acc, [s]: { male: 0, female: 0 } }),
          {} as Record<GADSector, { male: number; female: number }>,
        ),
      },
      nonTeaching: {
        male: 0,
        female: 0,
        sectors: GAD_SECTORS.reduce(
          (acc, s) => ({ ...acc, [s]: { male: 0, female: 0 } }),
          {} as Record<GADSector, { male: number; female: number }>,
        ),
      },
    };

    unitPersonnel.forEach((emp) => {
      const isTeaching = emp.type === 'Teaching';
      const targetGroup = isTeaching ? updatedForm.teaching : updatedForm.nonTeaching;

      if (emp.sex === 'Male') {
        targetGroup.male++;
      } else {
        targetGroup.female++;
      }

      // Get sectors and auto-add LGBTQA++ if employee has sex 'LGBTQA+'
      const sectorsList = [...(emp.sectors || [])];
      if (emp.sex === 'LGBTQA+' && !sectorsList.includes('LGBTQA++')) {
        sectorsList.push('LGBTQA++');
      }

      sectorsList.forEach((sector) => {
        if (!targetGroup.sectors[sector]) {
          targetGroup.sectors[sector] = { male: 0, female: 0 };
        }
        if (emp.sex === 'Male') {
          targetGroup.sectors[sector].male++;
        } else {
          targetGroup.sectors[sector].female++;
        }
      });
    });

    setCensusForm((prev) => ({
      ...prev,
      teaching: updatedForm.teaching as any,
      nonTeaching: updatedForm.nonTeaching as any,
    }));

    toast({
      title: 'Sync Complete',
      description: `Successfully synchronized and auto-calculated metrics from ${unitPersonnel.length} active staff records.`,
    });
  };

  useEffect(() => {
    if (census) setCensusForm(census);
    else
      setCensusForm({
        teaching: {
          male: 0,
          female: 0,
          sectors: GAD_SECTORS.reduce((acc, s) => ({ ...acc, [s]: { male: 0, female: 0 } }), {}),
        },
        nonTeaching: {
          male: 0,
          female: 0,
          sectors: GAD_SECTORS.reduce((acc, s) => ({ ...acc, [s]: { male: 0, female: 0 } }), {}),
        },
      } as any);
  }, [census]);

  const handleSaveCensus = async () => {
    if (!firestore || !userProfile?.unitId) return;
    setIsSaving(true);
    try {
      await setDoc(
        censusRef!,
        {
          ...censusForm,
          id: censusId,
          unitId: userProfile.unitId,
          campusId: userProfile.campusId,
          year: dashboardYear,
          updatedAt: serverTimestamp(),
          updatedBy: userProfile.id,
        },
        { merge: true },
      );
      toast({ title: 'Census Updated', description: 'Institutional personnel data synchronized.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update census data.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const aggregatedData = useMemo(() => {
    let s1Male = 0,
      s1Female = 0;
    const studentSectors: Record<string, { male: number; female: number }> = {};
    GAD_SECTORS.forEach((s) => (studentSectors[s] = { male: 0, female: 0 }));

    const levels = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'] as const;
    const yearRecords = getUniqueComplianceRecords(studentRecordSource, {
      academicYear: dashboardYear,
      activeProgramIds,
    });

    const collectSectors = (term: any) => {
      levels.forEach((level) => {
        const levelData = term?.[level];
        if (!levelData?.sectors) return;

        Object.entries(levelData.sectors).forEach(([sector, counts]: [string, any]) => {
          if (studentSectors[sector]) {
            studentSectors[sector].male += Number(counts?.male || 0);
            studentSectors[sector].female += Number(counts?.female || 0);
          }
        });
      });
    };

    yearRecords.forEach((record) => {
      const summary = getComplianceEnrollmentSummary(record, { academicYear: dashboardYear });
      s1Male += summary.firstSemester.male;
      s1Female += summary.firstSemester.female;

      const enrollmentRecords = getEnrollmentRecordsForYear(record.enrollmentRecords, dashboardYear);
      if (enrollmentRecords.length > 0) {
        enrollmentRecords.forEach((rec) => {
          const resolvedSectors = getEnrollmentRecordTermSectors(rec, 'firstSemester');
          Object.entries(resolvedSectors).forEach(([sector, counts]) => {
            if (studentSectors[sector]) {
              studentSectors[sector].male += Number(counts?.male || 0);
              studentSectors[sector].female += Number(counts?.female || 0);
            }
          });
        });
      } else {
        collectSectors(record.stats?.enrollment?.firstSemester);
      }
    });

    const createPieData = (m: number, f: number, o: number = 0) =>
      [
        { name: 'Male', value: m, fill: COLORS[0] },
        { name: 'Female', value: f, fill: COLORS[1] },
        { name: 'Others', value: o, fill: COLORS[2] },
      ].filter((d) => d.value > 0);

    const sectoralChartData = Object.entries(studentSectors)
      .map(([name, counts]) => ({
        name,
        total: counts.male + counts.female,
        male: counts.male,
        female: counts.female,
      }))
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total);

    return {
      s1: createPieData(s1Male, s1Female),
      studentSectors: sectoralChartData,
      studentSectorMap: studentSectors,
      totals: { s1: s1Male + s1Female },
    };
  }, [studentRecordSource, dashboardYear, activeProgramIds]);

  const studentLevelRowData = useMemo(() => {
    const records = getUniqueComplianceRecords(studentRecordSource, {
      academicYear: dashboardYear,
      activeProgramIds,
    });
    const levelDefs = [
      { key: 'firstYear', label: 'First Year' },
      { key: 'secondYear', label: 'Second Year' },
      { key: 'thirdYear', label: 'Third Year' },
      { key: 'fourthYear', label: 'Fourth Year' },
      { key: 'fifthYear', label: 'Fifth Year' },
    ] as const;

    const buildTerm = (termKey: 'firstSemester' | 'secondSemester' | 'midYearTerm') => {
      const levels = levelDefs.map(({ label }) => ({ label, male: 0, female: 0 }));
      let totals: EnrollmentTotals = emptyEnrollmentTotals();

      const collectTerm = (term: any) => {
        if (!term) return;
        levelDefs.forEach(({ key: levelKey }, index) => {
          const levelData = term[levelKey];
          if (!levelData) return;
          levels[index].male += Number(levelData.male || 0);
          levels[index].female += Number(levelData.female || 0);
        });
      };

      records.forEach((record) => {
        const summary = getComplianceEnrollmentSummary(record, { academicYear: dashboardYear });
        totals = addEnrollmentTotals(totals, summary[termKey]);

        const enrollmentRecords = getEnrollmentRecordsForYear(record.enrollmentRecords, dashboardYear);
        if (enrollmentRecords.length > 0) {
          enrollmentRecords.forEach((rec) => {
            if (rec.overallOnly) return;
            collectTerm(rec?.[termKey]);
          });
        } else {
          collectTerm((record.stats?.enrollment as any)?.[termKey]);
        }
      });

      return { levels, male: totals.male, female: totals.female, total: totals.total };
    };

    const first = buildTerm('firstSemester');
    const second = buildTerm('secondSemester');
    const midyear = buildTerm('midYearTerm');

    const rows = levelDefs
      .map((_, index) => {
        const s1 = first.levels[index];
        const s2 = second.levels[index];
        const mid = midyear.levels[index];
        return {
          label: levelDefs[index].label,
          first: s1,
          second: s2,
          midyear: mid,
          total: {
            male: s1.male + s2.male + mid.male,
            female: s1.female + s2.female + mid.female,
          },
        };
      })
      .filter((row, index) => index < 4 || row.total.male + row.total.female > 0);

    const firstTotal = { male: first.male, female: first.female };
    const secondTotal = { male: second.male, female: second.female };
    const midyearTotal = { male: midyear.male, female: midyear.female };
    const hasMidyear = midyear.total > 0 || rows.some((row) => row.midyear.male + row.midyear.female > 0);

    return {
      rows,
      hasMidyear,
      totals: {
        first: firstTotal,
        second: secondTotal,
        midyear: midyearTotal,
        overall: {
          male: firstTotal.male + secondTotal.male + midyearTotal.male,
          female: firstTotal.female + secondTotal.female + midyearTotal.female,
        },
      },
    };
  }, [studentRecordSource, dashboardYear, activeProgramIds]);

  const studentYearlyData = useMemo(() => {
    const yearTotals = new Map<number, StudentSourceTermTotals>();

    getUniqueComplianceRecords(studentRecordSource, { activeProgramIds }).forEach((record) => {
      const year = Number(record.academicYear);
      if (!Number.isFinite(year) || year <= 2000) return;

      const sourceTotals = getStudentSourceTermTotals(record, reportSource, year);
      const totals = yearTotals.get(year) || emptySourceTermTotals();

      yearTotals.set(year, {
        firstSemester: addEnrollmentTotals(totals.firstSemester, sourceTotals.firstSemester),
        secondSemester: addEnrollmentTotals(totals.secondSemester, sourceTotals.secondSemester),
        midYearTerm: addEnrollmentTotals(totals.midYearTerm, sourceTotals.midYearTerm),
        unspecified: addEnrollmentTotals(totals.unspecified, sourceTotals.unspecified),
      });
    });

    return Array.from(yearTotals.entries())
      .map(([year, totals]) => ({ year, ...totals }))
      .filter(
        (row) =>
          row.firstSemester.total > 0 ||
          row.secondSemester.total > 0 ||
          row.midYearTerm.total > 0 ||
          row.unspecified.total > 0 ||
          row.year === dashboardYear,
      )
      .sort((a, b) => b.year - a.year);
  }, [studentRecordSource, dashboardYear, activeProgramIds, reportSource]);

  const studentSourceBaseline = useMemo(() => {
    const row = studentYearlyData.find((entry) => entry.year === dashboardYear);
    if (!row) return emptyEnrollmentTotals();
    if (reportSource === 'enrollment' || reportSource === 'board') return row.firstSemester;
    return addEnrollmentTotals(
      addEnrollmentTotals(addEnrollmentTotals(row.firstSemester, row.secondSemester), row.midYearTerm),
      row.unspecified,
    );
  }, [studentYearlyData, dashboardYear, reportSource]);

  const studentSourcePieData = useMemo(
    () =>
      [
        { name: 'Male', value: studentSourceBaseline.male, fill: COLORS[0] },
        { name: 'Female', value: studentSourceBaseline.female, fill: COLORS[1] },
      ].filter((entry) => entry.value > 0),
    [studentSourceBaseline],
  );

  const semesterLabels = {
    firstSemester: 'First Semester',
    secondSemester: 'Second Semester',
    midYearTerm: 'Midyear Term',
    unspecified: 'All / Unspecified Semester',
  } as const;

  const sourceTermColumns: { key: StudentSourceTermKey; label: string }[] =
    reportSource === 'board'
      ? [{ key: 'firstSemester', label: 'Academic Year Total' }]
      : [
          { key: 'firstSemester', label: '1st Semester' },
          { key: 'secondSemester', label: '2nd Semester' },
          { key: 'midYearTerm', label: 'Midyear Term' },
          ...(reportSource === 'graduation' ? [{ key: 'unspecified' as const, label: 'All / Unspecified' }] : []),
        ];

  const sourceMeta = STUDENT_SOURCE_META[reportSource];

  const formatPeriodLabel = (years: number[], semesterKey?: StudentSourceTermKey) => {
    const sorted = [...years].sort((a, b) => a - b);
    const yearLabel =
      sorted.length <= 1
        ? `${sorted[0]}-${sorted[0] + 1}`
        : `${sorted[0]}-${sorted[0] + 1} to ${sorted[sorted.length - 1]}-${sorted[sorted.length - 1] + 1}`;
    return semesterKey ? `${yearLabel} (${semesterLabels[semesterKey]})` : yearLabel;
  };

  const isSpecificCampus = printCampusId !== 'all' && printCampusId !== 'institution';
  const isSpecificProgram = printProgramId !== 'all' && printProgramId !== 'institution';
  const selectedCampusName = isSpecificCampus ? campusNameMap.get(printCampusId) || printCampusId : undefined;
  const selectedProgramName = isSpecificProgram ? programNameMap.get(printProgramId) || printProgramId : undefined;

  const buildStudentSection = (
    records: ProgramComplianceRecord[],
    title: string,
    years: number[],
    semesterKey?: StudentSourceTermKey,
    levelMode: StudentLevelMode = 'byLevel',
    selectedLevelKey?: StudentLevelKey,
  ): SDDStudentSection => {
    const termKeys =
      semesterKey && semesterKey !== 'unspecified'
        ? ([semesterKey] as const)
        : (['firstSemester', 'secondSemester', 'midYearTerm'] as const);
    const levelDefs = [
      { key: 'firstYear', label: 'First Year' },
      { key: 'secondYear', label: 'Second Year' },
      { key: 'thirdYear', label: 'Third Year' },
      { key: 'fourthYear', label: 'Fourth Year' },
      { key: 'fifthYear', label: 'Fifth Year' },
    ] as const;

    const terms: SDDTermBlock[] = [];

    years.forEach((year) => {
      const yearRecords = getUniqueComplianceRecords(records, { academicYear: year, activeProgramIds });

      termKeys.forEach((key) => {
        const levels = levelDefs.map(({ label }) => ({ label, male: 0, female: 0 }));
        const sectorMap: Record<string, { male: number; female: number }> = {};
        let male = 0;
        let female = 0;

        const collectTerm = (term: any) => {
          if (!term) return;
          levelDefs.forEach(({ key: levelKey }, index) => {
            if (levelMode === 'selected' && levelKey !== selectedLevelKey) return;

            const levelData = term[levelKey];
            if (!levelData) return;

            const levelMale = Number(levelData.male || 0);
            const levelFemale = Number(levelData.female || 0);
            levels[index].male += levelMale;
            levels[index].female += levelFemale;
            male += levelMale;
            female += levelFemale;

            Object.entries(levelData.sectors || {}).forEach(([sector, counts]: [string, any]) => {
              if (!sectorMap[sector]) sectorMap[sector] = { male: 0, female: 0 };
              sectorMap[sector].male += Number(counts?.male || 0);
              sectorMap[sector].female += Number(counts?.female || 0);
            });
          });
        };

        const canonicalTotals = yearRecords.reduce<EnrollmentTotals>((totals, record) => {
          const summary = getComplianceEnrollmentSummary(record, { academicYear: year });
          return addEnrollmentTotals(totals, summary[key]);
        }, emptyEnrollmentTotals());

        yearRecords.forEach((record) => {
          const enrollmentRecords = getEnrollmentRecordsForYear(record.enrollmentRecords, year);
          if (enrollmentRecords.length > 0) {
            enrollmentRecords.forEach((rec) => {
              if (!rec.overallOnly) {
                collectTerm(rec?.[key]);
              }
              if (levelMode !== 'selected') {
                const resolvedSectors = getEnrollmentRecordTermSectors(rec, key);
                Object.entries(resolvedSectors).forEach(([sector, counts]) => {
                  const overallSec = rec.overall?.[key]?.sectors?.[sector as GADSector];
                  // If overallOnly is true, or if year-level sectors had 0 and overall sectors had > 0, add them
                  if (rec.overallOnly) {
                    if (!sectorMap[sector]) sectorMap[sector] = { male: 0, female: 0 };
                    sectorMap[sector].male += Number(counts?.male || 0);
                    sectorMap[sector].female += Number(counts?.female || 0);
                  } else if (overallSec) {
                    const levelSecSum = levelDefs.reduce(
                      (sum, { key: lKey }) =>
                        sum +
                        Number((rec?.[key] as any)?.[lKey]?.sectors?.[sector]?.male || 0) +
                        Number((rec?.[key] as any)?.[lKey]?.sectors?.[sector]?.female || 0),
                      0,
                    );
                    if (levelSecSum === 0) {
                      if (!sectorMap[sector]) sectorMap[sector] = { male: 0, female: 0 };
                      sectorMap[sector].male += Number(overallSec.male || 0);
                      sectorMap[sector].female += Number(overallSec.female || 0);
                    }
                  }
                });
              }
            });
          } else {
            collectTerm((record.stats?.enrollment as any)?.[key]);
          }
        });

        const displayedMale = levelMode === 'selected' ? male : canonicalTotals.male;
        const displayedFemale = levelMode === 'selected' ? female : canonicalTotals.female;
        const displayedTotal = levelMode === 'selected' ? male + female : canonicalTotals.total;

        if (!semesterKey && key === 'midYearTerm' && displayedTotal === 0) return;

        const sectors: SDDSectorRow[] = Object.entries(sectorMap)
          .map(([sector, counts]) => ({
            sector,
            male: counts.male,
            female: counts.female,
            total: counts.male + counts.female,
          }))
          .filter((sector) => sector.total > 0)
          .sort((a, b) => b.total - a.total);

        const levelMale = levels.reduce((sum, level) => sum + level.male, 0);
        const levelFemale = levels.reduce((sum, level) => sum + level.female, 0);
        const unallocatedMale = Math.max(canonicalTotals.male - levelMale, 0);
        const unallocatedFemale = Math.max(canonicalTotals.female - levelFemale, 0);

        const displayedLevels =
          levelMode === 'overall'
            ? [
                {
                  label: 'Overall Total',
                  male: canonicalTotals.male,
                  female: canonicalTotals.female,
                  total: canonicalTotals.total,
                },
              ]
            : levelMode === 'selected'
              ? levels.filter((_, index) => levelDefs[index].key === selectedLevelKey)
              : [
                  ...levels.filter((level, index) => index < 4 || level.male + level.female > 0),
                  ...(unallocatedMale + unallocatedFemale > 0
                    ? [
                        {
                          label: 'Overall / Unspecified',
                          male: unallocatedMale,
                          female: unallocatedFemale,
                          total: unallocatedMale + unallocatedFemale,
                        },
                      ]
                    : []),
                ];

        terms.push({
          term: semesterLabels[key],
          academicYear: `${year}-${year + 1}`,
          levels: displayedLevels,
          sectors,
          male: displayedMale,
          female: displayedFemale,
          total: displayedTotal,
          hideYearLevel: levelMode === 'overall',
        });
      });
    });

    const grand = {
      male: terms.reduce((sum, term) => sum + term.male, 0),
      female: terms.reduce((sum, term) => sum + term.female, 0),
      total: terms.reduce((sum, term) => sum + (term.total ?? term.male + term.female), 0),
    };

    return { title, terms: grand.total > 0 ? terms : [], grand, totalLabel: sourceMeta.totalLabel };
  };

  const buildOutcomeStudentSection = (
    records: ProgramComplianceRecord[],
    title: string,
    years: number[],
    semesterKey?: StudentSourceTermKey,
  ): SDDStudentSection => {
    const termKeys: StudentSourceTermKey[] =
      reportSource === 'board'
        ? ['firstSemester']
        : semesterKey
          ? [semesterKey]
          : ['firstSemester', 'secondSemester', 'midYearTerm', 'unspecified'];

    const terms: SDDTermBlock[] = [];

    years.forEach((year) => {
      const yearRecords = getUniqueComplianceRecords(records, { academicYear: year, activeProgramIds });

      termKeys.forEach((termKey) => {
        const totals = yearRecords.reduce<EnrollmentTotals>(
          (sum, record) => addEnrollmentTotals(sum, getStudentSourceTermTotals(record, reportSource, year)[termKey]),
          emptyEnrollmentTotals(),
        );

        if (totals.total === 0) return;

        terms.push({
          term: reportSource === 'board' ? 'Academic Year Total' : semesterLabels[termKey],
          academicYear: `${year}-${year + 1}`,
          levels: [
            {
              label: 'Overall Total',
              male: totals.male,
              female: totals.female,
              total: totals.total,
            },
          ],
          sectors: [],
          male: totals.male,
          female: totals.female,
          total: totals.total,
          hideYearLevel: true,
        });
      });
    });

    const grand = {
      male: terms.reduce((sum, term) => sum + term.male, 0),
      female: terms.reduce((sum, term) => sum + term.female, 0),
      total: terms.reduce((sum, term) => sum + (term.total ?? term.male + term.female), 0),
    };

    return { title, terms, grand, totalLabel: sourceMeta.totalLabel };
  };

  const buildStudentReportData = (
    years: number[],
    semesterKey?: StudentSourceTermKey,
    levelMode: StudentLevelMode = 'byLevel',
    selectedLevelKey?: StudentLevelKey,
  ): StudentSDDReportData => {
    const programLevelById = new Map((academicPrograms || []).map((program) => [program.id, program.level]));
    const allRecords = studentRecordSource.filter((record) => {
      if (printStudentType === 'all') return true;
      const level = programLevelById.get(record.programId);
      return printStudentType === 'undergraduate' ? level === 'Undergraduate' : level === 'Graduate';
    });
    const filterRecords = (campusId?: string, programId?: string) =>
      allRecords.filter(
        (record) => (!campusId || record.campusId === campusId) && (!programId || record.programId === programId),
      );

    const campusList = campuses
      .filter((campus) =>
        allRecords.some(
          (record) => record.campusId === campus.id && (!isSpecificProgram || record.programId === printProgramId),
        ),
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    const sections: SDDStudentSection[] = [];
    const appendices: SDDStudentSection[] = [];

    const addSection = (target: SDDStudentSection[], records: ProgramComplianceRecord[], title: string) => {
      const section =
        reportSource === 'enrollment'
          ? buildStudentSection(records, title, years, semesterKey, levelMode, selectedLevelKey)
          : buildOutcomeStudentSection(records, title, years, semesterKey);
      if (section.terms.length > 0) target.push(section);
    };

    const addProgramSections = (
      target: SDDStudentSection[],
      campusId: string,
      campusName: string,
      programId?: string,
      fallbackToCampus: boolean = true,
    ) => {
      const campusRecords = filterRecords(campusId, programId);
      const programLevelRank: Record<AcademicProgram['level'], number> = {
        Undergraduate: 0,
        Graduate: 1,
        TVET: 2,
      };
      const programs = (academicPrograms || [])
        .filter(
          (program) => program.campusId === campusId && campusRecords.some((record) => record.programId === program.id),
        )
        .sort((a, b) => programLevelRank[a.level] - programLevelRank[b.level] || a.name.localeCompare(b.name));

      if (programs.length > 0) {
        programs.forEach((program) => {
          addSection(target, filterRecords(campusId, program.id), `Campus: ${campusName} — Program: ${program.name}`);
        });
      } else if (fallbackToCampus && campusRecords.length > 0) {
        addSection(target, campusRecords, `Campus: ${campusName}`);
      }
    };

    if (printCampusId === 'all') {
      campusList.forEach((campus) => {
        if (printProgramId === 'all') {
          addProgramSections(sections, campus.id, campus.name);
        } else if (isSpecificProgram) {
          addSection(
            sections,
            filterRecords(campus.id, printProgramId),
            `Campus: ${campus.name} — Program: ${selectedProgramName}`,
          );
        } else {
          addSection(sections, filterRecords(campus.id), `Campus: ${campus.name}`);
        }
      });
    } else if (printCampusId === 'institution') {
      addSection(
        sections,
        filterRecords(undefined, isSpecificProgram ? printProgramId : undefined),
        'Institution Summary',
      );

      campusList.forEach((campus) => {
        addSection(
          appendices,
          filterRecords(campus.id, isSpecificProgram ? printProgramId : undefined),
          `Campus: ${campus.name}${isSpecificProgram ? ` — Program: ${selectedProgramName}` : ''}`,
        );
      });

      if (!isSpecificProgram) {
        campusList.forEach((campus) => {
          addProgramSections(appendices, campus.id, campus.name, undefined, false);
        });
      }
    } else {
      const campusName = selectedCampusName || printCampusId;
      if (printProgramId === 'all') {
        addProgramSections(sections, printCampusId, campusName);
      } else if (isSpecificProgram) {
        addSection(
          sections,
          filterRecords(printCampusId, printProgramId),
          `Campus: ${campusName} — Program: ${selectedProgramName}`,
        );
      } else {
        addSection(sections, filterRecords(printCampusId), `Campus: ${campusName}`);
      }
    }

    const programInfoByTitle = new Map(
      (academicPrograms || []).map((program) => [
        `Campus: ${campusNameMap.get(program.campusId) || program.campusId} — Program: ${program.name}`,
        program,
      ]),
    );
    const programLevelRank: Record<AcademicProgram['level'], number> = {
      Undergraduate: 0,
      Graduate: 1,
      TVET: 2,
    };
    const sectionProgramName = (title: string) => {
      const marker = ' — Program: ';
      const markerIndex = title.indexOf(marker);
      return markerIndex >= 0 ? title.slice(markerIndex + marker.length) : '';
    };
    const sortSectionsByProgramLevel = (list: SDDStudentSection[], nonProgramFirst = false) => {
      list.sort((a, b) => {
        const programA = sectionProgramName(a.title);
        const programB = sectionProgramName(b.title);
        if (!programA && !programB) return a.title.localeCompare(b.title);
        if (!programA) return nonProgramFirst ? -1 : 1;
        if (!programB) return nonProgramFirst ? 1 : -1;
        const infoA = programInfoByTitle.get(a.title);
        const infoB = programInfoByTitle.get(b.title);
        const rankA = infoA ? programLevelRank[infoA.level] : 99;
        const rankB = infoB ? programLevelRank[infoB.level] : 99;
        return rankA - rankB || a.title.localeCompare(b.title);
      });
    };
    sortSectionsByProgramLevel(sections);
    sortSectionsByProgramLevel(appendices, true);

    const grand = sections.reduce(
      (acc, section) => ({ male: acc.male + section.grand.male, female: acc.female + section.grand.female }),
      { male: 0, female: 0 },
    );

    const scopeParts: string[] = [];
    if (isSpecificCampus) scopeParts.push(`Campus: ${selectedCampusName}`);
    if (isSpecificProgram) scopeParts.push(`Program: ${selectedProgramName}`);
    if (printStudentType !== 'all') {
      scopeParts.push(
        `Student Type: ${printStudentType === 'undergraduate' ? 'Undergraduate Student' : 'Graduate Student'}`,
      );
    }
    if (reportSource !== 'enrollment') {
      scopeParts.push(`Report Source: ${sourceMeta.label}`);
    } else if (levelMode === 'overall') {
      scopeParts.push('Student Level: Overall Total');
    } else if (levelMode === 'selected') {
      const levelLabel = STUDENT_LEVEL_OPTIONS.find((level) => level.key === selectedLevelKey)?.label;
      if (levelLabel) scopeParts.push(`Student Level: ${levelLabel}`);
    }

    return {
      academicYear: formatPeriodLabel(years, semesterKey),
      unitName: unitName || 'Institutional',
      scopeLabel: scopeParts.length > 0 ? scopeParts.join(' • ') : undefined,
      sections,
      appendices,
      grand,
      reportTitle: sourceMeta.reportTitle,
      reportSubtitle: sourceMeta.reportSubtitle,
      emptyMessage: sourceMeta.reportEmpty,
      totalLabel: sourceMeta.totalLabel,
    };
  };

  const buildEmployeeSection = (records: UnitPersonnelCensus[], title: string, years: number[]): SDDEmployeeSection => {
    const unitNameMap = new Map(units.map((unit) => [unit.id, unit.name]));

    const yearBlocks: SDDEmployeeYearBlock[] = years
      .map((year) => {
        const yearRecords = records.filter((record) => Number(record.year) === year);

        const buildGroup = (label: string, groupKey: 'teaching' | 'nonTeaching') => {
          const sectorMap: Record<string, { male: number; female: number }> = {};
          let male = 0;
          let female = 0;

          yearRecords.forEach((record) => {
            const group = record[groupKey];
            if (!group) return;
            male += Number(group.male || 0);
            female += Number(group.female || 0);
            Object.entries(group.sectors || {}).forEach(([sector, counts]: [string, any]) => {
              if (!sectorMap[sector]) sectorMap[sector] = { male: 0, female: 0 };
              sectorMap[sector].male += Number(counts?.male || 0);
              sectorMap[sector].female += Number(counts?.female || 0);
            });
          });

          const sectors: SDDSectorRow[] = Object.entries(sectorMap)
            .map(([sector, counts]) => ({
              sector,
              male: counts.male,
              female: counts.female,
              total: counts.male + counts.female,
            }))
            .filter((sector) => sector.total > 0)
            .sort((a, b) => b.total - a.total);

          return { label, male, female, sectors };
        };

        const groups = [buildGroup('Teaching Faculty', 'teaching'), buildGroup('Non-Teaching Staff', 'nonTeaching')];
        const grand = groups.reduce(
          (acc, group) => ({ male: acc.male + group.male, female: acc.female + group.female }),
          { male: 0, female: 0 },
        );

        const unitRows = yearRecords
          .map((record) => ({
            unitName: unitNameMap.get(record.unitId) || record.unitId,
            teachingMale: Number(record.teaching?.male || 0),
            teachingFemale: Number(record.teaching?.female || 0),
            nonTeachingMale: Number(record.nonTeaching?.male || 0),
            nonTeachingFemale: Number(record.nonTeaching?.female || 0),
          }))
          .sort((a, b) => a.unitName.localeCompare(b.unitName));

        return {
          academicYear: `${year}-${year + 1}`,
          groups,
          units: unitRows,
          grand,
          showUnitBreakdown: unitRows.length > 1,
        };
      })
      .filter((block) => block.grand.male + block.grand.female > 0);

    const grand = yearBlocks.reduce(
      (acc, block) => ({ male: acc.male + block.grand.male, female: acc.female + block.grand.female }),
      { male: 0, female: 0 },
    );

    return { title, years: yearBlocks, grand };
  };

  const buildEmployeeReportData = (years: number[], note?: string): EmployeeSDDReportData => {
    const allRecords = reportCensuses || [];
    const sections: SDDEmployeeSection[] = [];
    const appendices: SDDEmployeeSection[] = [];

    const addSection = (target: SDDEmployeeSection[], records: UnitPersonnelCensus[], title: string) => {
      const section = buildEmployeeSection(records, title, years);
      if (section.years.length > 0) target.push(section);
    };

    const campusList = campuses.filter((campus) => allRecords.some((record) => record.campusId === campus.id));

    if (printCampusId === 'all') {
      campusList.forEach((campus) => {
        addSection(
          sections,
          allRecords.filter((record) => record.campusId === campus.id),
          `Campus: ${campus.name}`,
        );
      });
    } else if (printCampusId === 'institution') {
      addSection(sections, allRecords, 'Institution Summary');
      campusList.forEach((campus) => {
        addSection(
          appendices,
          allRecords.filter((record) => record.campusId === campus.id),
          `Campus: ${campus.name}`,
        );
      });
    } else {
      addSection(
        sections,
        allRecords.filter((record) => record.campusId === printCampusId),
        `Campus: ${selectedCampusName}`,
      );
    }

    const grand = sections.reduce(
      (acc, section) => ({ male: acc.male + section.grand.male, female: acc.female + section.grand.female }),
      { male: 0, female: 0 },
    );

    return {
      academicYear: formatPeriodLabel(years),
      unitName: unitName || 'Institutional',
      scopeLabel: isSpecificCampus ? `Campus: ${selectedCampusName}` : undefined,
      sections,
      appendices,
      grand,
      note,
    };
  };

  const openSddPrintWindow = (title: string, reportHtml: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Popup Blocked',
        description: 'Please allow popups for this site to print the SDD report.',
        variant: 'destructive',
      });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <html>
      <head>
        <title>${title}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @media print {
            @page { size: letter portrait; margin: 0.4in; }
            body { margin: 0; padding: 0; background: white; }
            .no-print { display: none !important; }
            table { page-break-inside: avoid; break-inside: avoid; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            thead { display: table-header-group; }
          }
          body { font-family: serif; background: #f9fafb; padding: 20px; color: black; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        </style>
      </head>
      <body>
        <div class="no-print mb-8 flex justify-center">
          <button onclick="window.print()" class="bg-indigo-600 text-white px-8 py-3 rounded shadow-xl hover:bg-indigo-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print SDD Report</button>
        </div>
        <div id="print-content">${reportHtml}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const resolvePrintYears = () => {
    if (printMode === 'range') {
      const from = Math.min(printFromYear, printToYear);
      const to = Math.max(printFromYear, printToYear);
      const years: number[] = [];
      for (let year = from; year <= to && years.length < 20; year++) {
        years.push(year);
      }
      return years;
    }
    return [printYear];
  };

  const handlePrintSddReport = () => {
    const years = resolvePrintYears();

    try {
      if (printReportType === 'students') {
        const semesterKey =
          printMode === 'yearSemester' && reportSource !== 'board'
            ? reportSource === 'graduation' || printSemester !== 'unspecified'
              ? printSemester
              : 'firstSemester'
            : undefined;
        const reportData = buildStudentReportData(years, semesterKey, printStudentLevelMode, printStudentLevelKey);

        if (reportData.sections.length === 0 || reportData.grand.male + reportData.grand.female === 0) {
          toast({
            title: 'No Student Data',
            description: sourceMeta.printEmpty,
            variant: 'destructive',
          });
          return;
        }

        const reportHtml = renderToStaticMarkup(
          <SDDStudentReportTemplate
            data={reportData}
            signatories={signatories || undefined}
            gadSettings={gadSettings || undefined}
          />,
        );
        openSddPrintWindow(`GAD SDD Report - Students - ${reportData.academicYear}`, reportHtml);
      } else {
        const note =
          printMode === 'yearSemester'
            ? 'Note: The personnel census is recorded annually, so the selected semester does not alter employee figures.'
            : undefined;
        const reportData = buildEmployeeReportData(years, note);

        if (reportData.grand.male + reportData.grand.female === 0) {
          toast({
            title: 'No Employee Data',
            description: 'There is no personnel census data to print for the selected period.',
            variant: 'destructive',
          });
          return;
        }

        const reportHtml = renderToStaticMarkup(
          <SDDEmployeeReportTemplate
            data={reportData}
            signatories={signatories || undefined}
            gadSettings={gadSettings || undefined}
          />,
        );
        openSddPrintWindow(`GAD SDD Report - Employees - ${reportData.academicYear}`, reportHtml);
      }

      setIsPrintDialogOpen(false);
    } catch (error) {
      console.error('SDD print error:', error);
      toast({ title: 'Print Failed', description: 'Could not generate the SDD report.', variant: 'destructive' });
    }
  };

  const openPrintDialog = (reportType: 'students' | 'employees') => {
    setPrintReportType(reportType);
    setIsPrintDialogOpen(true);
  };

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[10px] font-black"
      >{`${(percent * 100).toFixed(0)}%`}</text>
    );
  };

  return (
    <div className="space-y-8 border-none pb-20">
      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-primary mb-1">
                <Info className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Institutional SDD HUB
                </span>
              </div>
              <CardTitle className="text-lg font-black uppercase tracking-tight">
                Sex-Disaggregated Data (SDD) Hub: {unitName}
              </CardTitle>
              <CardDescription className="text-xs">
                Consolidated analysis of students, personnel, and activity participants for Academic Year{' '}
                {dashboardYear}-{dashboardYear + 1} (AY {dashboardYear} Baseline).
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-primary/70">Report Source</span>
                <Select value={reportSource} onValueChange={(value) => setReportSource(value as StudentReportSource)}>
                  <SelectTrigger className="h-8 w-[150px] border-primary/30 bg-white text-[10px] font-black uppercase tracking-wider">
                    <Layers className="mr-1.5 h-3 w-3 shrink-0 text-primary" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDENT_SOURCE_OPTIONS.map((source) => (
                      <SelectItem key={source.key} value={source.key}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <AcademicYearSelect value={dashboardYear} years={yearOptions} onChange={setDashboardYear} />
              <Badge className="bg-primary hover:bg-primary/90 text-white font-black text-xs px-3.5 py-1 uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <CalendarRange className="h-3.5 w-3.5" />
                AY {dashboardYear} &ndash; {dashboardYear + 1}
              </Badge>
              <Badge
                variant="outline"
                className="bg-white border-primary/20 text-primary text-[10px] font-black uppercase px-2.5 py-1"
              >
                {sourceMeta.badge}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openPrintDialog('students')}
                className="h-8 gap-1.5 border-primary/30 bg-white text-[10px] font-black uppercase tracking-wider text-primary hover:bg-primary/5"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Student SDD
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openPrintDialog('employees')}
                className="h-8 gap-1.5 border-primary/30 bg-white text-[10px] font-black uppercase tracking-wider text-primary hover:bg-primary/5"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Employee SDD
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* TOP MANAGEMENT SDD ANALYTICS & SECTORAL DECISION SUPPORT SYSTEM */}
      <SDDDecisionSupport
        dashboardYear={dashboardYear}
        unitName={unitName || 'Institutional'}
        studentBaseline={studentSourceBaseline}
        studentSecondSem={studentYearlyData.find((entry) => entry.year === dashboardYear)?.secondSemester}
        previousYearStudentBaseline={studentYearlyData.find((entry) => entry.year === dashboardYear - 1)?.firstSemester}
        studentSectorCounts={aggregatedData.studentSectorMap}
        censuses={reportCensuses || []}
        activities={activities || []}
        signatories={signatories || undefined}
        gadSettings={gadSettings || undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3D SVG GRADIENTS & DEPTH FILTERS */}
        <Chart3DDefs idPrefix="sddhub3d" />

        {/* STUDENT SDD SUMMARY */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-lg hover:shadow-xl transition-all border-primary/10 rounded-2xl overflow-hidden flex flex-col h-full bg-white dark:bg-slate-900">
            <CardHeader className="p-4 bg-primary/5 border-b text-center shrink-0">
              <div className="flex items-center justify-between gap-2 border-b pb-2 mb-2">
                <AcademicYearSelect
                  value={dashboardYear}
                  years={yearOptions}
                  onChange={setDashboardYear}
                  className="h-7 w-[125px] border-primary/20 bg-white text-[9px] font-black uppercase tracking-wide"
                />
                <span className="text-[8px] font-bold uppercase text-muted-foreground bg-primary/5 px-2 py-0.5 rounded">
                  {sourceMeta.badge}
                </span>
              </div>
              <div className="mx-auto h-10 w-10 rounded-full bg-white flex items-center justify-center mb-2 shadow-sm">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-[10px] font-black uppercase tracking-widest leading-tight">
                {sourceMeta.baselineTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 flex-1 flex flex-col items-center justify-center">
              {studentSourcePieData.length > 0 ? (
                <>
                  <ChartContainer config={{}} className="h-[220px] w-full mb-6">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={studentSourcePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                          label={RenderPie3DLabel}
                          labelLine={false}
                        >
                          {studentSourcePieData.map((e, j) => (
                            <Cell
                              key={j}
                              fill={j === 0 ? 'url(#sddhub3d-grad-indigo)' : 'url(#sddhub3d-grad-rose)'}
                              filter="url(#sddhub3d-soft-depth)"
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                        <Legend
                          verticalAlign="bottom"
                          align="center"
                          wrapperStyle={{
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            fontWeight: 'bold',
                            paddingTop: '20px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                  <div className="text-center">
                    <p className="text-4xl font-black text-slate-900 dark:text-slate-100 tabular-nums leading-none drop-shadow-sm">
                      {studentSourceBaseline.total.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                      {sourceMeta.baselineTotalLabel} (AY {dashboardYear}&ndash;{dashboardYear + 1})
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center opacity-20 py-20 space-y-3">
                  <PieIcon className="h-12 w-12" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    No {sourceMeta.label.toLowerCase()} data for AY {dashboardYear}-{dashboardYear + 1}
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-muted/5 border-t py-3 px-6 flex items-start gap-2.5">
              <Users className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                {sourceMeta.baselineFooter}
              </p>
            </CardFooter>
          </Card>
        </div>

        {/* STUDENT POPULATION BY ACADEMIC YEAR */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg hover:shadow-xl transition-all border-primary/10 rounded-2xl h-full flex flex-col bg-white dark:bg-slate-900">
            <CardHeader className="bg-muted/10 border-b py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-tight">
                      {sourceMeta.tableTitle}
                    </CardTitle>
                    <CardDescription className="text-[10px]">{sourceMeta.tableDescription}</CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="w-fit text-[9px] font-black uppercase border-primary/30 text-primary bg-white"
                >
                  {studentYearlyData.length} AY Tracked
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-x-auto">
              {studentYearlyData.length > 0 ? (
                <table
                  className={cn(
                    'w-full border-collapse text-[11px]',
                    sourceTermColumns.length === 1 ? 'min-w-[420px]' : 'min-w-[1040px]',
                  )}
                >
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">
                      <th rowSpan={2} className="px-5 py-3 text-left align-middle">
                        Academic Year
                      </th>
                      {sourceTermColumns.map((column, index) => (
                        <th
                          key={column.key}
                          colSpan={3}
                          className={cn(
                            'px-4 py-2 text-center',
                            index > 0 && 'border-l border-slate-200 dark:border-slate-700',
                          )}
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-800/70 text-[8px] font-black uppercase text-slate-500 dark:text-slate-400">
                      {sourceTermColumns.map((column, index) => (
                        <Fragment key={column.key}>
                          <th
                            className={cn(
                              'px-3 py-2 text-center text-indigo-600 dark:text-indigo-400',
                              index > 0 && 'border-l border-slate-200 dark:border-slate-700',
                            )}
                          >
                            Male
                          </th>
                          <th className="px-3 py-2 text-center text-rose-600 dark:text-rose-400">Female</th>
                          <th className="px-3 py-2 text-center">Total</th>
                        </Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studentYearlyData.map((row) => {
                      const isCurrent = row.year === dashboardYear;

                      return (
                        <tr
                          key={row.year}
                          className={cn(
                            'border-b last:border-0 transition-colors',
                            isCurrent ? 'bg-primary/5' : 'hover:bg-muted/30',
                          )}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900 dark:text-slate-100 tabular-nums">
                                AY {row.year}&ndash;{row.year + 1}
                              </span>
                              {isCurrent && (
                                <Badge className="h-4 bg-primary/10 px-1.5 text-[8px] font-black uppercase text-primary hover:bg-primary/10">
                                  Current
                                </Badge>
                              )}
                            </div>
                          </td>
                          {sourceTermColumns.map((column, index) => {
                            const term = row[column.key];
                            return (
                              <Fragment key={`${row.year}-${column.key}`}>
                                <td
                                  className={cn(
                                    'px-3 py-3 text-center font-black tabular-nums text-indigo-600 dark:text-indigo-400',
                                    index > 0 && 'border-l border-border/50',
                                  )}
                                >
                                  {term.male.toLocaleString()}
                                </td>
                                <td className="px-3 py-3 text-center font-black tabular-nums text-rose-600 dark:text-rose-400">
                                  {term.female.toLocaleString()}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <span className="inline-flex min-w-[56px] justify-center rounded-md bg-primary/5 px-2 py-1 font-black tabular-nums text-primary">
                                    {term.total.toLocaleString()}
                                  </span>
                                </td>
                              </Fragment>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-16 opacity-30">
                  <Users className="h-10 w-10" />
                  <p className="text-[10px] font-black uppercase tracking-widest">{sourceMeta.tableEmpty}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-muted/5 border-t py-3 px-6 flex items-start gap-2.5">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                Headcounts consolidate the {sourceMeta.label.toLowerCase()} records of all programs in scope for each
                academic year. Male and female totals support year-on-year sex-disaggregated trend analysis for GAD
                planning and reporting.
              </p>
            </CardFooter>
          </Card>
        </div>

        {reportSource === 'enrollment' && (
          <>
            {/* STUDENT SECTORAL DISTRIBUTION */}
            <div className="lg:col-span-3">
              <Card className="shadow-lg hover:shadow-xl transition-all border-primary/10 rounded-2xl h-full flex flex-col bg-white dark:bg-slate-900">
                <CardHeader className="bg-muted/10 border-b py-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      <CardTitle className="text-sm font-black uppercase tracking-tight">
                        Student Sectoral Reach Analysis (3D)
                      </CardTitle>
                    </div>
                    <AcademicYearSelect value={dashboardYear} years={yearOptions} onChange={setDashboardYear} />
                  </div>
                  <CardDescription className="text-[10px]">
                    Consolidated headcount of students belonging to marginalized or prioritized GAD groups for AY{' '}
                    {dashboardYear}&ndash;{dashboardYear + 1}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 flex-1">
                  {aggregatedData.studentSectors.length > 0 ? (
                    <ChartContainer config={{}} className="h-[350px] w-full">
                      <ResponsiveContainer>
                        <BarChart
                          data={aggregatedData.studentSectors}
                          layout="vertical"
                          margin={{ left: 20, right: 50 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.15} />
                          <XAxis type="number" hide />
                          <YAxis
                            dataKey="name"
                            type="category"
                            tick={{ fontSize: 9, fontWeight: 900 }}
                            width={120}
                            axisLine={false}
                            tickLine={false}
                          />
                          <RechartsTooltip content={<ChartTooltipContent />} />
                          <Legend
                            verticalAlign="top"
                            align="right"
                            wrapperStyle={{
                              fontSize: '9px',
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                              paddingBottom: '10px',
                            }}
                          />
                          <Bar
                            dataKey="male"
                            stackId="a"
                            fill="url(#sddhub3d-grad-indigo)"
                            filter="url(#sddhub3d-soft-depth)"
                            radius={[0, 0, 0, 0]}
                          />
                          <Bar
                            dataKey="female"
                            stackId="a"
                            fill="url(#sddhub3d-grad-rose)"
                            radius={[0, 6, 6, 0]}
                            filter="url(#sddhub3d-soft-depth)"
                          >
                            <LabelList
                              dataKey="total"
                              position="right"
                              style={{ fontSize: '11px', fontWeight: '900', fill: 'hsl(var(--primary))' }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-20">
                      <LayoutList className="h-12 w-12" />
                      <p className="text-[10px] font-black uppercase tracking-widest mt-2">
                        Zero Sectoral Hits Recorded
                      </p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="bg-muted/5 border-t py-3 px-6 flex items-start gap-2.5">
                  <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                    This analysis profiles student representation across vulnerable sectors—such as Solo Parents,
                    Persons with Disabilities, Indigenous Peoples, and 4Ps beneficiaries—disaggregated by gender.
                    Measuring sectoral enrollment informs targeted scholarship allocations, barrier-free campus
                    initiatives, and academic retention interventions aligned with the Magna Carta of Women and
                    Philippine Harmonized GAD Guidelines.
                  </p>
                </CardFooter>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* STUDENT SDD BY YEAR LEVEL */}
      {reportSource === 'enrollment' && (
        <Card className="shadow-lg border-primary/10 rounded-2xl overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <LayoutList className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-tight">
                    Student SDD by Year Level
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    Enrollment disaggregated by sex and year level for AY {dashboardYear}&ndash;{dashboardYear + 1}.
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <AcademicYearSelect value={dashboardYear} years={yearOptions} onChange={setDashboardYear} />
                <Badge
                  variant="outline"
                  className="w-fit text-[9px] font-black uppercase border-primary/30 text-primary bg-white flex items-center gap-1"
                >
                  <LayoutList className="h-3 w-3" /> Year-Level Breakdown
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 font-black uppercase text-[9px]">
                  <th rowSpan={2} className="border border-slate-200 p-2 text-left">
                    Year Level
                  </th>
                  <th colSpan={3} className="border border-slate-200 p-2 text-center">
                    First Semester
                  </th>
                  <th colSpan={3} className="border border-slate-200 p-2 text-center">
                    Second Semester
                  </th>
                  {studentLevelRowData.hasMidyear && (
                    <th colSpan={3} className="border border-slate-200 p-2 text-center">
                      Midyear Term
                    </th>
                  )}
                  <th colSpan={3} className="border border-slate-200 p-2 text-center">
                    Overall Total
                  </th>
                </tr>
                <tr className="bg-slate-50 dark:bg-slate-800/60 font-black uppercase text-[8px] text-slate-500">
                  <th className="border border-slate-200 p-1.5 text-right">Male</th>
                  <th className="border border-slate-200 p-1.5 text-right">Female</th>
                  <th className="border border-slate-200 p-1.5 text-right">Total</th>
                  <th className="border border-slate-200 p-1.5 text-right">Male</th>
                  <th className="border border-slate-200 p-1.5 text-right">Female</th>
                  <th className="border border-slate-200 p-1.5 text-right">Total</th>
                  {studentLevelRowData.hasMidyear && (
                    <>
                      <th className="border border-slate-200 p-1.5 text-right">Male</th>
                      <th className="border border-slate-200 p-1.5 text-right">Female</th>
                      <th className="border border-slate-200 p-1.5 text-right">Total</th>
                    </>
                  )}
                  <th className="border border-slate-200 p-1.5 text-right">Male</th>
                  <th className="border border-slate-200 p-1.5 text-right">Female</th>
                  <th className="border border-slate-200 p-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {studentLevelRowData.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={studentLevelRowData.hasMidyear ? 13 : 10}
                      className="border border-slate-200 p-6 text-center italic text-muted-foreground"
                    >
                      No year-level enrollment data for AY {dashboardYear}&ndash;{dashboardYear + 1}.
                    </td>
                  </tr>
                ) : (
                  <>
                    {studentLevelRowData.rows.map((row) => (
                      <tr key={row.label} className="hover:bg-primary/5 transition-colors">
                        <td className="border border-slate-200 p-2 font-bold">{row.label}</td>
                        <td className="border border-slate-200 p-2 text-right tabular-nums">
                          {row.first.male.toLocaleString()}
                        </td>
                        <td className="border border-slate-200 p-2 text-right tabular-nums">
                          {row.first.female.toLocaleString()}
                        </td>
                        <td className="border border-slate-200 p-2 text-right tabular-nums font-bold">
                          {(row.first.male + row.first.female).toLocaleString()}
                        </td>
                        <td className="border border-slate-200 p-2 text-right tabular-nums">
                          {row.second.male.toLocaleString()}
                        </td>
                        <td className="border border-slate-200 p-2 text-right tabular-nums">
                          {row.second.female.toLocaleString()}
                        </td>
                        <td className="border border-slate-200 p-2 text-right tabular-nums font-bold">
                          {(row.second.male + row.second.female).toLocaleString()}
                        </td>
                        {studentLevelRowData.hasMidyear && (
                          <>
                            <td className="border border-slate-200 p-2 text-right tabular-nums">
                              {row.midyear.male.toLocaleString()}
                            </td>
                            <td className="border border-slate-200 p-2 text-right tabular-nums">
                              {row.midyear.female.toLocaleString()}
                            </td>
                            <td className="border border-slate-200 p-2 text-right tabular-nums font-bold">
                              {(row.midyear.male + row.midyear.female).toLocaleString()}
                            </td>
                          </>
                        )}
                        <td className="border border-slate-200 p-2 text-right tabular-nums">
                          {row.total.male.toLocaleString()}
                        </td>
                        <td className="border border-slate-200 p-2 text-right tabular-nums">
                          {row.total.female.toLocaleString()}
                        </td>
                        <td className="border border-slate-200 p-2 text-right tabular-nums font-black text-primary">
                          {(row.total.male + row.total.female).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-primary/5 font-black">
                      <td className="border border-slate-200 p-2 uppercase">Total</td>
                      <td className="border border-slate-200 p-2 text-right tabular-nums">
                        {studentLevelRowData.totals.first.male.toLocaleString()}
                      </td>
                      <td className="border border-slate-200 p-2 text-right tabular-nums">
                        {studentLevelRowData.totals.first.female.toLocaleString()}
                      </td>
                      <td className="border border-slate-200 p-2 text-right tabular-nums">
                        {(
                          studentLevelRowData.totals.first.male + studentLevelRowData.totals.first.female
                        ).toLocaleString()}
                      </td>
                      <td className="border border-slate-200 p-2 text-right tabular-nums">
                        {studentLevelRowData.totals.second.male.toLocaleString()}
                      </td>
                      <td className="border border-slate-200 p-2 text-right tabular-nums">
                        {studentLevelRowData.totals.second.female.toLocaleString()}
                      </td>
                      <td className="border border-slate-200 p-2 text-right tabular-nums">
                        {(
                          studentLevelRowData.totals.second.male + studentLevelRowData.totals.second.female
                        ).toLocaleString()}
                      </td>
                      {studentLevelRowData.hasMidyear && (
                        <>
                          <td className="border border-slate-200 p-2 text-right tabular-nums">
                            {studentLevelRowData.totals.midyear.male.toLocaleString()}
                          </td>
                          <td className="border border-slate-200 p-2 text-right tabular-nums">
                            {studentLevelRowData.totals.midyear.female.toLocaleString()}
                          </td>
                          <td className="border border-slate-200 p-2 text-right tabular-nums">
                            {(
                              studentLevelRowData.totals.midyear.male + studentLevelRowData.totals.midyear.female
                            ).toLocaleString()}
                          </td>
                        </>
                      )}
                      <td className="border border-slate-200 p-2 text-right tabular-nums">
                        {studentLevelRowData.totals.overall.male.toLocaleString()}
                      </td>
                      <td className="border border-slate-200 p-2 text-right tabular-nums">
                        {studentLevelRowData.totals.overall.female.toLocaleString()}
                      </td>
                      <td className="border border-slate-200 p-2 text-right tabular-nums">
                        {(
                          studentLevelRowData.totals.overall.male + studentLevelRowData.totals.overall.female
                        ).toLocaleString()}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </CardContent>
          <CardFooter className="bg-muted/5 border-t py-3 px-6 flex items-start gap-2.5">
            <LayoutList className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
              Year-level headcounts are consolidated from the enrollment records of all programs in scope. The table
              includes first and second semester figures, plus the midyear term when recorded. Use the academic year
              selector to review a different school year.
            </p>
          </CardFooter>
        </Card>
      )}

      {/* UNIT PERSONNEL CENSUS WORKSPACE */}
      {!isLoadingCensus && userProfile?.unitId && (
        <Card className="border-indigo-200 shadow-xl overflow-hidden bg-indigo-50/5">
          <CardHeader className="bg-indigo-50 border-b py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Briefcase className="h-5 w-5" />
                  <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2 flex-wrap">
                    Unit Personnel Census Workspace
                    <Badge className="bg-indigo-600 text-white font-black text-[9px] uppercase">
                      AY {dashboardYear}&ndash;{dashboardYear + 1}
                    </Badge>
                  </CardTitle>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600/70">
                  Update total employee headcount for your office for AY {dashboardYear}&ndash;{dashboardYear + 1}{' '}
                  (Fiscal Year {dashboardYear}).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <AcademicYearSelect
                  value={dashboardYear}
                  years={yearOptions}
                  onChange={setDashboardYear}
                  className="h-10 w-[160px] border-indigo-300 bg-white text-[10px] font-black uppercase tracking-wider text-indigo-700"
                />
                <Button
                  variant="outline"
                  onClick={handleAutoCalculateCensus}
                  disabled={isLoadingPersonnel || isSavingCensus}
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-100/50 hover:text-indigo-800 bg-white font-black uppercase text-[10px] tracking-widest h-10 px-5"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Sync from Registry
                </Button>
                <Button
                  onClick={handleSaveCensus}
                  disabled={isSavingCensus}
                  className="shadow-lg shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700 font-black uppercase text-[10px] tracking-widest h-10 px-8"
                >
                  {isSavingCensus ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Commit Personnel Registry
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* TEACHING CENSUS */}
              <section className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-800 border-b pb-1 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" /> 1. Teaching Faculty (Unit Total)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Total Male</Label>
                    <Input
                      type="number"
                      value={censusForm.teaching?.male}
                      onChange={(e) =>
                        setCensusForm((prev) => ({
                          ...prev,
                          teaching: { ...prev.teaching!, male: Number(e.target.value) },
                        }))
                      }
                      className="h-10 bg-white font-black"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Total Female</Label>
                    <Input
                      type="number"
                      value={censusForm.teaching?.female}
                      onChange={(e) =>
                        setCensusForm((prev) => ({
                          ...prev,
                          teaching: { ...prev.teaching!, female: Number(e.target.value) },
                        }))
                      }
                      className="h-10 bg-white font-black"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[9px] font-bold text-indigo-400 uppercase">
                    Sectoral Breakdown (Teaching Faculty)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {GAD_SECTORS.map((sec) => (
                      <div key={sec} className="p-2 rounded-lg bg-white border border-indigo-100 flex flex-col gap-2">
                        <p className="text-[8px] font-black uppercase truncate">{sec}</p>
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            placeholder="M"
                            value={censusForm.teaching?.sectors?.[sec]?.male || 0}
                            onChange={(e) =>
                              setCensusForm((prev) => ({
                                ...prev,
                                teaching: {
                                  ...prev.teaching!,
                                  sectors: {
                                    ...prev.teaching!.sectors,
                                    [sec]: {
                                      ...(prev.teaching!.sectors![sec] || { female: 0 }),
                                      male: Number(e.target.value),
                                    },
                                  },
                                },
                              }))
                            }
                            className="h-6 text-[9px] w-full px-1 text-center"
                          />
                          <Input
                            type="number"
                            placeholder="F"
                            value={censusForm.teaching?.sectors?.[sec]?.female || 0}
                            onChange={(e) =>
                              setCensusForm((prev) => ({
                                ...prev,
                                teaching: {
                                  ...prev.teaching!,
                                  sectors: {
                                    ...prev.teaching!.sectors,
                                    [sec]: {
                                      ...(prev.teaching!.sectors![sec] || { male: 0 }),
                                      female: Number(e.target.value),
                                    },
                                  },
                                },
                              }))
                            }
                            className="h-6 text-[9px] w-full px-1 text-center"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* NON-TEACHING CENSUS */}
              <section className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-800 border-b pb-1 flex items-center gap-2">
                  <Users className="h-4 w-4" /> 2. Non-Teaching Staff (Unit Total)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Total Male</Label>
                    <Input
                      type="number"
                      value={censusForm.nonTeaching?.male}
                      onChange={(e) =>
                        setCensusForm((prev) => ({
                          ...prev,
                          nonTeaching: { ...prev.nonTeaching!, male: Number(e.target.value) },
                        }))
                      }
                      className="h-10 bg-white font-black"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Total Female</Label>
                    <Input
                      type="number"
                      value={censusForm.nonTeaching?.female}
                      onChange={(e) =>
                        setCensusForm((prev) => ({
                          ...prev,
                          nonTeaching: { ...prev.nonTeaching!, female: Number(e.target.value) },
                        }))
                      }
                      className="h-10 bg-white font-black"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[9px] font-bold text-indigo-400 uppercase">Sectoral Breakdown (Staff)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {GAD_SECTORS.map((sec) => (
                      <div key={sec} className="p-2 rounded-lg bg-white border border-indigo-100 flex flex-col gap-2">
                        <p className="text-[8px] font-black uppercase truncate">{sec}</p>
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            placeholder="M"
                            value={censusForm.nonTeaching?.sectors?.[sec]?.male || 0}
                            onChange={(e) =>
                              setCensusForm((prev) => ({
                                ...prev,
                                nonTeaching: {
                                  ...prev.nonTeaching!,
                                  sectors: {
                                    ...prev.nonTeaching!.sectors,
                                    [sec]: {
                                      ...(prev.nonTeaching!.sectors![sec] || { female: 0 }),
                                      male: Number(e.target.value),
                                    },
                                  },
                                },
                              }))
                            }
                            className="h-6 text-[9px] w-full px-1 text-center"
                          />
                          <Input
                            type="number"
                            placeholder="F"
                            value={censusForm.nonTeaching?.sectors?.[sec]?.female || 0}
                            onChange={(e) =>
                              setCensusForm((prev) => ({
                                ...prev,
                                nonTeaching: {
                                  ...prev.nonTeaching!,
                                  sectors: {
                                    ...prev.nonTeaching!.sectors,
                                    [sec]: {
                                      ...(prev.nonTeaching!.sectors![sec] || { male: 0 }),
                                      female: Number(e.target.value),
                                    },
                                  },
                                },
                              }))
                            }
                            className="h-6 text-[9px] w-full px-1 text-center"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </CardContent>
          <CardFooter className="bg-indigo-100/30 border-t py-4 px-8 flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-indigo-900/90 leading-relaxed font-medium">
              This personnel census establishes verified institutional denominators for faculty and administrative
              workforce participation disaggregated by sex and vulnerable sector classifications. Accurate reporting
              ensures compliance with PCW-NEDA-DBM Joint Circular guidelines and guarantees precise attribution
              calculations for institutional GAD Plan and Budget (GPB) submissions.
            </p>
          </CardFooter>
        </Card>
      )}

      {/* INDIVIDUAL UNIT SDD EXPLORER */}
      {(isAdmin || userRole?.toLowerCase().includes('director') || userRole?.toLowerCase().includes('odimo')) && (
        <UnitSddExplorer
          compliances={studentRecordSource}
          units={units}
          selectedYear={dashboardYear}
          availableYears={yearOptions}
          onYearChange={setDashboardYear}
        />
      )}

      <Card className="border-primary/10 shadow-md">
        <CardHeader className="bg-muted/10 border-b">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <School className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">
                Institutional SDD Reporting Guidelines
              </CardTitle>
            </div>
            <AcademicYearSelect value={dashboardYear} years={yearOptions} onChange={setDashboardYear} />
          </div>
        </CardHeader>
        <CardContent className="p-6 flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              The RSU EOMS Portal automatically consolidates SDD from academic monitoring (students) and the personnel
              census (employees). This data is critical for generating the university's{' '}
              <strong>GAD Accomplishment Reports</strong> for the Philippine Commission on Women.
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight">Print SDD Report</DialogTitle>
            <DialogDescription>
              Configure the report type and reporting period. Student reports follow the selected Report Source (
              {sourceMeta.label}) while employee reports use the annual personnel census.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Report Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={printReportType === 'students' ? 'default' : 'outline'}
                  onClick={() => setPrintReportType('students')}
                  className="h-9 text-[10px] font-black uppercase tracking-wider"
                >
                  <GraduationCap className="mr-1.5 h-3.5 w-3.5" /> Students
                </Button>
                <Button
                  type="button"
                  variant={printReportType === 'employees' ? 'default' : 'outline'}
                  onClick={() => setPrintReportType('employees')}
                  className="h-9 text-[10px] font-black uppercase tracking-wider"
                >
                  <Briefcase className="mr-1.5 h-3.5 w-3.5" /> Employees
                </Button>
              </div>
            </div>

            {printReportType === 'students' && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Student Type</Label>
                <Select
                  value={printStudentType}
                  onValueChange={(value) => setPrintStudentType(value as 'all' | 'undergraduate' | 'graduate')}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Student Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Student Types</SelectItem>
                    <SelectItem value="undergraduate">Undergraduate Student</SelectItem>
                    <SelectItem value="graduate">Graduate Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {printReportType === 'students' && reportSource === 'enrollment' && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Student Level</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={printStudentLevelMode === 'byLevel' ? 'default' : 'outline'}
                    onClick={() => setPrintStudentLevelMode('byLevel')}
                    className="h-9 text-[10px] font-black uppercase tracking-wider"
                  >
                    By Level
                  </Button>
                  <Button
                    type="button"
                    variant={printStudentLevelMode === 'selected' ? 'default' : 'outline'}
                    onClick={() => setPrintStudentLevelMode('selected')}
                    className="h-9 text-[10px] font-black uppercase tracking-wider"
                  >
                    Select Level
                  </Button>
                  <Button
                    type="button"
                    variant={printStudentLevelMode === 'overall' ? 'default' : 'outline'}
                    onClick={() => setPrintStudentLevelMode('overall')}
                    className="h-9 text-[10px] font-black uppercase tracking-wider"
                  >
                    Overall Total
                  </Button>
                </div>
                {printStudentLevelMode === 'selected' && (
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {STUDENT_LEVEL_OPTIONS.map((level) => (
                      <Button
                        key={level.key}
                        type="button"
                        variant={printStudentLevelKey === level.key ? 'default' : 'outline'}
                        onClick={() => setPrintStudentLevelKey(level.key)}
                        className="h-8 text-[9px] font-black uppercase tracking-wider"
                      >
                        {level.label}
                      </Button>
                    ))}
                  </div>
                )}
                {printStudentLevelMode === 'overall' && (
                  <p className="text-[10px] italic text-muted-foreground">
                    Uses the Total Overall Male, Total Overall Female, and Overall Total saved in Rapid Hub Entry.
                  </p>
                )}
              </div>
            )}

            {printReportType === 'students' && reportSource !== 'enrollment' && (
              <p className="text-[10px] italic text-muted-foreground">
                The {sourceMeta.label} source has no year-level breakdown, so the report uses overall sex-disaggregated
                figures.
              </p>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Reporting Period</Label>
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant={printMode === 'range' ? 'default' : 'outline'}
                  onClick={() => setPrintMode('range')}
                  className="h-auto justify-start px-3 py-2 text-left"
                >
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider">From Year and To Year</p>
                    <p className="text-[9px] font-medium opacity-70">Print a multi-year SDD report</p>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={printMode === 'year' ? 'default' : 'outline'}
                  onClick={() => setPrintMode('year')}
                  className="h-auto justify-start px-3 py-2 text-left"
                >
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider">Year Only</p>
                    <p className="text-[9px] font-medium opacity-70">
                      Print both first and second semester for one school year
                    </p>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={printMode === 'yearSemester' ? 'default' : 'outline'}
                  onClick={() => setPrintMode('yearSemester')}
                  className="h-auto justify-start px-3 py-2 text-left"
                >
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider">Year &amp; Semester</p>
                    <p className="text-[9px] font-medium opacity-70">Print one school year and one semester</p>
                  </div>
                </Button>
              </div>
            </div>

            {printMode === 'range' ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">From Year</Label>
                  <Input
                    type="number"
                    value={printFromYear}
                    onChange={(event) => setPrintFromYear(Number(event.target.value))}
                    min={2000}
                    max={2100}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">To Year</Label>
                  <Input
                    type="number"
                    value={printToYear}
                    onChange={(event) => setPrintToYear(Number(event.target.value))}
                    min={2000}
                    max={2100}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Year</Label>
                <Input
                  type="number"
                  value={printYear}
                  onChange={(event) => setPrintYear(Number(event.target.value))}
                  min={2000}
                  max={2100}
                />
              </div>
            )}

            {printMode === 'yearSemester' && printReportType === 'students' && reportSource !== 'board' && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Semester</Label>
                <div className={cn('grid gap-2', reportSource === 'graduation' ? 'grid-cols-4' : 'grid-cols-3')}>
                  {(
                    [
                      { key: 'firstSemester', label: 'First' },
                      { key: 'secondSemester', label: 'Second' },
                      { key: 'midYearTerm', label: 'Midyear' },
                      ...(reportSource === 'graduation' ? [{ key: 'unspecified' as const, label: 'All' }] : []),
                    ] as const
                  ).map((semester) => (
                    <Button
                      key={semester.key}
                      type="button"
                      variant={printSemester === semester.key ? 'default' : 'outline'}
                      onClick={() => setPrintSemester(semester.key)}
                      className="h-8 text-[10px] font-black uppercase tracking-wider"
                    >
                      {semester.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {printMode === 'yearSemester' && printReportType === 'students' && reportSource === 'board' && (
              <p className="text-[10px] italic text-muted-foreground">
                Board passer data is recorded annually, so the semester selection does not change the figures.
              </p>
            )}

            {printMode === 'yearSemester' && printReportType === 'employees' && (
              <p className="text-[10px] italic text-muted-foreground">
                The personnel census is recorded annually, so the semester selection does not change employee figures.
              </p>
            )}

            <div className="space-y-2 border-t pt-4">
              <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Campus / Program Filter
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold uppercase text-slate-400">Campus</Label>
                  <Select value={printCampusId} onValueChange={setPrintCampusId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Campuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campus - List Down</SelectItem>
                      <SelectItem value="institution">Institution Summary</SelectItem>
                      {campuses.map((campus) => (
                        <SelectItem key={campus.id} value={campus.id}>
                          {campus.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold uppercase text-slate-400">Program</Label>
                  <Select
                    value={printProgramId}
                    onValueChange={setPrintProgramId}
                    disabled={printReportType === 'employees'}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Programs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Programs - List</SelectItem>
                      <SelectItem value="institution">Institutional Summary</SelectItem>
                      {printProgramOptions.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {printReportType === 'employees' && (
                <p className="text-[10px] italic text-muted-foreground">
                  Employee census data is not program-specific. Campus list, campus summary, and institution summary
                  apply; per-program breakdowns are available for the Student report only.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPrintDialogOpen(false)}
              className="text-[10px] font-black uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePrintSddReport}
              className="gap-1.5 text-[10px] font-black uppercase tracking-wider"
            >
              <Printer className="h-3.5 w-3.5" /> Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
