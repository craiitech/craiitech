'use client';

import React from 'react';
import { format } from 'date-fns';
import { faqs } from '@/lib/support-data';

interface SupportCenterPrintTemplateProps {
  preparedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  generatedDate?: Date;
}

export function SupportCenterPrintTemplate({
  preparedBy = 'QMS Lead Technical Officer',
  reviewedBy = 'Institutional Document Controller',
  approvedBy = 'Director, Quality Assurance Office',
  generatedDate = new Date(),
}: SupportCenterPrintTemplateProps) {
  const today = generatedDate;
  const currentYear = today.getFullYear();

  return (
    <div
      className="p-8 text-black bg-white max-w-[8.5in] mx-auto font-sans leading-relaxed print:p-2 print:max-w-full"
      style={{ fontSize: '9pt' }}
    >
      {/* =========================================================================
          COVER & INSTITUTIONAL LETTERHEAD
          ========================================================================= */}
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <p className="text-[9pt] font-bold uppercase tracking-wider text-slate-700 m-0">Republic of the Philippines</p>
        <h1 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-900 m-0 my-1">
          ROMBLON STATE UNIVERSITY
        </h1>
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800 m-0">
          Quality Assurance Office • Institutional EOMS Management Team
        </h2>
        <p className="text-[8pt] italic text-slate-600 m-0">Main Campus, Odiongan, Romblon, Philippines</p>
      </div>

      {/* DOCUMENT TITLE STRIP */}
      <div className="border-y-2 border-black py-3 mb-6 bg-slate-50 text-center">
        <span className="text-[8pt] font-black uppercase tracking-widest text-slate-500 block mb-1">
          OFFICIAL INSTITUTIONAL PUBLICATION • QAO-MAN-2026-001
        </span>
        <h2 className="text-sm md:text-base font-black uppercase tracking-wider text-slate-900 m-0">
          EOMS PORTAL: COMPREHENSIVE SOFTWARE SUPPORT CENTER & USER OPERATIONS MANUAL
        </h2>
        <p className="text-[8pt] font-bold uppercase tracking-wider text-slate-700 m-0 mt-1">
          Standardized Operating Procedures, Quality Governance Workflows, Risk Protocols & Technical Knowledge Base
        </p>
      </div>

      {/* DOCUMENT CONTROL METADATA */}
      <table className="w-full border-collapse border-2 border-black text-[8pt] mb-6">
        <tbody>
          <tr>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase w-[20%]">DOCUMENT REF NO:</td>
            <td className="border border-black p-2 font-mono font-bold w-[30%]">RSU-QAO-SCUG-{currentYear}-001</td>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase w-[20%]">DATE EFFECTIVE:</td>
            <td className="border border-black p-2 font-bold w-[30%]">{format(today, 'MMMM d, yyyy')}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase">REVISION LEVEL:</td>
            <td className="border border-black p-2 font-bold text-emerald-800">Rev 03 (Enterprise Cloud Edition)</td>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase">SECURITY STATUS:</td>
            <td className="border border-black p-2 font-bold">University-Wide Standard (Public User Manual)</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase">STANDARDS COVERED:</td>
            <td colSpan={3} className="border border-black p-2 font-medium">
              ISO 21001:2018 (EOMS) • ISO 9001:2015 (QMS) • CHED CMO 46, s. 2012 • RA 10173 (Data Privacy Act)
            </td>
          </tr>
        </tbody>
      </table>

      {/* EXECUTIVE SUMMARY CALLOUT */}
      <div className="border-l-4 border-slate-900 bg-slate-50 p-3 mb-6 text-[8.5pt] rounded-r border-y border-r border-slate-200">
        <p className="font-black uppercase text-slate-900 mb-1">Purpose & Target Audience:</p>
        <p className="text-slate-700 leading-normal">
          This manual serves as the authoritative, university-wide technical standard and user operational guide for all
          faculty, non-academic personnel, unit coordinators, campus directors, and quality auditors interacting with
          the
          <strong> Romblon State University Educational Organizations Management System (RSU EOMS Portal)</strong>. It
          covers step-by-step procedures, role responsibilities, compliance deadlines, digital risk management, internal
          quality audits, and IT service desk workflows.
        </p>
      </div>

      {/* TABLE OF CONTENTS QUICK MATRIX */}
      <div className="mb-8 border border-black p-3 bg-slate-50/50 rounded">
        <h3 className="text-[9pt] font-black uppercase tracking-wider mb-2 border-b border-black pb-1 text-slate-900">
          Summary Directory & Chapter Overview
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[8pt]">
          <div>
            <p>
              <strong>Chapter 1:</strong> System Overview & Global Architecture
            </p>
            <p>
              <strong>Chapter 2:</strong> User Access, Security & RA 10173 Privacy
            </p>
            <p>
              <strong>Chapter 3:</strong> Accessibility & Inclusivity (PWD Support)
            </p>
            <p>
              <strong>Chapter 4:</strong> The 6 Mandatory EOMS Compliance Documents
            </p>
            <p>
              <strong>Chapter 5:</strong> Digital Risk & Opportunity Register (ROR)
            </p>
            <p>
              <strong>Chapter 6:</strong> Internal Quality Audit (IQA) & CAR 8D
            </p>
          </div>
          <div>
            <p>
              <strong>Chapter 7:</strong> Academic Program Monitoring & Accreditation
            </p>
            <p>
              <strong>Chapter 8:</strong> GAD Mainstreaming & SWOT Diagnostics
            </p>
            <p>
              <strong>Chapter 9:</strong> Unit Procedure Manuals (SOP) Governance
            </p>
            <p>
              <strong>Chapter 10:</strong> System Administration & Cloud Backups
            </p>
            <p>
              <strong>Chapter 11:</strong> Technical FAQs, Printing & Diagnostics
            </p>
            <p>
              <strong>Chapter 12:</strong> IT Support Escalation & Helpdesk SLA
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CHAPTER 1: SYSTEM OVERVIEW & GLOBAL ARCHITECTURE
          ========================================================================= */}
      <div className="mb-6 page-break-inside-avoid">
        <div className="bg-slate-900 text-white px-3 py-1 font-black text-[9.5pt] uppercase tracking-wider mb-2">
          Chapter 1: System Overview & Global Architecture
        </div>
        <p className="mb-2">
          The RSU EOMS Cloud Portal is a centralized digital governance suite purpose-built to streamline quality
          management, institutional accreditation, operational risk mitigation, and audit readiness across all 10
          campuses of Romblon State University.
        </p>
        <table className="w-full border-collapse border border-black text-[8pt] mb-3">
          <thead>
            <tr className="bg-slate-100 font-bold uppercase text-slate-800">
              <th className="border border-black p-1.5 text-left w-[25%]">Core Portal Module</th>
              <th className="border border-black p-1.5 text-left w-[45%]">Functionality & Scope</th>
              <th className="border border-black p-1.5 text-center w-[30%]">Primary User Roles</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1.5 font-bold">Executive Cockpit</td>
              <td className="border border-black p-1.5">
                Maturity scores, task feeds, announcements, and quick compliance gauges.
              </td>
              <td className="border border-black p-1.5 text-center">All University Personnel</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 font-bold">Submission Hub</td>
              <td className="border border-black p-1.5">
                Repository and approval gate for the 6 core EOMS institutional documents.
              </td>
              <td className="border border-black p-1.5 text-center">Unit Heads, ODIMOs, Directors</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 font-bold">Digital ROR Hub</td>
              <td className="border border-black p-1.5">
                Risk and opportunity register with pre/post treatment analysis & AI assistant.
              </td>
              <td className="border border-black p-1.5 text-center">Risk Leads, Process Owners</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 font-bold">IQA & CAR System</td>
              <td className="border border-black p-1.5">
                Audit scheduling, non-conformance logging, and 8D corrective action workflows.
              </td>
              <td className="border border-black p-1.5 text-center">IQA Auditors, QAO Officers</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 font-bold">Academic Programs</td>
              <td className="border border-black p-1.5">
                CHED COPC, AACCUP levels, faculty profiles, and board exam licensure metrics.
              </td>
              <td className="border border-black p-1.5 text-center">Deans, Program Chairs, VPAA</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 font-bold">GAD Corner & SWOT</td>
              <td className="border border-black p-1.5">
                5% statutory budget tracking, HGDG checklist scoring, and 7-sector inclusion.
              </td>
              <td className="border border-black p-1.5 text-center">GAD Focal Persons, Directors</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* =========================================================================
          CHAPTER 2: USER ACCESS, SECURITY & DATA PRIVACY (RA 10173)
          ========================================================================= */}
      <div className="mb-6 page-break-inside-avoid">
        <div className="bg-slate-900 text-white px-3 py-1 font-black text-[9.5pt] uppercase tracking-wider mb-2">
          Chapter 2: User Access, Security & Data Privacy (RA 10173)
        </div>
        <div className="space-y-2 mb-3">
          <p>
            <strong>1. Account Creation & Institutional Verification:</strong>
          </p>
          <ul className="list-disc list-inside pl-2 space-y-0.5 text-slate-700">
            <li>
              Accounts must be registered using official institutional credentials (or approved university email
              addresses).
            </li>
            <li>
              New accounts enter an <em>Awaiting Verification</em> holding state. Full access is unlocked once verified
              by the Quality Assurance Office or Campus Administrator.
            </li>
            <li>
              Institutional identifiers (Campus, Unit, Role) are locked post-verification to ensure audit immutability.
            </li>
          </ul>

          <p className="mt-2">
            <strong>2. Compliance with the Data Privacy Act of 2012 (RA 10173):</strong>
          </p>
          <ul className="list-disc list-inside pl-2 space-y-0.5 text-slate-700">
            <li>
              <strong>Right to Information:</strong> Users have complete visibility over personal metadata captured
              within their profile.
            </li>
            <li>
              <strong>Right to Erasure (Account Deletion):</strong> Users may permanently delete their account via
              Profile &gt; Danger Zone after providing password re-authentication.
            </li>
            <li>
              <strong>Archival Preservation:</strong> In accordance with Philippine Commission on Audit (COA) and ISO
              audit standards, institutional submissions, evidence files, and activity logs remain preserved under an
              anonymous institutional string to prevent audit trail destruction.
            </li>
          </ul>

          <p className="mt-2">
            <strong>3. Progressive Web App (PWA) Standalone Installation:</strong>
          </p>
          <ul className="list-disc list-inside pl-2 space-y-0.5 text-slate-700">
            <li>
              <strong>Desktop (Chrome/Edge):</strong> Click the <em>Install EOMS Portal</em> icon on the right side of
              the address bar.
            </li>
            <li>
              <strong>Mobile (iOS Safari):</strong> Tap the <em>Share</em> button and select <em>Add to Home Screen</em>
              .
            </li>
            <li>
              <strong>Mobile (Android Chrome):</strong> Tap the menu (three dots) and select <em>Install app</em>.
            </li>
          </ul>
        </div>
      </div>

      {/* =========================================================================
          CHAPTER 3: ACCESSIBILITY & INCLUSIVITY (PWD SUPPORT)
          ========================================================================= */}
      <div className="mb-6 page-break-inside-avoid">
        <div className="bg-slate-900 text-white px-3 py-1 font-black text-[9.5pt] uppercase tracking-wider mb-2">
          Chapter 3: Accessibility & Inclusivity (PWD Support)
        </div>
        <p className="mb-2">
          In line with international WCAG 2.1 AA accessibility guidelines and national disability inclusion directives,
          the portal provides built-in assistive personalization tools accessible under{' '}
          <strong>User Profile &gt; Accessibility &amp; Inclusivity</strong>:
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="border border-slate-300 p-2 rounded bg-slate-50">
            <p className="font-bold text-slate-900">🔠 Dynamic Font Scaling (80% – 140%)</p>
            <p className="text-slate-600 text-[7.5pt] mt-0.5">
              Enables real-time scaling of system-wide typography for low-vision users without breaking table
              structures.
            </p>
          </div>
          <div className="border border-slate-300 p-2 rounded bg-slate-50">
            <p className="font-bold text-slate-900">🌓 High-Contrast Color Theme</p>
            <p className="text-slate-600 text-[7.5pt] mt-0.5">
              Sharpens text borders, badges, and card boundaries with high visual contrast for maximum readability.
            </p>
          </div>
          <div className="border border-slate-300 p-2 rounded bg-slate-50">
            <p className="font-bold text-slate-900">📖 OpenDyslexic Typography</p>
            <p className="text-slate-600 text-[7.5pt] mt-0.5">
              Switches interface typeface to weighted gravity fonts designed to mitigate character flipping for dyslexic
              readers.
            </p>
          </div>
          <div className="border border-slate-300 p-2 rounded bg-slate-50">
            <p className="font-bold text-slate-900">⚡ Reduced Motion & Animation</p>
            <p className="text-slate-600 text-[7.5pt] mt-0.5">
              Suppresses rapid transitions, slide-ins, and floating elements to protect users with vestibular disorders.
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CHAPTER 4: THE 6 MANDATORY EOMS COMPLIANCE DOCUMENTS
          ========================================================================= */}
      <div className="mb-6 page-break-inside-avoid">
        <div className="bg-slate-900 text-white px-3 py-1 font-black text-[9.5pt] uppercase tracking-wider mb-2">
          Chapter 4: The 6 Mandatory EOMS Compliance Documents
        </div>
        <p className="mb-2">
          All university operational units (academic, administrative, research, and production) are mandated to maintain
          annual compliance across the 6 core ISO 21001 documents:
        </p>
        <table className="w-full border-collapse border border-black text-[8pt] mb-3">
          <thead>
            <tr className="bg-slate-100 font-bold uppercase text-slate-800">
              <th className="border border-black p-1.5 text-center w-[6%]">Doc #</th>
              <th className="border border-black p-1.5 text-left w-[24%]">Document Title</th>
              <th className="border border-black p-1.5 text-left w-[40%]">Purpose & Content Description</th>
              <th className="border border-black p-1.5 text-center w-[30%]">Submission Rules</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1.5 text-center font-bold">1</td>
              <td className="border border-black p-1.5 font-bold">SWOT Analysis</td>
              <td className="border border-black p-1.5">
                Contextual assessment of Strengths, Weaknesses, Opportunities, and Threats.
              </td>
              <td className="border border-black p-1.5 text-center">Annual (1st Cycle)</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center font-bold">2</td>
              <td className="border border-black p-1.5 font-bold">Needs &amp; Expectations</td>
              <td className="border border-black p-1.5">
                Matrix of internal and external interested parties (Students, Faculty, CHED).
              </td>
              <td className="border border-black p-1.5 text-center">Annual (1st Cycle)</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center font-bold">3</td>
              <td className="border border-black p-1.5 font-bold">Operational Plan (OpPlan)</td>
              <td className="border border-black p-1.5">
                Detailed annual targets, milestone timelines, responsible leads, and budgets.
              </td>
              <td className="border border-black p-1.5 text-center">
                1st Cycle (Targets) &amp; Final (Accomplishments)
              </td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center font-bold">4</td>
              <td className="border border-black p-1.5 font-bold">Quality Objectives</td>
              <td className="border border-black p-1.5">
                Measurable institutional KPI indicators aligned with the RSU Quality Policy.
              </td>
              <td className="border border-black p-1.5 text-center">Semi-Annual Review</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center font-bold">5</td>
              <td className="border border-black p-1.5 font-bold">Risk &amp; Opportunity Register</td>
              <td className="border border-black p-1.5">
                Comprehensive register of operational vulnerabilities &amp; strategic growth points.
              </td>
              <td className="border border-black p-1.5 text-center">Mandatory Digital Encoding</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center font-bold">6</td>
              <td className="border border-black p-1.5 font-bold">Risk Action Plan (RAP)</td>
              <td className="border border-black p-1.5">
                Dedicated treatment plan for all items evaluated with Medium, High, or Critical risk.
              </td>
              <td className="border border-black p-1.5 text-center">Mandatory if Risk &gt;= 5</td>
            </tr>
          </tbody>
        </table>

        <div className="bg-slate-50 p-2.5 rounded border border-slate-300 text-[8pt] space-y-1">
          <p>
            <strong>Submission Lifecycle &amp; Version Control:</strong>
          </p>
          <p>
            • <strong>Draft Submission:</strong> For initial review by the Quality Assurance Office. Allows working
            Google Docs or PDFs without official wet/digital signatures.
          </p>
          <p>
            • <strong>Final Submission:</strong> Scanned, signed PDF with complete signatory endorsement. Automatically
            increments revision control (e.g. <code>Rev 00 &rarr; Rev 01</code>) and locks compliance status.
          </p>
        </div>
      </div>

      {/* =========================================================================
          CHAPTER 5: DIGITAL RISK & OPPORTUNITY REGISTER (ROR) PROTOCOL
          ========================================================================= */}
      <div className="mb-6 page-break-inside-avoid">
        <div className="bg-slate-900 text-white px-3 py-1 font-black text-[9.5pt] uppercase tracking-wider mb-2">
          Chapter 5: Digital Risk &amp; Opportunity Register (ROR) Protocol
        </div>
        <p className="mb-2">
          Pursuant to ISO 21001:2018 Clause 6.1, risk management is quantitatively scored using a standardized 5x5
          matrix:
        </p>
        <div className="border border-black p-2.5 bg-slate-50 mb-3 text-[8pt]">
          <p className="font-bold text-center uppercase mb-1">
            Risk Magnitude Formula: Likelihood (1-5) × Consequence (1-5) = Magnitude (1-25)
          </p>
          <div className="grid grid-cols-4 gap-2 text-center mt-2">
            <div className="p-1 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
              Low Risk (1 – 4)
              <br />
              <span className="text-[7pt] font-normal">Acceptable / Monitor</span>
            </div>
            <div className="p-1 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold">
              Medium Risk (5 – 14)
              <br />
              <span className="text-[7pt] font-normal">Action Plan Required</span>
            </div>
            <div className="p-1 rounded bg-rose-100 text-rose-900 border border-rose-300 font-bold">
              High Risk (15 – 19)
              <br />
              <span className="text-[7pt] font-normal">Priority Executive Action</span>
            </div>
            <div className="p-1 rounded bg-rose-200 text-rose-950 border border-rose-400 font-black">
              Critical Risk (20 – 25)
              <br />
              <span className="text-[7pt] font-normal">Immediate Intervention</span>
            </div>
          </div>
        </div>
        <ul className="list-disc list-inside pl-2 space-y-0.5 text-slate-700 text-[8pt]">
          <li>
            <strong>Digital Encoding Requirement:</strong> Individual risks must be encoded in the digital register
            before the unit's ROR document can be cleared.
          </li>
          <li>
            <strong>Post-Treatment Evaluation (Delta Drop):</strong> In the Final Cycle, units must record
            post-treatment magnitude and upload Form QAO-00-027 verification evidence.
          </li>
          <li>
            <strong>AI Treatment Suggestions:</strong> Users can invoke the built-in AI assistant to draft ISO-compliant
            mitigation strategies.
          </li>
        </ul>
      </div>

      {/* =========================================================================
          CHAPTER 6: INTERNAL QUALITY AUDIT (IQA) & CAR 8D WORKFLOW
          ========================================================================= */}
      <div className="mb-6 page-break-inside-avoid">
        <div className="bg-slate-900 text-white px-3 py-1 font-black text-[9.5pt] uppercase tracking-wider mb-2">
          Chapter 6: Internal Quality Audit (IQA) &amp; CAR 8D Workflow
        </div>
        <p className="mb-2">
          When an audit identifies non-conformities, the Corrective Action Request (CAR) module enforces an 8D
          problem-solving discipline:
        </p>
        <div className="grid grid-cols-2 gap-2 text-[8pt] mb-3">
          <div className="border border-slate-300 p-2 rounded bg-slate-50">
            <p className="font-bold text-slate-900">D1 – D3: Team, Description &amp; Containment</p>
            <p className="text-slate-600 text-[7.5pt] mt-0.5">
              Identify lead persons, document the specific non-conformance breach, and apply immediate containment
              within 48 hours.
            </p>
          </div>
          <div className="border border-slate-300 p-2 rounded bg-slate-50">
            <p className="font-bold text-slate-900">D4: Root Cause Analysis (5-Whys / Fishbone)</p>
            <p className="text-slate-600 text-[7.5pt] mt-0.5">
              Analyze systemic procedural failures rather than individual human error to prevent recurrent issues.
            </p>
          </div>
          <div className="border border-slate-300 p-2 rounded bg-slate-50">
            <p className="font-bold text-slate-900">D5 – D6: Permanent Corrective Actions</p>
            <p className="text-slate-600 text-[7.5pt] mt-0.5">
              Implement institutional policy adjustments, training, or software updates and log verification metrics.
            </p>
          </div>
          <div className="border border-slate-300 p-2 rounded bg-slate-50">
            <p className="font-bold text-slate-900">D7 – D8: Prevention &amp; Auditor Sign-Off</p>
            <p className="text-slate-600 text-[7.5pt] mt-0.5">
              Update unit SOP manuals, verify sustained effectiveness over 90 days, and obtain Lead Auditor sign-off.
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CHAPTER 7: FREQUENTLY ASKED QUESTIONS & TROUBLESHOOTING
          ========================================================================= */}
      <div className="mb-6 page-break-inside-avoid">
        <div className="bg-slate-900 text-white px-3 py-1 font-black text-[9.5pt] uppercase tracking-wider mb-2">
          Chapter 7: Frequently Asked Questions &amp; Technical Troubleshooting
        </div>
        <div className="space-y-2 mb-3">
          {faqs.map((faqGroup, i) => (
            <div key={i} className="border-b border-slate-200 pb-2">
              <p className="font-bold text-slate-800 text-[8.5pt] uppercase tracking-wide mb-1">{faqGroup.role}</p>
              {faqGroup.questions.map((q, j) => (
                <div key={j} className="mb-2 pl-2">
                  <p className="font-bold text-slate-900 text-[8pt]">Q: {q.question}</p>
                  <p className="text-slate-700 text-[7.5pt] mt-0.5 leading-snug">A: {q.answer}</p>
                  {q.answerBlocks && (
                    <div className="mt-1 pl-2 text-[7.5pt] text-slate-600 space-y-0.5">
                      {q.answerBlocks.map((b: any, k: number) => (
                        <p key={k} dangerouslySetInnerHTML={{ __html: b.content }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          CHAPTER 8: INSTITUTIONAL SUPPORT ESCALATION & CONTACT MATRIX
          ========================================================================= */}
      <div className="mb-6 page-break-inside-avoid">
        <div className="bg-slate-900 text-white px-3 py-1 font-black text-[9.5pt] uppercase tracking-wider mb-2">
          Chapter 8: Institutional Support Escalation &amp; Contact Matrix
        </div>
        <p className="mb-2">
          For technical assistance, workflow clearances, and document template requests, follow the established support
          tier:
        </p>
        <table className="w-full border-collapse border border-black text-[8pt] mb-4">
          <thead>
            <tr className="bg-slate-100 font-bold uppercase text-slate-800">
              <th className="border border-black p-1.5 text-center w-[15%]">Support Tier</th>
              <th className="border border-black p-1.5 text-left w-[30%]">Scope of Assistance</th>
              <th className="border border-black p-1.5 text-left w-[30%]">Designated Focal Office</th>
              <th className="border border-black p-1.5 text-center w-[25%]">Response SLA</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1.5 text-center font-bold">Tier 1</td>
              <td className="border border-black p-1.5">In-App AI Assistant &amp; Online SOP Manual</td>
              <td className="border border-black p-1.5">Automated EOMS Knowledge Desk</td>
              <td className="border border-black p-1.5 text-center font-bold text-emerald-800">Instant (24/7)</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center font-bold">Tier 2</td>
              <td className="border border-black p-1.5">Unit document clearance, template review</td>
              <td className="border border-black p-1.5">Campus QMS Focal &amp; Unit ODIMO</td>
              <td className="border border-black p-1.5 text-center font-bold">Within 24 Hours</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center font-bold">Tier 3</td>
              <td className="border border-black p-1.5">Account verification, role assignment, server</td>
              <td className="border border-black p-1.5">Quality Assurance Office (QAO) / MIS</td>
              <td className="border border-black p-1.5 text-center font-bold">Within 4 - 8 Hours</td>
            </tr>
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-black text-[8pt]">
          <div>
            <p className="font-bold uppercase text-slate-900 mb-1">Quality Assurance Office Contact:</p>
            <p>
              Email: <span className="font-mono font-bold text-primary">qao@rsu.edu.ph</span>
            </p>
            <p>Location: 2nd Floor, Administration Building, Main Campus</p>
            <p>Operating Hours: Monday – Friday, 8:00 AM – 5:00 PM</p>
          </div>
          <div>
            <p className="font-bold uppercase text-slate-900 mb-1">Management Information System (MIS):</p>
            <p>
              Email: <span className="font-mono font-bold text-primary">mis@rsu.edu.ph</span>
            </p>
            <p>Location: IT Center, Main Campus, Odiongan, Romblon</p>
            <p>Emergency Portal Support: Local Ext. 104 / 108</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          DOCUMENT CONTROL & INSTITUTIONAL SIGNATORIES
          ========================================================================= */}
      <div className="pt-4 border-t-2 border-black page-break-inside-avoid">
        <h3 className="text-[8.5pt] font-black uppercase tracking-wider mb-4 text-center text-slate-900">
          Institutional Document Approvals &amp; Quality Management Sign-Off
        </h3>
        <div className="grid grid-cols-3 gap-6 text-[8pt]">
          <div>
            <p className="font-bold text-slate-600 mb-6">Prepared by Technical Lead:</p>
            <div className="border-b border-black w-40 mb-1"></div>
            <p className="font-black uppercase">{preparedBy}</p>
            <p className="text-[7pt] text-slate-500">Quality Management System Division</p>
          </div>
          <div>
            <p className="font-bold text-slate-600 mb-6">Reviewed by Document Controller:</p>
            <div className="border-b border-black w-40 mb-1"></div>
            <p className="font-black uppercase">{reviewedBy}</p>
            <p className="text-[7pt] text-slate-500">Institutional Document Control Custodian</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-600 mb-6">Approved for University Release:</p>
            <div className="border-b border-black w-40 ml-auto mb-1"></div>
            <p className="font-black uppercase">{approvedBy}</p>
            <p className="text-[7pt] text-slate-500">Director, Quality Assurance Office</p>
          </div>
        </div>
      </div>
    </div>
  );
}
