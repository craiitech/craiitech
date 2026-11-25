'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { useState, useRef, useEffect } from 'react';

interface DataPrivacyDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAccept: () => void;
}

export function DataPrivacyDialog({ isOpen, onOpenChange, onAccept }: DataPrivacyDialogProps) {
  const router = useRouter();

  const handleDecline = () => {
    onOpenChange(false);
    router.push('/');
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Data Privacy Statement</AlertDialogTitle>
          <AlertDialogDescription>
            Your privacy is important to us. This statement explains how we collect, use, and protect your personal data
            in compliance with Republic Act No. 10173, also known as the Data Privacy Act of 2012.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="h-[400px] w-full rounded-md border">
          <div className="p-4 text-sm space-y-4">
            <h3 className="font-semibold">1. Data We Collect</h3>
            <p>
              To create and manage your account for the RSU EOMS Submission Portal (UAQA Portal), we collect the
              following personal and sensitive personal information:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Full Name &amp; RSU Email Address:</strong> To identify you, authenticate your account, and send
                official notifications.
              </li>
              <li>
                <strong>Role, Campus, and Unit:</strong> To assign appropriate Role-Based Access Control (RBAC)
                permissions and organizational scope.
              </li>
              <li>
                <strong>Sex Identification (GAD Standard):</strong> Used for mandated Gender and Development (GAD)
                Sex-Disaggregated Data reporting under RA 9710.
              </li>
              <li>
                <strong>Activity, Attendance &amp; Device Binding Data:</strong> When using attendance or WFH/daily
                activity modules, the system records timestamps, activity logs, and a device fingerprint to prevent
                duplicate check-ins.
              </li>
            </ul>

            <h3 className="font-semibold">2. How We Use Your Data &amp; Third-Party Processors</h3>
            <p>Your personal data is used exclusively for institutional quality assurance and governance:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>To authenticate your identity, enforce RBAC, and maintain a permanent system audit trail.</li>
              <li>To manage EOMS submissions, audits, risks, CHED/GAD reporting, and FIAMO repair workflows.</li>
              <li>
                <strong>Cloud &amp; Cross-Border Processing:</strong> Data is hosted on Google Cloud / Firebase
                (including Cloud Functions in <code>asia-southeast1</code> Singapore), Google Drive / Apps Script, and
                Upstash Redis (rate limiting). Optional AI summaries run locally in your browser via WebLLM.
              </li>
            </ul>
            <p>
              We will not use your personal information for any other purpose without your explicit consent or legal
              mandate.
            </p>

            <h3 className="font-semibold">3. Data Protection, Retention &amp; Cryptographic Security</h3>
            <p>We protect your data through multi-tier institutional safeguards:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>At-Rest &amp; In-Transit Encryption:</strong> Database records and Google Drive documents are
                encrypted at rest (AES-256) and transmitted over HTTPS/TLS.
              </li>
              <li>
                <strong>Digital Verification:</strong> QR attendance codes and offline logs are signed via HMAC-SHA-256
                to detect tampering.
              </li>
              <li>
                <strong>Credential Protection:</strong> Firebase Authentication protects credentials using salted scrypt
                key derivation.
              </li>
              <li>
                <strong>Retention:</strong> Records are retained only as long as necessary per University Records
                Disposition Schedules (RDS) and NAP guidelines.
              </li>
            </ul>

            <h3 className="font-semibold">4. Your Rights as a Data Subject</h3>
            <p>Under R.A. 10173, you have the following rights:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>The Right to be Informed:</strong> You have the right to know that your data is being collected
                and processed.
              </li>
              <li>
                <strong>The Right to Access:</strong> You can request access to the personal information we hold about
                you.
              </li>
              <li>
                <strong>The Right to Object:</strong> You can object to the processing of your personal data.
              </li>
              <li>
                <strong>The Right to Rectification:</strong> You can correct any inaccuracies in your personal data.
              </li>
              <li>
                <strong>The Right to Erasure or Blocking:</strong> You can request the suspension, withdrawal, or
                deletion of your personal data.
              </li>
              <li>
                <strong>The Right to Damages:</strong> You may be indemnified for any damages sustained due to
                inaccurate, incomplete, or unlawfully obtained personal data.
              </li>
              <li>
                <strong>The Right to Data Portability:</strong> You can obtain a copy of your data in a structured,
                commonly used, and machine-readable format.
              </li>
            </ul>
            <p>
              To exercise any of these rights, please contact the RSU Data Protection Officer at{' '}
              <a href="mailto:dpo@rsu.edu.ph" className="text-primary underline">
                dpo@rsu.edu.ph
              </a>
              .
            </p>

            <h3 className="font-semibold">5. Consent</h3>
            <p>
              By clicking "Understand and Accept" below and proceeding to create an account, you confirm that you have
              read and understood this statement and you give your consent to the collection, processing, and use of
              your personal data as described herein.
            </p>
          </div>
          <ScrollBar />
        </ScrollArea>

        <AlertDialogFooter>
          <Button variant="destructive" onClick={handleDecline}>
            I do not agree
          </Button>
          <AlertDialogAction onClick={onAccept}>Understand and Accept</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
