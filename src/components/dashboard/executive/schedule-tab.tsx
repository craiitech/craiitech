'use client';

import { useMemo, useState } from 'react';
import type { 
  Risk, 
  CorrectiveActionRequest, 
  ProgramComplianceRecord, 
  AcademicProgram, 
  AuditSchedule, 
  Campus, 
  Unit,
  Cycle,
  ManagementReviewOutput
} from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Filter, 
  MapPin, 
  Building2, 
  User, 
  Activity, 
  Info,
  CalendarCheck2,
  ClipboardCheck,
  AlertTriangle,
  Zap,
  ShieldAlert,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isBefore, isAfter, addDays, startOfDay, endOfDay } from 'date-fns';

interface ScheduleTabProps {
  schedules: AuditSchedule[];
  risks: Risk[];
  cars: CorrectiveActionRequest[];
  allCompliances: ProgramComplianceRecord[];
  academicPrograms: AcademicProgram[];
  campuses: Campus[];
  allUnits: Unit[];
  cycles: Cycle[];
  mrOutputs: ManagementReviewOutput[];
  selectedYear: number;
}

type EventCategory = 
  | 'Internal Quality Audit'
  | 'Risk & Opportunity'
  | 'Actionable Decision'
  | 'Corrective Action Request'
  | 'Accreditation'
  | 'Submission Cycle';

interface ScheduleEvent {
  id: string;
  category: EventCategory;
  title: string;
  description: string;
  date: Date;
  displayDate: string;
  status: 'Open' | 'In Progress' | 'Closed' | 'Scheduled' | 'Completed' | 'Pending';
  responsibleName?: string;
  unitId?: string;
  unitName?: string;
  campusId?: string;
  campusName?: string;
  additionalInfo?: string;
  sourceRecord: any;
}

const CATEGORY_STYLING: Record<EventCategory, { bg: string; border: string; text: string; dot: string }> = {
  'Internal Quality Audit': { bg: 'bg-emerald-50/50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Risk & Opportunity': { bg: 'bg-amber-50/50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Actionable Decision': { bg: 'bg-purple-50/50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-500' },
  'Corrective Action Request': { bg: 'bg-rose-50/50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
  'Accreditation': { bg: 'bg-blue-50/50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Submission Cycle': { bg: 'bg-teal-50/50', border: 'border-teal-200', text: 'text-teal-700', dot: 'bg-teal-500' },
};

const MODULES: EventCategory[] = [
  'Internal Quality Audit',
  'Risk & Opportunity',
  'Actionable Decision',
  'Corrective Action Request',
  'Accreditation',
  'Submission Cycle'
];

function parseDateValue(dateVal: any): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal === 'object' && dateVal.seconds !== undefined) {
    return new Date(dateVal.seconds * 1000);
  }
  if (dateVal && typeof dateVal.toDate === 'function') {
    return dateVal.toDate();
  }
  if (typeof dateVal === 'string') {
    const parsed = Date.parse(dateVal);
    if (!isNaN(parsed)) return new Date(parsed);
    const match = dateVal.match(/([a-zA-Z]+)\s+(\d{4})/);
    if (match) {
      const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const mStr = match[1].toLowerCase().substring(0, 3);
      const mIdx = monthNames.indexOf(mStr);
      if (mIdx !== -1) {
        return new Date(parseInt(match[2]), mIdx, 1);
      }
    }
  }
  return null;
}

function EventItemCard({ event: e, styles }: { event: ScheduleEvent; styles: any }) {
  const isEventOverdue = isBefore(e.date, startOfDay(new Date())) && e.status !== 'Closed' && e.status !== 'Completed';
  
  return (
    <div className={cn(
      "p-3 rounded-xl border bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3 relative group shadow-sm hover:shadow-md",
      isEventOverdue && "border-rose-100 bg-rose-50/20"
    )}>
      {/* Date badge */}
      <div className={cn(
        "flex flex-col items-center justify-center h-10 w-10 rounded-lg border shrink-0 text-center font-bold select-none text-[8px]",
        isEventOverdue ? "border-rose-200 bg-rose-50 text-rose-700 font-black" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300"
      )}>
        <span className="font-black uppercase leading-none">{format(e.date, 'MMM')}</span>
        <span className="text-sm font-black leading-none mt-0.5">{format(e.date, 'd')}</span>
      </div>

      <div className="flex-1 min-w-0 space-y-1 pr-16">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge 
            className={cn(
              "h-4 px-1.5 text-[7px] font-black uppercase border-none",
              e.status === 'Completed' || e.status === 'Closed' ? "bg-emerald-100 text-emerald-800" :
              e.status === 'In Progress' ? "bg-amber-100 text-amber-800" :
              isEventOverdue ? "bg-rose-600 text-white font-black animate-pulse" : "bg-blue-100 text-blue-800"
            )}
          >
            {isEventOverdue ? 'Overdue' : e.status}
          </Badge>
          {e.campusName && (
            <span className="text-[8px] font-bold text-slate-400 flex items-center gap-0.5 uppercase">
              <MapPin className="h-2.5 w-2.5 shrink-0 text-slate-300" />
              {e.campusName.replace('Campus', '').trim()}
            </span>
          )}
          {e.unitName && (
            <span className="text-[8px] font-bold text-slate-400 flex items-center gap-0.5 uppercase max-w-[100px] truncate" title={e.unitName}>
              <Building2 className="h-2.5 w-2.5 shrink-0 text-slate-300" />
              {e.unitName}
            </span>
          )}
        </div>
        <h6 className="text-[11px] font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors leading-tight">
          {e.title}
        </h6>
        <p className="text-[10px] text-slate-500 font-medium leading-normal line-clamp-2" title={e.description}>
          {e.description}
        </p>
        
        {e.responsibleName && (
          <div className="text-[8px] font-bold text-slate-400 uppercase flex items-center gap-1 mt-1">
            <User className="h-3 w-3 text-slate-400 shrink-0" />
            <span>{e.responsibleName}</span>
          </div>
        )}
      </div>

      <span className="text-[8px] font-black text-slate-400 absolute top-3 right-3 bg-slate-100 dark:bg-slate-700 border px-1.5 py-0.5 rounded tabular-nums select-none">
        {e.displayDate}
      </span>
    </div>
  );
}

export function ScheduleTab({
  schedules,
  risks,
  cars,
  allCompliances,
  academicPrograms,
  campuses,
  allUnits,
  cycles,
  mrOutputs,
  selectedYear
}: ScheduleTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeframeFilter, setTimeframeFilter] = useState('all');

  const unitMap = useMemo(() => new Map(allUnits.map(u => [u.id, u.name])), [allUnits]);
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  const programMap = useMemo(() => new Map(academicPrograms.map(p => [p.id, p.name])), [academicPrograms]);

  const allEvents = useMemo(() => {
    const events: ScheduleEvent[] = [];
    const getDisplayDateStr = (date: Date, rawVal: any) => {
      if (typeof rawVal === 'string' && !rawVal.includes('00:00')) {
        return rawVal;
      }
      return format(date, 'PPP');
    };

    // 1. IQA
    schedules.forEach(s => {
      const parsedDate = parseDateValue(s.scheduledDate);
      if (parsedDate) {
        events.push({
          id: `iqa-${s.id}`,
          category: 'Internal Quality Audit',
          title: `IQA Audit: ${s.targetName || 'Academic Unit'}`,
          description: s.procedureDescription || 'Scheduled procedural compliance evaluation',
          date: parsedDate,
          displayDate: getDisplayDateStr(parsedDate, s.scheduledDate),
          status: s.status === 'Completed' ? 'Completed' : s.status === 'In Progress' ? 'In Progress' : 'Scheduled',
          responsibleName: s.auditorName || undefined,
          unitId: s.targetId || undefined,
          unitName: s.targetName || undefined,
          campusId: s.campusId,
          campusName: campusMap.get(s.campusId),
          additionalInfo: s.isoClausesToAudit?.length ? `Clauses: ${s.isoClausesToAudit.join(', ')}` : undefined,
          sourceRecord: s
        });
      }
    });

    // 2. Risks
    risks.forEach(r => {
      const parsedDate = parseDateValue(r.targetDate);
      if (parsedDate && r.type === 'Risk') {
        events.push({
          id: `risk-${r.id}`,
          category: 'Risk & Opportunity',
          title: `Risk Treatment: ${r.treatmentAction ? r.treatmentAction.substring(0, 80) : r.description.substring(0, 80)}`,
          description: `Mitigation Action: ${r.treatmentAction || r.description}`,
          date: parsedDate,
          displayDate: getDisplayDateStr(parsedDate, r.targetDate),
          status: r.status === 'Closed' ? 'Closed' : r.status === 'In Progress' ? 'In Progress' : 'Open',
          responsibleName: r.responsiblePersonName || undefined,
          unitId: r.unitId,
          unitName: unitMap.get(r.unitId),
          campusId: r.campusId,
          campusName: campusMap.get(r.campusId),
          additionalInfo: `Pre-treatment rating: ${r.preTreatment?.rating || 'Low'}`,
          sourceRecord: r
        });
      }
    });

    // 3. Actionable Decisions
    mrOutputs.forEach(o => {
      const parsedDate = parseDateValue(o.followUpDate);
      if (parsedDate) {
        events.push({
          id: `mr-${o.id}`,
          category: 'Actionable Decision',
          title: `Actionable Decision Follow-up: ${o.description.substring(0, 80)}`,
          description: `Action Item: ${o.description}. Plan: ${o.actionPlan || 'No plan logged yet.'}`,
          date: parsedDate,
          displayDate: getDisplayDateStr(parsedDate, o.followUpDate),
          status: o.status === 'Closed' ? 'Closed' : o.status === 'On-going' ? 'In Progress' : 'Open',
          responsibleName: o.initiator || undefined,
          additionalInfo: o.followUpRemarks ? `Remarks: ${o.followUpRemarks}` : undefined,
          sourceRecord: o
        });
      }
    });

    // 4. CAR
    cars.forEach(c => {
      const replyDeadline = parseDateValue(c.timeLimitForReply);
      if (replyDeadline) {
        events.push({
          id: `car-reply-${c.id}`,
          category: 'Corrective Action Request',
          title: `CAR Reply Deadline: ${c.carNumber}`,
          description: `Response limit for non-conformance. Procedure: ${c.procedureTitle}`,
          date: replyDeadline,
          displayDate: getDisplayDateStr(replyDeadline, c.timeLimitForReply),
          status: c.status === 'Closed' ? 'Closed' : 'Open',
          responsibleName: c.unitHead || undefined,
          unitId: c.unitId,
          unitName: unitMap.get(c.unitId),
          campusId: c.campusId,
          campusName: campusMap.get(c.campusId),
          additionalInfo: `NC Description: ${c.descriptionOfNonconformance?.substring(0, 100)}`,
          sourceRecord: c
        });
      }

      const verificationDate = parseDateValue(c.nextVerificationDate);
      if (verificationDate) {
        events.push({
          id: `car-verify-${c.id}`,
          category: 'Corrective Action Request',
          title: `CAR Follow-up Verification: ${c.carNumber}`,
          description: `Audit verification check for corrective actions. Procedure: ${c.procedureTitle}`,
          date: verificationDate,
          displayDate: getDisplayDateStr(verificationDate, c.nextVerificationDate),
          status: c.status === 'Closed' ? 'Closed' : 'Pending',
          responsibleName: c.preparedBy || undefined,
          unitId: c.unitId,
          unitName: unitMap.get(c.unitId),
          campusId: c.campusId,
          campusName: campusMap.get(c.campusId),
          additionalInfo: `Current CAR Status: ${c.status}`,
          sourceRecord: c
        });
      }

      c.actionSteps?.forEach((step, idx) => {
        const stepDeadline = parseDateValue(step.completionDate);
        if (stepDeadline) {
          events.push({
            id: `car-step-${c.id}-${idx}`,
            category: 'Corrective Action Request',
            title: `CAR Action Step Due: ${step.description.substring(0, 80)}`,
            description: `Correction Step [${step.type}] for CAR ${c.carNumber}.`,
            date: stepDeadline,
            displayDate: getDisplayDateStr(stepDeadline, step.completionDate),
            status: step.status === 'Completed' ? 'Completed' : 'Open',
            unitId: c.unitId,
            unitName: unitMap.get(c.unitId),
            campusId: c.campusId,
            campusName: campusMap.get(c.campusId),
            additionalInfo: step.verificationRemarks ? `QA Verification: ${step.verificationRemarks}` : undefined,
            sourceRecord: c
          });
        }
      });
    });

    // 5. Accreditation Milestones
    allCompliances.forEach(comp => {
      comp.accreditationRecords?.forEach((ar, idx) => {
        let targetDate: Date | null = null;
        const dateLabel = ar.nextSchedule || ar.dateOfSurvey || 'TBA';

        if (ar.nextScheduleYear) {
          targetDate = new Date(ar.nextScheduleYear, ar.nextScheduleMonth ? ar.nextScheduleMonth - 1 : 0, 1);
        } else if (ar.dateOfSurvey) {
          targetDate = parseDateValue(ar.dateOfSurvey);
        } else if (ar.nextSchedule) {
          targetDate = parseDateValue(ar.nextSchedule);
        }

        if (targetDate) {
          events.push({
            id: `accred-${comp.id}-${idx}`,
            category: 'Accreditation',
            title: `Accreditation Survey: Program ${programMap.get(comp.programId) || 'Offering'}`,
            description: `Targeting Level: ${ar.level} (${ar.typeOfVisit || 'Regular Visit'})`,
            date: targetDate,
            displayDate: dateLabel,
            status: ar.lifecycleStatus === 'Current' ? 'Completed' : ar.lifecycleStatus === 'Completed' ? 'Completed' : ar.lifecycleStatus === 'Undergoing' ? 'In Progress' : 'Scheduled',
            responsibleName: ar.overallTaskForceHead || undefined,
            unitId: comp.programId,
            unitName: programMap.get(comp.programId),
            campusId: comp.campusId,
            campusName: campusMap.get(comp.campusId),
            additionalInfo: ar.ratingsSummary?.grandMean ? `Grand Mean Score: ${ar.ratingsSummary.grandMean}` : undefined,
            sourceRecord: ar
          });
        }
      });
    });

    // 6. Cycles
    cycles.forEach(cy => {
      const start = parseDateValue(cy.startDate);
      const end = parseDateValue(cy.endDate);
      const cycleName = cy.name === 'first' ? '1st Semester Cycle' : 'Final Semester Cycle';

      if (start) {
        events.push({
          id: `cycle-start-${cy.id}`,
          category: 'Submission Cycle',
          title: `Submission Cycle Opens: ${cycleName} (AY ${cy.year})`,
          description: `Academic Year ${cy.year} evidence collection workspace becomes available.`,
          date: start,
          displayDate: getDisplayDateStr(start, cy.startDate),
          status: isBefore(new Date(), start) ? 'Scheduled' : 'Completed',
          additionalInfo: `Target Year: AY ${cy.year}`,
          sourceRecord: cy
        });
      }

      if (end) {
        const now = new Date();
        const isOver = isAfter(now, end);
        events.push({
          id: `cycle-end-${cy.id}`,
          category: 'Submission Cycle',
          title: `Submission Deadline: ${cycleName} (AY ${cy.year})`,
          description: `All mandatory QMS uploads must be finalized.`,
          date: end,
          displayDate: getDisplayDateStr(end, cy.endDate),
          status: isOver ? 'Closed' : 'Open',
          additionalInfo: `Target Year: AY ${cy.year}`,
          sourceRecord: cy
        });
      }
    });

    return events;
  }, [schedules, risks, mrOutputs, cars, allCompliances, cycles, campusMap, unitMap, programMap]);

  // Filters & sorting
  const filteredEvents = useMemo(() => {
    return allEvents
      .filter(e => {
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchTitle = e.title.toLowerCase().includes(term);
          const matchDesc = e.description.toLowerCase().includes(term);
          const matchResponsible = e.responsibleName?.toLowerCase().includes(term) || false;
          const matchUnit = e.unitName?.toLowerCase().includes(term) || false;
          const matchCampus = e.campusName?.toLowerCase().includes(term) || false;
          if (!matchTitle && !matchDesc && !matchResponsible && !matchUnit && !matchCampus) return false;
        }

        if (categoryFilter !== 'all' && e.category !== categoryFilter) {
          return false;
        }

        if (statusFilter !== 'all') {
          const isOpen = e.status === 'Open' || e.status === 'Scheduled' || e.status === 'Pending';
          const isInProgress = e.status === 'In Progress';
          const isClosed = e.status === 'Closed' || e.status === 'Completed';

          if (statusFilter === 'open' && !isOpen) return false;
          if (statusFilter === 'inprogress' && !isInProgress) return false;
          if (statusFilter === 'closed' && !isClosed) return false;
        }

        if (timeframeFilter !== 'all') {
          const now = new Date();
          const todayStart = startOfDay(now);
          const todayEnd = endOfDay(now);
          const weekEnd = endOfDay(addDays(now, 7));
          const monthEnd = endOfDay(addDays(now, 30));

          if (timeframeFilter === 'today') {
            if (!isToday(e.date)) return false;
          } else if (timeframeFilter === 'week') {
            if (isBefore(e.date, todayStart) || isAfter(e.date, weekEnd)) return false;
          } else if (timeframeFilter === 'month') {
            if (isBefore(e.date, todayStart) || isAfter(e.date, monthEnd)) return false;
          } else if (timeframeFilter === 'upcoming') {
            if (isBefore(e.date, todayStart)) return false;
          } else if (timeframeFilter === 'overdue') {
            const isCompleted = e.status === 'Closed' || e.status === 'Completed';
            if (!isBefore(e.date, todayStart) || isCompleted) return false;
          }
        }

        return true;
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [allEvents, searchTerm, categoryFilter, statusFilter, timeframeFilter]);

  // Visible modules with matches
  const visibleModules = useMemo(() => {
    return MODULES.filter(module => {
      if (categoryFilter !== 'all' && categoryFilter !== module) return false;
      return filteredEvents.some(e => e.category === module);
    });
  }, [filteredEvents, categoryFilter]);

  // Summaries
  const kpis = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const monthEnd = endOfDay(addDays(now, 30));

    let activeToday = 0;
    let upcomingMonth = 0;
    let overdueCount = 0;

    allEvents.forEach(e => {
      const isCompleted = e.status === 'Closed' || e.status === 'Completed';

      if (isToday(e.date)) {
        activeToday++;
      }
      if (isAfter(e.date, todayStart) && isBefore(e.date, monthEnd)) {
        upcomingMonth++;
      }
      if (isBefore(e.date, todayStart) && !isCompleted) {
        overdueCount++;
      }
    });

    return {
      activeToday,
      upcomingMonth,
      overdueCount,
      totalTracked: allEvents.length
    };
  }, [allEvents]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Today', value: kpis.activeToday, icon: <Activity className="h-5 w-5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Upcoming (30 Days)', value: kpis.upcomingMonth, icon: <CalendarIcon className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Overdue Activities', value: kpis.overdueCount, icon: <AlertCircle className="h-5 w-5" />, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Total Tracked Activities', value: kpis.totalTracked, icon: <CalendarCheck2 className="h-5 w-5" />, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50' },
        ].map(({ label, value, icon, color, bg }) => (
          <Card key={label} className="bg-white border-primary/10 shadow-md transition-all hover:scale-105 duration-200">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                <div className={cn('p-2 rounded-lg', bg, color)}>{icon}</div>
              </div>
              <div className={cn('text-3xl font-black tabular-nums', color)}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter panel */}
      <Card className="shadow-md bg-white border-primary/10">
        <CardHeader className="bg-primary/5 pb-4 border-b">
          <div className="flex items-center gap-2 text-primary">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Schedule Filters</CardTitle>
          </div>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
            Refine activities by description, campus, module, status or implementation timeline
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search schedule events..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-9 bg-white"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 text-xs bg-white">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="Internal Quality Audit">Internal Quality Audit</SelectItem>
                <SelectItem value="Risk & Opportunity">Risk & Opportunity</SelectItem>
                <SelectItem value="Actionable Decision">Actionable Decision</SelectItem>
                <SelectItem value="Corrective Action Request">Corrective Action Request</SelectItem>
                <SelectItem value="Accreditation">Accreditation</SelectItem>
                <SelectItem value="Submission Cycle">Submission Cycle</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs bg-white">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Pending / Open / Scheduled</SelectItem>
                <SelectItem value="inprogress">In Progress</SelectItem>
                <SelectItem value="closed">Closed / Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeframeFilter} onValueChange={setTimeframeFilter}>
              <SelectTrigger className="h-9 text-xs bg-white">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week (Next 7 Days)</SelectItem>
                <SelectItem value="month">This Month (Next 30 Days)</SelectItem>
                <SelectItem value="upcoming">Upcoming (Future Only)</SelectItem>
                <SelectItem value="overdue">Overdue (Incomplete Past)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Module Separated Cards */}
      <div className="space-y-8">
        {visibleModules.map(module => {
          const moduleEvents = filteredEvents.filter(e => e.category === module);
          // Today events (includes overdue events for direct priority action)
          const todayEvents = moduleEvents.filter(e => isToday(e.date) || (isBefore(e.date, startOfDay(new Date())) && e.status !== 'Closed' && e.status !== 'Completed'));
          // Upcoming events (tomorrow onwards)
          const upcomingEvents = moduleEvents.filter(e => isAfter(e.date, endOfDay(new Date())));
          const styles = CATEGORY_STYLING[module];

          return (
            <Card key={module} className={cn("shadow-lg border-l-4 transition-all hover:shadow-xl overflow-hidden bg-white", styles.border, `border-l-[6px]`)}>
              <CardHeader className={cn("py-4 px-6 border-b flex flex-row items-center justify-between", styles.bg)}>
                <div className="flex items-center gap-3">
                  <span className={cn("p-1.5 rounded-lg bg-white shadow-sm border", styles.text)}>
                    {module === 'Internal Quality Audit' && <ClipboardCheck className="h-4.5 w-4.5" />}
                    {module === 'Risk & Opportunity' && <AlertTriangle className="h-4.5 w-4.5" />}
                    {module === 'Actionable Decision' && <Zap className="h-4.5 w-4.5" />}
                    {module === 'Corrective Action Request' && <ShieldAlert className="h-4.5 w-4.5" />}
                    {module === 'Accreditation' && <Award className="h-4.5 w-4.5" />}
                    {module === 'Submission Cycle' && <CalendarIcon className="h-4.5 w-4.5" />}
                  </span>
                  <div>
                    <CardTitle className={cn("text-sm font-black uppercase tracking-wider", styles.text)}>
                      {module}
                    </CardTitle>
                    <CardDescription className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                      Activity ledger & monitoring pipeline
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className={cn("bg-white border-none font-black text-[10px] shadow-sm px-3", styles.text)}>
                  {moduleEvents.length} Active Items
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                  
                  {/* Left Column: Scheduled Today & Overdue */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-700 select-none">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        Scheduled Today / Overdue
                      </h5>
                      {todayEvents.length > 0 && (
                        <Badge className="bg-rose-600 text-white font-black text-[8px] h-4.5 px-2 tracking-widest">
                          {todayEvents.length} ACTION REQUIRED
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                      {todayEvents.map(e => (
                        <EventItemCard key={e.id} event={e} styles={styles} />
                      ))}
                      {todayEvents.length === 0 && (
                        <div className="py-12 flex flex-col items-center justify-center text-[10px] font-bold text-slate-400 uppercase italic bg-slate-50/50 dark:bg-slate-800/50 border border-dashed rounded-xl">
                          No activities scheduled for today
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Upcoming */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-700 select-none">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                        Upcoming Activities
                      </h5>
                      {upcomingEvents.length > 0 && (
                        <Badge className="bg-blue-600 text-white font-black text-[8px] h-4.5 px-2 tracking-widest">
                          {upcomingEvents.length} UPCOMING
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                      {upcomingEvents.map(e => (
                        <EventItemCard key={e.id} event={e} styles={styles} />
                      ))}
                      {upcomingEvents.length === 0 && (
                        <div className="py-12 flex flex-col items-center justify-center text-[10px] font-bold text-slate-400 uppercase italic bg-slate-50/50 dark:bg-slate-800/50 border border-dashed rounded-xl">
                          No upcoming activities
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          );
        })}

        {visibleModules.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center opacity-25 border border-dashed bg-slate-50/30 dark:bg-slate-800/30 rounded-2xl">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-sm">No Activities Match Selection</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              Try adjusting your query or resetting filters to find scheduled activities in the active registry.
            </p>
          </div>
        )}
      </div>

      <Card className="border-primary/10 overflow-hidden bg-white shadow-sm mt-8">
        <CardFooter className="bg-muted/5 py-4 px-6 text-[9px] text-muted-foreground italic font-medium flex items-center justify-between">
          <span>Real-time integrated module schedules feed.</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" /> Overdue alerts are calculated relative to local system date: {format(new Date(), 'PP')}.
          </span>
        </CardFooter>
      </Card>

    </div>
  );
}
