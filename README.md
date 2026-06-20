# RSU EOMS Submission Portal

A comprehensive web application for managing submission, review, and approval of compliance documents at Romblon State University, aligned with **ISO 21001:2018** and **ISO/IEC 25010:2011** standards.

## Overview

The portal provides a centralized platform for different user roles to handle compliance documentation efficiently. It features role-based access control, AI-powered document validation, printable audit reports, and a built-in software quality evaluation system.

## Key Features

- **Role-Based Access Control (RBAC):** Custom-tailored experiences for:
  - **Administrator:** Manages users, roles, campuses, and full oversight of submissions.
  - **Campus Director / ODIMO:** Monitors submission progress across their campus.
  - **Unit ODIMO:** Reviews and approves/rejects unit submissions.
  - **Employee / Unit Coordinator:** Submits documents and tracks status.

- **Document Submission Workflow:** Submit documents for required report types across First and Final submission cycles via Google Drive links, with AI-powered accessibility validation.

- **Approval & Feedback Loop:** Designated approvers review, approve, or reject submissions with threaded comments and full conversation history.

- **Role-Specific Dashboards:** Analytics, recent activity, submission checklists, and pending approval queues tailored per role.

- **Administrative Management:** Centralized settings for managing users, campuses, units, and roles.

- **Audit Reports:** Generate consolidated audit documents with ISO-standard headers that repeat on every printed page. Logo resolution works in `about:blank` print windows.

- **ISO/IEC 25010 Software Quality Evaluation:**
  - Full evaluation form covering **8 categories** and **36 sub-characteristics** of the ISO/IEC 25010:2011 standard.
  - Single-page scrollable layout with per-category progress tracking.
  - Session persistence — progress is auto-saved and restored on accidental navigation or close.
  - Mandatory evaluation gate: users registered for more than 30 days must complete the evaluation; new users may skip.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI:** [React](https://react.dev/), [ShadCN UI](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Database:** [Firebase](https://firebase.google.com/) (Authentication, Firestore)
- **Printing:** Native `window.print()` with `renderToStaticMarkup` for server-rendered document templates

## Getting Started

Run the application locally:

```bash
npm install
npm run dev
```

The application is deployed at `https://eoms.rsu.edu.ph`.

ISO 21001:2018 Certification: [https://www.certipedia.com/quality_marks/9000018803?locale=en](https://www.certipedia.com/quality_marks/9000018803?locale=en)