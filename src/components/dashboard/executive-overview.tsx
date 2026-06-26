'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Award,
  GraduationCap,
  TriangleAlert,
  ListChecks,
  Zap,
  CheckCircle2,
  Clock,
  TrendingUp,
  Building,
  Flame,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  ShieldAlert,
  Info
} from 'lucide-react';
import type { Submission, Risk, CorrectiveActionRequest, ProgramComplianceRecord, AcademicProgram, AuditSchedule, Unit, Campus, Cycle } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, isCycleActive } from '@/lib/utils';
import { TOTAL_REPORTS_PER_CYCLE } from '@/lib/constants';

interface ExecutiveOverviewProps {
  submissions: Submission[] | null;
  risks: Risk[] | null;
  cars: CorrectiveActionRequest[] | null;
  allCompliances: ProgramComplianceRecord[] | null;
  academicPrograms: AcademicProgram[] | null;
  schedules: AuditSchedule[] | null;
  units: Unit[] | null;
  campuses: Campus[] | null;
  cycles?: Cycle[] | null;
  selectedYear: number;
  scope?: 'university' | 'campus' | 'unit';
  scopeId?: string;
}

export function ExecutiveOverview({
  submissions = [],
  risks = [],
  cars = [],
  allCompliances = [],
  academicPrograms = [],
  schedules = [],
  units = [],
  campuses = [],
  cycles = [],
  selectedYear,
  scope = 'university',
  scopeId
}: ExecutiveOverviewProps) {

  const [startIndex, setStartIndex] = useState(0);

  // Filter collections by scope
  const { scopedSubmissions, scopedRisks, scopedCars, scopedCompliances, scopedPrograms, scopedSchedules, scopedUnits } = useMemo(() => {
    let sub = submissions || [];
    let rsk = risks || [];
    let cr = cars || [];
    let comp = allCompliances || [];
    let prog = academicPrograms || [];
    let sched = schedules || [];
    let unt = units || [];

    if (scope === 'campus' && scopeId) {
      sub = sub.filter(s => s.campusId === scopeId);
      rsk = rsk.filter(r => r.campusId === scopeId);
      cr = cr.filter(c => c.campusId === scopeId);
      comp = comp.filter(c => c.campusId === scopeId);
      prog = prog.filter(p => p.campusId === scopeId);
      sched = sched.filter(s => s.campusId === scopeId);
      unt = unt.filter(u => u.campusIds?.includes(scopeId));
    } else if (scope === 'unit' && scopeId) {
      sub = sub.filter(s => s.unitId === scopeId);
      rsk = rsk.filter(r => r.unitId === scopeId);
      cr = cr.filter(c => c.unitId === scopeId);
      comp = comp.filter(c => c.unitId === scopeId || c.programId === scopeId);
      prog = prog.filter(p => p.id === scopeId);
      sched = sched.filter(s => s.targetId === scopeId);
      unt = unt.filter(u => u.id === scopeId);
    }
    return {
      scopedSubmissions: sub,
      scopedRisks: rsk,
      scopedCars: cr,
      scopedCompliances: comp,
      scopedPrograms: prog,
      scopedSchedules: sched,
      scopedUnits: unt
    };
  }, [submissions, risks, cars, allCompliances, academicPrograms, schedules, units, scope, scopeId]);

  // 1. SUBMISSION COMPLIANCE RATE
  const pendingSubs = useMemo(() => scopedSubmissions.filter(s => Number(s.year) === Number(selectedYear) && s.statusId === 'submitted'), [scopedSubmissions, selectedYear]);
  
  const isIqaUnit = useMemo(() => {
    return scope === 'unit' && scopedUnits.some(u => u.name?.toLowerCase() === 'internal quality audit' || u.name?.toLowerCase() === 'iqa');
  }, [scope, scopedUnits]);

  const nonIqaUnitsForExpected = useMemo(() => {
    return scopedUnits.filter(u => u.name?.toLowerCase() !== 'internal quality audit' && u.name?.toLowerCase() !== 'iqa');
  }, [scopedUnits]);

  const approvedComboCount = useMemo(() => {
    const yearApproved = scopedSubmissions.filter(s => Number(s.year) === Number(selectedYear) && s.statusId === 'approved');
    return new Set(yearApproved.map(s => `${s.unitId}-${s.reportType}-${s.cycleId}`)).size;
  }, [scopedSubmissions, selectedYear]);

  const expectedSubs = useMemo(() => {
    const isFirstActive = isCycleActive('first', selectedYear, cycles);
    const isFinalActive = isCycleActive('final', selectedYear, cycles);

    if (scope === 'unit') {
      if (isIqaUnit) return 0;
      let total = 0;
      if (isFirstActive) {
        const firstRor = scopedSubmissions.find(s => s.cycleId === 'first' && s.reportType === 'Risk and Opportunity Registry');
        total += TOTAL_REPORTS_PER_CYCLE - (firstRor?.riskRating === 'low' ? 1 : 0);
      }
      if (isFinalActive) {
        const finalRor = scopedSubmissions.find(s => s.cycleId === 'final' && s.reportType === 'Risk and Opportunity Registry');
        total += TOTAL_REPORTS_PER_CYCLE - (finalRor?.riskRating === 'low' ? 1 : 0);
      }
      return total;
    }

    return nonIqaUnitsForExpected.reduce((total, unit) => {
      const unitSubs = scopedSubmissions.filter(s => s.unitId === unit.id && Number(s.year) === Number(selectedYear));
      if (isFirstActive) {
        const firstRor = unitSubs.find(s => s.cycleId === 'first' && s.reportType === 'Risk and Opportunity Registry');
        total += TOTAL_REPORTS_PER_CYCLE - (firstRor?.riskRating === 'low' ? 1 : 0);
      }
      if (isFinalActive) {
        const finalRor = unitSubs.find(s => s.cycleId === 'final' && s.reportType === 'Risk and Opportunity Registry');
        total += TOTAL_REPORTS_PER_CYCLE - (finalRor?.riskRating === 'low' ? 1 : 0);
      }
      return total;
    }, 0) || 1;
  }, [scopedSubmissions, nonIqaUnitsForExpected, scope, isIqaUnit, selectedYear, cycles]);

  const submissionRate = useMemo(() => expectedSubs > 0 ? Math.min(100, Math.round((approvedComboCount / expectedSubs) * 100)) : 0, [approvedComboCount, expectedSubs]);

  // 2. IQA PROGRESS RATE
  const yearSchedules = useMemo(() => scopedSchedules.filter(s => {
    if (!s.scheduledDate) return false;
    const date = s.scheduledDate.toDate ? s.scheduledDate.toDate() : new Date(s.scheduledDate);
    return date.getFullYear() === selectedYear;
  }), [scopedSchedules, selectedYear]);
  const completedAudits = useMemo(() => yearSchedules.filter(s => s.status === 'Completed'), [yearSchedules]);
  const inProgressAudits = useMemo(() => yearSchedules.filter(s => s.status === 'In Progress'), [yearSchedules]);
  const iqaProgressRate = useMemo(() => yearSchedules.length > 0 ? Math.min(100, Math.round((completedAudits.length / yearSchedules.length) * 100)) : 0, [completedAudits, yearSchedules]);

  // 3. CORRECTIVE ACTION REQUEST (CAR) CLOSURE RATE
  const yearCars = useMemo(() => scopedCars.filter(c => {
    if (!c.createdAt) return true;
    const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
    return date.getFullYear() === selectedYear;
  }), [scopedCars, selectedYear]);
  const closedCars = useMemo(() => yearCars.filter(c => c.status === 'Closed'), [yearCars]);
  const carResolutionRate = useMemo(() => yearCars.length > 0 ? Math.min(100, Math.round((closedCars.length / yearCars.length) * 100)) : 0, [closedCars, yearCars]);

  // 4. ACCREDITATION PERFORMANCE RATE (level achievement + mandatory gap closure combined)
  const recommendationsList = useMemo(() => scopedCompliances.reduce((acc: any[], c) => {
    c.accreditationRecords?.forEach(ar => {
      ar.recommendations?.forEach(rec => {
        if (rec.type !== 'Mandatory') return;
        acc.push({
          ...rec,
          programName: units?.find(u => u.id === c.programId)?.name || 'Academic Program',
          campusId: c.campusId
        });
      });
    });
    return acc;
  }, []) || [], [scopedCompliances, units]);
  const closedRecs = useMemo(() => recommendationsList.filter(r => r.status === 'Closed'), [recommendationsList]);
  const accreditationResolutionRate = useMemo(() => recommendationsList.length > 0 ? Math.min(100, Math.round((closedRecs.length / recommendationsList.length) * 100)) : 0, [closedRecs, recommendationsList]);

  // Accreditation Level Achievement Score (per-program level mapped to score)
  const levelScoreMap: Record<string, number> = {
    'Level IV': 100, 'Level III': 80, 'Level II': 60, 'Level I': 40, 'Candidate': 20, 'PSV': 20,
  };
  const accreditationLevelRate = useMemo(() => {
    const scored = scopedPrograms.filter(p => p.isActive).map(p => {
      const compliance = scopedCompliances.find(c => c.programId === p.id);
      const records = compliance?.accreditationRecords || [];
      const current = records.find(r => r.lifecycleStatus === 'Current') || records[records.length - 1];
      const level = current?.level?.trim() || 'Non Accredited';
      for (const [key, score] of Object.entries(levelScoreMap)) {
        if (level.includes(key) || level === key) return score;
      }
      if (level.toLowerCase().includes('candidate') || level.includes('PSV')) return 20;
      return 0;
    });
    return scored.length > 0 ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0;
  }, [scopedPrograms, scopedCompliances]);

  // Combined Accreditation Rate (50% level achievement + 50% gap closure)
  const accreditationRate = useMemo(() => {
    const hasRecommends = recommendationsList.length > 0;
    const hasPrograms = scopedPrograms.filter(p => p.isActive).length > 0;
    if (!hasRecommends && !hasPrograms) return 0;
    if (!hasRecommends) return accreditationLevelRate;
    if (!hasPrograms) return accreditationResolutionRate;
    return Math.round((accreditationLevelRate * 0.5) + (accreditationResolutionRate * 0.5));
  }, [accreditationLevelRate, accreditationResolutionRate, recommendationsList, scopedPrograms]);

  // Undergrad vs Graduate breakdown for display
  const accreditationByLevel = useMemo(() => {
    const undergrad: { level: string; count: number }[] = [];
    const graduate: { level: string; count: number }[] = [];
    const levelOrder = ['Level IV', 'Level III', 'Level II', 'Level I', 'Candidate', 'Non Accredited'];
    const countByLevel = (programs: typeof scopedPrograms) => {
      const counts: Record<string, number> = {};
      levelOrder.forEach(l => counts[l] = 0);
      programs.filter(p => p.isActive).forEach(p => {
        const compliance = scopedCompliances.find(c => c.programId === p.id);
        const records = compliance?.accreditationRecords || [];
        const current = records.find(r => r.lifecycleStatus === 'Current') || records[records.length - 1];
        const level = current?.level?.trim() || 'Non Accredited';
        let matched = 'Non Accredited';
        for (const key of levelOrder) {
          if (level.includes(key) || level === key) { matched = key; break; }
        }
        if (level.toLowerCase().includes('candidate') || level.includes('PSV')) matched = 'Candidate';
        counts[matched] = (counts[matched] || 0) + 1;
      });
      return levelOrder.map(l => ({ level: l, count: counts[l] || 0 })).filter(x => x.count > 0);
    };
    return {
      undergrad: countByLevel(scopedPrograms.filter(p => p.level === 'Undergraduate' || p.level === 'TVET')),
      graduate: countByLevel(scopedPrograms.filter(p => p.level === 'Graduate')),
    };
  }, [scopedPrograms, scopedCompliances]);

  // 5. CHED COPC RATE
  const copcCompliant = useMemo(() => scopedCompliances.filter(c => c.ched?.copcStatus === 'With COPC'), [scopedCompliances]);
  const totalProgramsCount = useMemo(() => scopedPrograms.length, [scopedPrograms]);
  const copcComplianceRate = useMemo(() => totalProgramsCount > 0 ? Math.min(100, Math.round((copcCompliant.length / totalProgramsCount) * 100)) : 0, [copcCompliant, totalProgramsCount]);

  // 6. RISK MITIGATION RATE
  const yearRisks = useMemo(() => scopedRisks.filter(r => Number(r.year) === Number(selectedYear)), [scopedRisks, selectedYear]);
  const mitigatedRisks = useMemo(() => yearRisks.filter(r => r.status === 'Closed' || r.preTreatment?.rating === 'low' || r.postTreatment?.rating === 'low'), [yearRisks]);
  const riskControlRate = useMemo(() => yearRisks.length > 0 ? Math.min(100, Math.round((mitigatedRisks.length / yearRisks.length) * 100)) : 0, [mitigatedRisks, yearRisks]);

  // COMPOSITE EOMS QUALITY SCORE
  const activeMetrics = useMemo(() => {
    const metrics = [
      { name: 'Submission compliance', value: submissionRate, weight: 0.25, color: 'bg-emerald-500', active: !isIqaUnit },
      { name: 'IQA Audit Progress', value: iqaProgressRate, weight: 0.20, color: 'bg-indigo-500', active: yearSchedules.length > 0 },
      { name: 'CAR Resolution Rate', value: carResolutionRate, weight: 0.20, color: 'bg-rose-500', active: yearCars.length > 0 },
      { name: 'Risk Control Index', value: riskControlRate, weight: 0.15, color: 'bg-amber-500', active: yearRisks.length > 0 },
      { name: 'CHED Program COPC', value: copcComplianceRate, weight: 0.10, color: 'bg-blue-500', active: totalProgramsCount > 0 },
      { name: 'Accreditation Performance', value: accreditationRate, weight: 0.10, color: 'bg-teal-500', active: scopedPrograms.filter(p => p.isActive).length > 0 },
    ];
    return metrics.filter(m => m.active);
  }, [submissionRate, iqaProgressRate, carResolutionRate, riskControlRate, copcComplianceRate, accreditationRate, yearSchedules, yearCars, yearRisks, totalProgramsCount, scopedPrograms, isIqaUnit]);

  const eomsQualityScore = useMemo(() => {
    const totalWeight = activeMetrics.reduce((sum, m) => sum + m.weight, 0);
    return totalWeight > 0 
      ? Math.round(activeMetrics.reduce((sum, m) => sum + (m.value * m.weight), 0) / totalWeight) 
      : 0;
  }, [activeMetrics]);

  // EOMS Quality Status Text & Badge
  const statusDetails = useMemo(() => {
    if (eomsQualityScore >= 85) return { text: 'Optimal Compliance', desc: scope === 'unit' ? 'The department exhibits outstanding alignment with EOMS standards.' : scope === 'campus' ? 'The campus exhibits outstanding alignment with EOMS standards.' : 'The University exhibits outstanding alignment with EOMS standards.', color: 'text-emerald-600 border-emerald-200 bg-emerald-50' };
    if (eomsQualityScore >= 65) return { text: 'Good standing', desc: scope === 'unit' ? 'Department operations are stable, though minor gaps require correction.' : scope === 'campus' ? 'Campus is stable, though minor compliance gaps require correction.' : 'System is stable, though minor compliance gaps require correction.', color: 'text-blue-600 border-blue-200 bg-blue-50' };
    if (eomsQualityScore >= 45) return { text: 'Needs Improvement', desc: 'Active non-conformities and missing evidence registries detected.', color: 'text-amber-600 border-amber-200 bg-amber-50' };
    return { text: 'Critical Attention Required', desc: scope === 'unit' ? 'Substantial compliance deficiencies found in this department.' : scope === 'campus' ? 'Substantial compliance deficiencies found across campus departments.' : 'Substantial compliance deficiencies found across several sites.', color: 'text-rose-600 border-rose-200 bg-rose-50' };
  }, [eomsQualityScore, scope]);

  // Scoped standings/comparison rate
  const complianceStandings = useMemo(() => {
    const isFirstActive = isCycleActive('first', selectedYear, cycles);
    const isFinalActive = isCycleActive('final', selectedYear, cycles);

    const getUnitExpected = (unitId: string) => {
      const unitSubs = (submissions || []).filter(s => s.unitId === unitId && Number(s.year) === Number(selectedYear));
      let total = 0;
      if (isFirstActive) {
        const firstRor = unitSubs.find(s => s.cycleId === 'first' && s.reportType === 'Risk and Opportunity Registry');
        total += TOTAL_REPORTS_PER_CYCLE - (firstRor?.riskRating === 'low' ? 1 : 0);
      }
      if (isFinalActive) {
        const finalRor = unitSubs.find(s => s.cycleId === 'final' && s.reportType === 'Risk and Opportunity Registry');
        total += TOTAL_REPORTS_PER_CYCLE - (finalRor?.riskRating === 'low' ? 1 : 0);
      }
      return total;
    };

    const getUnitApprovedComboCount = (unitId: string) => {
      const unitApproved = (submissions || []).filter(s => s.unitId === unitId && Number(s.year) === Number(selectedYear) && s.statusId === 'approved');
      return new Set(unitApproved.map(s => `${s.reportType}-${s.cycleId}`)).size;
    };

    if (scope === 'campus' && scopeId) {
      const campusUnits = units?.filter(u => u.campusIds?.includes(scopeId) && u.name?.toLowerCase() !== 'internal quality audit' && u.name?.toLowerCase() !== 'iqa') || [];
      return campusUnits.map(unit => {
        const approved = getUnitApprovedComboCount(unit.id);
        const expected = getUnitExpected(unit.id);
        const rate = expected > 0 ? Math.min(100, Math.round((approved / expected) * 100)) : 0;
        return { name: unit.name, approved, expected, rate };
      }).sort((a, b) => b.rate - a.rate);
    } else if (scope === 'unit' && scopeId) {
      return [];
    } else {
      if (!campuses?.length) return [];
      return campuses.map(campus => {
        const campusUnits = units?.filter(u => u.campusIds?.includes(campus.id) && u.name?.toLowerCase() !== 'internal quality audit' && u.name?.toLowerCase() !== 'iqa') || [];
        let totalApproved = 0;
        let totalExpected = 0;
        campusUnits.forEach(unit => {
          totalApproved += getUnitApprovedComboCount(unit.id);
          totalExpected += getUnitExpected(unit.id);
        });
        const rate = totalExpected > 0 ? Math.min(100, Math.round((totalApproved / totalExpected) * 100)) : 0;
        return { name: campus.name, approved: totalApproved, expected: totalExpected, rate };
      }).sort((a, b) => b.rate - a.rate);
    }
  }, [scope, scopeId, campuses, units, submissions, selectedYear, cycles]);

  const maxVal = useMemo(() => Math.max(0, complianceStandings.length - 10), [complianceStandings]);
  const currentStartIndex = Math.min(startIndex, maxVal);
  const visibleStandings = useMemo(() => {
    if (scope === 'campus' && complianceStandings.length > 10) {
      return complianceStandings.slice(currentStartIndex, currentStartIndex + 10);
    }
    return complianceStandings;
  }, [complianceStandings, currentStartIndex, scope]);

  // Dynamic rule-based insights and recommendations (without using AI)
  const insights = useMemo(() => {
    const analysis: string[] = [];
    const recommendations: string[] = [];

    // 1. Analyze Submission Compliance
    if (submissionRate === 100) {
      analysis.push("Submission Compliance is optimal (100%).");
    } else if (submissionRate >= 75) {
      analysis.push(`Submission Compliance is good (${submissionRate}%), but some units are missing evidence logs.`);
      recommendations.push("Ensure all outstanding unit evidence logs are submitted and approved.");
    } else {
      analysis.push(`Submission Compliance is critical (${submissionRate}%) due to multiple missing evidence registries.`);
      recommendations.push("Urgent: Instruct all departments to submit their required cycle deliverables.");
    }

    // 2. Analyze Audits
    if (yearSchedules.length > 0) {
      const pendingAudits = yearSchedules.length - completedAudits.length;
      if (iqaProgressRate === 100) {
        analysis.push("All scheduled internal audits have been completed.");
      } else if (iqaProgressRate >= 70) {
        analysis.push(`IQA audit progress is satisfactory at ${iqaProgressRate}%.`);
        recommendations.push(`Complete the remaining ${pendingAudits} scheduled internal quality audits (IQA).`);
      } else {
        analysis.push(`Internal quality audits are lagging heavily with only ${iqaProgressRate}% completed (${completedAudits.length}/${yearSchedules.length}).`);
        recommendations.push(`Expedite the ${pendingAudits} pending internal quality audits (IQA) to document compliance findings.`);
      }
    }

    // 3. Analyze CARs
    if (yearCars.length > 0) {
      const openCars = yearCars.length - closedCars.length;
      if (carResolutionRate === 100) {
        analysis.push("All Corrective Action Requests (CARs) are fully closed.");
      } else if (carResolutionRate >= 60) {
        analysis.push(`CAR resolution is at ${carResolutionRate}%.`);
        recommendations.push(`Verify and close the remaining ${openCars} active Corrective Action Requests (CARs).`);
      } else {
        analysis.push(`A high volume of unresolved Corrective Action Requests (${openCars} open CARs) is holding back compliance health.`);
        recommendations.push(`Follow up on the ${openCars} open CARs and request verification evidence from responsible offices.`);
      }
    }

    // 4. Analyze Risks
    if (yearRisks.length > 0) {
      const unmitigated = yearRisks.length - mitigatedRisks.length;
      if (riskControlRate === 100) {
        analysis.push("All identified risks have verified treatment plans.");
      } else if (riskControlRate >= 50) {
        analysis.push(`Risk mitigation is moderate (${riskControlRate}%).`);
        recommendations.push(`Implement treatment plans for the remaining ${unmitigated} unmitigated risk registers.`);
      } else {
        analysis.push(`Risk registers are largely untreated with only ${riskControlRate}% mitigated (${mitigatedRisks.length}/${yearRisks.length}).`);
        recommendations.push(`Ensure mitigation actions and treatment evidence are logged for the ${unmitigated} open risks.`);
      }
    }

    // 5. Analyze CHED COPC
    if (totalProgramsCount > 0) {
      const missingCopcCount = totalProgramsCount - copcCompliant.length;
      if (copcComplianceRate === 100) {
        analysis.push("All academic programs possess valid CHED COPC certificates.");
      } else if (copcComplianceRate >= 75) {
        analysis.push(`CHED COPC compliance is strong at ${copcComplianceRate}%.`);
        if (missingCopcCount > 0) {
          recommendations.push(`Apply for CHED COPC certificate for the remaining ${missingCopcCount} academic program(s).`);
        }
      } else {
        analysis.push(`A significant number of programs (${missingCopcCount} out of ${totalProgramsCount}) lack CHED COPC certificates.`);
        recommendations.push(`Initiate CHED quality reviews to obtain COPC status for the ${missingCopcCount} program(s) in need.`);
      }
    }

    // 6. Analyze Accreditation Performance
    if (recommendationsList.length > 0 || scopedPrograms.filter(p => p.isActive).length > 0) {
      if (accreditationRate === 100) {
        analysis.push("All programs meet the highest accreditation standards.");
      } else if (accreditationRate >= 75) {
        analysis.push(`Accreditation performance is strong at ${accreditationRate}%, combining level achievement and gap resolution.`);
      } else if (accreditationRate >= 50) {
        analysis.push(`Accreditation performance is at ${accreditationRate}%. Programs need improvement in accreditation level or gap closure.`);
        const openRecs = recommendationsList.length - closedRecs.length;
        if (openRecs > 0) recommendations.push(`Action and close the remaining ${openRecs} pending mandatory accreditation survey recommendations.`);
      } else {
        analysis.push(`Accreditation performance is at ${accreditationRate}%, requiring significant improvement in program accreditation levels and gap resolution.`);
        const openRecs = recommendationsList.length - closedRecs.length;
        if (openRecs > 0) recommendations.push(`Resolve and document compliance evidence for the ${openRecs} pending mandatory accreditation gaps.`);
      }
    }

    // Construct explanation sentence
    let overallExplanation = "";
    if (eomsQualityScore >= 85) {
      overallExplanation = "The system is in optimal health. Most quality gates are fully checked and verified.";
    } else if (eomsQualityScore >= 65) {
      overallExplanation = "The system is in good standing, but overall performance is capped by minor outstanding quality actions.";
    } else {
      // Find the two worst-performing metrics
      const activeStats = [
        { name: "Submission Compliance", rate: submissionRate, active: true },
        { name: "IQA Audit Progress", rate: iqaProgressRate, active: yearSchedules.length > 0 },
        { name: "CAR Resolution Rate", rate: carResolutionRate, active: yearCars.length > 0 },
        { name: "Risk Control Index", rate: riskControlRate, active: yearRisks.length > 0 },
        { name: "CHED COPC", rate: copcComplianceRate, active: totalProgramsCount > 0 },
        { name: "Accreditation Performance", rate: accreditationRate, active: scopedPrograms.filter(p => p.isActive).length > 0 }
      ].filter(m => m.active).sort((a, b) => a.rate - b.rate);

      if (activeStats.length > 0) {
        const worst = activeStats[0];
        const secondWorst = activeStats[1];
        if (secondWorst) {
          overallExplanation = `Performance is heavily constrained by low ${worst.name} (${worst.rate}%) and ${secondWorst.name} (${secondWorst.rate}%).`;
        } else {
          overallExplanation = `Performance is heavily constrained by low ${worst.name} (${worst.rate}%).`;
        }
      } else {
        overallExplanation = "Active metrics are not fully populated, resulting in a low overall EOMS rating.";
      }
    }

    // If no specific recommendations are compiled, add a generic one
    if (recommendations.length === 0) {
      recommendations.push("Maintain current compliance monitoring schedule and verified registries.");
    }

    return {
      explanation: overallExplanation,
      details: analysis,
      recommendations
    };
  }, [
    submissionRate,
    iqaProgressRate,
    carResolutionRate,
    riskControlRate,
    copcComplianceRate,
    accreditationResolutionRate,
    yearSchedules,
    completedAudits,
    yearCars,
    closedCars,
    yearRisks,
    mitigatedRisks,
    totalProgramsCount,
    copcCompliant,
    recommendationsList,
    closedRecs,
    eomsQualityScore
  ]);

  // High-Priority EOMS Bottlenecks
  const bottlenecks = useMemo(() => {
    const alerts: { title: string; subtitle: string; severity: 'high' | 'medium'; icon: any; section: string }[] = [];

    // 1. Critical Overdue CARs
    const openMajorCars = yearCars.filter(c => c.status !== 'Closed' && c.natureOfFinding === 'NC');
    if (openMajorCars.length > 0) {
      alerts.push({
        title: `${openMajorCars.length} Active Non-Conformances`,
        subtitle: 'Outstanding CARs need corrective action verification.',
        severity: 'high',
        icon: Flame,
        section: 'Corrective Actions'
      });
    }

    // 2. High Risks
    const highRisks = yearRisks.filter(r => r.status !== 'Closed' && (r.preTreatment?.rating === 'high' || r.preTreatment?.rating === 'critical'));
    if (highRisks.length > 0) {
      alerts.push({
        title: `${highRisks.length} Unmitigated High Risks`,
        subtitle: 'Critical risk registers lack verified treatment plan implementations.',
        severity: 'high',
        icon: AlertTriangle,
        section: 'Risk Management'
      });
    }

    // 3. Impending Audits In Progress
    if (inProgressAudits.length > 0) {
      alerts.push({
        title: `${inProgressAudits.length} Audits Currently In Progress`,
        subtitle: 'Field IQA in progress. Awaiting findings documentation.',
        severity: 'medium',
        icon: Clock,
        section: 'Internal Quality Audit'
      });
    }

    // 4. Critical Accreditation Gaps
    const openRecommendations = recommendationsList.filter(r => r.status !== 'Closed' && r.type === 'Mandatory');
    if (openRecommendations.length > 0) {
      alerts.push({
        title: `${openRecommendations.length} Mandatory Accreditation Gaps`,
        subtitle: 'Pending directives assigned to academic units require closure.',
        severity: 'high',
        icon: Award,
        section: 'Accreditation'
      });
    }

    // 4b. Non-Accredited Programs
    const nonAccredited = scopedPrograms.filter(ap => {
      if (!ap.isActive) return false;
      const comp = scopedCompliances.find(c => c.programId === ap.id);
      const records = comp?.accreditationRecords || [];
      const current = records.find(r => r.lifecycleStatus === 'Current') || records[records.length - 1];
      const level = current?.level || 'Non Accredited';
      return level === 'Non Accredited' || level.toLowerCase().includes('non accredited');
    });
    if (nonAccredited.length > 0) {
      alerts.push({
        title: `${nonAccredited.length} Non-Accredited Program${nonAccredited.length > 1 ? 's' : ''}`,
        subtitle: 'Programs without active accreditation status require immediate attention.',
        severity: nonAccredited.length > 3 ? 'high' : 'medium',
        icon: Award,
        section: 'Accreditation'
      });
    }

    // 5. Missing COPCs
    const nonCopc = scopedPrograms.filter(ap => {
      const comp = scopedCompliances.find(c => c.programId === ap.id);
      return !comp || comp.ched?.copcStatus === 'No COPC';
    }) || [];
    if (nonCopc.length > 0) {
      alerts.push({
        title: `${nonCopc.length} Programs Lacking COPC Certificate`,
        subtitle: 'CHED Quality compliance review needed for degree courses.',
        severity: 'high',
        icon: GraduationCap,
        section: 'CHED Programs'
      });
    }

    return alerts.slice(0, 4); // Limit to top 4 alerts
  }, [yearCars, yearRisks, inProgressAudits, recommendationsList, scopedPrograms, scopedCompliances]);

  // SWOT / Strengths & Weaknesses derivation
  const swotAnalysis = useMemo(() => {
    const strengthsList: { title: string; desc: string; tag: string; icon: any }[] = [];
    const weaknessesList: { title: string; desc: string; tag: string; icon: any; priority?: 'High' | 'Medium' }[] = [];

    // 1. Submission Rate
    if (submissionRate >= 80) {
      strengthsList.push({
        title: 'Strong Submission Compliance',
        desc: `The overall EOMS evidence submission rate is high at ${submissionRate}%, showing consistent documentation performance.`,
        tag: '[ISO 7.5.3]',
        icon: ShieldCheck,
      });
    } else {
      weaknessesList.push({
        title: 'Evidence Submission Gaps',
        desc: `Evidence log compliance is low at ${submissionRate}%, which means critical EOMS process documents are missing or unapproved.`,
        tag: '[EOMS Gap]',
        icon: ShieldAlert,
        priority: submissionRate < 50 ? 'High' : 'Medium',
      });
    }

    // 2. IQA Progress Rate
    if (yearSchedules.length > 0) {
      if (iqaProgressRate >= 80) {
        strengthsList.push({
          title: 'Optimal Audit Pacing',
          desc: `Internal quality audit (IQA) execution is on track at ${iqaProgressRate}% completion for the academic year.`,
          tag: '[IQA Active]',
          icon: CheckCircle2,
        });
      } else {
        weaknessesList.push({
          title: 'Audit Schedule Lag',
          desc: `Scheduled IQAs are lagging at ${iqaProgressRate}% completion, indicating delays in conducting on-site audits.`,
          tag: '[Audit Backlog]',
          icon: Clock,
          priority: iqaProgressRate < 50 ? 'High' : 'Medium',
        });
      }
    }

    // 3. CAR Resolution Rate
    if (yearCars.length > 0) {
      if (carResolutionRate >= 75) {
        strengthsList.push({
          title: 'High Corrective Action Closure',
          desc: `Excellent responsiveness in resolving non-conformities, with ${carResolutionRate}% of CARs successfully closed.`,
          tag: '[ISO 10.1]',
          icon: ShieldCheck,
        });
      } else {
        weaknessesList.push({
          title: 'CAR Resolution Bottleneck',
          desc: `Corrective actions resolution rate is slow at ${carResolutionRate}%, leaving unresolved findings in the pipeline.`,
          tag: '[CAR Backlog]',
          icon: AlertTriangle,
          priority: carResolutionRate < 50 ? 'High' : 'Medium',
        });
      }
    }

    // 4. Risk Mitigation Rate
    if (yearRisks.length > 0) {
      if (riskControlRate >= 75) {
        strengthsList.push({
          title: 'Proactive Risk Control',
          desc: `Risks are actively managed with a ${riskControlRate}% mitigation rate. Treatment plans are verified and logged.`,
          tag: '[Risk Control]',
          icon: ShieldCheck,
        });
      } else {
        weaknessesList.push({
          title: 'Untreated Risk Backlog',
          desc: `Risk mitigation rate is low at ${riskControlRate}%. Several critical and high risk items lack logged treatment plans.`,
          tag: '[Risk Exposure]',
          icon: AlertTriangle,
          priority: riskControlRate < 50 ? 'High' : 'Medium',
        });
      }
    }

    // 5. CHED COPC Rate
    if (totalProgramsCount > 0) {
      if (copcComplianceRate === 100) {
        strengthsList.push({
          title: 'Academic Program Authorization',
          desc: '100% of academic programs hold active CHED Certificates of Program Compliance (COPC).',
          tag: '[CHED COPC]',
          icon: Award,
        });
      } else if (copcComplianceRate >= 80) {
        strengthsList.push({
          title: 'Satisfactory Program Compliance',
          desc: `Strong regulatory alignment with ${copcComplianceRate}% of academic programs holding verified COPCs.`,
          tag: '[Regulatory]',
          icon: Award,
        });
      } else {
        weaknessesList.push({
          title: 'Academic COPC Gaps',
          desc: `Only ${copcComplianceRate}% of programs possess COPCs. Unverified programs pose an institutional operations risk.`,
          tag: '[CHED Flag]',
          icon: ShieldAlert,
          priority: 'High',
        });
      }
    }

    // 6. Accreditation Performance (Level Achievement + Mandatory Gap Closure)
    if (scopedPrograms.filter(p => p.isActive).length > 0) {
      if (accreditationRate >= 75) {
        strengthsList.push({
          title: 'Accreditation Performance',
          desc: `Strong overall accreditation performance at ${accreditationRate}%, with level achievement at ${accreditationLevelRate}% and gap resolution at ${accreditationResolutionRate}%.`,
          tag: '[Accreditation]',
          icon: Award,
        });
      } else {
        weaknessesList.push({
          title: 'Accreditation Performance Gap',
          desc: `Accreditation performance is at ${accreditationRate}%. Level achievement is ${accreditationLevelRate}% and mandatory gap resolution is ${accreditationResolutionRate}%.`,
          tag: '[Accreditation Gap]',
          icon: AlertTriangle,
          priority: accreditationRate < 50 ? 'High' : 'Medium',
        });
      }
    }

    // 7. Site-Specific Standings
    if (complianceStandings && complianceStandings.length > 0) {
      const topSites = complianceStandings.filter(s => s.rate === 100);
      if (topSites.length > 0) {
        strengthsList.push({
          title: 'Exceptional Unit Performance',
          desc: `${topSites.map(s => s.name.replace('Campus', '').trim()).slice(0, 3).join(', ')} achieved 100% EOMS submission compliance.`,
          tag: '[Site Excellence]',
          icon: ShieldCheck,
        });
      }
      const lowSites = complianceStandings.filter(s => s.rate < 40);
      if (lowSites.length > 0) {
        weaknessesList.push({
          title: 'Substandard Compliance Sites',
          desc: `${lowSites.map(s => s.name.replace('Campus', '').trim()).slice(0, 3).join(', ')} have submission rates below 40% and need support.`,
          tag: '[Site Underperformance]',
          icon: ShieldAlert,
          priority: 'High',
        });
      }
    }

    // Fallbacks to ensure the cards look full
    if (strengthsList.length === 0) {
      strengthsList.push({
        title: 'Institutional QMS Continuity',
        desc: 'The university has established QMS structures across campuses to facilitate quality reporting.',
        tag: '[QMS Baseline]',
        icon: ShieldCheck,
      });
    }
    if (weaknessesList.length === 0) {
      weaknessesList.push({
        title: 'Continuous Optimization',
        desc: 'Maintain current momentum and regularly verify the implementation of all action plans.',
        tag: '[QMS Optimization]',
        icon: ShieldCheck,
      });
    }

    return {
      strengths: strengthsList.slice(0, 4),
      weaknesses: weaknessesList.slice(0, 4),
    };
  }, [
    submissionRate,
    iqaProgressRate,
    carResolutionRate,
    riskControlRate,
    copcComplianceRate,
    accreditationResolutionRate,
    yearSchedules,
    yearCars,
    yearRisks,
    totalProgramsCount,
    recommendationsList,
    complianceStandings,
  ]);

  return (
    <div className="space-y-6">
      {/* SECTION 1: Health Index Gauge & Campus/Department comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        
        {/* EQI SCORECARD */}
        <Card className={cn(
          "border-primary/20 bg-white shadow-lg overflow-hidden flex flex-col justify-between",
          scope === 'unit' ? "lg:col-span-7" : "lg:col-span-4"
        )}>
          <CardHeader className="bg-primary/5 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  {scope === 'unit' ? 'Unit EOMS Quality Score' : scope === 'campus' ? 'Campus EOMS Health Score' : 'EOMS Executive Health Score'}
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                  {scope === 'unit' ? 'Departmental Quality Performance Index' : scope === 'campus' ? 'Site Quality Performance Index' : 'University-Wide Quality Performance Index'}
                </CardDescription>
              </div>
              <Badge variant="outline" className={cn("text-[9px] font-black uppercase px-2.5 py-1 border rounded-full shadow-xs", statusDetails.color)}>
                {statusDetails.text}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6 pb-6 flex flex-col sm:flex-row items-center gap-8">
            {/* SVG Radial Progress */}
            <div className="relative flex items-center justify-center shrink-0 w-[180px] h-[180px]">
              <svg className="w-full h-full transform -rotate-95" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="hsl(var(--primary) / 0.1)"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={eomsQualityScore >= 80 ? '#10b981' : eomsQualityScore >= 60 ? '#3b82f6' : eomsQualityScore >= 40 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - eomsQualityScore / 100)}`}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              {/* Center Text */}
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{eomsQualityScore}%</span>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">EOMS Index</span>
              </div>
            </div>

            {/* Sub-Indicators progress list */}
            <div className="w-full space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Metrics Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {activeMetrics.map((metric, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{metric.name}</span>
                      <span className="text-slate-900 dark:text-slate-100 font-extrabold">{metric.value}%</span>
                    </div>
                    <Progress value={metric.value} className={cn("h-1.5", metric.color)} />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>

          {/* INSIGHTS & ACTION PLAN */}
          <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-6 space-y-4">
            <div>
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">EOMS Quality Insights</h4>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                {insights.explanation}
              </p>
            </div>
            
            <div className="space-y-2">
              <h5 className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Required Actions to Improve Score</h5>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 list-none">
                {insights.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                    <span className="text-amber-500 font-extrabold select-none mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <CardFooter className="bg-primary/5 border-t py-3 px-6 text-[10px] font-medium text-slate-500 italic">
            {statusDetails.desc}
          </CardFooter>
        </Card>

        {/* STANDINGS COMPARISON */}
        {scope !== 'unit' && (
          <Card className="lg:col-span-3 border-primary/20 bg-white shadow-lg flex flex-col justify-between">
            <CardHeader className="bg-primary/5 pb-4 border-b">
              <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building className="h-5 w-5 text-indigo-600" />
                {scope === 'campus' ? 'Department Standings' : 'Campus Standings'}
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                {scope === 'campus' 
                  ? `Comparative submission rates per unit/dept` 
                  : `Comparative submission rates per site`}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 pb-4 space-y-4 flex-1 overflow-y-auto">
              {visibleStandings.map((cRate, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-800 dark:text-slate-200 uppercase truncate max-w-[170px]">{cRate.name}</span>
                    <span className="text-slate-900 dark:text-slate-100 font-black">{cRate.rate}% <span className="text-slate-400 font-medium font-mono text-[9px]">({cRate.approved}/{cRate.expected})</span></span>
                  </div>
                  <div className="relative w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        cRate.rate >= 80 ? "bg-emerald-500" : cRate.rate >= 60 ? "bg-blue-500" : cRate.rate >= 40 ? "bg-amber-500" : "bg-rose-500"
                      )}
                      style={{ width: `${cRate.rate}%` }}
                    />
                  </div>
                </div>
              ))}
              
              {scope === 'campus' && complianceStandings.length > 10 && (
                <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    <span>Move Slider to Scroll</span>
                    <span className="font-extrabold">{currentStartIndex + 1}-{currentStartIndex + visibleStandings.length} of {complianceStandings.length}</span>
                  </div>
                  <Slider
                    value={[currentStartIndex]}
                    onValueChange={(val) => setStartIndex(val[0])}
                    max={maxVal}
                    step={1}
                    className="py-2 cursor-pointer"
                  />
                </div>
              )}

              {visibleStandings.length === 0 && (
                <div className="py-12 text-center opacity-40 text-[10px] font-bold uppercase text-slate-500">
                  No datasets recorded
                </div>
              )}
            </CardContent>

            <CardFooter className="bg-primary/5 border-t py-3 px-6 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
              Ranked by percentage of verified approved submissions
            </CardFooter>
          </Card>
        )}

      </div>

      {/* SECTION 1.5: Strengths & Weaknesses / Areas for Improvement Card */}
      <Card className="shadow-lg border-primary/10 overflow-hidden bg-background">
        <CardHeader className="bg-muted/30 border-b py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Strengths & Weaknesses / For Improvement
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                Dynamic institutional quality posture based on current academic year compliance metrics
              </CardDescription>
            </div>
            <Badge variant="outline" className="h-6 px-3 bg-white font-black text-[10px] uppercase">
              {scope === 'university' ? 'UNIVERSITY-WIDE EVALUATION' : scope === 'campus' ? 'CAMPUS-WIDE EVALUATION' : 'UNIT EVALUATION'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border-b">
            {/* STRENGTHS */}
            <div className="flex flex-col">
              <div className="bg-emerald-50/50 px-6 py-3 border-b flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Institutional Strengths</span>
              </div>
              <div className="p-6 space-y-4 flex-1">
                {swotAnalysis.strengths.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="space-y-1 group">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">
                            {item.title}
                          </span>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 border-none h-4 px-1.5 text-[8px] font-black">{item.tag}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold italic">"{item.desc}"</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* WEAKNESSES / AREAS FOR IMPROVEMENT */}
            <div className="flex flex-col">
              <div className="bg-rose-50/50 px-6 py-3 border-b flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-600 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-700">Weaknesses / Areas for Improvement</span>
              </div>
              <div className="p-6 space-y-4 flex-1">
                {swotAnalysis.weaknesses.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="space-y-1 group">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight group-hover:text-rose-600 transition-colors">
                            {item.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {item.priority === 'High' && (
                            <Badge variant="destructive" className="h-4 px-1 text-[7px] font-black uppercase">Critical</Badge>
                          )}
                          <Badge className="bg-rose-100 text-rose-700 border-none h-4 px-1.5 text-[8px] font-black">{item.tag}</Badge>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold italic">"{item.desc}"</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: 5 EOMS Pillars cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* PILLAR 1: INTERNAL AUDITS */}
        <Card className="border-primary/10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xs shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Internal Audit</span>
              <Calendar className="h-4 w-4 text-indigo-500" />
            </div>
            <CardTitle className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 mt-2">IQA Schedule</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{yearSchedules.length} <span className="text-[10px] text-muted-foreground font-bold">Planned</span></div>
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase">
              <span>Completed</span>
              <span className="text-slate-900 dark:text-slate-100 font-extrabold">{completedAudits.length} ({iqaProgressRate}%)</span>
            </div>
            <Progress value={iqaProgressRate} className="h-1 bg-slate-100 dark:bg-slate-700" />
          </CardContent>
        </Card>

        {/* PILLAR 2: CORRECTIVE ACTIONS */}
        <Card className="border-primary/10 bg-white/50 backdrop-blur-xs shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">CAR Oversight</span>
              <ListChecks className="h-4 w-4 text-rose-500" />
            </div>
            <CardTitle className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 mt-2">Corrective Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{yearCars.length} <span className="text-[10px] text-muted-foreground font-bold">Issued</span></div>
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase">
              <span>Closed</span>
              <span className="text-slate-900 dark:text-slate-100 font-extrabold">{closedCars.length} ({carResolutionRate}%)</span>
            </div>
            <Progress value={carResolutionRate} className="h-1 bg-rose-50" />
          </CardContent>
        </Card>

        {/* PILLAR 3: ACCREDITATION */}
        <Card className="border-primary/10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xs shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Accreditation</span>
              <Award className="h-4 w-4 text-teal-500" />
            </div>
            <CardTitle className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 mt-2">Program Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{accreditationRate}% <span className="text-[10px] text-muted-foreground font-bold">Score</span></div>
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase">
              <span>Level Achievement</span>
              <span className="text-slate-900 dark:text-slate-100 font-extrabold">{accreditationLevelRate}%</span>
            </div>
            <Progress value={accreditationRate} className="h-1 bg-teal-50" />
            {accreditationByLevel.undergrad.length > 0 && (
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700">
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Undergrad / TVET</p>
                <div className="flex flex-wrap gap-1">
                  {accreditationByLevel.undergrad.map(item => (
                    <Badge key={item.level} variant="outline" className="text-[7px] font-black px-1.5 py-0 rounded-full bg-white">
                      {item.level}: {item.count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {accreditationByLevel.graduate.length > 0 && (
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700">
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Graduate</p>
                <div className="flex flex-wrap gap-1">
                  {accreditationByLevel.graduate.map(item => (
                    <Badge key={item.level} variant="outline" className="text-[7px] font-black px-1.5 py-0 rounded-full bg-white">
                      {item.level}: {item.count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PILLAR 4: RISKS */}
        <Card className="border-primary/10 bg-white/50 backdrop-blur-xs shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Risks & Opps</span>
              <TriangleAlert className="h-4 w-4 text-amber-500" />
            </div>
            <CardTitle className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 mt-2">Risk Registers</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{yearRisks.length} <span className="text-[10px] text-muted-foreground font-bold">Identified</span></div>
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase">
              <span>Mitigated</span>
              <span className="text-slate-900 dark:text-slate-100 font-extrabold">{mitigatedRisks.length} ({riskControlRate}%)</span>
            </div>
            <Progress value={riskControlRate} className="h-1 bg-amber-50" />
          </CardContent>
        </Card>

        {/* PILLAR 5: CHED PROGRAMS */}
        <Card className="border-primary/10 bg-white/50 backdrop-blur-xs shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Academic Quality</span>
              <GraduationCap className="h-4 w-4 text-blue-500" />
            </div>
            <CardTitle className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 mt-2">CHED Compliance</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{totalProgramsCount} <span className="text-[10px] text-muted-foreground font-bold">Programs</span></div>
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase">
              <span>With COPC</span>
              <span className="text-slate-900 dark:text-slate-100 font-extrabold">{copcCompliant.length} ({copcComplianceRate}%)</span>
            </div>
            <Progress value={copcComplianceRate} className="h-1 bg-blue-50" />
          </CardContent>
        </Card>

      </div>

      {/* SECTION 3: Priority alerts (Bottlenecks) */}
      {bottlenecks.length > 0 && (
        <Card className="border-rose-200/50 bg-rose-50/5 shadow-sm">
          <CardHeader className="py-3 bg-rose-500/5 border-b border-rose-200/30">
            <CardTitle className="text-xs font-black uppercase text-rose-800 tracking-wider flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-600 animate-pulse" />
              Critical EOMS Bottlenecks - Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bottlenecks.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex gap-3 items-start p-3 bg-white border border-rose-100 rounded-xl shadow-xs">
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      item.severity === 'high' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-tight text-slate-800 dark:text-slate-200">{item.title}</span>
                        <Badge variant="outline" className={cn(
                          "text-[7px] font-black uppercase h-4 px-1.5",
                          item.severity === 'high' ? "border-rose-200 text-rose-700 bg-rose-50" : "border-amber-200 text-amber-700 bg-amber-50"
                        )}>
                          {item.severity}
                        </Badge>
                      </div>
                      <p className="text-[10px] font-medium text-slate-500 leading-normal">{item.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
