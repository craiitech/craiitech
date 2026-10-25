---

`# Software Requirements & Implementation Specification: CMO No. 1, s. 2015 GAD Compliance & Assessment Module for University EOMS`

`## 1. Executive Summary & Regulatory Context`

`### 1.1 Purpose`  
`This specification defines the architectural design, data structures, workflow engine, role-based interfaces, and calculation logic for implementing the **CHED Memorandum Order (CMO) No. 01, series of 2015** ("Policies and Guidelines on Gender and Development in the Commission on Higher Education and Higher Education Institutions") into the university's **Educational Operations Management System (EOMS)** submission portal.`

`### 1.2 System Objectives`  
`1. **Digital Self-Assessment**: Enable Colleges, Campuses, and University GAD Focal Point System (GFPS) units to encode baseline assessments across the HEI tripartite functions (Curriculum, Research, Extension).`  
`2. **Evidence Management System**: Streamline uploading, linking, categorization, and verification of Means of Verifications (MOVs) and Additional MOVs.`  
`3. **Multi-Tier Validation & Collaboration**: Support parallel evaluation and consensus scoring across internal validators (PDPMED, NMFO/TSRCD/SCD, CHED) and external institutional partners (PCW).`  
`4. **Automated GADtimpala Scoring Engine**: Calculate raw scores and weighted conversion scores based on the prescribed CHED rubric formula.`

`---`

`## 2. Structural Breakdown & Scoring Formula`

`### 2.1 Thematic Pillars & Indicators`  
`The module evaluates **20 Core Descriptors** grouped under the university's tripartite mandate:`  
`- **Curriculum & Instruction** (Descriptors 1 to 7): Policy, People (pedagogy & safe spaces/CODI), Enabling Mechanisms (library holdings, technical review committees, benchmarking), and PAPs (curriculum reviews).`  
`- **Research & Development** (Descriptors 8 to 18): Research agenda, sex-disaggregated data (SDD), gender analysis, ethics review, research funding allocation, publications, and commercialization.`  
`- **Extension & Community Services** (Descriptors 19 to 20): Gender-responsive extension PPAs, community engagement, Safe Spaces Act (RA 11313) awareness, and social advocacy.`

`### 2.2 Mathematical Engine`  
`1. **Item Scoring Scale**:`  
   ``- `NO` = `0.0` points``  
   ``- `PARTIAL` = `0.5` points (or `1.0` point for 2-point policy items)``  
   ``- `YES` = `1.0` point (or `2.0` points for full institutional compliance)``  
`2. **Composite Metric Calculation**:`  
     
`$$RawTotalScore=\sum\limits_{i=1}^{20}ItemScor{e}_{i}(Max=20.0)$$`

   `$$\text{Compliance Rate (\%)} = \left(\frac{\text{Raw Total Score}}{20}\right) \times 100\%$$`  
   `$$\text{Final EOMS Weighted Score} = \text{Compliance Rate} \times 40\%$$`

`---`

`## 3. Role-Based Access Control (RBAC)`

`| Role Code | Role Name | System Permissions |`  
`| :--- | :--- | :--- |`  
``| `ROLE_GAD_FOCAL` | GAD Focal Point / Department Submitter | Create submission, input self-assessment scores, upload/tag primary MOVs, add narrative justification, view validation feedback. |``  
``| `ROLE_GFPS_SECRETARIAT` | University GFPS Secretariat / QA Admin | Audit submissions for completeness, request additional MOVs, assign validators, lock finalized draft. |``  
``| `ROLE_VALIDATOR_INTERNAL` | PDPMED Staff (1, 2, 3), NMFO/TSRCD/SCD | Provide independent item-level scores, post validator notes/findings, accept/reject specific MOVs. |``  
``| `ROLE_VALIDATOR_EXTERNAL` | PCW Evaluators (1-4), CHED Regional Monitors | Input external validated scores (GADtimpala), view historical audit trail, submit statutory recommendations. |``  
``| `ROLE_SYSTEM_ADMIN` | EOMS Superadmin | Manage indicator rubrics, manage academic years/evaluation cycles, export accreditation dossiers. |``

`---`

`## 4. Entity-Relationship & Database Schema (PostgreSQL / Prisma / TypeORM)`

```` ```sql ````  
`-- 1. Evaluation Cycle / Academic Year`  
`CREATE TABLE evaluation_cycles (`  
    `id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`  
    `academic_year VARCHAR(20) NOT NULL,`  
    `title VARCHAR(255) NOT NULL,`  
    `start_date TIMESTAMP WITH TIME ZONE NOT NULL,`  
    `submission_deadline TIMESTAMP WITH TIME ZONE NOT NULL,`  
    `validation_deadline TIMESTAMP WITH TIME ZONE NOT NULL,`  
    `status VARCHAR(50) DEFAULT 'ACTIVE', -- 'DRAFT', 'ACTIVE', 'VALIDATING', 'CLOSED'`  
    `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`  
`);`

`-- 2. Rubric Descriptors Master Table`  
`CREATE TABLE cmo_indicators (`  
    `id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`  
    `item_number INT NOT NULL UNIQUE,`  
    `pillar VARCHAR(50) NOT NULL, -- 'CURRICULUM', 'RESEARCH', 'EXTENSION'`  
    `entry_point VARCHAR(50) NOT NULL, -- 'POLICY', 'PEOPLE', 'ENABLING MECHANISMS', 'PAPS'`  
    `question_text TEXT NOT NULL,`  
    `max_score NUMERIC(3,1) NOT NULL DEFAULT 1.0, -- 1.0 or 2.0`  
    `rubric_no TEXT NOT NULL,`  
    `rubric_partial TEXT NOT NULL,`  
    `rubric_yes TEXT NOT NULL,`  
    `suggested_movs TEXT NOT NULL`  
`);`

`-- 3. Institutional Submission Header`  
`CREATE TABLE cmo_submissions (`  
    `id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`  
    `cycle_id UUID REFERENCES evaluation_cycles(id) ON DELETE CASCADE,`  
    `campus_or_unit VARCHAR(100) NOT NULL,`  
    `submitted_by UUID NOT NULL,`  
    `self_total_score NUMERIC(4,2) DEFAULT 0.00,`  
    `validated_total_score NUMERIC(4,2) DEFAULT 0.00,`  
    `weighted_final_score NUMERIC(5,2) DEFAULT 0.00,`  
    `status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_REVISION', 'VALIDATED'`  
    `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),`  
    `updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`  
`);`

`-- 4. Line Item Evaluation & Self-Score`  
`CREATE TABLE cmo_submission_items (`  
    `id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`  
    `submission_id UUID REFERENCES cmo_submissions(id) ON DELETE CASCADE,`  
    `indicator_id UUID REFERENCES cmo_indicators(id),`  
    `self_assessment_score NUMERIC(3,1) NOT NULL,`  
    `self_assessment_remarks TEXT,`  
    `validated_score NUMERIC(3,1),`  
    `is_mov_accepted BOOLEAN DEFAULT FALSE,`  
    `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`  
`);`

`-- 5. Means of Verifications (Evidence Repository)`  
`CREATE TABLE cmo_mov_records (`  
    `id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`  
    `submission_item_id UUID REFERENCES cmo_submission_items(id) ON DELETE CASCADE,`  
    `mov_type VARCHAR(50) NOT NULL, -- 'PRIMARY', 'ADDITIONAL'`  
    `document_title VARCHAR(255) NOT NULL,`  
    `memo_or_ref_number VARCHAR(100),`  
    `file_url TEXT NOT NULL,`  
    `storage_provider VARCHAR(50) DEFAULT 'S3', -- 'S3', 'GDRIVE', 'LOCAL'`  
    `file_size_bytes BIGINT,`  
    `mime_type VARCHAR(100),`  
    `uploaded_by UUID NOT NULL,`  
    `is_verified BOOLEAN DEFAULT FALSE,`  
    `uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`  
`);`

`-- 6. Validator Notes & Independent Scoring Matrix`  
`CREATE TABLE cmo_validator_assessments (`  
    `id UUID PRIMARY KEY DEFAULT gen_random_uuid(),`  
    `submission_item_id UUID REFERENCES cmo_submission_items(id) ON DELETE CASCADE,`  
    `validator_user_id UUID NOT NULL,`  
    `validator_role VARCHAR(50) NOT NULL, -- 'PDPMED_1', 'PDPMED_2', 'NMFO', 'PCW_1', 'CHED'`  
    `assigned_score NUMERIC(3,1),`  
    `validator_notes TEXT,`  
    `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`  
`);`  
---

5\. System Workflow & State Machine  
`[ Draft Mode ]`  
`│`  
`▼`  
`[ GAD Focal Encodes Self-Scores & Uploads MOVs ]`  
`│`  
`▼ (Submit)`  
`[ GFPS Secretariat Completeness Check ]`  
`├── (Incomplete / Missing Docs) ──► [ Return to Submitter (Needs Revision) ]`  
`└── (Approved)`  
`│`  
`▼`  
`[ Multi-Party Validation Stage ]`  
`├── PDPMED Staff (Internal Verification)`  
`├── NMFO / TSRCD / SCD Review`  
`└── PCW & CHED (External Validation)`  
`│`  
`▼`  
`[ Consensus Scoring & MOV Acceptance ]`  
`│`  
`▼`  
`[ Automatic Calculation of Total & 40% Weighted Final Score ]`  
`│`  
`▼`  
`[ Locked & Published to University EOMS Accreditation Dashboard ]`
---

6\. Detailed Indicator Specification Matrix (Seed Data)

> The system is pre-configured with the standard 20 CMO No. 1 s. 2015 criteria:Pillar 1: CURRICULUM (Descriptors 1 – 7\)

> - **Item 1 (Policy)**: Formal policy to mainstream GAD in curriculum, syllabi, and co-curricular programs. (Max: 2.0 pts)
> - **Item 2 (People)**: Faculty orientations on GAD pedagogy, gender-sensitive language, and instructional design. (Max: 1.0 pt)
> - **Item 3 (People \- CODI & Safe Spaces)**: Faculty training on RA 11313 (Safe Spaces Act), anti-sexual harassment, and international gender perspectives. (Max: 1.0 pt)
> - **Item 4 (Enabling Mechanisms \- Library & Learning Materials)**: Updated, non-sexist, gender-responsive library resources, GAD corner, and instructional modules. (Max: 1.0 pt)
> - **Item 5 (Enabling Mechanisms \- Review Committee)**: Operational review body (GFPS / CODI / Curriculum Review Committee) ensuring syllabi and modules are free from discriminatory content. (Max: 1.0 pt)
> - **Item 6 (Enabling Mechanisms \- Benchmarking)**: International and regional benchmarking integrating gender perspectives and SDG 5 frameworks. (Max: 1.0 pt)
> - **Item 7 (PAPs \- Curriculum Reviews)**: Systematic curriculum review cycles embedding GAD across multiple academic departments. (Max: 1.0 pt)

> Pillar 2: RESEARCH (Descriptors 8 – 18\)

> - **Item 8 (Policy)**: Research agenda explicitly requiring gender analysis and sex-disaggregated data (SDD). (Max: 1.0 pt)
> - **Item 9 (People \- Capability Building)**: Capacity training for faculty and student researchers on gender research methods. (Max: 1.0 pt)
> - **Item 10 (People \- Ethics Review)**: Research Ethics Committee trained in gender sensitivity and ethical protection of vulnerable populations. (Max: 1.0 pt)
> - **Item 11 (Enabling Mechanisms \- Funding Allocation)**: Clear budget line and university research fund allocation dedicated to GAD-focused or GAD-integrated studies. (Max: 1.0 pt)
> - **Item 12 (Enabling Mechanisms \- Database & SDD)**: Institutional research repository tracking publications, researchers, and beneficiaries by sex. (Max: 1.0 pt)
> - **Item 13 – 18 (PAPs & Outputs)**: Completed GAD research outputs, presentations in national/international conferences, peer-reviewed journal publications, policy briefs derived from research, and intellectual property/commercialization with gender impact. (Each 1.0 pt)

> Pillar 3: EXTENSION & COMMUNITY SERVICES (Descriptors 19 – 20\)

> - **Item 19 (PAPs \- Community Programs)**: Regular extension programs applying gender analysis and addressing targeted needs of marginalized sectors. (Max: 1.0 pt)
> - **Item 20 (PAPs \- Policy Advocacy & Social Awareness)**: Public advocacy campaigns on institutional GAD policies (Safe Spaces, Anti-Sexual Harassment, CODI) with community partners. (Max: 1.0 pt)

> ---

> 7\. RESTful API Specification7.1 Submission Endpoints

> - GET /api/v1/cmo/cycles/active: Get active evaluation cycle and deadlines.
> - GET /api/v1/cmo/submissions/current: Fetch the unit's submission draft and completed items.
> - POST /api/v1/cmo/submissions: Initialize a new submission dossier.
> - PUT /api/v1/cmo/submissions/:id/item: Save self-assessment score and narrative for a specific descriptor.
> - POST /api/v1/cmo/submissions/:id/submit: Lock and submit the complete dossier to Secretariat.

> 7.2 Evidence & MOV Endpoints

> - POST /api/v1/cmo/items/:itemId/movs: Upload or attach a document link (supports PDF, DOCX, Google Drive links).
> - DELETE /api/v1/cmo/movs/:movId: Remove an attached evidence file.
> - PATCH /api/v1/cmo/movs/:movId/verify: Set is\_verified status (Secretariat / Validator only).

> 7.3 Validation & Scoring Endpoints

> - GET /api/v1/cmo/validation/queue: List submissions awaiting validation.
> - POST /api/v1/cmo/items/:itemId/validator-notes: Submit score and notes for specific validator seats (PDPMED\_1, PCW, etc.).
> - POST /api/v1/cmo/submissions/:id/finalize: Calculate final total score, apply 40% weighting formula, and generate compliance certificate.

> ---

> 8\. Frontend UI / UX Guidelines

> 1. **Self-Assessment Grid View**:

- Split-screen layout: Left pane displays the 20-item navigation tree with compliance badges; Right pane shows the active rubric cards with radio buttons (\[0\] NO, \[0.5/1.0\] PARTIAL, \[1.0/2.0\] YES).

> 2. **Evidence Attachment Panel**:

- Distinct tabs for **Means of Verification (MOVs)** and **Additional MOVs**.
- Built-in PDF/document previewer to allow validators to inspect memos, BOR resolutions, and syllabi without leaving the browser tab.

> 3. **Validator Multi-Seat Drawer**:

- Dedicated tabbed panels representing each validator column from the spreadsheet: PDPMED 1-3, NMFO, PCW 1-4, and CHED.
- Allows independent note taking and item-by-item score consensus.

> 4. **Real-Time Scorecard Component**:

- Floating header badge showing:
  - **Self-Assessment Total**: xx / 20.0
  - **Validated Score (GADtimpala)**: xx / 20.0
  - **Weighted EOMS Contribution**: (Total / 20 \* 100%) \* 40% \= xx.xx%

---

9\. Vibe Coding Prompt (Direct Copy-Paste for Cursor / Claude Code)  
`Act as an expert full-stack engineer. Implement the CMO No. 1, s. 2015 GAD Compliance & Assessment Module for our University EOMS portal using the attached specification.`

`Key Deliverables:`  
`1. Database Models: Create the Prisma/TypeORM schema matching the cmo_indicators, cmo_submissions, cmo_mov_records, and cmo_validator_assessments tables.`  
`2. Seed Script: Populate all 20 indicators across Curriculum, Research, and Extension with their exact rubric definitions (NO, PARTIAL, YES points).`  
`3. MOV Management: Implement secure file uploads to S3/Cloud Storage and Google Drive link tagging with MIME-type validation.`  
`4. Validation Engine: Implement the multi-validator scoring matrix supporting independent inputs from PDPMED, PCW, and CHED monitors.`  
`5. Dynamic Score Calculator: Write unit-tested utility functions that calculate the Raw Total and the weighted final formula: (Total / 20 * 100%) * 40%.`  
`6. Frontend Components: Build a responsive assessment dashboard with rubric selection cards, evidence uploaders, embedded document previewer, and the real-time scoring summary bar.`  
`***`

`### Key Implementation Takeaways for your System:`  
``1. **Spreadsheet Translation**: The spreadsheet's merged header columns (`M1:U1` for PDPMED, PCW, and CHED) are handled via the `cmo_validator_assessments` table, allowing multiple validators to submit notes and scores simultaneously without cell-overwrite conflicts.``  
``2. **Flexible Evidence Handling**: Columns `K` and `L` in the sheet (*Means of Verifications* and *Additional MOVs*) are structured as relational file/link entities (`cmo_mov_records`) so users can attach multiple memos, syllabi, or BOR resolutions per indicator.``  
``3. **Formula Integrity**: The calculation in cell `H49` (`= (Total / 20) * 100% * 40%`) is codified directly into the validation finalizer endpoint to ensure automated, tamper-proof reporting.``
