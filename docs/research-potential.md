# Research & Publication Potential: RSU EOMS Portal

## A Digital Quality Management System for ISO 21001:2018 in Higher Education

---

## Abstract

The Romblon State University Educational Quality Management System (RSU EOMS) Portal is a comprehensive digital platform designed to operationalize ISO 21001:2018 management system standards in a higher education institution. This document catalogs potential research directions, publication opportunities, and scholarly contributions that can be derived from the system's architecture, implementation, and accumulated data.

---

## 1. System Overview

The EOMS Portal is a full-stack, multi-platform (Web PWA, Electron Desktop, Capacitor Android) application built on Next.js 15, React 19, Firebase/Firestore, and Tailwind CSS. It serves as a unified digital ecosystem integrating quality management, regulatory compliance, institutional analytics, and decision support for a decentralized multi-campus university system.

### Core Modules

| Module | ISO Reference | Purpose |
|--------|--------------|---------|
| Submissions Hub | ISO 7.5.3 | Documented information management |
| Risk & Opportunity Registry | ISO 6.1 | Risk-based thinking |
| Internal Quality Audit (IQA) | ISO 9.2 | Internal audit program |
| Corrective Action Requests (CAR) | ISO 10.1 | Nonconformity correction |
| Management Review | ISO 9.3 | Management review outputs |
| CHED Program Monitoring | Regulatory (CHED COPC) | Academic program compliance |
| Accreditation Performance | AACCUP | Accreditation level tracking |
| OKR Workspace | — | Strategic objective alignment |
| KPI Dashboard | ISO 4.1 | Performance indicators |
| GAD Corner | PCW | Gender & development |

---

## 2. Research Themes & Publication Opportunities

### 2.1 Digital Transformation of Quality Management in Higher Education

**Research Question**: How does a unified digital EOMS platform affect ISO 21001:2018 compliance rates, audit efficiency, and stakeholder engagement in a decentralized multi-campus university?

**Potential Contributions**:
- Pre/post-implementation compliance rate analysis
- Time-to-completion reduction for audit cycles
- Stakeholder satisfaction with digital vs. paper-based QMS
- Cost-benefit analysis of digital quality management adoption

**Data Sources**: Submission timestamps, audit completion dates, user activity logs, CSM survey responses, system adoption metrics across user roles.

**Methodology**: Mixed-methods — quantitative analysis of system usage metrics combined with qualitative surveys of administrators, auditors, and unit coordinators.

---

### 2.2 A Composite Institutional Quality Score: Design and Validation

**Research Question**: Can a weighted multi-metric composite index (EOMS Quality Score) reliably represent institutional quality maturity across diverse dimensions?

**System's Approach**: The EOMS Quality Score combines six weighted pillars:
- Submission Compliance (0.25)
- IQA Progress (0.20)
- CAR Resolution (0.20)
- Risk Control (0.15)
- CHED COPC Rate (0.10)
- Accreditation Performance (0.10)

**Potential Contributions**:
- Validation of weight assignments through sensitivity analysis
- Correlation between EOMS score and external audit outcomes
- Predictive power of composite score for accreditation readiness
- Comparison with ISO 21001:2018 maturity models

**Methodology**: Statistical validation using historical score data, regression analysis against actual audit findings, and Delphi method for weight refinement.

---

### 2.3 Cross-Module Data Integration for Institutional Decision Support

**Research Question**: How can cross-module data correlations (risks, findings, CARs, accreditation recommendations, MR outputs) be leveraged for predictive decision support in university quality management?

**System's Integration Graph**:

```
Audit Findings → CARs → Risk Registry (escalation)
MR Outputs → Unit Assignments (accountability)
Accreditation Recommendations → Units (gap closure)
Risk Ratings → Submission Requirements (dynamic exemption)
KPI Engine ← All Modules (aggregate computation)
```

**Potential Contributions**:
- Design pattern for integrated QMS data graph
- Decision support algorithm using multi-source correlation
- Automated bottleneck detection in quality workflows
- Risk propagation modeling across institutional processes

**Methodology**: Graph database analysis, process mining from event logs, and design science research for the decision support framework.

---

### 2.4 Gamification of Quality Compliance: The EOMS Points System

**Research Question**: Does gamification (Gold/Silver/Bronze tiered ratings) improve on-time submission compliance and quality engagement among academic and administrative units?

**System's Approach**: Per-cycle scoring where timely submissions earn 1.0 points and late submissions earn 0.5, with tier thresholds at Gold (≥11), Silver (≥8), and Bronze (≥1).

**Potential Contributions**:
- Effectiveness of gamification in bureaucratic compliance contexts
- Longitudinal analysis of submission timeliness pre/post gamification
- Unit-level competitive behavior analysis
- Optimal threshold calibration for tiered systems

**Methodology**: Interrupted time-series analysis, A/B testing of tier visibility, and behavioral economics frameworks.

---

### 2.5 AI-Augmented Risk Management in Higher Education

**Research Question**: How effective are LLM-generated ISO-aligned risk treatment suggestions compared to human-authored plans in terms of quality, adoption rate, and closure effectiveness?

**System's Implementation**: Genkit + Google Gemini Pro generates 3-5 mitigation strategies based on risk type, objective, and description, aligned with ISO 21001:2018.

**Potential Contributions**:
- AI vs. human risk treatment plan quality comparison
- Adoption patterns of AI-suggested treatments
- Reduction in risk treatment planning time
- LLM hallucination patterns in ISO compliance contexts

**Methodology**: Randomized controlled trial comparing AI-assisted vs. manual risk treatment, expert panel evaluation of plan quality, and user experience assessment.

---

### 2.6 Multi-Platform Architecture for EOMS in Resource-Constrained Settings

**Research Question**: How can a single codebase (Next.js) effectively serve web (PWA), desktop (Electron), and mobile (Capacitor) platforms for quality management in institutions with limited IT infrastructure?

**System's Implementation**: Shared components across platforms with platform-specific adaptations:
- **PWA**: Offline service worker, push notifications
- **Desktop (Electron)**: Local file system access, print templates
- **Mobile (Capacitor)**: Camera for QR scanning, GPS for field audits

**Potential Contributions**:
- Architecture patterns for cross-platform QMS
- Offline-first design for field audit scenarios
- Performance comparison across platforms
- Accessibility considerations in multi-platform design

**Methodology**: Software architecture evaluation (ISO 25010), performance benchmarking, and user acceptance testing across platforms.

---

### 2.7 Real-Time Compliance Monitoring: Design and Evaluation

**Research Question**: What are the design requirements and effectiveness of a real-time compliance monitoring dashboard for ISO management system standards in higher education?

**System's Implementation**: The ExecutiveDashboard provides real-time KPI cards, submission tracking, audit progress, risk alerts, accreditation timelines, and automated bottleneck identification.

**Potential Contributions**:
- Design principles for compliance dashboards in academia
- Information density vs. cognitive load trade-offs
- Role-specific dashboard personalization effectiveness
- Alert fatigue analysis in continuous monitoring systems

**Methodology**: Cognitive walkthrough, eye-tracking studies, and longitudinal usage analytics.

---

### 2.8 Accreditation Performance Prediction Using System Data

**Research Question**: Can historical accreditation data (AACCUP levels, recommendation closure rates, faculty alignment scores, curriculum compliance) predict future accreditation outcomes?

**System's Data**: Multi-year records of:
- Accreditation levels and sub-scores per area
- Mandatory recommendation closure rates
- Faculty CMO alignment percentages
- Curriculum CHED notation status
- Enrollment and graduation trends

**Potential Contributions**:
- Machine learning model for accreditation level prediction
- Key predictor identification for accreditation success
- Early warning system for accreditation gaps
- Resource allocation optimization for accreditation preparation

**Methodology**: Supervised learning (random forest, gradient boosting) on historical accreditation records, feature importance analysis, and time-series forecasting.

---

### 2.9 Gender Mainstreaming Analytics in Higher Education

**Research Question**: How can sex-disaggregated data across multiple institutional processes (enrollment, faculty, graduation, GAD initiatives, personnel census) reveal gender parity patterns and inform policy decisions?

**System's Data**: Cross-module gender-disaggregated data:
- Enrollment by sex, year level, program, campus
- Faculty by sex, educational attainment, CMO alignment
- Graduation outcomes by sex and program
- GAD initiative beneficiaries by sector and sex
- Personnel census by sector and sex

**Potential Contributions**:
- Multi-dimensional gender parity index for higher education
- Longitudinal analysis of enrollment-to-graduation gender pipeline
- Correlation between GAD budget allocation and parity outcomes
- Intersectional analysis across sectors (PWD, IP, LGBTQIA+, etc.)

**Methodology**: Descriptive and inferential statistics on SDD, disparity index computation, and policy impact evaluation.

---

### 2.10 Accessibility and Inclusion in University Digital Platforms

**Research Question**: How effective is a built-in accessibility suite (high contrast, dyslexic font, reduced motion, configurable font size, theme color) in improving user experience for diverse university stakeholders?

**System's Implementation**: Accessibility preferences stored per user profile, enforced via CSS variables and Tailwind dark mode, with system preference detection and reduced-motion respect.

**Potential Contributions**:
- Usability evaluation of built-in vs. OS-level accessibility
- Accessibility feature adoption patterns across user demographics
- Impact on task completion time for users with disabilities
- Design guidelines for inclusive EdTech platforms

**Methodology**: Controlled usability testing with users who have disabilities, System Usability Scale (SUS) surveys, and analytics on accessibility feature toggle rates.

---

### 2.11 Voice Accessibility for Quality Management Systems

**Research Question**: Can context-aware text-to-speech announcements improve user engagement and deadline compliance in quality management workflows?

**System's Implementation**: Web Speech API (SpeechSynthesis) with role-based briefings, daily frequency capping, contextual content generation from real-time system data, and reduced-motion preference detection.

**Potential Contributions**:
- Effectiveness of voice announcements for compliance reminders
- Role-based personalization of voice briefings
- Frequency capping optimization for notification effectiveness
- Voice as an accessibility tool for QMS stakeholders

**Methodology**: A/B testing of voice vs. text-only notifications, engagement rate analysis, and qualitative interviews with visually impaired users.

---

### 2.12 Offline-First Architecture for Quality Audits in Remote Areas

**Research Question**: How does an offline-first audit system with local data mirroring affect audit data integrity, auditor productivity, and user confidence in resource-constrained environments?

**System's Implementation**: Local data mirroring for auditor field work with service worker registration, offline capability, and eventual synchronization.

**Potential Contributions**:
- Offline sync conflict resolution patterns for audit data
- Data integrity comparison: offline-first vs. always-online
- Auditor productivity measurement in low-connectivity scenarios
- Design patterns for resilient EdTech in developing regions

**Methodology**: Field trials in remote campus sites, sync conflict analysis, and user experience evaluation.

---

### 2.13 KPI Engine: Automated Computation in Integrated Systems

**Research Question**: How can a centralized KPI computation engine that draws from 18+ data sources across interconnected modules provide reliable, real-time performance indicators for institutional decision-making?

**System's Implementation**: The KPI engine (`kpi-engine.ts`) computes metrics from submissions, risks, CARs, audits, CSM, GAD, and activities across 8 KPI categories with configurable thresholds.

**Potential Contributions**:
- Architecture for multi-source KPI aggregation
- Temporal consistency in cross-module metric computation
- Threshold calibration methodologies for educational KPIs
- Automated KPI visualization and alert generation

**Methodology**: Data quality assessment, threshold sensitivity analysis, and comparison with manual KPI tracking accuracy.

---

### 2.14 Change Management and User Adoption of Digital QMS

**Research Question**: What factors influence the adoption and sustained use of a digital quality management system across diverse user roles (faculty, administrators, auditors, executives) in a university setting?

**System's Data**: Granular user behavior tracking across roles, modules, and time:
- Login frequency and session duration
- Module-specific engagement metrics
- Submission timeliness patterns
- Role-specific feature utilization
- Year-over-year adoption trends

**Potential Contributions**:
- Technology acceptance model (TAM) extension for QMS context
- Role-specific adoption barrier identification
- Longitudinal adoption patterns in bureaucratic organizations
- Intervention effectiveness for lagging user groups

**Methodology**: Structural equation modeling, user surveys (TAM/UTAUT), and sequence analysis of user behavior logs.

---

### 2.15 ISO 21001:2018 Compliance Maturity Model for Philippine HEIs

**Research Question**: Can operational data from a digital EOMS platform be used to develop and validate a maturity model for ISO 21001:2018 compliance specific to the Philippine higher education context?

**Potential Contributions**:
- Context-specific maturity model for Philippine HEIs
- Empirical validation of maturity levels using system data
- Benchmarking framework across institutions
- Policy recommendations for CHED and accrediting bodies

**Methodology**: Design science research, expert panel validation, and cross-institutional comparative analysis.

---

## 3. Data Availability & Research Ethics

### 3.1 Available Datasets

The system generates and stores structured data across 55+ Firestore collections. Key datasets available for research (with appropriate anonymization and ethics clearance):

| Dataset | Records | Period | Granularity |
|---------|---------|--------|-------------|
| Submissions | Per-cycle per-unit | Multiple AYs | Timestamp + status + revision |
| Risks | 40+ fields per entry | Continuous | Pre/post treatment + verification |
| Audit Findings | Per-schedule per-clause | Per cycle | Type + clause + schedule link |
| CARs | Full lifecycle | Continuous | Status + action steps + verification |
| Accreditation Records | Per-program per-survey | Multi-year | Level + scores + recommendations |
| COPC Records | Per-program per-year | Multi-year | Status + award date |
| KPI Snapshots | Periodic | Multiple periods | 8 categories, configurable |
| User Activity | Continuous | Ongoing | Role + module + timestamp |

### 3.2 Ethical Considerations

All research using system data should:
1. Obtain appropriate ethics clearance from the university's ethics review board
2. Anonymize personally identifiable information (PII) before analysis
3. Aggregate data at the unit or campus level where individual identification is not required
4. Comply with the Data Privacy Act (Republic Act 10173) of the Philippines
5. Ensure informed consent for user experience and perception studies

---

## 4. Proposed Publication Roadmap

| Year | Quarter | Publication Type | Topic |
|------|---------|-----------------|-------|
| 1 | Q1 | Journal Paper | Digital EOMS Architecture for ISO 21001:2018 |
| 1 | Q2 | Conference Paper | Composite Quality Score Design & Validation |
| 1 | Q3 | Journal Paper | Cross-Module Decision Support Integration |
| 1 | Q4 | Conference Paper | Gamification of Compliance Behavior |
| 2 | Q1 | Journal Paper | AI-Augmented Risk Treatment in HEI |
| 2 | Q2 | Conference Paper | Accreditation Prediction Using ML |
| 2 | Q3 | Journal Paper | Gender Mainstreaming Analytics |
| 2 | Q4 | Conference Paper | Multi-Platform QMS for Resource-Scarce Settings |
| 3 | Q1 | Journal Paper | Offline-First Audit Architecture |
| 3 | Q2 | Conference Paper | Voice Accessibility in QMS |
| 3 | Q3 | Journal Paper | KPI Engine: Automated Metrics in Integrated Systems |
| 3 | Q4 | Book Chapter | ISO 21001:2018 Digital Transformation in Philippine HEIs |

---

## 5. Conclusion

The RSU EOMS Portal represents a significant digital infrastructure for quality management in higher education. Beyond its operational function, the system generates rich, structured, multi-year datasets across interconnected quality domains. These data, combined with the system's modular architecture, novel algorithms, and cross-module integration patterns, provide a fertile ground for scholarly research spanning information systems, educational technology, quality management, public administration, gender studies, and artificial intelligence.

The proposed research themes are designed to:
1. Generate empirical evidence for digital QMS effectiveness in HEI
2. Develop and validate novel composite indices and predictive models
3. Contribute design knowledge for integrated quality management platforms
4. Inform policy and practice for ISO 21001:2018 implementation in developing country contexts
5. Advance accessibility and inclusion in digital governance platforms

---

*Document prepared for research planning purposes. All research proposals should be reviewed by the institutional ethics review board before data collection.*
