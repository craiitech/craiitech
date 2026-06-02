'use client';

import { useState, useMemo } from 'react';
import { Calendar, Clock, ClipboardList, Info, Printer, Loader2, FileText, Award, GraduationCap, TriangleAlert, ListChecks, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AuditSchedule, AuditPlan, Signatories, AuditGroup, AuditFinding, ISOClause, Unit, Campus, AcademicProgram, Risk, CorrectiveActionRequest, ProgramComplianceRecord, Submission } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuditPlanPrintTemplate } from '@/components/audit/audit-plan-print-template';
import { ConsolidatedAuditReportTemplate } from '@/components/audit/consolidated-audit-report-template';
import { AccreditationRecommendationReport } from '@/components/programs/recommendation-print-template';
import { AuditPrintTemplate } from '@/components/audit/audit-print-template';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { ChedProgramsTab } from '@/components/dashboard/executive/ched-programs-tab';
import { RiskOpportunityTab } from '@/components/dashboard/executive/risk-opportunity-tab';
import { CorrectiveActionsTab } from '@/components/dashboard/executive/corrective-actions-tab';
import { ActionableDecisionsTab } from '@/components/dashboard/executive/actionable-decisions-tab';

interface UnitAuditScheduleProps {
  schedules: AuditSchedule[] | null;
  isLoading: boolean;
  plans?: AuditPlan[];
  findings?: AuditFinding[];
  isoClauses?: ISOClause[];
  units?: Unit[];
  campuses?: Campus[];
  signatories?: Signatories;
  campusName?: string;
  isSupervisor?: boolean;
  recommendations?: any[];
  selectedYear?: number;
  academicPrograms?: AcademicProgram[];
  risks?: Risk[] | null;
  cars?: CorrectiveActionRequest[] | null;
  allCompliances?: ProgramComplianceRecord[] | null;
  submissions?: Submission[] | null;
  showDecisionSupport?: boolean;
}

/**
 * UNIT AUDIT SCHEDULE COMPONENT
 * Displays upcoming IQA sessions for the user's unit or campus.
 * Restored: Accreditation recommendations displayed as tab with separate printing, dropdown filters, and IQA Itinerary printing filters.
 */
export function UnitAuditSchedule({ 
    schedules, 
    isLoading, 
    plans = [], 
    findings = [],
    isoClauses = [],
    units = [],
    campuses = [],
    signatories, 
    campusName = 'Campus Site',
    isSupervisor = false,
    recommendations,
    selectedYear,
    academicPrograms = [],
    risks = [],
    cars = [],
    allCompliances = [],
    submissions = [],
    showDecisionSupport = false
}: UnitAuditScheduleProps) {
  const { toast } = useToast();
  const [isPrintingPlan, setIsPrintingPlan] = useState(false);
  const [isPrintingReport, setIsPrintingReport] = useState(false);
  const [isPrintingRecos, setIsPrintingRecos] = useState(false);
  const [activeTab, setActiveTab] = useState('itinerary');

  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [selectedProgram, setSelectedProgram] = useState<string>('all');

  const [selectedItineraryCampus, setSelectedItineraryCampus] = useState<string>('all');
  const [selectedItineraryUnit, setSelectedItineraryUnit] = useState<string>('all');

  const unitMap = useMemo(() => {
    const map = new Map<string, string>();
    units?.forEach(u => map.set(u.id, u.name));
    academicPrograms?.forEach(p => map.set(p.id, p.name));
    return map;
  }, [units, academicPrograms]);

  // Accreditation dynamic dropdown options & filtered items
  const campusesWithLogs = useMemo(() => {
    if (!recommendations || !campuses) return [];
    const ids = new Set(recommendations.map(r => r.campusId).filter(Boolean));
    return campuses.filter(c => ids.has(c.id));
  }, [recommendations, campuses]);

  const programsWithLogs = useMemo(() => {
    if (!recommendations || !academicPrograms) return [];
    const relevantRecos = selectedCampus === 'all' 
      ? recommendations 
      : recommendations.filter(r => r.campusId === selectedCampus);
    const ids = new Set(relevantRecos.map(r => r.programId).filter(Boolean));
    return academicPrograms.filter(p => ids.has(p.id));
  }, [recommendations, academicPrograms, selectedCampus]);

  const filteredRecos = useMemo(() => {
    if (!recommendations) return [];
    return recommendations.filter(r => {
      const matchCampus = selectedCampus === 'all' || r.campusId === selectedCampus;
      const matchProgram = selectedProgram === 'all' || r.programId === selectedProgram;
      return matchCampus && matchProgram;
    });
  }, [recommendations, selectedCampus, selectedProgram]);

  // IQA Itinerary dynamic dropdown options & filtered items
  const itineraryCampuses = useMemo(() => {
    if (!schedules || !campuses) return [];
    const ids = new Set(schedules.map(s => s.campusId).filter(Boolean));
    return campuses.filter(c => ids.has(c.id));
  }, [schedules, campuses]);

  const itineraryUnits = useMemo(() => {
    if (!schedules || !units) return [];
    const relevantSchedules = selectedItineraryCampus === 'all'
      ? schedules
      : schedules.filter(s => s.campusId === selectedItineraryCampus);
    const ids = new Set(relevantSchedules.map(s => s.targetId).filter(Boolean));
    return units.filter(u => ids.has(u.id));
  }, [schedules, units, selectedItineraryCampus]);

  const filteredSchedules = useMemo(() => {
    if (!schedules) return [];
    return schedules.filter(s => {
      const matchCampus = selectedItineraryCampus === 'all' || s.campusId === selectedItineraryCampus;
      const matchUnit = selectedItineraryUnit === 'all' || s.targetId === selectedItineraryUnit;
      return matchCampus && matchUnit;
    });
  }, [schedules, selectedItineraryCampus, selectedItineraryUnit]);

  if (isLoading) return <Skeleton className="h-32 w-full rounded-2xl" />;

  const handlePrintPlan = () => {
    if (!plans.length || !filteredSchedules || filteredSchedules.length === 0) return;

    setIsPrintingPlan(true);
    try {
        const firstSchedule = filteredSchedules[0];
        const plan = plans.find(p => p.id === firstSchedule.auditPlanId);

        if (!plan) {
            toast({ title: "Print Failed", description: "Parent Audit Plan metadata not found.", variant: "destructive" });
            return;
        }

        const sectionsToPrint = Array.from(new Set(
            filteredSchedules.map(s => s.processCategory).filter(Boolean) as AuditGroup[]
        ));

        const order = { 'Management Processes': 1, 'Operation Processes': 2, 'Support Processes': 3 };
        sectionsToPrint.sort((a, b) => (order[a as keyof typeof order] || 99) - (order[b as keyof typeof order] || 99));

        const printCampusName = selectedItineraryCampus === 'all' 
          ? campusName 
          : campuses?.find(c => c.id === selectedItineraryCampus)?.name || campusName;

        const reportsHtml = sectionsToPrint.map(section => {
            const sectionSchedules = filteredSchedules.filter(s => s.processCategory === section && s.auditPlanId === plan.id);
            return renderToStaticMarkup(
                <div key={section} className="print-page-break mb-12">
                    <AuditPlanPrintTemplate 
                        plan={plan} 
                        schedules={sectionSchedules} 
                        campusName={printCampusName} 
                        signatories={signatories} 
                        section={section as AuditGroup}
                    />
                </div>
            );
        }).join('');

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Audit Plan - ${printCampusName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @media print { 
                            body { margin: 0; padding: 0; background: white; } 
                            .no-print { display: none !important; }
                            .print-page-break { page-break-after: always; }
                            .print-page-break:last-child { page-break-after: auto; }
                        }
                        body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-indigo-600 text-white px-8 py-3 rounded shadow-xl hover:bg-indigo-700 font-black uppercase text-xs tracking-widest transition-all">Print Itinerary</button>
                    </div>
                    <div id="print-content">${reportsHtml}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (err) {
        console.error("Print error:", err);
    } finally {
        setIsPrintingPlan(false);
    }
  };

  const handlePrintAuditReport = () => {
    if (!plans.length || !filteredSchedules || filteredSchedules.length === 0 || !isoClauses.length) return;

    setIsPrintingReport(true);
    try {
        const firstSchedule = filteredSchedules[0];
        const plan = plans.find(p => p.id === firstSchedule.auditPlanId);

        if (!plan) {
            toast({ title: "Report Error", description: "Audit Plan metadata missing.", variant: "destructive" });
            return;
        }

        const scheduleIds = new Set(filteredSchedules.map(s => s.id));
        const filteredFindings = findings.filter(f => scheduleIds.has(f.auditScheduleId));

        const printCampusName = selectedItineraryCampus === 'all' 
          ? campusName 
          : campuses?.find(c => c.id === selectedItineraryCampus)?.name || campusName;

        const reportHtml = renderToStaticMarkup(
            <ConsolidatedAuditReportTemplate 
                plan={plan}
                schedules={filteredSchedules}
                findings={filteredFindings}
                clauses={isoClauses}
                units={units}
                campuses={campuses}
                signatories={signatories}
                campusName={printCampusName}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <html>
                <head>
                    <title>Audit Report - ${printCampusName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @page { size: 8.5in 13in !important; margin: 0.5in !important; }
                        @media print { 
                            body { margin: 0 !important; padding: 0 !important; background: white; -webkit-print-color-adjust: exact; } 
                            .no-print { display: none !important; } 
                        }
                        body { font-family: serif; background: #f9fafb; padding: 40px; color: black; font-size: 11pt; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Audit Report</button>
                    </div>
                    <div id="print-content">${reportHtml}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (e) {
        console.error(e);
        toast({ title: "Report generation failed", variant: "destructive" });
    } finally {
        setIsPrintingReport(false);
    }
  };

  const handlePrintAssignedRecos = () => {
    if (!filteredRecos || filteredRecos.length === 0) return;

    setIsPrintingRecos(true);
    try {
        const year = selectedYear || new Date().getFullYear();
        
        let scope: 'institutional' | 'program' | 'unit' = 'institutional';
        let reportUnitName: string | undefined = undefined;
        
        if (selectedProgram !== 'all') {
            scope = 'unit';
            reportUnitName = unitMap.get(selectedProgram);
        } else if (selectedCampus !== 'all') {
            scope = 'institutional';
            reportUnitName = campuses?.find(c => c.id === selectedCampus)?.name;
        }

        const reportHtml = renderToStaticMarkup(
            <AccreditationRecommendationReport 
                items={filteredRecos.map((r: any) => ({
                    programName: r.programName,
                    abbreviation: '',
                    level: r.level,
                    recommendation: r.recommendation
                }))}
                unitMap={unitMap}
                scope={scope}
                year={year}
                unitName={reportUnitName}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Accreditation Gaps Report</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @page { size: 8.5in 13in !important; margin: 0.5in !important; } 
                        @media print { 
                            body { background: white; margin: 0; padding: 0; -webkit-print-color-adjust: exact; } 
                            .no-print { display: none !important; } 
                        } 
                        body { font-family: serif; padding: 40px; color: black; font-size: 11pt; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl font-black uppercase text-xs tracking-widest transition-all">Click to Print Folio Report</button>
                    </div>
                    <div id="print-content">${reportHtml}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (e) {
        console.error("Print recommendations error:", e);
        toast({ title: "Print Failed", description: "Could not generate Accreditation report.", variant: "destructive" });
    } finally {
        setIsPrintingRecos(false);
    }
  };

  const hasEvidence = (scheduleId: string) => {
    const hasFindings = findings.some(f => f.auditScheduleId === scheduleId);
    const schedule = schedules?.find(s => s.id === scheduleId);
    const hasSummary = schedule ? !!(schedule.summaryCommendable || schedule.summaryCompliance || schedule.summaryOFI || schedule.summaryNC) : false;
    return hasFindings || hasSummary;
  };

  const handlePrintIndividualTemplate = (schedule: AuditSchedule, withData: boolean = false) => {
    if (withData && !hasEvidence(schedule.id)) {
        toast({
            variant: "destructive",
            title: "No Evidence Logged",
            description: "Print failed: This unit has not been audited yet. No evidence logs are available to print.",
        });
        return;
    }

    const clausesInScope = isoClauses.filter(c => schedule.isoClausesToAudit.includes(c.id));
    const parentPlan = plans.find(p => p.id === schedule.auditPlanId);
    const campusName = campuses.find(c => c.id === schedule.campusId)?.name || 'Institutional';
    
    const scheduleFindings = withData 
        ? findings.filter(f => f.auditScheduleId === schedule.id)
        : [];

    try {
        const reportHtml = renderToStaticMarkup(
            <AuditPrintTemplate 
                schedule={schedule}
                findings={scheduleFindings}
                clauses={clausesInScope}
                signatories={signatories}
                leadAuditorName={parentPlan?.leadAuditorName}
                campusName={campusName}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Audit Evidence Log - ${schedule.targetName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @page { 
                            size: 8.5in 13in !important; 
                            margin: 0.5in !important; 
                        }
                        @media print { 
                            body { margin: 0 !important; padding: 0 !important; background: white; width: 100% !important; -webkit-print-color-adjust: exact; } 
                            .no-print { display: none !important; }
                            table { page-break-inside: auto; width: 100% !important; border-collapse: collapse; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                        }
                        body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print ${withData ? 'Evidence Log' : 'Blank Template'}</button>
                    </div>
                    <div id="print-content">
                        ${reportHtml}
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (err) {
        console.error("Print error:", err);
    }
  };

  const handlePrintIndividualReport = (schedule: AuditSchedule) => {
    if (!hasEvidence(schedule.id)) {
        toast({
            variant: "destructive",
            title: "No Evidence Logged",
            description: "Print failed: This unit has not been audited yet. No audit report can be generated.",
        });
        return;
    }

    const parentPlan = plans.find(p => p.id === schedule.auditPlanId);
    if (!parentPlan) {
        toast({
            variant: "destructive",
            title: "Plan Not Found",
            description: "Print failed: Parent audit plan for this schedule could not be resolved.",
        });
        return;
    }

    const scheduleFindings = findings.filter(f => f.auditScheduleId === schedule.id);
    const campusName = campuses.find(c => c.id === schedule.campusId)?.name || 'Institutional';

    try {
        const reportHtml = renderToStaticMarkup(
            <ConsolidatedAuditReportTemplate 
                plan={parentPlan}
                schedules={[schedule]}
                findings={scheduleFindings}
                clauses={isoClauses}
                units={units}
                campuses={campuses}
                signatories={signatories}
                campusName={campusName}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Audit Report - ${schedule.targetName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @page { 
                            size: 8.5in 13in !important; 
                            margin: 0.5in !important; 
                        }
                        @media print { 
                            body { margin: 0 !important; padding: 0 !important; background: white; width: 100% !important; -webkit-print-color-adjust: exact; } 
                            .no-print { display: none !important; }
                            table { page-break-inside: auto; width: 100% !important; border-collapse: collapse; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                        }
                        body { font-family: serif; background: #f9fafb; padding: 40px; color: black; font-size: 11pt; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Report</button>
                    </div>
                    <div id="print-content" style="padding: 0.1in;">
                        ${reportHtml}
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (err) {
        console.error("Print report error:", err);
    }
  };

  const showAccreditation = !!recommendations;
  const showChed = showDecisionSupport;
  const showRisk = showDecisionSupport;
  const showCar = showDecisionSupport;
  const showDecision = showDecisionSupport;

  const hasTabs = showAccreditation || showChed || showRisk || showCar || showDecision;

  const renderHeader = () => (
    <CardHeader className="pb-3 bg-primary/10 border-b">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {hasTabs ? (
              <ScrollArea className="w-full">
                  <TabsList className="bg-white/50 border border-primary/10 shadow-sm h-10 animate-tab-highlight rounded-md p-1 w-max min-w-max">
                      <TabsTrigger value="itinerary" className="text-[10px] font-black uppercase tracking-wider h-8">
                          IQA Itinerary
                      </TabsTrigger>
                      {showAccreditation && (
                          <TabsTrigger value="accreditation" className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 h-8">
                              Accreditation Gaps
                              <Badge className="bg-primary text-white h-4 min-w-4 px-1 rounded-full text-[8px] flex items-center justify-center border-none font-bold">
                                  {recommendations?.length || 0}
                              </Badge>
                          </TabsTrigger>
                      )}
                      {showChed && (
                          <TabsTrigger value="ched" className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 h-8">
                              <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
                              CHED Programs
                          </TabsTrigger>
                      )}
                      {showRisk && (
                          <TabsTrigger value="risk" className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 h-8">
                              <TriangleAlert className="h-3.5 w-3.5 text-amber-600" />
                              Risk & Opportunity
                          </TabsTrigger>
                      )}
                      {showCar && (
                          <TabsTrigger value="car" className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 h-8">
                              <ListChecks className="h-3.5 w-3.5 text-rose-600" />
                              Corrective Actions
                          </TabsTrigger>
                      )}
                      {showDecision && (
                          <TabsTrigger value="decision" className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 h-8">
                              <Zap className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                              Actionable Decisions
                          </TabsTrigger>
                      )}
                  </TabsList>
              </ScrollArea>
          ) : (
              <div className="space-y-1">
                  <CardTitle className="text-sm font-black uppercase text-primary flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Active IQA Itinerary Entries
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                  Official internal quality audit sessions for your scope.
                  </CardDescription>
              </div>
          )}
          
          <div className="flex flex-wrap gap-2">
              {(!hasTabs || activeTab === 'itinerary') ? (
                  <>
                      <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handlePrintAuditReport} 
                          disabled={isPrintingReport || filteredSchedules.length === 0}
                          className="h-8 bg-white border-primary/20 text-indigo-700 font-black uppercase text-[10px] tracking-widest gap-2 shadow-sm"
                      >
                          {isPrintingReport ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                          Print {isSupervisor ? 'Site' : 'Unit'} Report
                      </Button>
                      <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handlePrintPlan} 
                          disabled={isPrintingPlan || filteredSchedules.length === 0}
                          className="h-8 bg-white border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest gap-2 shadow-sm"
                      >
                          {isPrintingPlan ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                          Print {isSupervisor ? 'Site' : 'Unit'} Plan
                      </Button>
                  </>
              ) : activeTab === 'accreditation' ? (
                  <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePrintAssignedRecos} 
                      disabled={isPrintingRecos || filteredRecos.length === 0}
                      className="h-8 bg-white border-amber-200 text-amber-700 font-black uppercase text-[10px] tracking-widest gap-2 shadow-sm hover:bg-amber-50"
                  >
                      {isPrintingRecos ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                      Print Gaps Log
                  </Button>
              ) : null}
          </div>
      </div>
    </CardHeader>
  );

  const renderItineraryList = () => {
    return (
      <div className="flex flex-col">
        {/* IQA Filters bar */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-primary/5 border-b border-primary/10 items-center justify-between">
          <div className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            IQA Itinerary Filters
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Site dropdown */}
            <div className="w-full sm:w-[200px]">
              <Select value={selectedItineraryCampus} onValueChange={(val) => {
                setSelectedItineraryCampus(val);
                setSelectedItineraryUnit('all'); // Reset unit selection on campus change
              }}>
                <SelectTrigger className="h-8 text-[10px] font-black uppercase tracking-wider bg-white border-primary/20 text-primary shadow-xs">
                  <SelectValue placeholder="Institutional (All Sites)" />
                </SelectTrigger>
                <SelectContent className="bg-white border-primary/20">
                  <SelectItem value="all" className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Institutional (All Sites)
                  </SelectItem>
                  {itineraryCampuses.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Unit dropdown */}
            <div className="w-full sm:w-[250px]">
              <Select value={selectedItineraryUnit} onValueChange={setSelectedItineraryUnit}>
                <SelectTrigger className="h-8 text-[10px] font-black uppercase tracking-wider bg-white border-primary/20 text-primary shadow-xs">
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent className="bg-white border-primary/20">
                  <SelectItem value="all" className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    All Units
                  </SelectItem>
                  {itineraryUnits.map(u => (
                    <SelectItem key={u.id} value={u.id} className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Scroll area for IQA list */}
        <ScrollArea className="h-[450px]">
            <div className="divide-y divide-primary/10 bg-white/50">
                {filteredSchedules.map(schedule => {
                    const date = schedule.scheduledDate instanceof Timestamp ? schedule.scheduledDate.toDate() : new Date(schedule.scheduledDate);
                    return (
                        <div key={schedule.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-white transition-colors gap-4 animate-in fade-in duration-300">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center justify-center h-12 w-12 rounded-xl bg-white border border-primary/10 text-primary shrink-0 shadow-sm">
                                    <span className="text-[9px] font-black uppercase leading-none mb-0.5">{format(date, 'MMM')}</span>
                                    <span className="text-lg font-black leading-none">{format(date, 'dd')}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-900 uppercase truncate" title={schedule.targetName}>{schedule.targetName}</p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                                            <Clock className="h-3 w-3 text-primary/60" />
                                            {format(date, 'hh:mm a')}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium italic truncate max-w-[250px]">
                                            <ClipboardList className="h-3 w-3 text-primary/40" />
                                            {schedule.procedureDescription}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                                <Badge className={cn(
                                    "h-5 text-[9px] font-black uppercase border-none px-3 shadow-sm",
                                    schedule.status === 'In Progress' ? "bg-blue-600 text-white animate-pulse" : 
                                    schedule.status === 'Completed' ? "bg-emerald-600 text-white" : "bg-amber-50 text-amber-950"
                                )}>
                                    {schedule.status}
                                </Badge>
                                
                                <div className="flex items-center gap-1">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handlePrintIndividualTemplate(schedule, false)}
                                        className="h-7 text-[8px] px-2 font-black uppercase bg-white border-primary/20 text-primary hover:bg-primary/5 gap-1"
                                        title="Print Template"
                                    >
                                        <Printer className="h-2.5 w-2.5" />
                                        Template
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handlePrintIndividualTemplate(schedule, true)}
                                        className="h-7 text-[8px] px-2 font-black uppercase bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1"
                                        title="Print Evidence Log"
                                    >
                                        <Printer className="h-2.5 w-2.5" />
                                        Evidence
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handlePrintIndividualReport(schedule)}
                                        className="h-7 text-[8px] px-2 font-black uppercase bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1"
                                        title="Print Audit Report"
                                    >
                                        <FileText className="h-2.5 w-2.5" />
                                        Report
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filteredSchedules.length === 0 && (
                    <div className="py-20 text-center opacity-30 flex flex-col items-center gap-2 bg-white/50">
                      <Calendar className="h-10 w-10 text-primary" />
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">No active quality audits match the filters</p>
                    </div>
                )}
            </div>
        </ScrollArea>
      </div>
    );
  };

  const renderAccreditationList = () => {
    if (!recommendations || recommendations.length === 0) {
      return (
        <div className="py-20 text-center opacity-40 flex flex-col items-center gap-2 bg-white/50">
            <Award className="h-10 w-10 text-amber-600 animate-pulse" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">No active accreditation gaps recorded</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-amber-500/5 border-b border-amber-200/50 items-center justify-between">
          <div className="text-[10px] font-black uppercase text-amber-800 tracking-wider flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-600" />
            Accreditation Gaps Filters
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Campus dropdown */}
            <div className="w-full sm:w-[200px]">
              <Select value={selectedCampus} onValueChange={(val) => {
                setSelectedCampus(val);
                setSelectedProgram('all'); // Reset program selection on campus change
              }}>
                <SelectTrigger className="h-8 text-[10px] font-black uppercase tracking-wider bg-white border-amber-200 text-amber-800 shadow-xs focus:ring-amber-500">
                  <SelectValue placeholder="Institutional (All)" />
                </SelectTrigger>
                <SelectContent className="bg-white border-amber-200">
                  <SelectItem value="all" className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Institutional (All Campuses)
                  </SelectItem>
                  {campusesWithLogs.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Program dropdown */}
            <div className="w-full sm:w-[250px]">
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger className="h-8 text-[10px] font-black uppercase tracking-wider bg-white border-amber-200 text-amber-800 shadow-xs focus:ring-amber-500">
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent className="bg-white border-amber-200">
                  <SelectItem value="all" className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    All Programs
                  </SelectItem>
                  {programsWithLogs.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Scroll area for logs */}
        <ScrollArea className="h-[450px]">
            <div className="divide-y divide-amber-100 bg-white/50">
                {filteredRecos.map((recoItem, idx) => {
                    return (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-start justify-between p-4 hover:bg-amber-50/50 transition-colors gap-4 animate-in fade-in duration-300">
                            <div className="flex items-start gap-4 min-w-0">
                                <div className="flex flex-col items-center justify-center h-12 w-12 rounded-xl bg-white border border-amber-200 text-amber-700 shrink-0 shadow-sm mt-0.5">
                                    <Award className="h-6 w-6" />
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">
                                            {recoItem.programName}
                                        </span>
                                        <Badge variant="outline" className="h-4 text-[8px] font-black uppercase border-amber-200 text-amber-800 bg-amber-50/50">
                                            {recoItem.level}
                                        </Badge>
                                        <Badge className={cn(
                                            "h-4 text-[8px] font-black uppercase border-none px-2 shadow-xs",
                                            recoItem.recommendation.type === 'Mandatory' ? "bg-rose-600 text-white" : "bg-blue-600 text-white"
                                        )}>
                                            {recoItem.recommendation.type}
                                        </Badge>
                                    </div>
                                    <p className="text-xs font-medium text-slate-800 italic leading-relaxed">
                                        "{recoItem.recommendation.text}"
                                    </p>
                                    {recoItem.recommendation.additionalInfo && (
                                        <p className="text-[10px] text-muted-foreground font-semibold leading-normal mt-1">
                                            <span className="uppercase font-bold text-slate-500 mr-1">Notes:</span>
                                            {recoItem.recommendation.additionalInfo}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 sm:self-center">
                                <Badge className={cn(
                                    "h-5 text-[9px] font-black uppercase border-none px-3 shadow-sm",
                                    recoItem.recommendation.status === 'Open' ? "bg-rose-100 text-rose-800" :
                                    recoItem.recommendation.status === 'In Progress' ? "bg-amber-100 text-amber-800 animate-pulse" : "bg-emerald-100 text-emerald-800"
                                )}>
                                    {recoItem.recommendation.status}
                                </Badge>
                            </div>
                        </div>
                    );
                })}
                {filteredRecos.length === 0 && (
                    <div className="py-20 text-center opacity-40 flex flex-col items-center gap-2">
                        <Award className="h-10 w-10 text-amber-600" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">No active accreditation gaps match the filters</p>
                    </div>
                )}
            </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-md animate-in slide-in-from-top-4 duration-500 overflow-hidden">
      {hasTabs ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {renderHeader()}
          <CardContent className="p-0">
            <TabsContent value="itinerary" className="p-0 mt-0">
              {renderItineraryList()}
            </TabsContent>
            {showAccreditation && (
              <TabsContent value="accreditation" className="p-0 mt-0">
                {renderAccreditationList()}
              </TabsContent>
            )}
            {showChed && (
              <TabsContent value="ched" className="p-6 mt-0 bg-white/40">
                <ChedProgramsTab
                  academicPrograms={academicPrograms || []}
                  allCompliances={allCompliances || []}
                  campuses={campuses || []}
                  selectedYear={selectedYear || new Date().getFullYear()}
                />
              </TabsContent>
            )}
            {showRisk && (
              <TabsContent value="risk" className="p-6 mt-0 bg-white/40">
                <RiskOpportunityTab
                  risks={risks || []}
                  allUnits={units || []}
                  campuses={campuses || []}
                  selectedYear={selectedYear || new Date().getFullYear()}
                />
              </TabsContent>
            )}
            {showCar && (
              <TabsContent value="car" className="p-6 mt-0 bg-white/40">
                <CorrectiveActionsTab
                  cars={cars || []}
                  allUnits={units || []}
                  campuses={campuses || []}
                  selectedYear={selectedYear || new Date().getFullYear()}
                />
              </TabsContent>
            )}
            {showDecision && (
              <TabsContent value="decision" className="p-6 mt-0 bg-white/40">
                <ActionableDecisionsTab
                  risks={risks || []}
                  cars={cars || []}
                  allCompliances={allCompliances || []}
                  academicPrograms={academicPrograms || []}
                  auditSchedules={schedules || []}
                  submissions={submissions || []}
                  campuses={campuses || []}
                  allUnits={units || []}
                  selectedYear={selectedYear || new Date().getFullYear()}
                />
              </TabsContent>
            )}
          </CardContent>
          {activeTab === 'itinerary' && (
            <CardFooter className="bg-muted/5 border-t py-3 px-6">
                <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-muted-foreground italic leading-tight">
                        <strong>Auditee Preparation:</strong> Ensure all evidence logs and registered forms are accessible for verification. Refer to the <strong>Evidence Log Sheet</strong> instructions in the full Audit Hub for standard requirements.
                    </p>
                </div>
            </CardFooter>
          )}
          {activeTab === 'accreditation' && (
            <CardFooter className="bg-muted/5 border-t py-3 px-6">
                <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-muted-foreground italic leading-tight">
                        <strong>Accreditation Follow-up:</strong> The designated departments/units must initiate compliance actions. Upload documentation logs to clear active findings prior to next evaluation cycle.
                    </p>
                </div>
            </CardFooter>
          )}
        </Tabs>
      ) : (
        <>
          {renderHeader()}
          <CardContent className="p-0">
            {renderItineraryList()}
          </CardContent>
          <CardFooter className="bg-muted/5 border-t py-3 px-6">
              <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-muted-foreground italic leading-tight">
                      <strong>Auditee Preparation:</strong> Ensure all evidence logs and registered forms are accessible for verification. Refer to the <strong>Evidence Log Sheet</strong> instructions in the full Audit Hub for standard requirements.
                  </p>
              </div>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
