
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DataPrivacyDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAccept: () => void;
}

export function DataPrivacyDialog({ isOpen, onOpenChange, onAccept }: DataPrivacyDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Data Privacy Statement</AlertDialogTitle>
          <AlertDialogDescription>
            Your privacy is important to us. This statement explains how we collect, use, and protect your personal data in compliance with Republic Act No. 10173, also known as the Data Privacy Act of 2012.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <ScrollArea className="h-[400px] w-full rounded-md border p-4 text-sm">
            <div className="space-y-4">
                <h3 className="font-semibold">1. Data We Collect</h3>
                <p>
                    To create and manage your account for the RSU EOMS Submission Portal, we collect the following personal information:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Full Name:</strong> To identify you within the system.</li>
                    <li><strong>RSU Email Address:</strong> For login, account verification, and official notifications.</li>
                    <li><strong>Role, Campus, and Unit:</strong> To assign appropriate permissions and access levels within the portal.</li>
                </ul>

                <h3 className="font-semibold">2. How We Use Your Data</h3>
                <p>
                    Your personal data is used exclusively for the following purposes:
                </p>
                 <ul className="list-disc pl-5 space-y-1">
                    <li>To authenticate your identity and grant you access to the portal.</li>
                    <li>To manage the EOMS documentation workflow, including submissions, reviews, and approvals.</li>
                    <li>To send notifications related to your account and submission statuses.</li>
                    <li>To ensure data integrity and enforce role-based access control.</li>
                </ul>
                <p>
                    We will not use your personal information for any other purpose without your explicit consent.
                </p>

                <h3 className="font-semibold">3. Data Protection and Security</h3>
                <p>
                    We are committed to protecting your data. We implement appropriate technical and organizational security measures to prevent unauthorized access, disclosure, alteration, or destruction of your personal information. Your data is stored securely within our Firebase project, which adheres to global data protection standards.
                </p>

                <h3 className="font-semibold">4. Your Rights as a Data Subject</h3>
                <p>
                    Under R.A. 10173, you have the following rights:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>The Right to be Informed:</strong> You have the right to know that your data is being collected and processed.</li>
                    <li><strong>The Right to Access:</strong> You can request access to the personal information we hold about you.</li>
                    <li><strong>The Right to Object:</strong> You can object to the processing of your personal data.</li>
                    <li><strong>The Right to Rectification:</strong> You can correct any inaccuracies in your personal data.</li>
                    <li><strong>The Right to Erasure or Blocking:</strong> You can request the suspension, withdrawal, or deletion of your personal data.</li>
                    <li><strong>The Right to Damages:</strong> You may be indemnified for any damages sustained due to inaccurate, incomplete, or unlawfully obtained personal data.</li>
                    <li><strong>The Right to Data Portability:</strong> You can obtain a copy of your data in a structured, commonly used, and machine-readable format.</li>
                </ul>
                <p>
                    To exercise any of these rights, please contact the RSU Data Protection Officer at <a href="mailto:dpo@rsu.edu.ph" className="text-primary underline">dpo@rsu.edu.ph</a>.
                </p>

                 <h3 className="font-semibold">5. Consent</h3>
                 <p>
                    By clicking "Understand and Accept" below and proceeding to create an account, you confirm that you have read and understood this statement and you give your consent to the collection, processing, and use of your personal data as described herein.
                </p>
            </div>
        </ScrollArea>
        
        <div className="flex justify-end">
            <AlertDialogAction onClick={onAccept}>Understand and Accept</AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
