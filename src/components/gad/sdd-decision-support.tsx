'use client';

import React, { useMemo, useState } from 'react';
import type { GADSector, GADActivity, UnitPersonnelCensus, Signatories, GadSettings } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import {
  Sparkles,
  Scale,
  Users,
  Briefcase,
  GraduationCap,
  Target,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Lightbulb,
  Printer,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  Layers,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SectorSourceBreakdown {
  sector: GADSector;
  legalBasis: string;
  cmoReference: string;
  students: { male: number; female: number; total: number };
  personnel: {
    teachingMale: number;
    teachingFemale: number;
    nonTeachingMale: number;
    nonTeachingFemale: number;
    male: number;
    female: number;
    total: number;
  };
  activities: { male: number; female: number; total: number };
  combined: {
    baselinePopulation: number; // Students + Personnel
    male: number;
    female: number;
    total: number;
    femalePct: number;
    malePct: number;
    gpi: number | null; // Female / Male ratio
    shareOfSectoralTotal: number;
    reachRatePct: number; // Activity beneficiaries vs baseline population
  };
  status: 'ACTIVE_COVERAGE' | 'UNDERSERVED_GAP' | 'ACTIVITY_ONLY' | 'DATA_BLIND_SPOT';
  priorityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  analyticalFinding: string;
  managementDirective: string;
  budgetRecommendation: string;
}

interface SDDDecisionSupportProps {
  dashboardYear: number;
  unitName?: string;
  studentBaseline: { male: number; female: number; total: number };
  studentSecondSem?: { male: number; female: number; total: number };
  previousYearStudentBaseline?: { male: number; female: number; total: number };
  studentSectorCounts: Record<string, { male: number; female: number }>;
  censuses: UnitPersonnelCensus[];
  activities: GADActivity[];
  signatories?: Signatories;
  gadSettings?: GadSettings;
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

const SECTOR_METADATA: Record<
  GADSector,
  {
    legalBasis: string;
    cmoReference: string;
    focusArea: string;
    buildDirective: (stats: {
      studentTotal: number;
      personnelTotal: number;
      activityTotal: number;
      femalePct: number;
      malePct: number;
      status: SectorSourceBreakdown['status'];
    }) => {
      finding: string;
      directive: string;
      budgetRec: string;
    };
  }
> = {
  'Solo Parent': {
    legalBasis: 'RA 11861 (Expanded Solo Parents Welfare Act)',
    cmoReference: 'CMO No. 1, s. 2015 Part IV & V (Child-Minding & Welfare)',
    focusArea: 'Social Protection, Flexible Work/Study & Child-Minding Facilities',
    buildDirective: ({ studentTotal, personnelTotal, activityTotal, femalePct, malePct, status }) => {
      const pop = studentTotal + personnelTotal;
      if (status === 'DATA_BLIND_SPOT') {
        return {
          finding:
            'Zero Solo Parent records captured across student enrollment, employee census, and GAD programs for this cycle.',
          directive:
            'Mandate the Office of Student Affairs and HRMO to integrate Solo Parent ID / status verification during enrollment and annual personnel profiling.',
          budgetRec:
            'Allocate baseline GAD funds for Solo Parent orientation, legal literacy on RA 11861 benefits, and campus child-minding/lactation room maintenance.',
        };
      }
      const skewNote =
        femalePct >= 65
          ? `predominantly female (${femalePct}% F vs ${malePct}% M)`
          : malePct >= 65
            ? `notably male-represented (${malePct}% M vs ${femalePct}% F)`
            : `balanced across sexes (${femalePct}% F / ${malePct}% M)`;
      return {
        finding: `Identified ${pop.toLocaleString()} Solo Parents in baseline census (${studentTotal} students, ${personnelTotal} personnel) and ${activityTotal.toLocaleString()} reached in GAD programs—${skewNote}.`,
        directive:
          status === 'UNDERSERVED_GAP'
            ? 'Expand targeted academic flexibility policies for student-parents, enforce 7-day parental leave privileges for solo-parent employees, and operationalize campus child-minding centers.'
            : 'Sustain Solo Parent support desk operations, livelihood/financial literacy workshops, and priority scholarship slots for dependents.',
        budgetRec:
          'Prioritize Client-Focused GPB allocation for Solo Parent welfare kits, flexible learning assistance, and lactation/child-minding facility upgrades.',
      };
    },
  },
  PWD: {
    legalBasis: 'RA 7277 & RA 10524 (Magna Carta for Persons with Disabilities)',
    cmoReference: 'CMO No. 1, s. 2015 Part III (Inclusive & Barrier-Free HEI)',
    focusArea: 'Accessibility, Assistive Technology & Inclusive Education',
    buildDirective: ({ studentTotal, personnelTotal, activityTotal, femalePct, malePct, status }) => {
      const pop = studentTotal + personnelTotal;
      if (status === 'DATA_BLIND_SPOT') {
        return {
          finding: 'No Persons with Disabilities (PWD) headcount logged in current student or personnel registries.',
          directive:
            'Direct Admissions, Guidance Office, and HRMO to conduct a confidential disability & accommodation inventory across all campuses.',
          budgetRec:
            'Include accessibility audit and assistive learning software procurement in the upcoming Annual GAD Plan & Budget (GPB).',
        };
      }
      return {
        finding: `Recorded ${pop.toLocaleString()} PWD constituents (${studentTotal} students, ${personnelTotal} staff; ${femalePct}% F / ${malePct}% M) with ${activityTotal.toLocaleString()} program participations.`,
        directive:
          status === 'UNDERSERVED_GAP'
            ? 'Commission an immediate physical & digital accessibility audit (ramps, tactile paving, screen-reader LMS support) and design dedicated PWD empowerment programs.'
            : 'Continue assistive accommodation monitoring, inclusive instructional delivery, and reasonable workplace accommodation for PWD faculty and staff.',
        budgetRec:
          'Attribute infrastructure accessibility retrofits via HGDG and earmark MOOE/CO for assistive devices and sign-language/inclusive pedagogy training.',
      };
    },
  },
  'Senior Citizen': {
    legalBasis: 'RA 9994 (Expanded Senior Citizens Act of 2010)',
    cmoReference: 'CMO No. 1, s. 2015 Part V (Extension & Workforce Welfare)',
    focusArea: 'Geriatric Wellness, Pre-Retirement Transition & Community Extension',
    buildDirective: ({ studentTotal, personnelTotal, activityTotal, femalePct, malePct, status }) => {
      const pop = studentTotal + personnelTotal;
      if (status === 'DATA_BLIND_SPOT') {
        return {
          finding: 'Zero Senior Citizen records in workforce census or community extension beneficiary logs.',
          directive:
            'Coordinate with HRMO (for senior faculty/staff) and Extension Services (for community elders) to tag Senior Citizen participants in GAD and extension PPAs.',
          budgetRec:
            'Program Organization-Focused pre-retirement financial/health wellness seminars and Client-Focused community elder care extension projects.',
        };
      }
      return {
        finding: `Documented ${pop.toLocaleString()} internal Senior Citizens (${personnelTotal} senior personnel, ${studentTotal} lifelong learners) and ${activityTotal.toLocaleString()} extension/program beneficiaries (${femalePct}% F / ${malePct}% M).`,
        directive:
          status === 'UNDERSERVED_GAP'
            ? 'Institutionalize annual health screenings, ergonomic workspace adjustments, and pre-retirement succession planning for senior employees.'
            : 'Strengthen intergenerational mentorship programs and community geriatric health/livelihood extension initiatives.',
        budgetRec:
          'Allocate GPB funds for senior employee wellness checkups and community extension outreach for elderly women and men.',
      };
    },
  },
  'Youth/Student': {
    legalBasis: 'RA 9710 (Magna Carta of Women) & RA 11313 (Safe Spaces Act)',
    cmoReference: 'CMO No. 1, s. 2015 Part V — Curriculum, Student Services & Safe Spaces',
    focusArea: 'Gender-Responsive Pedagogy, Student Retention & Anti-VAWC / Safe Spaces',
    buildDirective: ({ studentTotal, activityTotal, femalePct, malePct, status }) => {
      if (status === 'DATA_BLIND_SPOT') {
        return {
          finding: 'Youth/Student sectoral disaggregation is not yet populated in the current academic cycle.',
          directive:
            'Require Academic Units and Registrars to complete semesterly sex-disaggregated enrollment and Youth/Student sectoral tagging.',
          budgetRec:
            'Dedicate Client-Focused GAD funds for student gender-sensitivity orientations (GST), Safe Spaces campaigns, and retention support.',
        };
      }
      const parityInsight =
        femalePct > 60
          ? `Female majority (${femalePct}% F vs ${malePct}% M)—monitor male cohort survival and academic engagement`
          : malePct > 60
            ? `Male majority (${malePct}% M vs ${femalePct}% F)—strengthen female scholarship and STEM/program recruitment`
            : `Balanced gender distribution (${femalePct}% F / ${malePct}% M)`;
      return {
        finding: `${studentTotal.toLocaleString()} tagged in Youth/Student sector census and ${activityTotal.toLocaleString()} reached through GAD student activities. ${parityInsight}.`,
        directive:
          status === 'UNDERSERVED_GAP'
            ? 'Scale up mandatory student GAD orientations, peer counseling, reproductive/mental health services, and gender-fair classroom audits across all colleges.'
            : 'Maintain high student engagement in GAD co-curricular programs and track gender parity in graduation and licensure outcomes.',
        budgetRec:
          'Prioritize Client-Focused student leadership, anti-sexual harassment (CODI) information drives, and gender-equitable scholarship support.',
      };
    },
  },
  Employee: {
    legalBasis: 'PCW-NEDA-DBM Joint Circular 2012-01 & CSC GAD Mainstreaming',
    cmoReference: 'CMO No. 1, s. 2015 Part IV — Institutional Enabling Mechanisms & GFPS',
    focusArea: 'Workforce Gender Parity, Leadership Equity & Capacity Development',
    buildDirective: ({ personnelTotal, activityTotal, femalePct, malePct, status }) => {
      if (status === 'DATA_BLIND_SPOT') {
        return {
          finding: 'Employee sectoral headcount has not yet been committed in the Unit Personnel Census.',
          directive:
            'Instruct Unit Heads and HRMO to click "Sync from Registry" and commit the Unit Personnel Census for the current academic year.',
          budgetRec:
            'Allocate Organization-Focused GPB budget for GFPS capacity building, HGDG training, and CODI workshops for faculty and staff.',
        };
      }
      return {
        finding: `${personnelTotal.toLocaleString()} personnel recorded in sector census (${femalePct}% F / ${malePct}% M) with ${activityTotal.toLocaleString()} employee participations in GAD trainings/activities.`,
        directive:
          status === 'UNDERSERVED_GAP'
            ? 'Require all academic and administrative units to send faculty and non-teaching staff to Gender Sensitivity Training (GST), Gender Analysis, and HGDG workshops.'
            : 'Audit gender balance in faculty promotions, committee chairmanships, and research/extension grants to ensure equal opportunity.',
        budgetRec:
          'Sustain Organization-Focused budget for faculty GAD research grants, CODI training, and Magna Carta of Women special leave implementation.',
      };
    },
  },
  'LGBTQA++': {
    legalBasis: 'RA 11313 (Bawal Bastos / Safe Spaces Act) & CSC Anti-Discrimination Policy',
    cmoReference: 'CMO No. 1, s. 2015 Part III & V — Non-Discrimination & Safe Campus',
    focusArea: 'SOGIESC Inclusivity, Anti-Discrimination & Safe Campus Environment',
    buildDirective: ({ studentTotal, personnelTotal, activityTotal, status }) => {
      const pop = studentTotal + personnelTotal;
      if (status === 'DATA_BLIND_SPOT') {
        return {
          finding: 'Zero voluntary LGBTQA++ sectoral records or targeted SOGIESC program beneficiaries logged.',
          directive:
            'Ensure voluntary, privacy-compliant SOGIESC inclusion in intake/activity forms (aligned with RA 10173 Data Privacy) and launch campus-wide Safe Spaces awareness.',
          budgetRec:
            'Fund SOGIESC sensitivity seminars, anti-bullying/harassment campaigns, and gender-neutral restroom signage.',
        };
      }
      return {
        finding: `${pop.toLocaleString()} individuals self-identified in census (${studentTotal} students, ${personnelTotal} staff) and ${activityTotal.toLocaleString()} participated in inclusive GAD activities.`,
        directive:
          status === 'UNDERSERVED_GAP'
            ? 'Institutionalize SOGIESC diversity trainings for frontline personnel and faculty, and strengthen CODI grievance redress mechanisms against gender-based online/campus harassment.'
            : 'Sustain Pride/diversity dialogues, psychosocial safe spaces, and non-discriminatory dress/uniform and facility policies.',
        budgetRec:
          'Allocate GPB resources for Safe Spaces Act (RA 11313) IEC materials, mental health support, and inclusive campus facilities.',
      };
    },
  },
  'Indigenous People': {
    legalBasis: 'RA 8371 (Indigenous Peoples Rights Act) & CHED CMO No. 2, s. 2019',
    cmoReference: 'CMO No. 1, s. 2015 Part V — Inclusive Access & Cultural Sensitivity',
    focusArea: 'IP Access to Higher Education, Cultural Preservation & Community Extension',
    buildDirective: ({ studentTotal, personnelTotal, activityTotal, femalePct, malePct, status }) => {
      const pop = studentTotal + personnelTotal;
      if (status === 'DATA_BLIND_SPOT') {
        return {
          finding: 'No Indigenous People (IP) students, personnel, or extension beneficiaries recorded for this cycle.',
          directive:
            'Partner with Admissions, Scholarship Office, and Extension Services to identify IP learners (e.g., Sibuyan Mangyan Tagabukid, Bantoanon/Ati communities) and track them in the SDD registry.',
          budgetRec:
            'Earmark GAD Extension and Student Services budget for IP outreach, culturally sensitive mentoring, and indigenous women livelihood programs.',
        };
      }
      return {
        finding: `${pop.toLocaleString()} IP members in institutional baseline (${studentTotal} students, ${personnelTotal} staff; ${femalePct}% F / ${malePct}% M) and ${activityTotal.toLocaleString()} reached in GAD/Extension activities.`,
        directive:
          status === 'UNDERSERVED_GAP'
            ? 'Establish dedicated academic bridging/tutoring, dormitory & financial grant prioritization, and culturally responsive counseling for IP students.'
            : 'Expand participatory GAD research and community extension projects preserving indigenous knowledge and empowering IP women and youth.',
        budgetRec:
          'Provide Client-Focused GPB funding for IP student retention grants, cultural integration dialogues, and highland/island community extension.',
      };
    },
  },
};

export function SDDDecisionSupport({
  dashboardYear,
  unitName = 'Institutional',
  studentBaseline,
  studentSecondSem,
  previousYearStudentBaseline,
  studentSectorCounts,
  censuses,
  activities,
  signatories,
  gadSettings,
}: SDDDecisionSupportProps) {
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<'ALL' | GADSector>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'HIGH' | 'GAP'>('ALL');

  const analytics = useMemo(() => {
    // 1. Consolidate Personnel Census for dashboardYear
    const yearCensuses = (censuses || []).filter((c) => Number(c.year) === dashboardYear);
    let teachingMale = 0;
    let teachingFemale = 0;
    let nonTeachingMale = 0;
    let nonTeachingFemale = 0;

    const personnelSectors: Record<
      GADSector,
      { teachingMale: number; teachingFemale: number; nonTeachingMale: number; nonTeachingFemale: number }
    > = GAD_SECTORS.reduce(
      (acc, sec) => ({
        ...acc,
        [sec]: { teachingMale: 0, teachingFemale: 0, nonTeachingMale: 0, nonTeachingFemale: 0 },
      }),
      {} as any,
    );

    yearCensuses.forEach((rec) => {
      teachingMale += Number(rec.teaching?.male || 0);
      teachingFemale += Number(rec.teaching?.female || 0);
      nonTeachingMale += Number(rec.nonTeaching?.male || 0);
      nonTeachingFemale += Number(rec.nonTeaching?.female || 0);

      GAD_SECTORS.forEach((sec) => {
        const tSec = rec.teaching?.sectors?.[sec];
        if (tSec) {
          personnelSectors[sec].teachingMale += Number(tSec.male || 0);
          personnelSectors[sec].teachingFemale += Number(tSec.female || 0);
        }
        const ntSec = rec.nonTeaching?.sectors?.[sec];
        if (ntSec) {
          personnelSectors[sec].nonTeachingMale += Number(ntSec.male || 0);
          personnelSectors[sec].nonTeachingFemale += Number(ntSec.female || 0);
        }
      });
    });

    const totalPersonnelMale = teachingMale + nonTeachingMale;
    const totalPersonnelFemale = teachingFemale + nonTeachingFemale;
    const totalPersonnel = totalPersonnelMale + totalPersonnelFemale;

    // 2. Consolidate GAD Activities & EOMS Matrix Synced Accomplishment SDD for dashboardYear
    const yearActivities = (activities || []).filter((a) => !a.year || Number(a.year) === dashboardYear);
    let activityMale = 0;
    let activityFemale = 0;
    const activitySectors: Record<GADSector, { male: number; female: number }> = GAD_SECTORS.reduce(
      (acc, sec) => ({ ...acc, [sec]: { male: 0, female: 0 } }),
      {} as any,
    );

    yearActivities.forEach((act) => {
      activityMale += Number(act.participants?.male || 0);
      activityFemale += Number(act.participants?.female || 0);
      if (act.participants?.sectors) {
        GAD_SECTORS.forEach((sec) => {
          const secCounts = (act.participants.sectors as any)?.[sec];
          if (secCounts) {
            activitySectors[sec].male += Number(secCounts.male || 0);
            activitySectors[sec].female += Number(secCounts.female || 0);
          }
        });
      }
    });

    const totalActivityBeneficiaries = activityMale + activityFemale;

    // 3. Compute Gender Parity Index (GPI = Female / Male)
    const calcGpi = (m: number, f: number): number | null => {
      if (m <= 0 && f <= 0) return null;
      if (m === 0) return 2.0; // Strongly female-dominated
      return Number((f / m).toFixed(2));
    };

    const describeGpi = (gpi: number | null) => {
      if (gpi === null)
        return { label: 'No Baseline Data', color: 'text-slate-500', badge: 'bg-slate-100 text-slate-600' };
      if (gpi >= 0.9 && gpi <= 1.1) {
        return {
          label: 'Gender Parity Achieved',
          color: 'text-emerald-700',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
        };
      }
      if (gpi < 0.9) {
        return {
          label: 'Male-Skewed (Female Gap)',
          color: 'text-indigo-700',
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-300',
        };
      }
      return {
        label: 'Female-Skewed (Male Gap)',
        color: 'text-rose-700',
        badge: 'bg-rose-50 text-rose-700 border-rose-300',
      };
    };

    const studentGpi = calcGpi(studentBaseline.male, studentBaseline.female);
    const personnelGpi = calcGpi(totalPersonnelMale, totalPersonnelFemale);
    const teachingGpi = calcGpi(teachingMale, teachingFemale);
    const nonTeachingGpi = calcGpi(nonTeachingMale, nonTeachingFemale);
    const activityGpi = calcGpi(activityMale, activityFemale);

    // 4. Semester Retention & YoY Growth Analytics
    const semRetentionMale =
      studentBaseline.male > 0 && studentSecondSem && studentSecondSem.male > 0
        ? Math.min(100, Math.round((studentSecondSem.male / studentBaseline.male) * 100))
        : null;
    const semRetentionFemale =
      studentBaseline.female > 0 && studentSecondSem && studentSecondSem.female > 0
        ? Math.min(100, Math.round((studentSecondSem.female / studentBaseline.female) * 100))
        : null;

    const yoyStudentDeltaPct =
      previousYearStudentBaseline && previousYearStudentBaseline.total > 0 && studentBaseline.total > 0
        ? Number(
            (
              ((studentBaseline.total - previousYearStudentBaseline.total) / previousYearStudentBaseline.total) *
              100
            ).toFixed(1),
          )
        : null;

    // 5. Build Per-Sector Analytics for all 7 GAD Sectors
    const rawSectorTotals = GAD_SECTORS.map((sec) => {
      const sMale = Number(studentSectorCounts[sec]?.male || 0);
      const sFemale = Number(studentSectorCounts[sec]?.female || 0);
      const p = personnelSectors[sec];
      const pMale = p.teachingMale + p.nonTeachingMale;
      const pFemale = p.teachingFemale + p.nonTeachingFemale;
      const aMale = activitySectors[sec].male;
      const aFemale = activitySectors[sec].female;

      return {
        sector: sec,
        sMale,
        sFemale,
        p,
        pMale,
        pFemale,
        aMale,
        aFemale,
        totalMale: sMale + pMale + aMale,
        totalFemale: sFemale + pFemale + aFemale,
        grandTotal: sMale + sFemale + pMale + pFemale + aMale + aFemale,
      };
    });

    const allSectorsGrandTotal = rawSectorTotals.reduce((acc, r) => acc + r.grandTotal, 0);

    const sectorBreakdowns: SectorSourceBreakdown[] = rawSectorTotals.map((raw) => {
      const meta = SECTOR_METADATA[raw.sector];
      const studentTotal = raw.sMale + raw.sFemale;
      const personnelTotal = raw.pMale + raw.pFemale;
      const activityTotal = raw.aMale + raw.aFemale;
      const baselinePopulation = studentTotal + personnelTotal;
      const total = raw.grandTotal;
      const femalePct = total > 0 ? Math.round((raw.totalFemale / total) * 100) : 0;
      const malePct = total > 0 ? Math.round((raw.totalMale / total) * 100) : 0;
      const gpi = calcGpi(raw.totalMale, raw.totalFemale);
      const shareOfSectoralTotal =
        allSectorsGrandTotal > 0 ? Number(((total / allSectorsGrandTotal) * 100).toFixed(1)) : 0;

      const reachRatePct =
        baselinePopulation > 0
          ? Math.min(100, Math.round((activityTotal / baselinePopulation) * 100))
          : activityTotal > 0
            ? 100
            : 0;

      let status: SectorSourceBreakdown['status'] = 'DATA_BLIND_SPOT';
      let priorityLevel: SectorSourceBreakdown['priorityLevel'] = 'HIGH';

      if (total === 0) {
        status = 'DATA_BLIND_SPOT';
        priorityLevel = 'HIGH';
      } else if (baselinePopulation > 0 && activityTotal === 0) {
        status = 'UNDERSERVED_GAP';
        priorityLevel = 'HIGH';
      } else if (baselinePopulation === 0 && activityTotal > 0) {
        status = 'ACTIVITY_ONLY';
        priorityLevel = 'MEDIUM';
      } else if (reachRatePct < 35) {
        status = 'UNDERSERVED_GAP';
        priorityLevel = 'MEDIUM';
      } else {
        status = 'ACTIVE_COVERAGE';
        priorityLevel = 'LOW';
      }

      const { finding, directive, budgetRec } = meta.buildDirective({
        studentTotal,
        personnelTotal,
        activityTotal,
        femalePct,
        malePct,
        status,
      });

      return {
        sector: raw.sector,
        legalBasis: meta.legalBasis,
        cmoReference: meta.cmoReference,
        students: { male: raw.sMale, female: raw.sFemale, total: studentTotal },
        personnel: {
          ...raw.p,
          male: raw.pMale,
          female: raw.pFemale,
          total: personnelTotal,
        },
        activities: { male: raw.aMale, female: raw.aFemale, total: activityTotal },
        combined: {
          baselinePopulation,
          male: raw.totalMale,
          female: raw.totalFemale,
          total,
          femalePct,
          malePct,
          gpi,
          shareOfSectoralTotal,
          reachRatePct,
        },
        status,
        priorityLevel,
        analyticalFinding: finding,
        managementDirective: directive,
        budgetRecommendation: budgetRec,
      };
    });

    const activeSectorsCount = sectorBreakdowns.filter((s) => s.combined.total > 0).length;
    const underservedSectors = sectorBreakdowns.filter((s) => s.status === 'UNDERSERVED_GAP');
    const blindSpotSectors = sectorBreakdowns.filter((s) => s.status === 'DATA_BLIND_SPOT');
    const servedSectors = sectorBreakdowns.filter(
      (s) => s.status === 'ACTIVE_COVERAGE' || s.status === 'ACTIVITY_ONLY',
    );

    const chartData = sectorBreakdowns.map((s) => ({
      sector: s.sector,
      Students: s.students.total,
      Personnel: s.personnel.total,
      'GAD Programs': s.activities.total,
      Male: s.combined.male,
      Female: s.combined.female,
      Total: s.combined.total,
    }));

    // 6. Top Management Executive Action Priorities
    const topManagementActions: Array<{
      category: string;
      priority: 'CRITICAL' | 'HIGH' | 'STRATEGIC';
      title: string;
      rationale: string;
      action: string;
    }> = [];

    if (studentGpi !== null && (studentGpi < 0.85 || studentGpi > 1.15)) {
      const isFemaleHigh = studentGpi > 1.15;
      topManagementActions.push({
        category: 'Academic & Enrollment Equity',
        priority: 'HIGH',
        title: isFemaleHigh
          ? `Address Male Student Under-Representation (GPI: ${studentGpi})`
          : `Address Female Student Under-Representation (GPI: ${studentGpi})`,
        rationale: `Current student baseline (${studentBaseline.male.toLocaleString()} Male vs ${studentBaseline.female.toLocaleString()} Female) deviates from the UNESCO 0.90–1.10 gender parity band.`,
        action: isFemaleHigh
          ? 'Direct Deans and Student Services to review male cohort attrition, strengthen academic advising/mentoring for male students, and promote balanced career guidance.'
          : 'Expand female scholarship grants, safe dormitory accommodations, and targeted recruitment in male-dominated degree programs.',
      });
    }

    if (
      semRetentionMale !== null &&
      semRetentionFemale !== null &&
      Math.abs(semRetentionMale - semRetentionFemale) >= 5
    ) {
      const lowerSex = semRetentionMale < semRetentionFemale ? 'Male' : 'Female';
      const lowerRate = Math.min(semRetentionMale, semRetentionFemale);
      const higherRate = Math.max(semRetentionMale, semRetentionFemale);
      topManagementActions.push({
        category: 'Cohort Survival & Retention',
        priority: 'HIGH',
        title: `Mitigate ${lowerSex} Semester-to-Semester Attrition (${lowerRate}% vs ${higherRate}%)`,
        rationale: `1st-to-2nd semester retention shows a ${Math.abs(semRetentionMale - semRetentionFemale)}% gender gap (${semRetentionMale}% Male vs ${semRetentionFemale}% Female).`,
        action: `Require Guidance & Counseling and Academic Units to conduct exit/retention interviews and deploy targeted financial or psychosocial assistance for at-risk ${lowerSex.toLowerCase()} learners.`,
      });
    }

    if (underservedSectors.length > 0) {
      topManagementActions.push({
        category: 'GPB Budget & Program Re-Alignment',
        priority: 'CRITICAL',
        title: `Close Program Intervention Gaps in ${underservedSectors.length} Identified Sector(s)`,
        rationale: `Constituents are enrolled/employed in [${underservedSectors.map((s) => s.sector).join(', ')}], but GAD program beneficiary reach is below 35% of baseline headcount.`,
        action: `Require Units to tag Client-Focused and Attributed Action Plans in the Unit EOMS Operational Plan Matrix specifically targeting ${underservedSectors.map((s) => s.sector).join(', ')}.`,
      });
    }

    if (blindSpotSectors.length > 0) {
      topManagementActions.push({
        category: 'SDD Data Governance (CMO No. 1, s. 2015)',
        priority: 'HIGH',
        title: `Eliminate SDD Blind Spots in ${blindSpotSectors.length} Marginalized Sector(s)`,
        rationale: `Zero baseline or activity data recorded for: ${blindSpotSectors.map((s) => s.sector).join(', ')}.`,
        action:
          'Mandate Registrars, HRMO, and Unit EOMS Coordinators to capture complete 7-sector disaggregation during enrollment, personnel census sync, and monthly accomplishment logging.',
      });
    }

    if (personnelGpi !== null && (personnelGpi < 0.85 || personnelGpi > 1.15)) {
      topManagementActions.push({
        category: 'HR & Organizational Mainstreaming',
        priority: 'STRATEGIC',
        title: `Workforce Gender Balance Review (Personnel GPI: ${personnelGpi})`,
        rationale: `Workforce census records ${totalPersonnelMale.toLocaleString()} Male and ${totalPersonnelFemale.toLocaleString()} Female employees (Teaching GPI: ${teachingGpi ?? 'N/A'}, Non-Teaching GPI: ${nonTeachingGpi ?? 'N/A'}).`,
        action:
          'Review Merit Selection & Promotion Plan (MSPP) and faculty recruitment pipelines under Equal Employment Opportunity (EEO) principles.',
      });
    }

    if (topManagementActions.length === 0) {
      topManagementActions.push({
        category: 'Institutional Sustainability',
        priority: 'STRATEGIC',
        title: 'Sustain High Gender Parity & Sectoral Mainstreaming',
        rationale:
          'Institutional SDD indicators demonstrate balanced sex ratios and active coverage across priority sectors.',
        action:
          'Continue quarterly SDD audits and leverage HGDG attribution to expand GAD research and community extension impact.',
      });
    }

    return {
      teachingMale,
      teachingFemale,
      nonTeachingMale,
      nonTeachingFemale,
      totalPersonnelMale,
      totalPersonnelFemale,
      totalPersonnel,
      activityMale,
      activityFemale,
      totalActivityBeneficiaries,
      yearActivitiesCount: yearActivities.length,
      studentGpi,
      studentGpiMeta: describeGpi(studentGpi),
      personnelGpi,
      personnelGpiMeta: describeGpi(personnelGpi),
      teachingGpi,
      nonTeachingGpi,
      activityGpi,
      activityGpiMeta: describeGpi(activityGpi),
      semRetentionMale,
      semRetentionFemale,
      yoyStudentDeltaPct,
      sectorBreakdowns,
      activeSectorsCount,
      underservedSectors,
      blindSpotSectors,
      servedSectors,
      allSectorsGrandTotal,
      chartData,
      topManagementActions,
    };
  }, [
    dashboardYear,
    studentBaseline,
    studentSecondSem,
    previousYearStudentBaseline,
    studentSectorCounts,
    censuses,
    activities,
  ]);

  const filteredSectors = useMemo(() => {
    return analytics.sectorBreakdowns.filter((item) => {
      if (selectedSectorFilter !== 'ALL' && item.sector !== selectedSectorFilter) return false;
      if (priorityFilter === 'HIGH' && item.priorityLevel !== 'HIGH') return false;
      if (priorityFilter === 'GAP' && item.status !== 'UNDERSERVED_GAP' && item.status !== 'DATA_BLIND_SPOT') {
        return false;
      }
      return true;
    });
  }, [analytics.sectorBreakdowns, selectedSectorFilter, priorityFilter]);

  const handlePrintExecutiveBrief = () => {
    const directorName =
      gadSettings?.gadDirector || signatories?.gadDirector || signatories?.qaoDirector || 'Carolyn D. Fetalver';
    const presidentName = signatories?.universityPresident || 'Merian P. Catajay-Mani, Ed.D., CESE';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const sectorRowsHtml = analytics.sectorBreakdowns
      .map(
        (s, idx) => `
        <tr class="${s.status === 'UNDERSERVED_GAP' || s.status === 'DATA_BLIND_SPOT' ? 'bg-rose-50/40' : ''}">
          <td class="border border-black p-1.5 text-center font-bold">${idx + 1}</td>
          <td class="border border-black p-1.5">
            <div class="font-black uppercase">${s.sector}</div>
            <div class="text-[7px] text-slate-600">${s.legalBasis}</div>
          </td>
          <td class="border border-black p-1.5 text-center tabular-nums">
            <div><strong>${s.students.total.toLocaleString()}</strong></div>
            <div class="text-[7px] text-slate-600">${s.students.male}M / ${s.students.female}F</div>
          </td>
          <td class="border border-black p-1.5 text-center tabular-nums">
            <div><strong>${s.personnel.total.toLocaleString()}</strong></div>
            <div class="text-[7px] text-slate-600">${s.personnel.male}M / ${s.personnel.female}F</div>
          </td>
          <td class="border border-black p-1.5 text-center tabular-nums">
            <div><strong>${s.activities.total.toLocaleString()}</strong></div>
            <div class="text-[7px] text-slate-600">${s.activities.male}M / ${s.activities.female}F</div>
          </td>
          <td class="border border-black p-1.5 text-center tabular-nums font-bold">
            <div>${s.combined.total.toLocaleString()}</div>
            <div class="text-[7px] text-indigo-800">${s.combined.femalePct}% F | ${s.combined.malePct}% M</div>
          </td>
          <td class="border border-black p-1.5 text-center font-black uppercase text-[7.5px]">
            ${s.status.replace(/_/g, ' ')}
          </td>
          <td class="border border-black p-1.5 text-[7.5px] leading-snug">
            <div class="font-bold text-slate-900">${s.analyticalFinding}</div>
            <div class="mt-1 text-indigo-900"><strong>Directive:</strong> ${s.managementDirective}</div>
          </td>
        </tr>`,
      )
      .join('');

    const actionsHtml = analytics.topManagementActions
      .map(
        (act) => `
        <div class="border border-black p-2.5 bg-slate-50 mb-2">
          <div class="flex justify-between items-center">
            <span class="font-black uppercase text-[9px] text-indigo-900">[${act.priority}] ${act.category}: ${act.title}</span>
          </div>
          <p class="text-[8px] mt-1 text-slate-700"><strong>Analytical Basis:</strong> ${act.rationale}</p>
          <p class="text-[8px] mt-0.5 text-black"><strong>Recommended Top Management Action:</strong> ${act.action}</p>
        </div>`,
      )
      .join('');

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Executive SDD Analytics & Decision Support Brief - AY ${dashboardYear}-${dashboardYear + 1}</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
          @media print {
            @page { size: landscape; margin: 10mm; }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
          }
          body { font-family: Arial, sans-serif; color: #000; background: #fff; padding: 16px; }
        </style>
      </head>
      <body>
        <div class="no-print mb-4 flex justify-end">
          <button onclick="window.print()" class="bg-indigo-700 text-white px-5 py-2 rounded text-xs font-bold uppercase tracking-wider shadow">Print Executive Brief</button>
        </div>
        <div class="text-center border-b-2 border-black pb-3 mb-4">
          <h1 class="text-base font-black uppercase">Romblon State University</h1>
          <h2 class="text-xs font-bold uppercase text-slate-700">Gender and Development Office &bull; Executive Decision Support System (DSS)</h2>
          <h3 class="text-sm font-black uppercase mt-1 text-indigo-900">
            Sex-Disaggregated Data (SDD) &amp; 7-Sectoral Analytics Report for Top Management
          </h3>
          <p class="text-[10px] font-bold mt-0.5 uppercase">
            Scope: ${unitName} &bull; Academic / Fiscal Year: AY ${dashboardYear}-${dashboardYear + 1} &bull; Benchmark: CHED CMO No. 1, s. 2015 &amp; PCW MC 2011-01
          </p>
        </div>

        <div class="grid grid-cols-4 gap-3 mb-4 text-center">
          <div class="border border-black p-2 bg-slate-50">
            <div class="text-[8px] font-bold uppercase text-slate-600">Student Baseline &amp; GPI</div>
            <div class="text-lg font-black">${studentBaseline.total.toLocaleString()}</div>
            <div class="text-[8px] font-bold">${studentBaseline.male.toLocaleString()}M / ${studentBaseline.female.toLocaleString()}F &bull; GPI: ${analytics.studentGpi ?? 'N/A'} (${analytics.studentGpiMeta.label})</div>
          </div>
          <div class="border border-black p-2 bg-slate-50">
            <div class="text-[8px] font-bold uppercase text-slate-600">Workforce Census &amp; GPI</div>
            <div class="text-lg font-black">${analytics.totalPersonnel.toLocaleString()}</div>
            <div class="text-[8px] font-bold">${analytics.totalPersonnelMale.toLocaleString()}M / ${analytics.totalPersonnelFemale.toLocaleString()}F &bull; GPI: ${analytics.personnelGpi ?? 'N/A'}</div>
          </div>
          <div class="border border-black p-2 bg-slate-50">
            <div class="text-[8px] font-bold uppercase text-slate-600">GAD Program / EOMS PPA Reach</div>
            <div class="text-lg font-black">${analytics.totalActivityBeneficiaries.toLocaleString()}</div>
            <div class="text-[8px] font-bold">${analytics.activityMale.toLocaleString()}M / ${analytics.activityFemale.toLocaleString()}F across ${analytics.yearActivitiesCount} Activity Logs</div>
          </div>
          <div class="border border-black p-2 bg-slate-50">
            <div class="text-[8px] font-bold uppercase text-slate-600">Sectoral Coverage</div>
            <div class="text-lg font-black">${analytics.activeSectorsCount} / 7 Sectors</div>
            <div class="text-[8px] font-bold">${analytics.underservedSectors.length} Underserved &bull; ${analytics.blindSpotSectors.length} Blind Spots</div>
          </div>
        </div>

        <h4 class="text-[10px] font-black uppercase mb-1.5 tracking-wider">I. Per-Sector SDD Consolidation &amp; Decision Support Matrix</h4>
        <table class="w-full border-collapse border border-black text-[8px] mb-4">
          <thead>
            <tr class="bg-slate-200 font-black uppercase text-center">
              <th class="border border-black p-1.5 w-[3%]">#</th>
              <th class="border border-black p-1.5 w-[15%] text-left">GAD Sector &amp; Legal Mandate</th>
              <th class="border border-black p-1.5 w-[9%]">Student SDD</th>
              <th class="border border-black p-1.5 w-[9%]">Personnel SDD</th>
              <th class="border border-black p-1.5 w-[9%]">GAD Activity Reach</th>
              <th class="border border-black p-1.5 w-[10%]">Total Footprint &amp; Ratio</th>
              <th class="border border-black p-1.5 w-[10%]">Coverage Status</th>
              <th class="border border-black p-1.5 w-[35%] text-left">Analytical Finding &amp; Top Management Directive</th>
            </tr>
          </thead>
          <tbody>
            ${sectorRowsHtml}
          </tbody>
        </table>

        <h4 class="text-[10px] font-black uppercase mb-1.5 tracking-wider">II. Top Management Strategic Directives &amp; Policy Actions</h4>
        <div class="mb-6">
          ${actionsHtml}
        </div>

        <div class="grid grid-cols-2 gap-16 px-12 mt-6 text-[9px] font-bold">
          <div class="text-center">
            <p class="text-left mb-8 text-slate-600">Prepared &amp; Certified Correct By:</p>
            <div class="border-b border-black pb-1 font-black uppercase">${directorName}</div>
            <p class="mt-1 text-[8px] uppercase text-slate-600">Director, Gender and Development</p>
          </div>
          <div class="text-center">
            <p class="text-left mb-8 text-slate-600">Noted &amp; Approved for Policy Action By:</p>
            <div class="border-b border-black pb-1 font-black uppercase">${presidentName}</div>
            <p class="mt-1 text-[8px] uppercase text-slate-600">University President</p>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Card className="border-primary/20 shadow-xl rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
      <CardHeader className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 text-white py-5 px-6 border-b">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-amber-400 text-slate-950 hover:bg-amber-400 font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5">
                <Sparkles className="h-3 w-3 mr-1" /> Executive Decision Support System (DSS)
              </Badge>
              <Badge
                variant="outline"
                className="border-white/25 text-white/90 font-mono text-[9px] uppercase px-2 py-0.5"
              >
                CMO No. 1, s. 2015 &bull; PCW MC 2011-01
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-400/40 bg-emerald-500/10 text-emerald-200 font-black text-[9px] uppercase px-2 py-0.5"
              >
                {analytics.activeSectorsCount}/7 Sectors Active
              </Badge>
            </div>
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Scale className="h-5 w-5 text-amber-400 shrink-0" />
              Top Management SDD Data Analytics &amp; Sectoral Decision Support
            </CardTitle>
            <CardDescription className="text-xs text-slate-300 max-w-4xl">
              Tri-source Sex-Disaggregated Data (SDD) intelligence synthesizing Student Registry, Workforce Personnel
              Census, and GAD / EOMS Matrix Program Reach across all 7 marginalized sectors to guide executive policy,
              scholarship equity, infrastructure, and 5% GPB resource allocation for AY {dashboardYear}&ndash;
              {dashboardYear + 1}.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintExecutiveBrief}
              className="h-9 bg-white/10 hover:bg-white/20 text-white border-white/25 font-black uppercase text-[10px] tracking-wider gap-1.5"
            >
              <Printer className="h-3.5 w-3.5 text-amber-300" />
              Print Executive SDD Brief
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* 1. MACRO GENDER PARITY INDEX (GPI) & MULTI-STREAM KPI RIBBON */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Student Parity Card */}
          <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" /> Student SDD &amp; GPI
              </span>
              <Badge
                variant="outline"
                className={cn('text-[8px] font-black uppercase', analytics.studentGpiMeta.badge)}
              >
                GPI: {analytics.studentGpi ?? 'N/A'}
              </Badge>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                {studentBaseline.total.toLocaleString()}
              </p>
              <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                {studentBaseline.male.toLocaleString()}M / {studentBaseline.female.toLocaleString()}F
              </span>
            </div>
            <p className={cn('text-[10px] font-bold', analytics.studentGpiMeta.color)}>
              {analytics.studentGpiMeta.label}
              {analytics.yoyStudentDeltaPct !== null && (
                <span className="ml-1.5 text-slate-500">
                  (
                  {analytics.yoyStudentDeltaPct >= 0
                    ? `+${analytics.yoyStudentDeltaPct}%`
                    : `${analytics.yoyStudentDeltaPct}%`}{' '}
                  YoY)
                </span>
              )}
            </p>
          </div>

          {/* Personnel Parity Card */}
          <div className="p-4 rounded-xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" /> Workforce SDD &amp; GPI
              </span>
              <Badge
                variant="outline"
                className={cn('text-[8px] font-black uppercase', analytics.personnelGpiMeta.badge)}
              >
                GPI: {analytics.personnelGpi ?? 'N/A'}
              </Badge>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                {analytics.totalPersonnel.toLocaleString()}
              </p>
              <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                {analytics.totalPersonnelMale.toLocaleString()}M / {analytics.totalPersonnelFemale.toLocaleString()}F
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
              Teaching GPI: <span className="text-purple-700">{analytics.teachingGpi ?? 'N/A'}</span> &bull; Staff GPI:{' '}
              <span className="text-purple-700">{analytics.nonTeachingGpi ?? 'N/A'}</span>
            </p>
          </div>

          {/* GAD Program & EOMS PPA Beneficiary Reach */}
          <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" /> GAD &amp; EOMS PPA Reach
              </span>
              <Badge
                variant="outline"
                className={cn('text-[8px] font-black uppercase', analytics.activityGpiMeta.badge)}
              >
                GPI: {analytics.activityGpi ?? 'N/A'}
              </Badge>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                {analytics.totalActivityBeneficiaries.toLocaleString()}
              </p>
              <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                {analytics.activityMale.toLocaleString()}M / {analytics.activityFemale.toLocaleString()}F
              </span>
            </div>
            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
              Consolidated from {analytics.yearActivitiesCount} GAD &amp; EOMS Matrix Activity Logs
            </p>
          </div>

          {/* 7-Sector Coverage & Vulnerability Diagnostic */}
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" /> 7-Sector Footprint
              </span>
              <Badge className="bg-amber-600 text-white text-[8px] font-black uppercase">
                {analytics.activeSectorsCount}/7 Tracked
              </Badge>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                {analytics.allSectorsGrandTotal.toLocaleString()}
              </p>
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">
                {analytics.underservedSectors.length} Gaps &bull; {analytics.blindSpotSectors.length} Blind Spots
              </span>
            </div>
            <Progress value={Math.round((analytics.activeSectorsCount / 7) * 100)} className="h-1.5 bg-amber-100" />
          </div>
        </div>

        {/* 2. TOP MANAGEMENT STRATEGIC DECISION PRIORITIES */}
        <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 dark:from-slate-900 dark:to-slate-900 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                  Executive Decision Support: Priority Policy &amp; Resource Directives
                </h4>
                <p className="text-[10px] font-medium text-muted-foreground">
                  Automated institutional recommendations derived from SDD parity ratios, retention trends, and sectoral
                  coverage gaps
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="w-fit text-[9px] font-black uppercase border-indigo-300 text-indigo-700"
            >
              {analytics.topManagementActions.length} Actionable Directive(s)
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {analytics.topManagementActions.map((item, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {item.category}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[8px] font-black uppercase px-2 py-0',
                        item.priority === 'CRITICAL'
                          ? 'border-rose-400 bg-rose-50 text-rose-700'
                          : item.priority === 'HIGH'
                            ? 'border-amber-400 bg-amber-50 text-amber-800'
                            : 'border-emerald-400 bg-emerald-50 text-emerald-700',
                      )}
                    >
                      {item.priority} PRIORITY
                    </Badge>
                  </div>
                  <h5 className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-start gap-1.5">
                    <ArrowUpRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {item.title}
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{item.rationale}</p>
                </div>
                <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-indigo-950 dark:text-indigo-200 leading-snug">
                    <span className="font-black uppercase text-indigo-700 dark:text-indigo-400">
                      Management Action:{' '}
                    </span>
                    {item.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. MULTI-SOURCE SECTORAL COMPARISON CHART */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border p-4 bg-slate-50/40 dark:bg-slate-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-tight flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" />
                  Tri-Source Sectoral Comparison (Students vs. Personnel vs. GAD Programs)
                </h4>
                <p className="text-[10px] text-muted-foreground">
                  Compares baseline constituent headcount against actual GAD &amp; EOMS PPA beneficiary reach per sector
                </p>
              </div>
            </div>
            <ChartContainer config={{}} className="h-[260px] w-full">
              <ResponsiveContainer>
                <BarChart data={analytics.chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis
                    dataKey="sector"
                    tick={{ fontSize: 9, fontWeight: 800 }}
                    interval={0}
                    angle={-12}
                    textAnchor="end"
                    height={45}
                  />
                  <YAxis tick={{ fontSize: 9, fontWeight: 700 }} />
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }} />
                  <Bar dataKey="Students" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Personnel" fill="#9333ea" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="GAD Programs" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <div className="lg:col-span-1 rounded-xl border p-4 bg-slate-50/40 dark:bg-slate-900/40 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-tight flex items-center gap-1.5">
                <Scale className="h-4 w-4 text-primary" />
                Sectoral Coverage Triage
              </h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Quick-filter the 7 GAD sectors below to inspect specific constituent groups, underserved populations, or
                data blind spots requiring immediate administrative intervention.
              </p>
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-emerald-900 dark:text-emerald-200">
                    Active Program Coverage
                  </p>
                  <p className="text-[9px] text-emerald-700">Sectors with active baseline &amp; program reach</p>
                </div>
                <span className="text-lg font-black text-emerald-700">{analytics.servedSectors.length}</span>
              </div>

              <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-200">
                    Underserved Intervention Gaps
                  </p>
                  <p className="text-[9px] text-amber-700">Constituents present but low/zero GAD activity reach</p>
                </div>
                <span className="text-lg font-black text-amber-700">{analytics.underservedSectors.length}</span>
              </div>

              <div className="p-3 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-rose-900 dark:text-rose-200">
                    Unrecorded Data Blind Spots
                  </p>
                  <p className="text-[9px] text-rose-700">Zero student, staff, or activity records logged</p>
                </div>
                <span className="text-lg font-black text-rose-700">{analytics.blindSpotSectors.length}</span>
              </div>
            </div>

            <div className="text-[10px] text-muted-foreground border-t pt-2.5 flex items-center justify-between">
              <span className="font-bold uppercase">UNESCO Parity Standard:</span>
              <span className="font-mono font-black text-primary">0.90 &le; GPI &le; 1.10</span>
            </div>
          </div>
        </div>

        {/* 4. GRANULAR 7-SECTOR ANALYTICS & DECISION SUPPORT MATRIX */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Granular Per-Sector SDD Result Analysis &amp; Decision Support Matrix (All 7 Sectors)
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Detailed disaggregation of Students, Teaching/Non-Teaching Personnel, and GAD Program Beneficiaries per
                sector with tailored statutory and budget directives
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant={priorityFilter === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriorityFilter('ALL')}
                className="h-7 text-[9px] font-black uppercase px-2.5"
              >
                All Sectors ({analytics.sectorBreakdowns.length})
              </Button>
              <Button
                variant={priorityFilter === 'GAP' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriorityFilter('GAP')}
                className="h-7 text-[9px] font-black uppercase px-2.5"
              >
                <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" />
                Gaps &amp; Blind Spots ({analytics.underservedSectors.length + analytics.blindSpotSectors.length})
              </Button>
              <Button
                variant={priorityFilter === 'HIGH' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriorityFilter('HIGH')}
                className="h-7 text-[9px] font-black uppercase px-2.5"
              >
                High Priority ({analytics.sectorBreakdowns.filter((s) => s.priorityLevel === 'HIGH').length})
              </Button>
            </div>
          </div>

          {/* Sector Pill Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Sector Filter:
            </span>
            <Badge
              variant={selectedSectorFilter === 'ALL' ? 'default' : 'outline'}
              onClick={() => setSelectedSectorFilter('ALL')}
              className="cursor-pointer text-[9px] font-black uppercase px-2.5 py-1"
            >
              Show All 7
            </Badge>
            {GAD_SECTORS.map((sec) => (
              <Badge
                key={sec}
                variant={selectedSectorFilter === sec ? 'default' : 'outline'}
                onClick={() => setSelectedSectorFilter(sec)}
                className="cursor-pointer text-[9px] font-bold uppercase px-2.5 py-1"
              >
                {sec}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSectors.map((secItem) => {
              const isGap = secItem.status === 'UNDERSERVED_GAP' || secItem.status === 'DATA_BLIND_SPOT';
              return (
                <div
                  key={secItem.sector}
                  className={cn(
                    'rounded-xl border p-5 space-y-4 transition-all shadow-xs flex flex-col justify-between',
                    secItem.status === 'DATA_BLIND_SPOT'
                      ? 'border-rose-200/80 bg-rose-50/15 dark:border-rose-900/40 dark:bg-rose-950/10'
                      : secItem.status === 'UNDERSERVED_GAP'
                        ? 'border-amber-200/80 bg-amber-50/15 dark:border-amber-900/40 dark:bg-amber-950/10'
                        : 'border-emerald-200/80 bg-emerald-50/10 dark:border-emerald-900/40 dark:bg-emerald-950/10',
                  )}
                >
                  <div className="space-y-3">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2 border-b pb-2.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                            {secItem.sector}
                          </h5>
                          <Badge
                            variant="outline"
                            className="text-[8px] font-mono font-black uppercase px-1.5 py-0 border-slate-300"
                          >
                            {secItem.combined.shareOfSectoralTotal}% of Sectoral Total
                          </Badge>
                        </div>
                        <p className="text-[9px] font-bold text-muted-foreground mt-0.5">
                          {secItem.legalBasis} &bull; {secItem.cmoReference}
                        </p>
                      </div>

                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[8px] font-black uppercase px-2 py-0.5 shrink-0',
                          secItem.status === 'ACTIVE_COVERAGE'
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                            : secItem.status === 'ACTIVITY_ONLY'
                              ? 'border-blue-400 bg-blue-50 text-blue-800'
                              : secItem.status === 'UNDERSERVED_GAP'
                                ? 'border-amber-400 bg-amber-50 text-amber-800'
                                : 'border-rose-400 bg-rose-50 text-rose-800',
                        )}
                      >
                        {secItem.status === 'ACTIVE_COVERAGE'
                          ? 'Active Coverage'
                          : secItem.status === 'ACTIVITY_ONLY'
                            ? 'Activity Reach Logged'
                            : secItem.status === 'UNDERSERVED_GAP'
                              ? 'Underserved Gap'
                              : 'Data Blind Spot'}
                      </Badge>
                    </div>

                    {/* Tri-Source Numbers Grid */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border">
                        <p className="text-[8px] font-black uppercase text-indigo-600">Students</p>
                        <p className="text-sm font-black tabular-nums mt-0.5">
                          {secItem.students.total.toLocaleString()}
                        </p>
                        <p className="text-[8px] text-muted-foreground font-mono">
                          {secItem.students.male}M / {secItem.students.female}F
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border">
                        <p className="text-[8px] font-black uppercase text-purple-600">Personnel</p>
                        <p className="text-sm font-black tabular-nums mt-0.5">
                          {secItem.personnel.total.toLocaleString()}
                        </p>
                        <p className="text-[8px] text-muted-foreground font-mono">
                          {secItem.personnel.male}M / {secItem.personnel.female}F
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border">
                        <p className="text-[8px] font-black uppercase text-emerald-600">GAD Reach</p>
                        <p className="text-sm font-black tabular-nums mt-0.5">
                          {secItem.activities.total.toLocaleString()}
                        </p>
                        <p className="text-[8px] text-muted-foreground font-mono">
                          {secItem.activities.male}M / {secItem.activities.female}F
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-[8px] font-black uppercase text-primary">Total SDD</p>
                        <p className="text-sm font-black text-primary tabular-nums mt-0.5">
                          {secItem.combined.total.toLocaleString()}
                        </p>
                        <p className="text-[8px] font-bold text-primary/80 font-mono">
                          {secItem.combined.femalePct}%F / {secItem.combined.malePct}%M
                        </p>
                      </div>
                    </div>

                    {/* Analytical Finding */}
                    <div className="p-3 rounded-lg bg-white/90 dark:bg-slate-800/80 border space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          {isGap ? (
                            <AlertTriangle className="h-3 w-3 text-amber-600" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          )}
                          Sectoral SDD Finding
                        </span>
                        {secItem.combined.gpi !== null && (
                          <span className="text-[9px] font-mono font-bold text-muted-foreground">
                            Sector GPI: {secItem.combined.gpi}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                        {secItem.analyticalFinding}
                      </p>
                    </div>
                  </div>

                  {/* Top Management Decision Directive & GPB Recommendation */}
                  <div className="space-y-2 pt-2 border-t border-dashed">
                    <div className="text-[10.5px] leading-relaxed">
                      <span className="font-black uppercase text-indigo-700 dark:text-indigo-400">
                        Decision Support Directive:{' '}
                      </span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {secItem.managementDirective}
                      </span>
                    </div>
                    <div className="text-[10px] leading-relaxed bg-indigo-50/60 dark:bg-indigo-950/30 px-2.5 py-1.5 rounded border border-indigo-100 dark:border-indigo-900/40">
                      <span className="font-black uppercase text-indigo-800 dark:text-indigo-300">
                        5% GPB / Resource Allocation:{' '}
                      </span>
                      <span className="text-indigo-950/90 dark:text-indigo-200">{secItem.budgetRecommendation}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-muted/10 border-t py-3 px-6 flex items-start gap-2.5">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
          <strong>Top Management Decision Support Methodology:</strong> This engine cross-tabulates Student SDD
          (Enrollment/Outcomes), Unit Personnel Census (Teaching &amp; Non-Teaching), and GAD Accomplishment / EOMS
          Matrix PPA logs across all 7 statutory GAD sectors. Gender Parity Index (GPI = Female / Male) and Sectoral
          Penetration Rates automatically flag underserved groups and data blind spots for evidence-based planning under
          CHED CMO No. 1, s. 2015 and PCW-NEDA-DBM Joint Circular No. 2012-01.
        </p>
      </CardFooter>
    </Card>
  );
}
