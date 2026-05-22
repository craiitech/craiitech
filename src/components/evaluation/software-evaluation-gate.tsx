
'use client';

/**
 * @fileOverview A blocking overlay component that mandates a software evaluation.
 * In compliance with ISO/IEC 25010 standards, this gate ensures all users provide feedback.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MonitorCheck, ShieldCheck, ArrowRight, Activity, Landmark, Info } from 'lucide-react';
import { Iso25010Form } from './iso-25010-form';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export function SoftwareEvaluationGate() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-2xl animate-in fade-in duration-700">
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[10%] left-[20%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[10%] right-[20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <Card className="w-full max-w-2xl bg-white/95 border-primary/20 shadow-[0_0_50px_-12px_rgba(var(--primary),0.3)] animate-in zoom-in duration-500 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-10 px-10 text-center">
              <div className="mx-auto bg-white p-4 rounded-3xl shadow-xl border border-primary/10 w-fit mb-6">
                  <MonitorCheck className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 mb-1">
                      <Badge variant="outline" className="h-5 text-[9px] font-black tracking-widest border-primary/30 text-primary uppercase bg-white">ISO/IEC 25010:2011</Badge>
                  </div>
                  <CardTitle className="text-3xl font-black uppercase tracking-tight text-slate-900 leading-tight">Institutional Software Audit</CardTitle>
                  <CardDescription className="text-base text-slate-600 font-medium">
                      Mandatory Quality Assurance Participation Protocol
                  </CardDescription>
              </div>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
              <div className="space-y-4">
                  <p className="text-sm text-slate-700 leading-relaxed text-center font-medium">
                      In alignment with the university's commitment to continuous improvement and our <strong>ISO 21001:2018 Certification</strong>, all registered stakeholders are required to conduct a formal evaluation of the EOMS Portal software.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                      {[
                          { icon: <Activity className="h-4 w-4 text-emerald-600" />, title: "Performance Efficiency", desc: "Speed and resource optimization." },
                          { icon: <ShieldCheck className="h-4 w-4 text-blue-600" />, title: "Functional Suitability", desc: "Meeting your operational needs." },
                          { icon: <Landmark className="h-4 w-4 text-purple-600" />, title: "System Reliability", desc: "Uptime and data integrity." },
                          { icon: <Info className="h-4 w-4 text-amber-600" />, title: "Security Maturity", desc: "Data protection standards." }
                      ].map((item, i) => (
                          <div key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-primary/20 transition-all">
                              <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">{item.icon}</div>
                              <div className="space-y-0.5">
                                  <h4 className="text-[10px] font-black uppercase text-slate-800">{item.title}</h4>
                                  <p className="text-[9px] text-muted-foreground font-medium">{item.desc}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-4">
                  <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-blue-900 tracking-tight">Oversight Lock Active</p>
                      <p className="text-[11px] text-blue-800/80 leading-relaxed italic font-medium">
                          Your access to EOMS modules (Submissions, Risks, and Monitoring) is temporarily restricted. Complete the evaluation instrument below to automatically restore full portal functionality.
                      </p>
                  </div>
              </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t py-8 px-10">
              <Button 
                  size="lg" 
                  className="w-full h-16 text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/30 group transition-all hover:scale-[1.02] active:scale-95" 
                  onClick={() => setIsFormOpen(true)}
              >
                  <ShieldCheck className="mr-2 h-6 w-6" />
                  Start Software Audit
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
          </CardFooter>
      </Card>

      <Iso25010Form isOpen={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  );
}
