# RSU EOMS Portal

Romblon State University's integrated **Enterprise Quality Management System (EOMS)** portal for quality assurance, compliance submission and approval, academic program monitoring, GAD reporting, facilities management, and institutional performance tracking.

The system is aligned with **ISO 21001:2018** and **ISO/IEC 25010:2011** and is available as a web application, Android app, and Windows desktop application.

## Overview

RSU EOMS provides role-based workspaces for university officials, campus and unit coordinators, quality auditors, faculty, and staff. It centralizes submission workflows, audit and risk management, CHED program monitoring, GAD sex-disaggregated data, FIAMO repair requests, visitor and activity tracking, and institutional reporting.

Key capabilities include:

- Role-based access control with granular permissions
- Firebase Authentication and Firestore-backed data
- AI-assisted document/link validation and risk intelligence
- Printable institutional reports and XLSX batch imports
- Offline-aware attendance, scanning, and focused conduct mode
- Web, Android (Capacitor), and Windows desktop (Electron) deployment

## Recent Additions

- **CHED Batch Data Hub** — downloadable XLSX templates and validated batch import for enrollment and graduation data
- **GAD SDD Hub** — per-card academic year selection, student/employee SDD reports, student-type filters, and highlighted program sections
- **Student SDD by Year Level** — first semester, second semester, midyear, and overall enrollment breakdowns
- **FIAMO Monitoring** — end-to-end repair request intake, review, assignment, execution, and oversight
- **Offline-capable attendance and scanning** with signed offline logs and focused conduct mode

## Core Modules

### Institutional Dashboard and Performance

- **Institutional Dashboard** with university-wide analytics, compliance heatmaps, recent activity, and pending actions
- **My Unit Workspace** for unit-level monitoring and action centers
- **KPI Dashboard** and **OKR Workspace** for performance targets and check-ins
- **Strategic Plan**, **Executive Display**, and institutional statements management
- **Activity Log (Daily)** for unit accomplishments and evidence tracking
- **Reports** and consolidated institutional exports

### EOMS Submission and Compliance

- **EOMS Submission Hub** for First and Final submission cycles, including Google Drive links and AI-powered accessibility validation
- Multi-level **Submission Approval** workflow with comments and rejection justification
- **Unit EOMS Digital Document / Operational Plan**
- **Unit Procedure Manuals**, **RSU EOMS Manual**, **University Documents**, and **Unit Forms & Records**
- **PBB Submissions**
- **Communications**, **Advisories**, and built-in help/manual pages

### Quality Assurance and Risk

- **Internal Quality Audit (IQA)** with schedules, findings, audit reports, and corrective action plans
- **Unit Monitoring** for compliance and performance tracking
- **QA Reports & CARs** covering IQA, EQA, management reviews, analytics, and actionable decisions
- **Risk & Opportunity Registry** with dashboards, SWOT analysis, AI risk intelligence, and printable registers
- **Software Quality Evaluation** based on ISO/IEC 25010 (8 categories, 36 sub-characteristics, session persistence, and mandatory evaluation gate)
- **CSM and Faculty Evaluation** modules
- **System Audit Log** and **Activity Audit Log**

### CHED Programs Monitoring

The **CHED Programs Monitoring** workspace includes:

- **CHED Monitoring** and **Accreditation Monitoring**
- **Decision Support** analytics for program performance
- **Batch Data Hub** for enrollment, graduation, board exam, and tracer study data
- **Program Registry** for active and closed programs
- **Quality Profile** and **JC03 Announcements**

The **Batch Data Hub** supports per-program entry and XLSX-based batch processing:

- Downloadable XLSX template with `Enrollment`, `Graduation`, `Programs`, and `Instructions` sheets
- Pre-filled active programs, campuses, majors, year levels, and semesters
- Upload preview with row counts, affected programs/years, and skipped-row validation
- Safe merge into `programCompliances` without overwriting unrelated records
- Enrollment breakdown by year level and semester; graduation breakdown by year level and semester

### GAD Corner

The **GAD Corner** includes:

- **Strategic Overview**
- **Event Registry**
- **GAD Plan & Budget (GPB)**
- **Accomplishment Report (AR)**
- **SDD Hub**
- **Projects Registry**
- **Mainstreaming**

The **SDD Hub** provides student and employee sex-disaggregated data with:

- Per-card **Academic Year** selection, defaulting to the active/current academic year
- Student population baseline and sectoral reach analysis
- Year-level enrollment table with first semester, second semester, midyear, and overall totals
- Institutional, campus, and per-program summaries
- SDD print reports for student and employee data
- Reporting by year range, single year, or year and semester
- Campus, program, and student-type filters (All Student Types, Undergraduate, Graduate)
- Highlighted program sections sorted Undergraduate first, then Graduate
- Unit personnel census workspace and Unit-Level SDD Explorer

### FIAMO Monitoring

**FIAMO Monitoring** manages facilities and repair requests through:

- Repair request submission and tracking
- Coordinator inbox and review
- Staff task execution
- Oversight and dashboard views
- FIAMO activity log
- Worker, evidence, and request settings

### Attendance, Visitors, and Unit Activity

- **Unit Activity** management and evaluation
- **Attendance App** and **Unit Activity Scanner** with QR support
- **Visitor Logbook** and mobile-friendly visitor logging
- Signed offline attendance logs and focused offline conduct mode
- Printable visitor logs and activity records

## Roles and Access

Access is controlled through role-based permissions and Firestore security rules. Common roles include:

- Administrator
- Campus Director / Campus ODIMO
- Vice President
- Unit Coordinator / Unit ODIMO / Unit Head
- Auditor
- Dean of Instruction / DOI
- FIAMO Staff and Driver/Operator/Mechanic

Administrators can manage users, roles, campuses, units, submission windows, and system-wide settings. Sensitive actions are recorded in audit and activity logs.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **UI:** React 19, ShadCN UI, Tailwind CSS, Radix UI, Recharts
- **Backend / Data:** Firebase Authentication, Firestore, Firebase Admin SDK
- **AI:** Genkit, Google GenAI, WebLLM
- **File Processing:** `xlsx-js-style`
- **Printing:** `renderToStaticMarkup` with native browser printing
- **Mobile:** Capacitor (Android)
- **Desktop:** Electron
- **Testing / Quality:** Vitest, Testing Library, ESLint, Prettier, Husky, lint-staged

## Getting Started

### Prerequisites

- Node.js 20 (see `.nvmrc`)
- npm
- A Firebase project with Authentication and Firestore enabled

### Installation

```bash
npm install
cp .env.example .env.local
npm run dev
```

The development server runs at `http://localhost:9002`.

### Environment Configuration

Firebase client configuration is defined in `src/firebase/config.ts`.

Server-side and optional environment variables are documented in `.env.example`:

- `FIREBASE_SERVICE_ACCOUNT` — Firebase Admin SDK service account JSON for server-side operations
- `NEXT_PUBLIC_ATTENDANCE_SALT_<YEAR>` — HMAC salt for attendance QR and offline logs
- `NEXT_PUBLIC_ATTENDANCE_OTP_SALT_<YEAR>` — OTP signing salt
- `NEXT_PUBLIC_ATTENDANCE_OFFLINE_SALT_<YEAR>` — offline log signing salt
- `GOOGLE_SCRIPT_WEBHOOK_URL` — optional Google Apps Script endpoint for Drive uploads
- `ADMIN_SEED_SECRET` — optional secret for the KPI seed endpoint

### Available Scripts

```bash
npm run dev            # Start development server on port 9002
npm run build          # Production build
npm run start          # Start production server
npm run typecheck      # TypeScript checks
npm run lint           # ESLint
npm run lint:fix       # ESLint with autofix
npm run format         # Prettier formatting
npm run format:check   # Prettier check
npm test               # Run Vitest suite
npm run test:watch     # Watch tests
npm run test:coverage  # Coverage report
npm run genkit:dev     # Start Genkit development server
npm run electron:dev   # Run Electron with the development server
npm run electron:build # Build Windows desktop installer
npm run build:mobile   # Build web app and Android APK
npm run build:apk      # Copy/package Android APK
```

### Quality Checks

Before committing major changes, run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Husky and lint-staged run ESLint and Prettier on staged files before commit.

## Mobile and Desktop

### Android

```bash
npm run build:mobile
```

The Android project is available under `android/` and uses Capacitor.

### Windows Desktop

```bash
npm run electron:build
```

The installer is generated in `dist/`. See `INSTALL_WINDOWS.md` for step-by-step Windows installation instructions.

## Security and Data Protection

- Role-based route and permission enforcement
- Firestore security rules in `firestore.rules`
- Security headers configured in `next.config.ts` (clickjacking, MIME sniffing, referrer, permissions policy)
- Production source maps disabled and `X-Powered-By` removed
- Audit logging for sensitive administrative and quality actions
- Signed attendance and offline activity payloads

See `DATA_HANDLING_REQUIREMENTS.md` for data handling requirements.

## Project Structure

```text
src/
  app/                  Next.js routes and API endpoints
  components/           Feature modules and shared UI
  firebase/             Firebase client, admin, and Firestore helpers
  lib/                  Types, permissions, utilities, and business logic
  ai/                   Genkit AI flows
functions/              Firebase Cloud Functions
android/                Capacitor Android project
electron/               Electron desktop wrapper
docs/                   Architecture and implementation documentation
```

## Documentation

- `TESTING.md` — testing guide and scenarios
- `DATA_HANDLING_REQUIREMENTS.md` — data handling and privacy requirements
- `INSTALL_WINDOWS.md` — Windows desktop installation
- `docs/` — architecture, KPI specification, SUC levelling, GAD monograph, and related references
- `MULTI_DESIGNATION_CONTEXT_SWITCHING.md` — multi-designation workspace behavior
- `OPERATIONAL_PLAN_IMPLEMENTATION_PLAN.md` — operational plan implementation notes

## Deployment

The production portal is deployed at `https://eoms.rsu.edu.ph`.

Firebase App Hosting configuration is available in `apphosting.yaml`. Firestore rules and indexes are deployed from `firestore.rules` and `firestore.indexes.json`.

ISO 21001:2018 Certification: [Certipedia quality mark](https://www.certipedia.com/quality_marks/9000018803?locale=en)
