
'use client';

/**
 * @fileOverview A dismissible overlay component that prompts for software evaluation.
 * In compliance with ISO/IEC 25010 standards.
 * Users can skip the evaluation for the current session, but it will be prompted again on logout.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MonitorCheck, ShieldCheck, ArrowRight, Activity, Landmark, Info, X } from 'lucide-react';
import { Iso25010Form } from './iso-25010-form';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export function SoftwareEvaluationGate() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);

  useEffect(() => {
    // Check if the user has already skipped the evaluation in this session
    const skipped = sessionStorage.getItem('rsu_eval_skipped_session') === 'true';
    setIsSkipped(skipped);
  }, []);

  const handleSkip = () => {
    sessionStorage.setItem('rsu_eval_skipped_session', 'true');
    setIsSkipped(true);
  };

  if (isSkipped) return null;

  if (isFormOpen) {
    return <Iso25010Form isOpen={isFormOpen} onOpenChange={setIsFormOpen} />;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/40 backdrop-blur-2xl animate-in fade-in duration-700 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[10%] left-[20%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[10%] right-[20%] w-[60%] h-[60%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <Card className="w-full max-w-xl max-h-[95vh] bg-white/95 border-primary/20 shadow-[0_0_50px_-12px_rgba(var(--primary),0.3)] animate-in zoom-in duration-500 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            <CardHeader className="bg-primary/5 border-b py-4 sm:py-6 px-6 sm:px-10 text-center relative">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-4 right-4 rounded-full" 
                    onClick={handleSkip}
                >
                    <X className="h-4 w-4" />
                </Button>
                <div className="mx-auto bg-white p-2 rounded-2xl shadow-xl border border-primary/10 w-fit mb-4">
                    <MonitorCheck className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                </div>
                <div className="space-y-1">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <Badge variant="outline" className="h-5 text-[8px] font-black tracking-widest border-primary/30 text-primary uppercase bg-white">ISO/IEC 25010:2011</Badge>
                    </div>
                    <CardTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 leading-tight">Institutional Software Audit</CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-slate-600 font-medium">
                        Quality Assurance Participation Protocol
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-4">
                <div className="space-y-4">
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed text-center font-medium">
                        In alignment with our <strong>ISO 21001:2018 Certification</strong>, all stakeholders are encouraged to evaluate the EOMS Portal.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                        {[
                            { icon: <Activity className="h-4 w-4 text-emerald-600" />, title: "Performance Efficiency", desc: "Speed and optimization." },
                            { icon: <ShieldCheck className="h-4 w-4 text-blue-600" />, title: "Functional Suitability", desc: "Operational alignment." },
                            { icon: <Landmark className="h-4 w-4 text-purple-600" />, title: "System Reliability", desc: "Uptime and integrity." },
                            { icon: <Info className="h-4 w-4 text-amber-600" />, title: "Security Maturity", desc: "Data protection." }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-3 p-2 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-primary/20 transition-all">
                                <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm">{item.icon}</div>
                                <div className="space-y-0.5">
                                    <h4 className="text-[9px] sm:text-[10px] font-black uppercase text-slate-800">{item.title}</h4>
                                    <p className="text-[8px] text-muted-foreground font-medium">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-4">
                    <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-blue-900 tracking-tight">Flexible Participation</p>
                        <p className="text-[9px] text-blue-800/80 leading-relaxed italic font-medium">
                            You may skip this for now to continue your work. You will be prompted again during logout to fulfill this quality requirement.
                        </p>
                    </div>
                </div>
            </CardContent>
          </ScrollArea>
          <CardFooter className="bg-slate-50 border-t py-4 px-6 sm:px-10 shrink-0 gap-3">
              <Button 
                  variant="outline"
                  size="lg" 
                  className="flex-1 h-12 sm:h-14 text-sm font-black uppercase tracking-widest border-slate-200" 
                  onClick={handleSkip}
              >
                  Skip for Now
              </Button>
              <Button 
                  size="lg" 
                  className="flex-[2] h-12 sm:h-14 text-sm sm:text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/30 group transition-all hover:scale-[1.02] active:scale-95" 
                  onClick={() => setIsFormOpen(true)}
              >
                  <ShieldCheck className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                  Evaluate Now
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
          </CardFooter>
      </Card>
    </div>
  );
}
