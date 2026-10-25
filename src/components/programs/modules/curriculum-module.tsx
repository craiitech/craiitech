'use client';

import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardFooter } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BookOpen,
  Link as LinkIcon,
  GraduationCap,
  HeartHandshake,
  Layers,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Calendar,
  Info,
  Calculator,
  Users,
  Globe,
  UserCheck,
  LayoutList,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GADSector } from '@/lib/types';
import { useUser } from '@/firebase';

interface CurriculumModuleProps {
  canEdit: boolean;
  programSpecializations?: { id: string; name: string }[];
  focusMode?: 'enrollment' | 'all';
}

const GAD_SECTORS: GADSector[] = [
  'Solo Parent',
  'PWD',
  'Senior Citizen',
  'Youth/Student',
  'Employee',
  'LGBTQA++',
  'Indigenous People',
];

function EnrollmentRecordCard({
  index,
  control,
  canEdit,
  isAdmin,
  onRemove,
  programSpecializations,
  setValue,
}: {
  index: number;
  control: any;
  canEdit: boolean;
  isAdmin: boolean;
  onRemove: () => void;
  programSpecializations?: { id: string; name: string }[];
  setValue: any;
}) {
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);

  const recordValues = useWatch({
    control,
    name: `enrollmentRecords.${index}`,
  });
  const overallOnly = Boolean(recordValues?.overallOnly);

  const calculateLevelTotal = (term: string, level: string) => {
    const male = Number(recordValues?.[term]?.[level]?.male) || 0;
    const female = Number(recordValues?.[term]?.[level]?.female) || 0;
    return male + female;
  };

  const calculateTermTotal = (term: string) => {
    const levels = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'];
    return levels.reduce((acc, level) => acc + calculateLevelTotal(term, level), 0);
  };

  const calculateTermSexTotals = (term: string) => {
    const levels = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'];
    return levels.reduce(
      (totals, level) => ({
        male: totals.male + (Number(recordValues?.[term]?.[level]?.male) || 0),
        female: totals.female + (Number(recordValues?.[term]?.[level]?.female) || 0),
      }),
      { male: 0, female: 0 },
    );
  };

  const calculateTermSectorTotals = (term: string, sector: GADSector) => {
    const levels = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'];
    return levels.reduce(
      (totals, level) => ({
        male: totals.male + (Number(recordValues?.[term]?.[level]?.sectors?.[sector]?.male) || 0),
        female: totals.female + (Number(recordValues?.[term]?.[level]?.sectors?.[sector]?.female) || 0),
      }),
      { male: 0, female: 0 },
    );
  };

  const getOverallSectorValues = (termKey: string, sector: GADSector) => {
    const computed = calculateTermSectorTotals(termKey, sector);
    const stored = recordValues?.overall?.[termKey]?.sectors?.[sector];
    const storedMale = Number(stored?.male || 0);
    const storedFemale = Number(stored?.female || 0);

    if (overallOnly) {
      return {
        male: stored?.male !== undefined ? storedMale : computed.male,
        female: stored?.female !== undefined ? storedFemale : computed.female,
      };
    }

    if (computed.male + computed.female > 0) {
      return computed;
    }

    return { male: storedMale, female: storedFemale };
  };

  const getOverallSectorGrandTotal = (termKey: string) => {
    return GAD_SECTORS.reduce((sum, sector) => {
      const vals = getOverallSectorValues(termKey, sector);
      return sum + vals.male + vals.female;
    }, 0);
  };

  const getOverallValues = (termKey: string) => {
    const computed = calculateTermSexTotals(termKey);
    if (!overallOnly) return { ...computed, total: computed.male + computed.female };

    const stored = recordValues?.overall?.[termKey];
    const male = Number(stored?.male ?? computed.male);
    const female = Number(stored?.female ?? computed.female);
    return { male, female, total: male + female };
  };

  const handleOverallOnlyChange = (checked: boolean) => {
    setValue(`enrollmentRecords.${index}.overallOnly`, checked, { shouldDirty: true, shouldTouch: true });
    if (!checked) return;

    (['firstSemester', 'secondSemester', 'midYearTerm'] as const).forEach((termKey) => {
      const totals = calculateTermSexTotals(termKey);
      setValue(`enrollmentRecords.${index}.overall.${termKey}.male`, totals.male, { shouldDirty: true });
      setValue(`enrollmentRecords.${index}.overall.${termKey}.female`, totals.female, { shouldDirty: true });
      setValue(`enrollmentRecords.${index}.overall.${termKey}.total`, totals.male + totals.female, {
        shouldDirty: true,
      });

      GAD_SECTORS.forEach((sector) => {
        const secTotals = getOverallSectorValues(termKey, sector);
        setValue(`enrollmentRecords.${index}.overall.${termKey}.sectors.${sector}.male`, secTotals.male, {
          shouldDirty: true,
        });
        setValue(`enrollmentRecords.${index}.overall.${termKey}.sectors.${sector}.female`, secTotals.female, {
          shouldDirty: true,
        });
      });
    });
  };

  const renderOverallField = (
    termKey: string,
    fieldKey: 'male' | 'female' | 'total',
    label: string,
    fallbackValue: number,
  ) => {
    const path = `enrollmentRecords.${index}.overall.${termKey}.${fieldKey}`;

    if (overallOnly && isAdmin && canEdit && fieldKey !== 'total') {
      return (
        <FormField
          control={control}
          name={path}
          render={({ field: inputField }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                {label}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={inputField.value ?? fallbackValue}
                  onChange={(event) => inputField.onChange(Number(event.target.value))}
                  className="h-8 text-xs font-black tabular-nums"
                />
              </FormControl>
            </FormItem>
          )}
        />
      );
    }

    return (
      <div className="space-y-1">
        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <div className="flex h-8 items-center justify-center rounded-md border border-primary/20 bg-white text-xs font-black tabular-nums text-primary">
          {fallbackValue.toLocaleString()}
        </div>
      </div>
    );
  };

  const renderSectorInputs = (termKey: string, level: string, isVisible: boolean) => (
    <div
      className={cn(
        'mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-4 animate-in zoom-in duration-300',
        !isVisible && 'hidden',
      )}
    >
      <div className="flex items-center justify-between border-b pb-2">
        <p className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
          <Globe className="h-3 w-3" /> Sectoral Breakdown (Institutional GAD)
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpandedLevel(null)}
          className="h-6 text-[9px] font-bold uppercase"
        >
          Collapse
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GAD_SECTORS.map((sector) => {
          const malePath = `enrollmentRecords.${index}.${termKey}.${level}.sectors.${sector}.male`;
          const femalePath = `enrollmentRecords.${index}.${termKey}.${level}.sectors.${sector}.female`;
          return (
            <div key={sector} className="space-y-2 p-2 rounded-lg bg-white border shadow-sm">
              <p className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-300">{sector}</p>
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={control}
                  name={malePath}
                  defaultValue={0}
                  render={({ field: inputField }) => (
                    <div className="space-y-1">
                      <Label className="text-[8px] uppercase font-bold text-muted-foreground">Male</Label>
                      <Input
                        type="number"
                        value={inputField.value ?? 0}
                        className="h-7 text-[10px]"
                        disabled={!canEdit || overallOnly}
                        onChange={(e) => {
                          const num = Number(e.target.value) || 0;
                          inputField.onChange(num);
                          setValue(malePath, num, { shouldDirty: true, shouldTouch: true });
                        }}
                      />
                    </div>
                  )}
                />
                <FormField
                  control={control}
                  name={femalePath}
                  defaultValue={0}
                  render={({ field: inputField }) => (
                    <div className="space-y-1">
                      <Label className="text-[8px] uppercase font-bold text-muted-foreground">Female</Label>
                      <Input
                        type="number"
                        value={inputField.value ?? 0}
                        className="h-7 text-[10px]"
                        disabled={!canEdit || overallOnly}
                        onChange={(e) => {
                          const num = Number(e.target.value) || 0;
                          inputField.onChange(num);
                          setValue(femalePath, num, { shouldDirty: true, shouldTouch: true });
                        }}
                      />
                    </div>
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderOverallSectorInputs = (termKey: string, isVisible: boolean) => (
    <div
      className={cn(
        'mt-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-primary/20 space-y-4 animate-in zoom-in duration-300 shadow-xs',
        !isVisible && 'hidden',
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
        <div>
          <p className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
            <Globe className="h-3.5 w-3.5" /> Over-all Program Sectoral Breakdown (Institutional GAD)
          </p>
          <p className="text-[9px] text-muted-foreground font-medium">
            {overallOnly
              ? 'Enter overall program headcounts per GAD sector for this semester.'
              : 'Enter overall program sectoral counts directly if not disaggregated by year level, or review year-level sums.'}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpandedLevel(null)}
          className="h-6 text-[9px] font-bold uppercase w-fit"
        >
          Collapse
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GAD_SECTORS.map((sector) => {
          const computed = calculateTermSectorTotals(termKey, sector);
          const hasYearLevelSectorData = !overallOnly && computed.male + computed.female > 0;
          const resolved = getOverallSectorValues(termKey, sector);
          const malePath = `enrollmentRecords.${index}.overall.${termKey}.sectors.${sector}.male`;
          const femalePath = `enrollmentRecords.${index}.overall.${termKey}.sectors.${sector}.female`;

          return (
            <div
              key={sector}
              className="space-y-2 p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/60 border shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-200">{sector}</p>
                <span className="text-[8px] font-mono font-black text-primary">
                  Total: {resolved.male + resolved.female}
                  {hasYearLevelSectorData ? ' (From Yr Levels)' : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={control}
                  name={malePath}
                  defaultValue={0}
                  render={({ field: inputField }) => (
                    <div className="space-y-1">
                      <Label className="text-[8px] uppercase font-bold text-muted-foreground">Male</Label>
                      <Input
                        type="number"
                        value={hasYearLevelSectorData ? computed.male : (inputField.value ?? 0)}
                        className="h-7 text-[10px] bg-white font-bold tabular-nums"
                        disabled={!canEdit || hasYearLevelSectorData}
                        onChange={(e) => {
                          const num = Number(e.target.value) || 0;
                          inputField.onChange(num);
                          setValue(malePath, num, { shouldDirty: true, shouldTouch: true });
                        }}
                      />
                    </div>
                  )}
                />
                <FormField
                  control={control}
                  name={femalePath}
                  defaultValue={0}
                  render={({ field: inputField }) => (
                    <div className="space-y-1">
                      <Label className="text-[8px] uppercase font-bold text-muted-foreground">Female</Label>
                      <Input
                        type="number"
                        value={hasYearLevelSectorData ? computed.female : (inputField.value ?? 0)}
                        className="h-7 text-[10px] bg-white font-bold tabular-nums"
                        disabled={!canEdit || hasYearLevelSectorData}
                        onChange={(e) => {
                          const num = Number(e.target.value) || 0;
                          inputField.onChange(num);
                          setValue(femalePath, num, { shouldDirty: true, shouldTouch: true });
                        }}
                      />
                    </div>
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderTermInputs = (termKey: string) => {
    const overallValues = getOverallValues(termKey);
    const isOverallSectorExpanded = expandedLevel === `${termKey}-overall`;
    const overallSectorGrandTotal = getOverallSectorGrandTotal(termKey);

    return (
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {['firstYear', 'secondYear', 'thirdYear', 'fourthYear'].map((level, lIdx) => {
            const total = calculateLevelTotal(termKey, level);
            const isExpanded = expandedLevel === `${termKey}-${level}`;
            return (
              <div
                key={level}
                className={cn(
                  'p-3 rounded-lg border bg-muted/5 space-y-3 transition-all',
                  isExpanded && 'ring-2 ring-primary border-primary',
                )}
              >
                <div className="flex items-center justify-between border-b pb-1">
                  <p className="text-[9px] font-black uppercase text-primary">
                    {lIdx + 1}
                    {lIdx === 0 ? 'st' : lIdx === 1 ? 'nd' : lIdx === 2 ? 'rd' : 'th'} Year Level
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedLevel(isExpanded ? null : `${termKey}-${level}`)}
                    className="h-5 px-2 text-[8px] font-black uppercase bg-white border shadow-sm gap-1"
                  >
                    {isExpanded ? <LayoutList className="h-2.5 w-2.5" /> : <PlusCircle className="h-2.5 w-2.5" />}
                    {isExpanded ? 'Hide Sectors' : 'Sector Breakdown'}
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <FormField
                    control={control}
                    name={`enrollmentRecords.${index}.${termKey}.${level}.male`}
                    render={({ field: inputField }) => (
                      <FormItem>
                        <FormLabel className="text-[8px] uppercase font-bold text-muted-foreground">Male</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...inputField}
                            className="h-7 text-[10px]"
                            disabled={!canEdit}
                            onChange={(e) => inputField.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name={`enrollmentRecords.${index}.${termKey}.${level}.female`}
                    render={({ field: inputField }) => (
                      <FormItem>
                        <FormLabel className="text-[8px] uppercase font-bold text-muted-foreground">Female</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...inputField}
                            className="h-7 text-[10px]"
                            disabled={!canEdit}
                            onChange={(e) => inputField.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <FormLabel className="text-[8px] uppercase font-black text-primary">Total</FormLabel>
                    <div className="h-7 flex items-center justify-center text-[10px] font-black bg-primary/5 rounded border border-primary/20 tabular-nums">
                      {total}
                    </div>
                  </FormItem>
                </div>
                {renderSectorInputs(termKey, level, isExpanded)}
              </div>
            );
          })}
        </div>
        <div
          className={cn(
            'space-y-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 transition-all',
            isOverallSectorExpanded && 'ring-2 ring-primary border-primary',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 pb-2">
            <div className="flex items-center gap-2">
              <p className="text-[9px] font-black uppercase tracking-wider text-primary">
                Over-all Program Enrollment &amp; GAD Sectors
              </p>
              {overallSectorGrandTotal > 0 && (
                <Badge
                  variant="outline"
                  className="h-4 border-primary/30 bg-white px-1.5 text-[8px] font-mono font-black uppercase text-primary"
                >
                  Sectoral Total: {overallSectorGrandTotal}
                </Badge>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpandedLevel(isOverallSectorExpanded ? null : `${termKey}-overall`)}
              className="h-6 px-2.5 text-[8px] font-black uppercase bg-white border border-primary/20 text-primary hover:bg-primary/10 shadow-xs gap-1"
            >
              {isOverallSectorExpanded ? (
                <LayoutList className="h-2.5 w-2.5" />
              ) : (
                <PlusCircle className="h-2.5 w-2.5" />
              )}
              {isOverallSectorExpanded ? 'Hide Over-all Sectors' : 'Sector Breakdown (Over-all)'}
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {renderOverallField(termKey, 'male', 'Total Overall Male', overallValues.male)}
            {renderOverallField(termKey, 'female', 'Total Overall Female', overallValues.female)}
            {renderOverallField(termKey, 'total', 'Overall Total', overallValues.total)}
          </div>
          <p className="text-[9px] italic text-muted-foreground">
            {overallOnly
              ? 'Manual male and female totals and Over-all Sector Breakdown are enabled. Overall Total is auto-computed from their sum.'
              : 'Auto-computed from all year levels. Use "Sector Breakdown (Over-all)" to log program-wide GAD sectors without breaking down by year level.'}
          </p>
          {renderOverallSectorInputs(termKey, isOverallSectorExpanded)}
        </div>
      </div>
    );
  };

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 8 }, (_, i) => currentYear + 2 - i);
  const parentAY = useWatch({ control, name: 'academicYear' }) || currentYear;

  return (
    <Card className="border-primary/10 shadow-md overflow-hidden animate-in slide-in-from-top-4 duration-500 relative group">
      {canEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 text-destructive h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      <CardHeader className="bg-primary/5 py-4 border-b">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-black uppercase text-primary flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              Enrollment Data Log #{index + 1}
            </p>
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
              Year-Level & GAD Sector Distribution
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
            {/* ACADEMIC YEAR SELECTOR */}
            <div className="w-full sm:w-[150px]">
              <FormField
                control={control}
                name={`enrollmentRecords.${index}.academicYear`}
                render={({ field: inputField }) => (
                  <FormItem>
                    <Select
                      onValueChange={(val) => inputField.onChange(Number(val) || val)}
                      value={String(inputField.value || parentAY)}
                      disabled={!canEdit}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 text-[10px] font-black uppercase bg-white dark:bg-slate-900 border-primary/20">
                          <div className="flex items-center gap-1.5 truncate">
                            <Calendar className="h-3 w-3 text-primary shrink-0" />
                            <SelectValue placeholder="Academic Year" />
                          </div>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableYears.map((yr) => (
                          <SelectItem key={yr} value={String(yr)} className="font-bold text-xs">
                            AY {yr}–{yr + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* ASSOCIATE TO MAJOR */}
            <div className="w-full sm:w-[220px]">
              <FormField
                control={control}
                name={`enrollmentRecords.${index}.majorId`}
                render={({ field: inputField }) => (
                  <FormItem>
                    <Select onValueChange={inputField.onChange} value={inputField.value} disabled={!canEdit}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-[10px] font-black uppercase bg-white dark:bg-slate-900">
                          <SelectValue placeholder="Associate to Major" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="General" className="font-bold">
                          General Program / All Majors
                        </SelectItem>
                        {programSpecializations?.map((spec) => (
                          <SelectItem key={spec.id} value={spec.id}>
                            {spec.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {(canEdit || isAdmin) && (
          <div className="flex flex-col gap-2 border-b bg-muted/10 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
            {canEdit && isAdmin ? (
              <FormField
                control={control}
                name={`enrollmentRecords.${index}.overallOnly`}
                render={({ field: inputField }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={Boolean(inputField.value)}
                        onCheckedChange={(checked) => handleOverallOnlyChange(checked === true)}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer text-[10px] font-black uppercase tracking-wider">
                      Overall Total Only
                    </FormLabel>
                  </FormItem>
                )}
              />
            ) : (
              <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                {overallOnly ? 'Overall totals only' : 'Year-level entry'}
              </p>
            )}
            {overallOnly && (
              <Badge
                variant="outline"
                className="w-fit border-primary/20 bg-primary/5 text-[8px] font-black uppercase text-primary"
              >
                Totals-only mode
              </Badge>
            )}
          </div>
        )}
        <Tabs defaultValue="first" className="w-full">
          <TabsList className="grid grid-cols-3 h-8 bg-muted/30 rounded-none border-b p-0">
            <TabsTrigger value="first" className="text-[9px] font-black uppercase rounded-none border-r">
              1st Sem
            </TabsTrigger>
            <TabsTrigger value="second" className="text-[9px] font-black uppercase rounded-none border-r">
              2nd Sem
            </TabsTrigger>
            <TabsTrigger value="mid" className="text-[9px] font-black uppercase rounded-none">
              Summer
            </TabsTrigger>
          </TabsList>
          <div className="p-4">
            <TabsContent value="first" forceMount className="mt-0 data-[state=inactive]:hidden">
              {renderTermInputs('firstSemester')}
            </TabsContent>
            <TabsContent value="second" forceMount className="mt-0 data-[state=inactive]:hidden">
              {renderTermInputs('secondSemester')}
            </TabsContent>
            <TabsContent value="mid" forceMount className="mt-0 data-[state=inactive]:hidden">
              {renderTermInputs('midYearTerm')}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
      <CardFooter className="bg-muted/5 border-t py-2 px-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[8px] font-black uppercase bg-primary/5 text-primary border-primary/20"
          >
            AY {recordValues?.academicYear || parentAY}
          </Badge>
          <p className="text-[8px] font-black uppercase text-primary/50 hidden sm:inline">
            Institutional GAD Synchronization Active
          </p>
        </div>
        <div className="flex gap-6 text-[10px] font-black text-slate-800 dark:text-slate-200">
          <div className="flex items-center gap-2">
            <span className="opacity-40">1ST SEM TOTAL:</span>
            <span className="text-primary tabular-nums">{getOverallValues('firstSemester').total}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="opacity-40">2ND SEM TOTAL:</span>
            <span className="text-primary tabular-nums">{getOverallValues('secondSemester').total}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

function CurriculumRecordCard({
  index,
  control,
  canEdit,
  isAdmin,
  onRemove,
  programSpecializations,
}: {
  index: number;
  control: any;
  canEdit: boolean;
  isAdmin: boolean;
  onRemove: () => void;
  programSpecializations?: { id: string; name: string }[];
}) {
  const isNotedByChed = useWatch({ control, name: `curriculumRecords.${index}.isNotedByChed` });
  const notationProofLinkVal = useWatch({ control, name: `curriculumRecords.${index}.notationProofLink` });

  return (
    <Card className="border-primary/10 shadow-sm overflow-hidden relative group">
      {canEdit && isAdmin && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="absolute top-2 right-2 text-destructive h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      <CardHeader className="bg-muted/30 py-3 border-b">
        <p className="text-xs font-black uppercase text-primary flex items-center gap-2">
          <Layers className="h-3.5 w-3.5" />
          Specialization/Major Curriculum & Notation Record #{index + 1}
        </p>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name={`curriculumRecords.${index}.majorId`}
            render={({ field: inputField }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-bold uppercase">Associated Specialization/Major</FormLabel>
                <Select onValueChange={inputField.onChange} value={inputField.value} disabled={!canEdit || !isAdmin}>
                  <FormControl>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="General" className="font-bold">
                      General Program / All Specializations
                    </SelectItem>
                    {programSpecializations?.map((spec) => (
                      <SelectItem key={spec.id} value={spec.id}>
                        {spec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`curriculumRecords.${index}.revisionNumber`}
            render={({ field: inputField }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-bold uppercase">Revision Number</FormLabel>
                <FormControl>
                  <Input
                    {...inputField}
                    value={inputField.value || ''}
                    placeholder="e.g. 2024-Rev01"
                    className="h-9 text-xs"
                    disabled={!canEdit || !isAdmin}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name={`curriculumRecords.${index}.dateImplemented`}
          render={({ field: inputField }) => (
            <FormItem>
              <FormLabel className="text-[10px] font-bold uppercase">Date Implemented</FormLabel>
              <FormControl>
                <Input
                  {...inputField}
                  value={inputField.value || ''}
                  placeholder="e.g. 1st Sem 2024"
                  className="h-9 text-xs"
                  disabled={!canEdit || !isAdmin}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <FormLabel className="text-xs font-black uppercase text-blue-800">CHED Program Notation Status</FormLabel>
              <p className="text-[9px] text-muted-foreground">
                Is this specialization/major's curriculum officially acknowledged by CHED?
              </p>
            </div>
            <FormField
              control={control}
              name={`curriculumRecords.${index}.isNotedByChed`}
              render={({ field: inputField }) => (
                <FormControl>
                  <Switch
                    checked={inputField.value}
                    onCheckedChange={inputField.onChange}
                    disabled={!canEdit || !isAdmin}
                  />
                </FormControl>
              )}
            />
          </div>

          <div
            className={cn(
              'grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border bg-blue-50/20 transition-all duration-500',
              !isNotedByChed && 'opacity-30 grayscale pointer-events-none',
            )}
          >
            <FormField
              control={control}
              name={`curriculumRecords.${index}.notationProofLink`}
              render={({ field: inputField }) => (
                <FormItem>
                  <FormLabel className="text-[9px] font-black uppercase text-blue-700 flex items-center gap-2">
                    Proof of Content Noted (PDF)
                    {notationProofLinkVal && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <LinkIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-blue-400" />
                      <Input
                        {...inputField}
                        value={inputField.value || ''}
                        placeholder="GDrive Proof Link..."
                        className="pl-8 h-8 text-[10px] bg-white border-blue-100"
                        disabled={!canEdit || !isAdmin}
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`curriculumRecords.${index}.dateNoted`}
              render={({ field: inputField }) => (
                <FormItem>
                  <FormLabel className="text-[9px] font-black uppercase text-blue-700">Date of CHED Notation</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-blue-400" />
                      <Input
                        {...inputField}
                        value={inputField.value || ''}
                        placeholder="e.g. Oct 24, 2024"
                        className="pl-8 h-8 text-[10px] bg-white border-blue-100 font-bold"
                        disabled={!canEdit || !isAdmin}
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CurriculumModule({ canEdit, programSpecializations, focusMode = 'all' }: CurriculumModuleProps) {
  const { control, setValue, watch } = useFormContext();
  const { isAdmin } = useUser();
  const programCmoLinkVal = watch('ched.programCmoLink');

  const {
    fields: curFields,
    append: appendCur,
    remove: removeCur,
  } = useFieldArray({
    control,
    name: 'curriculumRecords',
  });

  const {
    fields: enrollFields,
    append: appendEnroll,
    remove: removeEnroll,
  } = useFieldArray({
    control,
    name: 'enrollmentRecords',
  });

  const getEmptyYearLevel = () => ({
    male: 0,
    female: 0,
    total: 0,
    specialNeeds: 0,
    sectors: GAD_SECTORS.reduce((acc, s) => ({ ...acc, [s]: { male: 0, female: 0 } }), {}),
  });

  const parentAY = watch('academicYear') || new Date().getFullYear();

  const getEmptyEnrollRecord = () => ({
    id: Math.random().toString(36).substr(2, 9),
    academicYear: Number(parentAY) || parentAY,
    majorId: 'General',
    firstSemester: {
      firstYear: getEmptyYearLevel(),
      secondYear: getEmptyYearLevel(),
      thirdYear: getEmptyYearLevel(),
      fourthYear: getEmptyYearLevel(),
    },
    secondSemester: {
      firstYear: getEmptyYearLevel(),
      secondYear: getEmptyYearLevel(),
      thirdYear: getEmptyYearLevel(),
      fourthYear: getEmptyYearLevel(),
    },
    midYearTerm: {
      firstYear: getEmptyYearLevel(),
      secondYear: getEmptyYearLevel(),
      thirdYear: getEmptyYearLevel(),
      fourthYear: getEmptyYearLevel(),
    },
    overallOnly: false,
    overall: {
      firstSemester: {
        male: 0,
        female: 0,
        total: 0,
        sectors: GAD_SECTORS.reduce((acc, s) => ({ ...acc, [s]: { male: 0, female: 0 } }), {}),
      },
      secondSemester: {
        male: 0,
        female: 0,
        total: 0,
        sectors: GAD_SECTORS.reduce((acc, s) => ({ ...acc, [s]: { male: 0, female: 0 } }), {}),
      },
      midYearTerm: {
        male: 0,
        female: 0,
        total: 0,
        sectors: GAD_SECTORS.reduce((acc, s) => ({ ...acc, [s]: { male: 0, female: 0 } }), {}),
      },
    },
  });

  const handleClearYearLevels = () => {
    if (!canEdit || !isAdmin) return;
    if (
      !window.confirm(
        'Clear all male and female entries for every year level and GAD sector in all enrollment records? This cannot be undone until you save the form.',
      )
    ) {
      return;
    }

    const records = (watch('enrollmentRecords') || []) as Array<Record<string, any>>;

    enrollFields.forEach((_, recordIndex) => {
      (['firstSemester', 'secondSemester', 'midYearTerm'] as const).forEach((termKey) => {
        GAD_SECTORS.forEach((sector) => {
          setValue(`enrollmentRecords.${recordIndex}.overall.${termKey}.sectors.${sector}.male`, 0, {
            shouldDirty: true,
          });
          setValue(`enrollmentRecords.${recordIndex}.overall.${termKey}.sectors.${sector}.female`, 0, {
            shouldDirty: true,
          });
        });

        (['firstYear', 'secondYear', 'thirdYear', 'fourthYear', 'fifthYear'] as const).forEach((level) => {
          const levelData = records[recordIndex]?.[termKey]?.[level];
          if (!levelData) return;

          setValue(`enrollmentRecords.${recordIndex}.${termKey}.${level}.male`, 0, { shouldDirty: true });
          setValue(`enrollmentRecords.${recordIndex}.${termKey}.${level}.female`, 0, { shouldDirty: true });

          if (!levelData.sectors) return;
          GAD_SECTORS.forEach((sector) => {
            setValue(`enrollmentRecords.${recordIndex}.${termKey}.${level}.sectors.${sector}.male`, 0, {
              shouldDirty: true,
            });
            setValue(`enrollmentRecords.${recordIndex}.${termKey}.${level}.sectors.${sector}.female`, 0, {
              shouldDirty: true,
            });
          });
        });
      });
    });
  };

  const showRegistry = focusMode === 'all';
  const showEnrollment = focusMode === 'all' || focusMode === 'enrollment';

  return (
    <div className={cn('grid grid-cols-1 gap-8', showRegistry ? 'lg:grid-cols-2' : 'max-w-4xl mx-auto')}>
      {showRegistry && (
        <div className="space-y-8">
          <Card className="border-primary/20 shadow-sm overflow-hidden">
            <div className="bg-primary/5 border-b py-4 px-6">
              <p className="text-xs font-black uppercase text-primary flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Program Standard Reference
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                The CHED Memorandum Order (CMO) that governs this entire degree program.
              </p>
            </div>
            <CardContent className="pt-6">
              <FormField
                control={control}
                name="ched.programCmoLink"
                render={({ field: inputField }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold uppercase flex items-center gap-2">
                      CHED Memorandum Order (CMO) Link
                      {programCmoLinkVal && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...inputField}
                          value={inputField.value || ''}
                          placeholder="https://drive.google.com/..."
                          className="pl-9"
                          disabled={!canEdit || !isAdmin}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-[9px]">
                      A single institutional standard reference for all program specializations.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between bg-muted p-4 rounded-xl border border-primary/10 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Major-Specific Curriculum Registry
              </h3>
              <p className="text-[10px] text-muted-foreground font-medium">
                Log notation status and implementation details per specialization/major.
              </p>
            </div>
            {canEdit && isAdmin && (
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  appendCur({
                    id: Math.random().toString(36).substr(2, 9),
                    majorId: 'General',
                    revisionNumber: '',
                    dateImplemented: '',
                    isNotedByChed: false,
                    notationProofLink: '',
                    dateNoted: '',
                  })
                }
                className="shadow-lg shadow-primary/20 h-8 text-[10px] font-bold"
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Curriculum
              </Button>
            )}
          </div>

          <div className="space-y-6">
            {curFields.map((field, index) => (
              <CurriculumRecordCard
                key={field.id}
                index={index}
                control={control}
                canEdit={canEdit}
                isAdmin={isAdmin}
                onRemove={() => removeCur(index)}
                programSpecializations={programSpecializations}
              />
            ))}
            {curFields.length === 0 && (
              <div className="text-center py-16 border border-dashed rounded-2xl bg-muted/5">
                <Layers className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-3" />
                <p className="text-xs font-bold text-muted-foreground uppercase">No Curriculum Records Logged</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showEnrollment && (
        <div className="space-y-8">
          <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/10 shadow-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Users className="h-4 w-4" />
                Major-Specific Enrollment Registry
              </h3>
              <p className="text-[10px] text-muted-foreground font-medium">
                Disaggregated student statistics by Year Level and GAD Sector.
              </p>
            </div>
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                {isAdmin && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleClearYearLevels}
                    className="h-8 border-destructive/30 text-[10px] font-bold text-destructive hover:bg-destructive/5"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear All Year Levels
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => appendEnroll(getEmptyEnrollRecord())}
                  className="shadow-lg shadow-primary/20 h-8 text-[10px] font-bold"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Major Count
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-8">
            {enrollFields.map((field, index) => (
              <EnrollmentRecordCard
                key={field.id}
                index={index}
                control={control}
                canEdit={canEdit}
                isAdmin={isAdmin}
                onRemove={() => removeEnroll(index)}
                programSpecializations={programSpecializations}
                setValue={setValue}
              />
            ))}
            {enrollFields.length === 0 && (
              <div className="text-center py-16 border border-dashed rounded-2xl bg-muted/5">
                <Users className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-3" />
                <p className="text-xs font-bold text-muted-foreground uppercase">No Enrollment Data Logged</p>
              </div>
            )}
          </div>

          {showRegistry && (
            <Card className="bg-slate-50 dark:bg-slate-800/50 border-dashed">
              <div className="py-4 px-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Calculator className="h-3.5 w-3.5" />
                  Institutional Totals (Summary)
                </p>
              </div>
              <CardContent>
                <FormField
                  control={control}
                  name="stats.graduationCount"
                  render={({ field: inputField }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-primary">
                        AY Graduation Target
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...inputField}
                          value={inputField.value || 0}
                          className="h-10 text-lg font-black border-primary/30"
                          disabled={!canEdit}
                          onChange={(e) => inputField.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
