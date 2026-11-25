'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Lock, Eye, Scale, Globe, Clock, Database } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <Card className="shadow-lg border-primary/10">
      <CardHeader className="bg-primary/5 border-b">
        <CardTitle className="text-3xl font-black uppercase tracking-tight">Data Privacy Statement</CardTitle>
        <CardDescription className="font-bold text-slate-700 dark:text-slate-300">
          In Compliance with Republic Act No. 10173 (Data Privacy Act of 2012) &bull; RSU EOMS / UAQA Portal
        </CardDescription>
      </CardHeader>
      <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-8 pt-8">
        <p className="leading-relaxed">
          Romblon State University (RSU), through the <strong>RSU EOMS Portal (UAQA Portal)</strong>, is committed to
          protecting the privacy and security of your personal data in accordance with Republic Act No. 10173 (Data
          Privacy Act of 2012), its Implementing Rules and Regulations (IRR), and National Privacy Commission (NPC)
          issuances. This statement explains what personal data we collect, why we process it, how it is protected and
          stored, and how you can exercise your rights as a data subject.
        </p>

        <section className="space-y-4">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 border-b pb-2 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" /> 1. Information We Collect
          </h3>
          <p>Depending on your role and how you interact with the portal, we collect and process:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Account &amp; Identity Data:</strong> Full Name, RSU Email Address, Assigned Role, Campus Site,
              Academic/Administrative Unit, and optional Google Drive portfolio links.
            </li>
            <li>
              <strong>Demographic &amp; GAD Sectoral Data (Sensitive Personal Information):</strong> Sex identification
              (for Gender and Development Sex-Disaggregated Data), Age Group and Client Type (for ARTA Client
              Satisfaction Measurement), and sectoral classifications (e.g., Solo Parent, PWD, Senior Citizen,
              Youth/Student, Employee, LGBTQA++, Indigenous People) where applicable. Student CHED enrollment and
              graduation figures are processed in aggregated form.
            </li>
            <li>
              <strong>Visitor, Attendance &amp; Activity Logs:</strong> Visitor name, sex, purpose of visit, and office
              visited; unit activity QR/OTP attendance logs, evaluation ratings, and a browser/device fingerprint used
              to prevent duplicate or unauthorized attendance check-ins; daily/WFH accomplishment logs; and FIAMO repair
              request records.
            </li>
            <li>
              <strong>Local &amp; Offline Storage:</strong> Accessibility preferences (Font Scale, High Contrast, Theme)
              and temporary offline queues for visitor logs, CSM responses, and signed attendance logs are stored
              locally in your browser&apos;s <code>localStorage</code> until synchronized.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 border-b pb-2 flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" /> 2. Purpose &amp; Lawful Basis of Processing
          </h3>
          <p>
            Your personal data is processed under RA 10173 Sec. 12 and Sec. 13 (institutional mandate, legal obligation,
            employment/contractual necessity, and explicit consent) strictly for:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Authenticating authorized personnel and enforcing Role-Based Access Control (RBAC).</li>
            <li>
              Managing ISO 21001:2018 EOMS workflows, Quality Audits (IQA/EQA), Risk Registries, CHED Program
              Monitoring, and FIAMO facilities maintenance.
            </li>
            <li>
              Maintaining a permanent <strong>System Audit Trail</strong> of quality management and administrative
              actions.
            </li>
            <li>
              Generating mandated Sex-Disaggregated Data (SDD) for GAD reporting (RA 9710) and ARTA Client Satisfaction
              Measurement (RA 11032).
            </li>
            <li>
              Providing optional <strong>on-device AI assistance (WebLLM)</strong> for dashboard commentary, which
              executes locally in your browser without transmitting personal data to external AI servers.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 border-b pb-2 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> 3. Third-Party Processors &amp; Cross-Border Cloud Storage
          </h3>
          <p>
            To deliver secure cloud functionality, the portal utilizes vetted cloud infrastructure and service
            processors, some of which store or process data on servers outside the Philippines (e.g., Singapore{' '}
            <code>asia-southeast1</code> or global/US cloud regions):
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Google Firebase &amp; Google Cloud:</strong> Firebase Authentication, Cloud Firestore, Firebase
              App Hosting, and Cloud Functions (<code>asia-southeast1</code>).
            </li>
            <li>
              <strong>Google Drive &amp; Google Apps Script:</strong> Institutional document storage and link
              accessibility validation.
            </li>
            <li>
              <strong>Upstash Redis:</strong> Serverless rate limiting for API endpoints to prevent abuse.
            </li>
            <li>
              <strong>Local In-Browser AI (WebLLM):</strong> Runs entirely on your local device via WebGPU/browser cache
              after downloading open-weight model files; no user data is sent to external AI APIs.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 border-b pb-2 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> 4. Data Protection &amp; Cryptographic Standards
          </h3>
          <p>
            UAQA Portal employs multi-layer enterprise security standards to protect the confidentiality, integrity, and
            availability of institutional records:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>At-Rest Cloud Storage Encryption (AES-256):</strong> All documents and Firestore database entries
              are encrypted at rest using Google Cloud AES-256 encryption.
            </li>
            <li>
              <strong>In-Transit Network Security (TLS):</strong> All web and API communications are encrypted in
              transit via HTTPS/TLS, alongside hardened HTTP security headers (<code>X-Frame-Options</code>,{' '}
              <code>X-Content-Type-Options</code>, <code>Referrer-Policy</code>, and <code>Permissions-Policy</code>).
            </li>
            <li>
              <strong>Cryptographic Tamper Verification (HMAC-SHA-256):</strong> QR code attendance check-ins, dynamic
              OTP codes, and offline attendance logs are signed with Web Crypto API HMAC-SHA-256 signatures to detect
              unauthorized alteration.
            </li>
            <li>
              <strong>Credential Security (Salted scrypt):</strong> User authentication credentials are managed by
              Firebase Authentication using salted scrypt hashing.
            </li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 border-b pb-2 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> 5. Data Retention &amp; Disposal
          </h3>
          <p>
            Personal data is retained only for as long as necessary to fulfill its declared institutional, audit, and
            statutory purposes in accordance with the University&apos;s Records Disposition Schedule (RDS) and National
            Archives of the Philippines (NAP) guidelines (e.g., minimum 2-year retention for operational/FIAMO audit
            logs). Offline browser caches are cleared upon synchronization, and records past their retention period are
            subject to secure deletion or anonymization.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 border-b pb-2 flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" /> 6. Your Rights as a Data Subject
          </h3>
          <p>
            Under RA 10173 (Sections 16–18), you have the right to be informed, access, object, rectify, erase or block,
            claim damages, and request data portability. To exercise these rights or report a suspected privacy
            incident, contact the <strong>RSU Data Protection Officer</strong> at{' '}
            <a href="mailto:dpo@rsu.edu.ph" className="text-primary underline font-semibold">
              dpo@rsu.edu.ph
            </a>
            .
          </p>
        </section>

        <div className="pt-8 mt-8 border-t text-[10px] uppercase font-bold text-center">
          Last Updated: November 2026 &bull; Issued by RSU Quality Assurance Office &amp; Data Protection Office
        </div>
      </CardContent>
    </Card>
  );
}
