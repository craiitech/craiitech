'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Lock, Eye, UserCheck, Scale } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <Card className="shadow-lg border-primary/10">
      <CardHeader className="bg-primary/5 border-b">
        <CardTitle className="text-3xl font-black uppercase tracking-tight">Data Privacy Statement</CardTitle>
        <CardDescription className="font-bold text-slate-700">
          In Compliance with Republic Act No. 10173 (Data Privacy Act of 2012)
        </CardDescription>
      </CardHeader>
      <CardContent className="prose prose-sm max-w-none text-muted-foreground space-y-8 pt-8">
        <p className="leading-relaxed">
          Romblon State University (RSU) is committed to protecting the privacy and security of your personal data. This statement explains how the EOMS Portal collects and manages information from authorized institutional users.
        </p>

        <section className="space-y-4">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 border-b pb-2 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" /> 1. Information Collection
          </h3>
          <p>We collect and process the following personal data necessary for institutional identification and access control:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Identity Data:</strong> Full Name, RSU Email Address, and Employee ID.</li>
            <li><strong>Institutional Data:</strong> Assigned Role, Campus Site, and Academic/Administrative Unit.</li>
            <li><strong>Accessibility Preferences:</strong> Settings for visual assistance (Font Scale, High Contrast) are stored locally to your profile.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 border-b pb-2 flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" /> 2. Purpose of Processing
          </h3>
          <p>Your data is utilized strictly for the following purposes:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>To verify your authority to submit or approve official EOMS documentation.</li>
            <li>To maintain a permanent **System Audit Trail** of all quality management activities.</li>
            <li>To generate sex-disaggregated analytics for Gender and Development (GAD) reporting.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 border-b pb-2 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> 3. Data Protection
          </h3>
          <p>
            The RSU EOMS Portal employs enterprise-grade security via Firebase infrastructure. Access is restricted through a strictly defined hierarchy, and all data transmissions are encrypted.
          </p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 border-b pb-2 flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" /> 4. User Rights
          </h3>
          <p>
            As a data subject, you retain the right to access, correct, or request the deletion of your account through the RSU Data Protection Officer.
          </p>
        </section>

        <div className="pt-8 mt-8 border-t text-[10px] uppercase font-bold text-center">
            Last Updated: February 2025 • Issued by RSU Quality Assurance Office
        </div>
      </CardContent>
    </Card>
  );
}
