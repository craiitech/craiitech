
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MonitorCheck, ShieldCheck, Home } from 'lucide-react';
import { Iso25010Form } from '@/components/evaluation/iso-25010-form';
import Image from 'next/image';
import Link from 'next/link';

/**
 * PUBLIC STAKEHOLDER EVALUATION PAGE
 * Accessible at /evaluate
 * This page is intended for public stakeholders to perform audits without logging in.
 */
export default function PublicSoftwareEvaluationPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* RSU Branded Background */}
      <div className="fixed inset-0 -z-10 h-full w-full">
          <Image
              src="/rsupage.png"
              alt="RSU Background"
              fill
              priority
              className="object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-[4px]" />
      </div>

      <Card className="w-full max-w-2xl bg-white/95 backdrop-blur shadow-2xl border-none animate-in fade-in zoom-in duration-500">
          <CardHeader className="text-center pb-8 border-b">
              <div className="mx-auto bg-primary/10 h-20 w-20 rounded-full flex items-center justify-center mb-6">
                  <MonitorCheck className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-3xl font-black tracking-tight text-slate-900">Software Quality Audit</CardTitle>
              <CardDescription className="text-base text-slate-600">
                  ISO/IEC 25010 Quality Model Assessment for RSU EOMS Portal.
              </CardDescription>
          </CardHeader>
          <CardContent className="pt-8 space-y-6 text-center">
              <div className="space-y-2">
                  <h3 className="font-bold text-lg text-slate-800">Stakeholder Participation</h3>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                      Your evaluation helps us measure the system's maturity across Functional Suitability, Usability, Security, and other key characteristics.
                  </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4">
                  {['Usability', 'Security', 'Reliability', 'Performance'].map(tag => (
                      <div key={tag} className="px-3 py-1.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-slate-200">
                          {tag}
                      </div>
                  ))}
              </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-10 pt-4">
              <Button 
                  size="lg" 
                  className="w-full h-14 text-lg font-black shadow-xl shadow-primary/20" 
                  onClick={() => setIsFormOpen(true)}
              >
                  <ShieldCheck className="mr-2 h-6 w-6" />
                  Start Quality Evaluation
              </Button>
              <Button variant="ghost" asChild className="text-slate-400 hover:text-slate-900">
                  <Link href="/">
                      <Home className="mr-2 h-4 w-4" /> Back to Home
                  </Link>
              </Button>
          </CardFooter>
      </Card>

      <Iso25010Form isOpen={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
}
