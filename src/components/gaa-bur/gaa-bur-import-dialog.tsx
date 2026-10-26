'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import * as XLSX from 'xlsx-js-style';
import { Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { doc, serverTimestamp, setDoc } from '@/firebase/firestore-wrapper';
import { useToast } from '@/hooks/use-toast';
import type {
  GaaBurRateTargets,
  GaaBurFinancialTargets,
  GaaBurPhysicalTarget,
  GaaBurQuarter,
  GaaBurReport,
} from '@/lib/types';
import { DEFAULT_BUR_TARGETS, toFiniteNumber } from '@/lib/gaa-bur';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ImportPayload = {
  financial: GaaBurFinancialTargets | null;
  burTargets: GaaBurRateTargets | null;
  physicalTargets: GaaBurPhysicalTarget[];
  reports: GaaBurReport[];
};

type GaaBurImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
};

const GAA_HEADERS = ['Year', 'PS', 'MOOE', 'CO', 'Obligation BUR Target (%)', 'Disbursement BUR Target (%)'];

const PHYSICAL_HEADERS = ['Indicator', 'Baseline', 'Annual Target', 'Actual', 'Unit', 'Remarks'];

const BUR_HEADERS = ['Quarter', 'Allotments', 'Obligations', 'Disbursements', 'Remarks'];

const normalizeKey = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

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

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeKey(key)] = value;
  }
  return normalized;
}

function getSheetRows(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const actualSheetName = workbook.SheetNames.find((name) => normalizeKey(name) === normalizeKey(sheetName));
  if (!actualSheetName) return [];

  return XLSX.utils
    .sheet_to_json<Record<string, unknown>>(workbook.Sheets[actualSheetName], {
      defval: '',
    })
    .map(normalizeRow);
}

function parseQuarter(value: unknown): GaaBurQuarter | null {
  const match = String(value ?? '').match(/[1-4]/);
  if (!match) return null;
  const quarter = Number(match[0]);
  return quarter >= 1 && quarter <= 4 ? (quarter as GaaBurQuarter) : null;
}

export function GaaBurImportDialog({ open, onOpenChange, year }: GaaBurImportDialogProps) {
  const firestore = useFirestore();
  const { user, userProfile } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState<ImportPayload | null>(null);
  const [fileName, setFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!open) {
      setPending(null);
      setFileName('');
      setIsParsing(false);
      setIsImporting(false);
    }
  }, [open]);

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();

    const gaaSheet = XLSX.utils.aoa_to_sheet([
      GAA_HEADERS,
      [year, 0, 0, 0, DEFAULT_BUR_TARGETS.obligation, DEFAULT_BUR_TARGETS.disbursement],
    ]);
    gaaSheet['!cols'] = [{ wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 26 }, { wch: 30 }];
    styleHeaderRow(gaaSheet, GAA_HEADERS.length);

    const physicalSheet = XLSX.utils.aoa_to_sheet([
      PHYSICAL_HEADERS,
      ['', 0, 0, 0, '%', ''],
      ['', 0, 0, 0, '%', ''],
      ['', 0, 0, 0, '%', ''],
    ]);
    physicalSheet['!cols'] = [{ wch: 45 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 36 }];
    styleHeaderRow(physicalSheet, PHYSICAL_HEADERS.length);

    const burSheet = XLSX.utils.aoa_to_sheet([
      BUR_HEADERS,
      ['Q1', 0, 0, 0, ''],
      ['Q2', 0, 0, 0, ''],
      ['Q3', 0, 0, 0, ''],
      ['Q4', 0, 0, 0, ''],
    ]);
    burSheet['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 40 }];
    styleHeaderRow(burSheet, BUR_HEADERS.length);

    const instructions = XLSX.utils.aoa_to_sheet([
      ['GAA & BUR Monitoring Import Instructions'],
      [''],
      ['1. Fill in the "GAA Targets" sheet with the annual financial targets and BUR targets.'],
      ['2. Fill in the "Physical Targets" sheet with one indicator per row.'],
      ['3. Fill in the "BUR Reports" sheet with cumulative year-to-date values for each quarter.'],
      ['4. Do not change the sheet names or column headers.'],
      ['5. Enter numeric values only. Currency values may include commas or PHP.'],
      ['6. Leave zero values or blank rows when no data is available.'],
      ['7. BUR targets must be between 0 and 100.'],
      ['8. Existing values for quarters included in the file will be replaced.'],
      ['9. The selected year in the system is used for all imported data.'],
    ]);
    instructions['!cols'] = [{ wch: 110 }];

    XLSX.utils.book_append_sheet(workbook, gaaSheet, 'GAA Targets');
    XLSX.utils.book_append_sheet(workbook, physicalSheet, 'Physical Targets');
    XLSX.utils.book_append_sheet(workbook, burSheet, 'BUR Reports');
    XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions');

    XLSX.writeFile(workbook, `RSU_GAA_BUR_Template_${year}.xlsx`);
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      const gaaRows = getSheetRows(workbook, 'GAA Targets');
      const physicalRows = getSheetRows(workbook, 'Physical Targets');
      const reportRows = getSheetRows(workbook, 'BUR Reports');

      const gaaRow = gaaRows[0];
      const financial = gaaRow
        ? {
            ps: toFiniteNumber(gaaRow.ps),
            mooe: toFiniteNumber(gaaRow.mooe),
            co: toFiniteNumber(gaaRow.co),
          }
        : null;
      const burTargets = gaaRow
        ? {
            obligation: toFiniteNumber(gaaRow.obligationburtarget ?? gaaRow.obligationburtargetpercent),
            disbursement: toFiniteNumber(gaaRow.disbursementburtarget ?? gaaRow.disbursementburtargetpercent),
          }
        : null;

      const hasFinancialTarget = !!financial && (financial.ps > 0 || financial.mooe > 0 || financial.co > 0);
      const hasBurTarget = !!burTargets && (burTargets.obligation > 0 || burTargets.disbursement > 0);

      const physicalTargets: GaaBurPhysicalTarget[] = physicalRows
        .map((row, index) => {
          const indicator = String(row.indicator ?? '').trim();
          const baseline = toFiniteNumber(row.baseline);
          const target = toFiniteNumber(row.annualtarget ?? row.target);
          const actual = toFiniteNumber(row.actual);
          if (!indicator && baseline === 0 && target === 0 && actual === 0) {
            return null;
          }
          return {
            id: `import-physical-${index + 1}`,
            indicator,
            baseline,
            target,
            actual,
            unit: String(row.unit ?? '').trim(),
            remarks: String(row.remarks ?? '').trim(),
          };
        })
        .filter((row): row is GaaBurPhysicalTarget => row !== null);

      const reportsByQuarter = new Map<GaaBurQuarter, GaaBurReport>();
      reportRows.forEach((row) => {
        const quarter = parseQuarter(row.quarter);
        if (!quarter) return;

        const allotments = toFiniteNumber(row.allotments);
        const obligations = toFiniteNumber(row.obligations);
        const disbursements = toFiniteNumber(row.disbursements);
        const remarks = String(row.remarks ?? '').trim();

        if (allotments === 0 && obligations === 0 && disbursements === 0 && !remarks) {
          return;
        }

        reportsByQuarter.set(quarter, {
          year,
          quarter,
          allotments,
          obligations,
          disbursements,
          remarks,
        });
      });

      const payload: ImportPayload = {
        financial: hasFinancialTarget ? financial : null,
        burTargets: hasBurTarget ? burTargets : null,
        physicalTargets,
        reports: Array.from(reportsByQuarter.values()).sort((a, b) => a.quarter - b.quarter),
      };

      if (
        !payload.financial &&
        !payload.burTargets &&
        payload.physicalTargets.length === 0 &&
        payload.reports.length === 0
      ) {
        toast({
          title: 'Nothing to import',
          description: 'No GAA targets, physical targets, or quarterly BUR values were found in the file.',
          variant: 'destructive',
        });
        return;
      }

      setPending(payload);
      setFileName(file.name);
    } catch (error) {
      console.error('Failed to parse GAA/BUR import file:', error);
      toast({
        title: 'Could not read file',
        description: 'Please check that the file is a valid Excel workbook.',
        variant: 'destructive',
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!firestore || !pending) return;

    setIsImporting(true);
    try {
      let savedTargets = false;

      if (pending.financial || pending.burTargets) {
        await setDoc(
          doc(firestore, 'gaaBurTargets', String(year)),
          {
            year,
            ...(pending.financial ? { financial: pending.financial } : {}),
            ...(pending.burTargets ? { burTargets: pending.burTargets } : {}),
            ...(pending.physicalTargets.length > 0 ? { physicalTargets: pending.physicalTargets } : {}),
            updatedAt: serverTimestamp(),
            updatedBy: userProfile?.id || user?.uid || '',
          },
          { merge: true },
        );
        savedTargets = true;
      } else if (pending.physicalTargets.length > 0) {
        await setDoc(
          doc(firestore, 'gaaBurTargets', String(year)),
          {
            year,
            physicalTargets: pending.physicalTargets,
            updatedAt: serverTimestamp(),
            updatedBy: userProfile?.id || user?.uid || '',
          },
          { merge: true },
        );
        savedTargets = true;
      }

      await Promise.all(
        pending.reports.map((report) =>
          setDoc(
            doc(firestore, 'gaaBurReports', `${year}-Q${report.quarter}`),
            {
              ...report,
              year,
              updatedAt: serverTimestamp(),
              updatedBy: userProfile?.id || user?.uid || '',
            },
            { merge: true },
          ),
        ),
      );

      const targetParts: string[] = [];
      if (pending.financial || pending.burTargets) {
        targetParts.push('annual GAA targets');
      }
      if (pending.physicalTargets.length > 0) {
        targetParts.push(
          `${pending.physicalTargets.length} physical target${pending.physicalTargets.length === 1 ? '' : 's'}`,
        );
      }

      const importedParts: string[] = [];
      if (savedTargets && targetParts.length > 0) {
        importedParts.push(targetParts.join(' and '));
      }
      if (pending.reports.length > 0) {
        importedParts.push(`${pending.reports.length} quarterly BUR report${pending.reports.length === 1 ? '' : 's'}`);
      }

      toast({
        title: 'Import complete',
        description: `Imported ${importedParts.join(' and ')}.`,
      });

      setPending(null);
      setFileName('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to import GAA/BUR data:', error);
      toast({
        title: 'Import failed',
        description: 'Could not save the imported data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import GAA &amp; BUR Data</DialogTitle>
          <DialogDescription>
            Download the template, enter the annual targets and quarterly BUR reports, then upload the completed
            workbook.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isParsing || isImporting}>
              {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Choose Excel File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>

          <div className="rounded-md border bg-muted/30 p-4 text-sm">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <FileSpreadsheet className="h-4 w-4" />
              Import Guide
            </div>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Use the provided template and keep the sheet names unchanged.</li>
              <li>Values are saved under the currently selected year: {year}.</li>
              <li>BUR amounts must be cumulative year-to-date values.</li>
              <li>Existing values for quarters included in the file will be replaced.</li>
            </ul>
          </div>

          {pending && (
            <div className="rounded-md border p-4 text-sm">
              <div className="font-medium">{fileName}</div>
              <div className="mt-2 grid gap-2 text-muted-foreground sm:grid-cols-3">
                <div>
                  Financial target:{' '}
                  <span className="font-medium text-foreground">{pending.financial ? 'Included' : 'None'}</span>
                </div>
                <div>
                  Physical targets:{' '}
                  <span className="font-medium text-foreground">{pending.physicalTargets.length}</span>
                </div>
                <div>
                  BUR reports: <span className="font-medium text-foreground">{pending.reports.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!pending || isImporting}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Import Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
