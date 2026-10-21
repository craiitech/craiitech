# SUC Levelling Monitoring & Decision Support System: Comprehensive Architecture, Data Schema, Calculation Engine & Implementation Specification

> **Document Version:** 2.0 (Verified & Aligned with Romblon State University EOMS Platform)  
> **Platform Stack:** Next.js 15 (Turbopack, App Router, React 19) • Google Cloud Firestore (NoSQL) • Google Drive API • Tailwind CSS • Recharts 3D  
> **Applicable Policies:** DBM-CHED Joint Circular (SUC Levelling Guidelines) • ISO 21001:2025 (EOMS) • CHED CMO No. 46, s. 2012 (ISA) • RSU 10-Point Agenda & Archipelagic Intelligence (AQ)

---

## 1. Executive Summary & Policy Context

The **SUC Levelling Monitoring System** is an institutional decision-support and regulatory compliance engine embedded within the **Romblon State University (RSU) Educational Organizations Management System (EOMS)**.

SUC Levelling is governed by the joint guidelines of the **Department of Budget and Management (DBM)** and the **Commission on Higher Education (CHED)** (Joint Circular No. 1, series of 2016 and updated iterations). It evaluates State Universities and Colleges across the Philippines, categorizing institutions from **Level I to Level V**.

### Strategic Importance for the University

1. **Executive Plantilla & Compensation**: Directly governs the salary grade and qualification standards of the University President (Salary Grade 30/31 for Level IV/V), Vice Presidents, and Campus Directors.
2. **Organizational Upgrading**: Dictates institutional entitlement to additional vice-presidential items, dean items, directorships, and academic divisions.
3. **Capital Outlay & Budget Priority**: SUC Level rating forms a primary criterion for national government infrastructure allocations, research grants, and General Appropriations Act (GAA) funding tiers.

### The Four (4) Key Result Areas (KRAs)

Institutional performance is calculated across 4 Key Result Areas, with **strict minimum point thresholds ("hard floors")** per KRA:

```
+----------------------------------------------------------------------------------------------------------+
|                                    SUC LEVELLING TOTAL POINTS (100.0 PTS)                               |
+------------------------------------+------------------------------------+--------------------------------+
| KRA 1: Higher & Advanced Education | KRA 2: Research & Extension Output | KRA 3: Management of Resources |
| Max: 35.0 Points                   | Max: 30.0 Points                   | Max: 20.0 Points               |
+------------------------------------+------------------------------------+--------------------------------+
|                                    KRA 4: Good Governance & QMS         |                                |
|                                    Max: 15.0 Points                     |                                |
+-------------------------------------------------------------------------+--------------------------------+
```

1. **KRA I: Higher and Advanced Education Quality and Relevance (Max 35.0 pts)**:
   - Certificate of Program Compliance (COPC) coverage across all active offerings.
   - Program accreditation levels (AACCUP Levels I, II, III, and IV).
   - Licensure Examination Passing Rates compared to National Passing Rates (PRC Board Exams).
   - Full-time faculty profiles with advanced postgraduate degrees (Ph.D. / Master's).
   - Student completion and graduation rates in national priority programs.
2. **KRA II: Research Capability and Output (Max 30.0 pts)**:
   - Publications in international peer-reviewed journals (Scopus, Web of Science, ASEAN Citation Index).
   - Inventions, patents, utility models, and industrial designs registered with IPOPHL.
   - Technology transfer, commercialization agreements, and revenue-generating research.
   - External competitive research grants attracted (DOST, CHED, DA-BAR, international agencies).
3. **KRA III: Services to the Community / Extension (Embedded in KRA 2/3)**:
   - Active community adoption programs across RSU's island municipalities.
   - Certified training person-days and client satisfaction ratings.
   - Local and international Memoranda of Agreement / Understanding (MOA/MOU).
4. **KRA IV: Management of Resources & Sound Governance (Max 20.0 / 15.0 pts)**:
   - Budget Utilization Rate (Obligation BUR $\ge 90\%$, Disbursement BUR $\ge 85\%$).
   - Internally Generated Income (IGI) growth and commercial enterprise viability.
   - Commission on Audit (COA) Unmodified / Qualified Annual Audit Opinion.
   - Quality Management System Certification (**ISO 21001:2025 EOMS certified**).
   - Transparency Seal, Citizen's Charter, and digital institutional automation systems.

---

## 2. Institutional Architecture: Aligning with the RSU EOMS

### Multi-Campus Decentralized Topology

Unlike single-campus institutions, Romblon State University operates across multiple islands. The system topology reflects this archipelagic reality:

- **University Executive Level (Central)**: Institutional oversight, consolidated DBM-CHED submission, and presidential simulation.
- **Island Campuses (9 Campuses)**:
  - _Tablas Island_: Main Campus (Odiongan), San Agustin, San Andres, Calatrava, Sta. Fe, Sta. Maria.
  - _Sibuyan Island_: Cajidiocan, San Fernando.
  - _Romblon Island_: Romblon Campus.
- **Academic & Delivery Units**:
  - Colleges (CED, CAS, COE, CIT, CBA, etc.).
  - Research Institutes, Extension Centers, and Administrative Support Offices.

### Role-Based Access Control (RBAC) Mapping

| System Role                            | Real EOMS User Context                                     | SUC Levelling Privileges                                                                                    |
| :------------------------------------- | :--------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| **System Administrator / QA Director** | QMS Director, Institutional Planning Officer               | Full configuration, global toggle activation, cycle initialization, formula tuning.                         |
| **Executive Leadership**               | University President, Vice Presidents (VPAA, VPAF, VPREDI) | View executive dashboards, approve VP strategic goals, run level elevation simulations, export DBM annexes. |
| **Campus Supervisor**                  | Campus Directors, Campus ODIMO Heads                       | Campus-level performance oversight, verify campus MOV uploads.                                              |
| **Unit Encoder**                       | Deans, Department Chairs, Research Heads, Budget Officers  | Data entry for program metrics, research publications, BUR data, and Google Drive MOV linking.              |
| **Internal Validator / Auditor**       | IQA Lead Auditor, SUC Levelling Task Force                 | Document verification, audit finding linkage, validation remarks, score endorsement.                        |

---

## 3. Database Schema: Cloud Firestore Data Models

In contrast to relational SQL schemas (such as PostgreSQL), the RSU EOMS leverages **Google Cloud Firestore** for real-time reactivity, distributed multi-campus offline sync, and flexible nested metric documents.

```
Firestore Root
├── campuses/                         # 9 Island Campuses metadata
├── units/                            # Colleges and administrative offices
├── academicPrograms/                 # Program registry (board, degree level, campus)
├── programCompliances/               # Annual compliance records (COPC, PRC exams, accreditation)
│   └── {complianceId}
│       ├── ched: { copcStatus, copcLink, rqatVisits, programCmoLink }
│       ├── stats: { enrollment: { firstSemester, secondSemester }, graduationCount }
│       ├── boardPerformance: [{ examDate, overallPassRate, nationalPassingRate }]
│       └── accreditationRecords: [{ level, lifecycleStatus, certificateLink }]
├── operationalPlans/                 # Operational plan items linked to SUC KRAs
├── vpStrategicObjectives/            # VP goals tagged with `sucLevellingKra`
├── sucLevellingCycles/               # SUC Levelling Assessment Periods
│   └── {cycleId}
│       ├── yearStart, yearEnd, status, isFinalized
│       └── kras: { kra1, kra2, kra3, kra4 }
├── sucLevellingSubmissions/          # Department / Program indicator claims
│   └── {submissionId}
│       ├── indicatorId, unitId, campusId, year
│       ├── rawNumerator, rawDenominator, rawMetric
│       ├── calculatedPoints, validatedPoints
│       ├── movDriveLinks: [{ title, url, fileId }]
│       └── validationStatus: 'Pending' | 'Verified' | 'Flagged' | 'Rejected'
└── campusSettings/
    └── global                        # Master configuration & Home Dashboard state
```

### TypeScript Data Definitions (`src/lib/types.ts`)

```typescript
// 1. SUC Levelling Evaluation Cycle
export type SucLevellingCycle = {
  id: string;
  cycleName: string; // e.g., "AY 2024-2027 SUC Levelling Cycle"
  targetYearStart: number;
  targetYearEnd: number;
  status: 'Draft' | 'DataCollection' | 'InternalReview' | 'Submitted' | 'Finalized';
  isFinalized: boolean;
  scoringCeilings: {
    kra1Max: number; // default: 35.0
    kra2Max: number; // default: 30.0
    kra3Max: number; // default: 20.0
    kra4Max: number; // default: 15.0
  };
  createdAt: any;
  updatedAt: any;
};

// 2. Indicator Definition
export type SucIndicator = {
  id: string; // e.g., 'KRA1_ACCREDITATION', 'KRA2_SCOPUS_PUBS'
  kraId: 'KRA_1' | 'KRA_2' | 'KRA_3' | 'KRA_4';
  code: string;
  title: string;
  description: string;
  calculationType: 'TABLE_LOOKUP' | 'RATIO_PERCENT' | 'TIERED_POINTS' | 'DIRECT_VALUE';
  maxAllowablePoints: number;
  targetUnit: 'PERCENTAGE' | 'COUNT' | 'PESOS' | 'POINTS';
  requiresDriveEvidence: boolean;
};

// 3. Indicator Submission with Google Drive MOV
export type SucIndicatorSubmission = {
  id: string;
  cycleId: string;
  indicatorId: string;
  unitId: string;
  campusId: string;
  academicYear: number;

  // Numerical Metrics
  numeratorValue: number;
  denominatorValue: number;
  rawMetricValue: number;

  // Points
  selfAwardedPoints: number;
  validatedPoints?: number;
  externalPoints?: number;

  // Means of Verification (Google Drive API Integration)
  movDriveLinks: {
    title: string;
    driveFolderUrl: string;
    fileId?: string;
    directViewLink: string;
    mimeType?: string;
  }[];

  // Workflow & Audit
  validationStatus: 'Pending' | 'Verified' | 'Flagged' | 'Rejected';
  validatorRemarks?: string;
  validatedById?: string;
  validatedByName?: string;
  validatedAt?: any;

  createdAt: any;
  updatedAt: any;
};

// 4. SUC Levelling Threshold Matrix
export type SucLevelThreshold = {
  level: 'Level V' | 'Level IV' | 'Level III' | 'Level II' | 'Level I';
  title: string;
  minTotal: number;
  minKra1: number;
  minKra2: number;
  minKra3: number;
  minKra4: number;
  badgeClass: string;
};
```

---

## 4. Scoring Engine & Hard-Floor Demotion Logic

### SUC Level Thresholds & Minimum Qualifying Floors

To attain an institutional level, an institution must satisfy **both** the composite total score **and** the minimum qualifying floor in every single KRA.

| SUC Classification Level                       |          Min Composite Total           | Min KRA 1 (Instruction)  |   Min KRA 2 (Research)   |  Min KRA 3 (Resources)   | Min KRA 4 (Governance)  |
| :--------------------------------------------- | :------------------------------------: | :----------------------: | :----------------------: | :----------------------: | :---------------------: |
| **Level V** _(National Research University)_   |    **$\ge 85.00$** (or $\ge 42.0$)     | $\ge 29.75$ ($\ge 14.0$) | $\ge 25.50$ ($\ge 12.0$) | $\ge 17.00$ ($\ge 10.0$) | $\ge 12.75$ ($\ge 4.5$) |
| **Level IV** _(High-Performing Regional SUC)_  | **$65.00 - 84.99$** (or $34.0 - 41.9$) | $\ge 22.75$ ($\ge 11.5$) | $\ge 19.50$ ($\ge 9.5$)  | $\ge 13.00$ ($\ge 8.0$)  | $\ge 9.75$ ($\ge 3.5$)  |
| **Level III** _(Established State University)_ | **$45.00 - 64.99$** (or $26.0 - 33.9$) | $\ge 15.75$ ($\ge 9.0$)  | $\ge 13.50$ ($\ge 7.0$)  |  $\ge 9.00$ ($\ge 6.0$)  | $\ge 6.75$ ($\ge 2.5$)  |
| **Level II** _(Developing State University)_   | **$25.00 - 44.99$** (or $18.0 - 25.9$) |  $\ge 8.75$ ($\ge 6.5$)  |  $\ge 7.50$ ($\ge 4.5$)  |  $\ge 5.00$ ($\ge 4.0$)  | $\ge 3.75$ ($\ge 1.5$)  |
| **Level I** _(Foundational State University)_  |        **$< 25.00$** ($< 18.0$)        |           Any            |           Any            |           Any            |           Any           |

> **Hard-Floor Rule Enforcement**:  
> If RSU earns a total score of **72.4 points** (which falls within Level IV: $65.0 - 84.9$), but its KRA 2 (Research) score is only **18.2 points** (below the $19.50$ minimum for Level IV), the engine automatically triggers **Hard-Floor Demotion** and flags the institution as **Level III**. The system pinpoints the exact KRA deficit and calculates the point delta required to remove the restriction.

### Production Calculation Engine (`src/lib/suc-levelling-engine.ts`)

```typescript
export interface SucKraScores {
  kra1: number;
  kra2: number;
  kra3: number;
  kra4: number;
  total: number;
}

export const SUC_LEVEL_THRESHOLDS: SucLevelThreshold[] = [
  {
    level: 'Level V',
    title: 'Top-Tier National Research University',
    minTotal: 85.0,
    minKra1: 29.75,
    minKra2: 25.5,
    minKra3: 17.0,
    minKra4: 12.75,
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    level: 'Level IV',
    title: 'High-Performing Regional University',
    minTotal: 65.0,
    minKra1: 22.75,
    minKra2: 19.5,
    minKra3: 13.0,
    minKra4: 9.75,
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    level: 'Level III',
    title: 'Established State University',
    minTotal: 45.0,
    minKra1: 15.75,
    minKra2: 13.5,
    minKra3: 9.0,
    minKra4: 6.75,
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    level: 'Level II',
    title: 'Developing State University',
    minTotal: 25.0,
    minKra1: 8.75,
    minKra2: 7.5,
    minKra3: 5.0,
    minKra4: 3.75,
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    level: 'Level I',
    title: 'Foundational State University',
    minTotal: 0.0,
    minKra1: 0.0,
    minKra2: 0.0,
    minKra3: 0.0,
    minKra4: 0.0,
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
  },
];

export function evaluateSucClassification(scores: SucKraScores) {
  let nominalLevel = SUC_LEVEL_THRESHOLDS[SUC_LEVEL_THRESHOLDS.length - 1];

  // 1. Identify nominal level based on total composite points
  for (const t of SUC_LEVEL_THRESHOLDS) {
    if (scores.total >= t.minTotal) {
      nominalLevel = t;
      break;
    }
  }

  // 2. Evaluate downward against KRA minimum thresholds
  for (const t of SUC_LEVEL_THRESHOLDS) {
    if (scores.total >= t.minTotal) {
      const deficits: string[] = [];
      if (scores.kra1 < t.minKra1) deficits.push(`KRA 1: ${scores.kra1.toFixed(1)} / ${t.minKra1.toFixed(1)}`);
      if (scores.kra2 < t.minKra2) deficits.push(`KRA 2: ${scores.kra2.toFixed(1)} / ${t.minKra2.toFixed(1)}`);
      if (scores.kra3 < t.minKra3) deficits.push(`KRA 3: ${scores.kra3.toFixed(1)} / ${t.minKra3.toFixed(1)}`);
      if (scores.kra4 < t.minKra4) deficits.push(`KRA 4: ${scores.kra4.toFixed(1)} / ${t.minKra4.toFixed(1)}`);

      if (deficits.length === 0) {
        return {
          achievedLevel: t.level,
          title: t.title,
          badgeClass: t.badgeClass,
          isDemotedByFloor: t.level !== nominalLevel.level,
          nominalLevel: nominalLevel.level,
          deficits: [],
          pointsToNextLevel: getPointsToNext(t.level, scores.total),
        };
      }
    }
  }

  return {
    achievedLevel: 'Level I',
    title: 'Foundational State University',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    isDemotedByFloor: nominalLevel.level !== 'Level I',
    nominalLevel: nominalLevel.level,
    deficits: [],
    pointsToNextLevel: 25.0 - scores.total,
  };
}

function getPointsToNext(currentLevel: string, currentTotal: number): number {
  if (currentLevel === 'Level V') return 0;
  if (currentLevel === 'Level IV') return Math.max(0, 85.0 - currentTotal);
  if (currentLevel === 'Level III') return Math.max(0, 65.0 - currentTotal);
  if (currentLevel === 'Level II') return Math.max(0, 45.0 - currentTotal);
  return Math.max(0, 25.0 - currentTotal);
}
```

---

## 5. Means of Verification (MOV) & Google Drive Integration

Rather than storing binary blobs inside a local SQL database or expensive relational storage, the RSU EOMS uses a **decentralized Google Drive Architecture**:

```
Google Drive Institutional Repository
└── RSU EOMS Submissions /
    ├── Main Campus /
    │   ├── College of Education /
    │   │   ├── KRA1_Instruction_COPC_Certificates/
    │   │   └── KRA1_AACCUP_Accreditation_Survey_Results/
    │   └── College of Engineering /
    ├── Romblon Campus /
    └── Sibuyan Island Campuses /
```

### MOV Requirements per Indicator

| Indicator                   | Mandatory MOV Document                                          | Verified By                  | Storage Link in EOMS                |
| :-------------------------- | :-------------------------------------------------------------- | :--------------------------- | :---------------------------------- |
| **KRA 1.1: COPC**           | Official CHED Certificate of Program Compliance                 | Dean / VP Academic Affairs   | `comp.ched.copcLink`                |
| **KRA 1.2: AACCUP**         | AACCUP Official Level Certificate & Summary of Ratings          | Quality Assurance Office     | `milestone.certificateLink`         |
| **KRA 1.3: Board Exams**    | PRC Certified Summary of Rating with Institutional Passing Rate | College Dean / Registrar     | `comp.boardPerformance[].examDate`  |
| **KRA 2.1: Scopus / WoS**   | Scopus Document Link, DOI URL, and Author Affiliation Sheet     | VP Research & Extension      | `indicatorSubmission.movDriveLinks` |
| **KRA 2.2: IPOPHL Patents** | Letters Patent Certificate or Utility Model Certificate         | Intellectual Property Office | `indicatorSubmission.movDriveLinks` |
| **KRA 3.1: BUR**            | FAR No. 1 and FAR No. 1-A certified by Budget Officer           | VP Administration & Finance  | `submission.googleDriveLink`        |
| **KRA 4.1: ISO 21001**      | Accredited ISO 21001:2025 Scope Certificate & IQA Reports       | QMS Director                 | `campusSettings.formsDriveLink`     |

---

## 6. Implementation Blueprint: Active Frontend Components

The system is deployed and active in the codebase:

```
src/
├── components/
│   ├── dashboard/
│   │   ├── unified-home-dashboard.tsx                // Master Multi-Framework Orchestrator
│   │   ├── executive-overview.tsx                    // Composite Pulse & Health Gauge
│   │   └── strategic/
│   │       ├── suc-levelling-dashboard-tab.tsx       // SUC Levelling 4 KRAs & Predictive Simulator
│   │       ├── ched-isa-dashboard-tab.tsx            // CHED ISA 5-Dimension Radar & Criteria
│   │       └── island-campus-equity-tab.tsx          // 9-Campus Comparative Benchmark Radar
│   ├── admin/
│   │   └── home-dashboard-settings-management.tsx    // Global Toggle & Settings Switch
│   └── programs/
│       ├── ched-monitoring-view.tsx                  // COPC & Student Data Warnings
│       └── academic-unit-ched-warnings-card.tsx      // Missing Data Warnings (Enrollment, Board, Grad)
├── lib/
│   ├── ched-compliance-warnings.ts                   // Validation engine for student data
│   ├── types.ts                                      // Shared data types & interfaces
│   └── utils.ts                                      // Formatting, calculations, context helpers
└── app/(dashboard)/
    ├── dashboard/page.tsx                            // Dashboard entry point with Global toggle
    └── settings/page.tsx                             // System settings page (Home Dashboard tab)
```

### Key UI Features Implemented:

1. **Interactive Strategic Elevation Simulator** ([src/components/dashboard/strategic/suc-levelling-dashboard-tab.tsx](file:///Users/coolviper01/PROJECTS/craiitech/src/components/dashboard/strategic/suc-levelling-dashboard-tab.tsx)):
   - Sliders allowing leadership to simulate adding 1–15 Level III/IV programs ($+0.8\text{ pts/program}$).
   - PRC Licensure pass rate boost slider ($+1\text{ to }5\text{ pts}$).
   - Scopus/WoS publication incentives ($+0.5\text{ pts/paper}$).
   - Budget utilization rate adjustment ($90\%\text{ to }100\%$).
   - Real-time gauge displaying projected level transition (e.g., Level III $\rightarrow$ Level IV).
2. **Global Setting Activation Switch** ([src/components/admin/home-dashboard-settings-management.tsx](file:///Users/coolviper01/PROJECTS/craiitech/src/components/admin/home-dashboard-settings-management.tsx)):
   - Admin toggle activating the unified dashboard for all university personnel.
   - Quick-switch button allowing unit heads and auditors to access their personal workspace without losing institutional context.
3. **Automated Student Warning Engine** ([src/lib/ched-compliance-warnings.ts](file:///Users/coolviper01/PROJECTS/craiitech/src/lib/ched-compliance-warnings.ts)):
   - Checks 1st & 2nd semester enrollment headcounts, zero graduates, and missing PRC board exam records.

---

## 7. Migration & Real-Time Sync Strategy

1. **Reactive Cloud Firestore Listeners**:
   - The dashboard uses `useDoc` and `useCollection` with `useMemoFirebase` for zero-refresh updates.
   - When a dean submits a COPC certificate or updates PRC board exam passing rates in `programCompliances`, the SUC Levelling scorecard updates dynamically across all executive screens.
2. **Backward Compatibility**:
   - When `enableUnifiedHomeDashboard` is toggled off in settings, the system immediately reverts to standard role-based views (`renderAdminHome`, `renderAuditorHome`, `renderSupervisorHome`, `renderUnitUserHome`).
3. **Auditability & Board of Regents (BOR) Reporting**:
   - The system supports single-click executive briefing printing (`window.print()`) formatted for BOR quarterly sessions and DBM-CHED Regional Evaluation Committee presentations.
