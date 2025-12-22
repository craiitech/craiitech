# RSU EOMS Submission Portal

This is a comprehensive web application designed to streamline and manage the submission, review, and approval of documents for Romblon State University's Educational Organizations Management System (EOMS), aligned with ISO 21001:2018 standards.

## Overview

The portal provides a centralized platform for different user roles within the university to handle compliance documentation efficiently. It features a role-based access control system, ensuring that users only see and interact with the data and functionalities relevant to their position.

## Key Features

- **Role-Based Access Control (RBAC):** Custom-tailored experiences for different user roles, including:
    - **Administrator:** Manages users, roles, campuses, and has full oversight of all submissions.
    - **Campus Director / ODIMO:** Monitors submission progress for all units within their campus and manages campus-specific settings.
    - **Unit ODIMO:** Reviews and approves/rejects submissions from their specific unit.
    - **Employee / Unit Coordinator:** Submits documents and tracks their status.
- **Document Submission Workflow:** Users can submit documents for various required report types across different submission cycles (First and Final). Submissions are made via Google Drive links, with an AI-powered validation check to ensure link accessibility.
- **Approval & Feedback Loop:** A clear workflow for designated approvers to review, approve, or reject submissions. A commenting system allows for clear feedback and conversation history on each submission.
- **Role-Specific Dashboards:** Each user is presented with a dashboard tailored to their needs, featuring analytics, recent activity, submission checklists, and pending approval queues.
- **Administrative Management:** A secure settings area for administrators to manage system-wide data such as users, campuses, units, and roles.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI:** [React](https://react.dev/), [ShadCN UI](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Database:** [Firebase](https://firebase.google.com/) (Authentication, Firestore)
- **Generative AI:** [Google AI & Genkit](https://firebase.google.com/docs/genkit) for AI-powered features.

## Getting Started

To run the application locally, install the dependencies and start the development server:

```bash
npm install
npm run dev
```

The application will be available at `http://localhost:900
