'use client';

/**
 * @fileOverview XLSX template generation and batch import for CHED enrollment and graduation data.
 */

import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import type { AcademicProgram, Campus, EnrollmentRecord, ProgramComplianceRecord } from '@/lib/types';
import { withEnrollmentOveralls } from '@/lib/enrollment';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertTriangle, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';

interface BatchXlsxImportProps {
  programs: AcademicProgram[];
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  selectedYear: number;
  canEdit: boolean;
}

const YEAR_LEVELS = [
  { label: 'First Year', key: 'firstYear' },
  { label: 'Second Year', key: 'secondYear' },
  { label: 'Third Year', key: 'thirdYear' },
  { label: 'Fourth Year', key: 'fourthYear' },
  { label: 'Fifth Year', key: 'fifthYear' },
] as const;

const SEMESTERS = [
  { label: '1st Semester', key: 'firstSemester' },
  { label: '2nd Semester', key: 'secondSemester' },
  { label: 'Summer / Midyear', key: 'midYearTerm' },
] as const;

const ENROLLMENT_HEADERS = [
  'Academic Year',
  'Campus',
  'Program',
  'Program ID',
  'Major / Specialization',
  'Year Level',
  'Semester',
  'Male',
  'Female',
  'Total',
];

const GRADUATION_HEADERS = [
  'Academic Year',
  'Campus',
  'Program',
  'Program ID',
  'Major / Specialization',
  'Year Level',
  'Semester',
  'Male Graduates',
  'Female Graduates',
  'Total Graduates',
];

type EnrollmentUpdate = {
  program: AcademicProgram;
  year: number;
  majorId: string;
  termKey: 'firstSemester' | 'secondSemester' | 'midYearTerm';
  levelKey: (typeof YEAR_LEVELS)[number]['key'];
  male: number;
  female: number;
};

type GraduationUpdate = {
  program: AcademicProgram;
  year: number;
  majorId: string;
  yearLevel: string;
  semester: string;
  male: number;
  female: number;
};

type ImportScope = 'both' | 'enrollment' | 'graduation';

type ImportPreview = {
  fileName: string;
  enrollmentUpdates: EnrollmentUpdate[];
  graduationUpdates: GraduationUpdate[];
  programIds: string[];
  years: number[];
  skippedEnrollment: number;
  skippedGraduation: number;
  errors: string[];
};

const normalizeKey = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const toNumber = (value: unknown) => {
  const parsed = Number(
    String(value ?? '')
      .replace(/,/g, '')
      .trim(),
  );
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeSemester = (value: unknown) => {
  const key = normalizeKey(value);
  if (key.includes('1st') || key.includes('first') || key === '1') return '1st Semester';
  if (key.includes('2nd') || key.includes('second') || key === '2') return '2nd Semester';
  if (key.includes('summer') || key.includes('mid')) return 'Summer / Midyear';
  return String(value ?? '').trim();
};

const normalizeYearLevel = (value: unknown) => {
  const key = normalizeKey(value);
  for (const level of YEAR_LEVELS) {
    if (key === normalizeKey(level.label) || key === normalizeKey(level.key)) return level;
  }
  if (key.startsWith('1') || key.includes('first')) return YEAR_LEVELS[0];
  if (key.startsWith('2') || key.includes('second')) return YEAR_LEVELS[1];
  if (key.startsWith('3') || key.includes('third')) return YEAR_LEVELS[2];
  if (key.startsWith('4') || key.includes('fourth')) return YEAR_LEVELS[3];
  if (key.startsWith('5') || key.includes('fifth')) return YEAR_LEVELS[4];
  return null;
};

const emptyStats = () => ({ male: 0, female: 0, total: 0, specialNeeds: 0, sectors: {} });

const emptyYearLevelEnrollment = () => ({
  firstYear: emptyStats(),
  secondYear: emptyStats(),
  thirdYear: emptyStats(),
  fourthYear: emptyStats(),
  fifthYear: emptyStats(),
});

function getProgramMajors(program: AcademicProgram) {
  if (program.hasSpecializations && (program.specializations?.length || 0) > 0) {
    return (program.specializations || []).map((specialization) => specialization.name);
  }
  return ['General'];
}

function styleHeaderRow(worksheet: XLSX.WorkSheet, columnCount: number) {
  for (let column = 0; column < columnCount; column++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: column })];
    if (!cell) continue;
    cell.s = {
      fill: { fgColor: { rgb: '1E293B' } },
      font: { color: { rgb: 'FFFFFF' }, bold: true },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    };
  }
}

export function BatchXlsxImport({ programs, compliances, campuses, selectedYear, canEdit }: BatchXlsxImportProps) {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importScope, setImportScope] = useState<ImportScope>('both');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const activePrograms = useMemo(() => programs.filter((program) => program.isActive), [programs]);
  const campusMap = useMemo(() => new Map(campuses.map((campus) => [campus.id, campus.name])), [campuses]);

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const sortedPrograms = [...activePrograms].sort((a, b) => {
      const campusA = campusMap.get(a.campusId) || '';
      const campusB = campusMap.get(b.campusId) || '';
      return campusA.localeCompare(campusB) || a.name.localeCompare(b.name);
    });

    const enrollmentRows: (string | number)[][] = [];
    const graduationRows: (string | number)[][] = [];

    sortedPrograms.forEach((program) => {
      const campusName = campusMap.get(program.campusId) || '';
      getProgramMajors(program).forEach((major) => {
        YEAR_LEVELS.forEach((level) => {
          SEMESTERS.forEach((semester) => {
            enrollmentRows.push([
              selectedYear,
              campusName,
              program.name,
              program.id,
              major,
              level.label,
              semester.label,
              0,
              0,
              0,
            ]);
          });
        });

        SEMESTERS.forEach((semester) => {
          graduationRows.push([
            selectedYear,
            campusName,
            program.name,
            program.id,
            major,
            'All Levels',
            semester.label,
            0,
            0,
            0,
          ]);
        });
      });
    });

    const enrollmentSheet = XLSX.utils.aoa_to_sheet([ENROLLMENT_HEADERS, ...enrollmentRows]);
    const graduationSheet = XLSX.utils.aoa_to_sheet([GRADUATION_HEADERS, ...graduationRows]);
    enrollmentSheet['!cols'] = [
      { wch: 14 },
      { wch: 24 },
      { wch: 38 },
      { wch: 28 },
      { wch: 26 },
      { wch: 14 },
      { wch: 18 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
    ];
    graduationSheet['!cols'] = [...enrollmentSheet['!cols']];
    styleHeaderRow(enrollmentSheet, ENROLLMENT_HEADERS.length);
    styleHeaderRow(graduationSheet, GRADUATION_HEADERS.length);

    const programRows: (string | number)[][] = [['Campus', 'Program', 'Program ID', 'Major / Specialization']];
    sortedPrograms.forEach((program) => {
      const campusName = campusMap.get(program.campusId) || '';
      getProgramMajors(program).forEach((major) => {
        programRows.push([campusName, program.name, program.id, major]);
      });
    });
    const programSheet = XLSX.utils.aoa_to_sheet(programRows);
    programSheet['!cols'] = [{ wch: 24 }, { wch: 38 }, { wch: 28 }, { wch: 28 }];
    styleHeaderRow(programSheet, 4);

    const instructionsSheet = XLSX.utils.aoa_to_sheet([
      ['CHED Batch Data Import Instructions'],
      [''],
      ['1. Fill in the "Enrollment" sheet only for the year levels and semesters with data.'],
      ['2. Fill in the "Graduation" sheet only for programs and semesters with graduates.'],
      ['3. Do not change the Campus, Program, Program ID, Major, Year Level, and Semester values.'],
      ['4. Enter whole numbers for Male and Female. Rows with both values at 0 are ignored.'],
      ['5. Academic Year must be numeric (example: 2025 for AY 2025-2026).'],
      ['6. Only active programs listed in the "Programs" sheet are accepted.'],
      [
        '7. Existing records are merged: imported values update the matching program, year, major, level, and semester.',
      ],
      ['8. Graduation "Year Level" is optional; use "All Levels" when the breakdown is not available.'],
    ]);
    instructionsSheet['!cols'] = [{ wch: 110 }];

    XLSX.utils.book_append_sheet(workbook, enrollmentSheet, 'Enrollment');
    XLSX.utils.book_append_sheet(workbook, graduationSheet, 'Graduation');
    XLSX.utils.book_append_sheet(workbook, programSheet, 'Programs');
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

    XLSX.writeFile(workbook, `RSU_CHED_Batch_Data_Template_AY_${selectedYear}.xlsx`);
  };

  const parseWorkbook = (workbook: XLSX.WorkBook, fileName: string): ImportPreview => {
    const enrollmentUpdates: EnrollmentUpdate[] = [];
    const graduationUpdates: GraduationUpdate[] = [];
    const errors: string[] = [];
    let skippedEnrollment = 0;
    let skippedGraduation = 0;

    const programsById = new Map(activePrograms.map((program) => [String(program.id), program]));
    const programsByName = new Map<string, AcademicProgram>();
    const campusByKey = new Map<string, Campus>();
    campuses.forEach((campus) => {
      campusByKey.set(normalizeKey(campus.name), campus);
      campusByKey.set(normalizeKey(campus.id), campus);
    });
    activePrograms.forEach((program) => {
      const campusName = campusMap.get(program.campusId) || '';
      programsByName.set(`${normalizeKey(campusName)}::${normalizeKey(program.name)}`, program);
      programsByName.set(`${normalizeKey(campusName)}::${normalizeKey(program.abbreviation)}`, program);
      programsByName.set(normalizeKey(program.name), program);
      programsByName.set(normalizeKey(program.abbreviation), program);
    });

    const resolveProgram = (row: Record<string, unknown>) => {
      const programId = String(row.programid ?? '').trim();
      if (programId && programsById.has(programId)) return programsById.get(programId) || null;

      const campusValue = String(row.campus ?? '').trim();
      const campus = campusByKey.get(normalizeKey(campusValue));
      const programName = String(row.program ?? '').trim();
      const campusKey = campus ? normalizeKey(campus.name) : normalizeKey(campusValue);
      return (
        programsByName.get(`${campusKey}::${normalizeKey(programName)}`) ||
        programsByName.get(normalizeKey(programName)) ||
        null
      );
    };

    const resolveMajor = (program: AcademicProgram, value: unknown) => {
      const raw = String(value ?? '').trim();
      if (!raw) return 'General';
      if (program.hasSpecializations) {
        const matched = (program.specializations || []).find(
          (specialization) => normalizeKey(specialization.name) === normalizeKey(raw) || specialization.id === raw,
        );
        if (matched) return matched.id;
      }
      return 'General';
    };

    const readRows = (sheetName: string) => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return [];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      return rawRows.map((row) => {
        const normalized: Record<string, unknown> = {};
        Object.entries(row).forEach(([key, value]) => {
          normalized[normalizeKey(key)] = value;
        });
        return normalized;
      });
    };

    readRows('Enrollment').forEach((row, index) => {
      const rowNumber = index + 2;
      const program = resolveProgram(row);
      const year = Math.trunc(toNumber(row.academicyear)) || selectedYear;

      if (!program) {
        skippedEnrollment++;
        if (errors.length < 10) errors.push(`Enrollment row ${rowNumber}: program not found.`);
        return;
      }

      const level = normalizeYearLevel(row.yearlevel);
      const semester = normalizeSemester(row.semester);
      const semesterDef = SEMESTERS.find((item) => item.label === semester);
      const male = toNumber(row.male);
      const female = toNumber(row.female);

      if (!level || !semesterDef) {
        skippedEnrollment++;
        if (errors.length < 10) {
          errors.push(`Enrollment row ${rowNumber}: invalid year level or semester.`);
        }
        return;
      }

      if (male + female === 0) return;

      enrollmentUpdates.push({
        program,
        year,
        majorId: resolveMajor(program, row.majorspecialization),
        termKey: semesterDef.key,
        levelKey: level.key,
        male,
        female,
      });
    });

    readRows('Graduation').forEach((row, index) => {
      const rowNumber = index + 2;
      const program = resolveProgram(row);
      const year = Math.trunc(toNumber(row.academicyear)) || selectedYear;

      if (!program) {
        skippedGraduation++;
        if (errors.length < 10) errors.push(`Graduation row ${rowNumber}: program not found.`);
        return;
      }

      const semester = normalizeSemester(row.semester);
      const semesterDef = SEMESTERS.find((item) => item.label === semester);
      const male = toNumber(row.malegraduates ?? row.male);
      const female = toNumber(row.femalegraduates ?? row.female);

      if (!semesterDef) {
        skippedGraduation++;
        if (errors.length < 10) errors.push(`Graduation row ${rowNumber}: invalid semester.`);
        return;
      }

      if (male + female === 0) return;

      graduationUpdates.push({
        program,
        year,
        majorId: resolveMajor(program, row.majorspecialization),
        yearLevel: String(row.yearlevel ?? '').trim() || 'All Levels',
        semester: semesterDef.label,
        male,
        female,
      });
    });

    const programIds = Array.from(
      new Set([...enrollmentUpdates, ...graduationUpdates].map((update) => update.program.id)),
    );
    const years = Array.from(new Set([...enrollmentUpdates, ...graduationUpdates].map((update) => update.year))).sort(
      (a, b) => a - b,
    );

    return {
      fileName,
      enrollmentUpdates,
      graduationUpdates,
      programIds,
      years,
      skippedEnrollment,
      skippedGraduation,
      errors,
    };
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const parsed = parseWorkbook(workbook, file.name);

      if (parsed.enrollmentUpdates.length === 0 && parsed.graduationUpdates.length === 0) {
        toast({
          title: 'Nothing to Import',
          description: 'No valid enrollment or graduation rows with values were found in the file.',
          variant: 'destructive',
        });
        return;
      }

      setImportScope(
        parsed.enrollmentUpdates.length > 0 && parsed.graduationUpdates.length > 0
          ? 'both'
          : parsed.enrollmentUpdates.length > 0
            ? 'enrollment'
            : 'graduation',
      );
      setPreview(parsed);
    } catch (error) {
      console.error('XLSX parse error:', error);
      toast({
        title: 'Invalid File',
        description: 'The selected file could not be read as an XLSX workbook.',
        variant: 'destructive',
      });
    } finally {
      setIsParsing(false);
    }
  };

  const importPreview = async () => {
    if (!preview || !firestore || !userProfile) return;

    const enrollmentUpdates = importScope === 'graduation' ? [] : preview.enrollmentUpdates;
    const graduationUpdates = importScope === 'enrollment' ? [] : preview.graduationUpdates;

    if (enrollmentUpdates.length === 0 && graduationUpdates.length === 0) {
      toast({
        title: 'Nothing to Import',
        description: 'The selected data type has no valid rows to import.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      const groups = new Map<
        string,
        {
          program: AcademicProgram;
          year: number;
          enrollmentUpdates: EnrollmentUpdate[];
          graduationUpdates: GraduationUpdate[];
        }
      >();

      const ensureGroup = (program: AcademicProgram, year: number) => {
        const key = `${program.id}-${year}`;
        if (!groups.has(key)) {
          groups.set(key, { program, year, enrollmentUpdates: [], graduationUpdates: [] });
        }
        return groups.get(key)!;
      };

      enrollmentUpdates.forEach((update) => {
        ensureGroup(update.program, update.year).enrollmentUpdates.push(update);
      });
      graduationUpdates.forEach((update) => {
        ensureGroup(update.program, update.year).graduationUpdates.push(update);
      });

      await Promise.all(
        Array.from(groups.values()).map(async ({ program, year, enrollmentUpdates, graduationUpdates }) => {
          const recordId = `${program.id}-${year}`;
          const existing = compliances.find(
            (record) => record.programId === program.id && Number(record.academicYear) === year,
          );

          const enrollmentRecords = (existing?.enrollmentRecords || []).map((record) => ({
            ...record,
            firstSemester: { ...emptyYearLevelEnrollment(), ...record.firstSemester },
            secondSemester: { ...emptyYearLevelEnrollment(), ...record.secondSemester },
            midYearTerm: { ...emptyYearLevelEnrollment(), ...(record.midYearTerm || {}) },
          }));
          const recordByMajor = new Map(
            enrollmentRecords.map((record) => [String(record.majorId || 'General'), record]),
          );

          enrollmentUpdates.forEach((update) => {
            let record = recordByMajor.get(update.majorId);
            if (!record) {
              record = {
                id: `${program.id}-${year}-${update.majorId}`,
                academicYear: year,
                majorId: update.majorId,
                firstSemester: emptyYearLevelEnrollment(),
                secondSemester: emptyYearLevelEnrollment(),
                midYearTerm: emptyYearLevelEnrollment(),
              };
              recordByMajor.set(update.majorId, record);
              enrollmentRecords.push(record);
            }

            const term = record[update.termKey] || emptyYearLevelEnrollment();
            const current = term[update.levelKey] || emptyStats();
            term[update.levelKey] = {
              ...current,
              male: update.male,
              female: update.female,
              total: update.male + update.female,
              specialNeeds: current.specialNeeds || 0,
              sectors: current.sectors || {},
            };
            record[update.termKey] = term;
          });

          const graduationRecords = [...(existing?.graduationRecords || [])];
          graduationUpdates.forEach((update) => {
            const index = graduationRecords.findIndex(
              (record) =>
                String(record.majorId || 'General') === update.majorId &&
                Number(record.year) === update.year &&
                record.semester === update.semester &&
                (record.yearLevel || 'All Levels') === update.yearLevel,
            );

            const nextRecord = {
              majorId: update.majorId,
              year: update.year,
              yearLevel: update.yearLevel,
              semester: update.semester,
              maleCount: update.male,
              femaleCount: update.female,
              count: update.male + update.female,
            };

            if (index >= 0) {
              graduationRecords[index] = { ...graduationRecords[index], ...nextRecord };
            } else {
              graduationRecords.push(nextRecord);
            }
          });

          const enrollmentRecordsWithOveralls = enrollmentRecords.map((record) =>
            withEnrollmentOveralls(record as EnrollmentRecord),
          );

          const baseRecord = existing
            ? {}
            : {
                ched: { copcStatus: 'No COPC' as const },
                faculty: {
                  dean: { name: '', highestEducation: '', isAlignedWithCMO: 'N/A' as const, sex: 'Male' as const },
                  programChair: {
                    name: '',
                    highestEducation: '',
                    isAlignedWithCMO: 'N/A' as const,
                    sex: 'Male' as const,
                  },
                  members: [],
                },
                stats: {
                  enrollment: {
                    firstSemester: emptyYearLevelEnrollment(),
                    secondSemester: emptyYearLevelEnrollment(),
                    midYearTerm: emptyYearLevelEnrollment(),
                  },
                  graduationCount: 0,
                },
                boardPerformance: [],
                tracerRecords: [],
                curriculumRecords: [],
              };

          await setDoc(
            doc(firestore, 'programCompliances', recordId),
            {
              ...baseRecord,
              id: recordId,
              academicYear: year,
              programId: program.id,
              campusId: program.campusId,
              unitId: program.collegeId,
              enrollmentRecords: enrollmentRecordsWithOveralls,
              graduationRecords,
              updatedAt: serverTimestamp(),
              updatedBy: userProfile.id,
            },
            { merge: true },
          );
        }),
      );

      toast({
        title: 'Import Complete',
        description: `${enrollmentUpdates.length} enrollment row(s) and ${graduationUpdates.length} graduation row(s) were saved.`,
      });
      setPreview(null);
    } catch (error) {
      console.error('XLSX import error:', error);
      toast({
        title: 'Import Failed',
        description: 'Some records could not be saved. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
          className="h-8 gap-1.5 text-[10px] font-black uppercase tracking-wider"
        >
          <Download className="h-3.5 w-3.5" />
          XLSX Template
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={!canEdit || isParsing}
          className="h-8 gap-1.5 text-[10px] font-black uppercase tracking-wider"
        >
          {isParsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload XLSX
        </Button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelected} />
      </div>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black uppercase tracking-tight">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import Preview
            </DialogTitle>
            <DialogDescription>{preview?.fileName}</DialogDescription>
          </DialogHeader>

          {preview && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-[9px] font-black uppercase text-muted-foreground">Enrollment Rows</p>
                  <p className="text-lg font-black tabular-nums">{preview.enrollmentUpdates.length}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[9px] font-black uppercase text-muted-foreground">Graduation Rows</p>
                  <p className="text-lg font-black tabular-nums">{preview.graduationUpdates.length}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[9px] font-black uppercase text-muted-foreground">Programs</p>
                  <p className="text-lg font-black tabular-nums">{preview.programIds.length}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[9px] font-black uppercase text-muted-foreground">Academic Years</p>
                  <p className="text-lg font-black tabular-nums">{preview.years.join(', ') || '—'}</p>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-[9px] font-black uppercase text-muted-foreground">Data to Import</p>
                <RadioGroup
                  value={importScope}
                  onValueChange={(value) => setImportScope(value as ImportScope)}
                  className="grid grid-cols-3 gap-2"
                >
                  <Label
                    htmlFor="import-scope-both"
                    className={cn(
                      'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 p-2 text-center transition-all hover:bg-muted',
                      importScope === 'both' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-700',
                    )}
                  >
                    <RadioGroupItem value="both" id="import-scope-both" className="sr-only" />
                    <span className="text-[10px] font-black uppercase">Both</span>
                    <span className="text-[9px] text-muted-foreground tabular-nums">
                      {preview.enrollmentUpdates.length + preview.graduationUpdates.length} rows
                    </span>
                  </Label>
                  <Label
                    htmlFor="import-scope-enrollment"
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 rounded-md border-2 p-2 text-center transition-all hover:bg-muted',
                      preview.enrollmentUpdates.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                      importScope === 'enrollment'
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-100 dark:border-slate-700',
                    )}
                  >
                    <RadioGroupItem
                      value="enrollment"
                      id="import-scope-enrollment"
                      className="sr-only"
                      disabled={preview.enrollmentUpdates.length === 0}
                    />
                    <span className="text-[10px] font-black uppercase">Enrollment</span>
                    <span className="text-[9px] text-muted-foreground tabular-nums">
                      {preview.enrollmentUpdates.length} rows
                    </span>
                  </Label>
                  <Label
                    htmlFor="import-scope-graduation"
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 rounded-md border-2 p-2 text-center transition-all hover:bg-muted',
                      preview.graduationUpdates.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                      importScope === 'graduation'
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-100 dark:border-slate-700',
                    )}
                  >
                    <RadioGroupItem
                      value="graduation"
                      id="import-scope-graduation"
                      className="sr-only"
                      disabled={preview.graduationUpdates.length === 0}
                    />
                    <span className="text-[10px] font-black uppercase">Graduation</span>
                    <span className="text-[9px] text-muted-foreground tabular-nums">
                      {preview.graduationUpdates.length} rows
                    </span>
                  </Label>
                </RadioGroup>
                <p className="text-[10px] text-muted-foreground">Only the selected dataset will be saved.</p>
              </div>

              {(preview.skippedEnrollment > 0 || preview.skippedGraduation > 0) && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold uppercase">Skipped rows</p>
                    <p>
                      Enrollment: {preview.skippedEnrollment} | Graduation: {preview.skippedGraduation}
                    </p>
                    {preview.errors.length > 0 && (
                      <ul className="mt-1 list-disc pl-4 text-[10px]">
                        {preview.errors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreview(null)}
              disabled={isImporting}
              className="text-[10px] font-black uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={importPreview}
              disabled={isImporting}
              className="gap-1.5 text-[10px] font-black uppercase tracking-wider"
            >
              {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Import Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
