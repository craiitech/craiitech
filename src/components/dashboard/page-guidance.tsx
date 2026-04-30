'use client';

/**
 * @fileOverview A responsive guidance column that provides contextual help for dashboard pages.
 * Enhanced: Sticky layout and internal scroll area for one-page persistent guidance.
 */

import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { helpContent } from '@/lib/contextual-help-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
    Info, 
    ListChecks, 
    MousePointer2, 
    Sparkles, 
    HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageGuidanceProps {
  className?: string;
}

export function PageGuidance({ className }: PageGuidanceProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab');

  // Find help content based on current path and active tab
  const help = useMemo(() => {
    // 1. Precise Match: Path + Tab
    if (activeTab) {
        const pathWithTab = `${pathname}?tab=${activeTab}`;
        if (helpContent[pathWithTab]) return helpContent[pathWithTab];
    }

    // 2. Base Path Match
    if (helpContent[pathname]) return helpContent[pathname];
    
    // 3. Dynamic Route Fallback
    const segments = pathname.split('/');
    const parentPath = `/${segments[1]}`;
    if (helpContent[parentPath]) return helpContent[parentPath];

    return null;
  }, [pathname, activeTab]);

  if (!help) return null;

  return (
    <div className={cn(
      "w-full lg:w-80 shrink-0", 
      "lg:sticky lg:top-0 lg:h-full", // Sticky relative to its scroll container in layout.tsx
      className
    )}>
      <Card className="h-full border-primary/20 shadow-xl bg-white/70 backdrop-blur-md flex flex-col overflow-hidden">
        <CardHeader className="bg-primary/5 border-b py-4 px-6 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Info className="h-4 w-4" />
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em]">Operational Guide</CardTitle>
            </div>
            <Badge variant="outline" className="h-4 text-[7px] font-black bg-white border-primary/20 text-primary uppercase tracking-tighter">RSU EOMS ASSIST</Badge>
          </div>
          <div className="pt-3">
              <h3 className="text-sm font-black uppercase text-slate-800 leading-tight">{help.title}</h3>
              <p className="text-[10px] text-muted-foreground font-medium leading-relaxed mt-1 italic">{help.description}</p>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full overscroll-contain">
            <div className="p-6 space-y-8 pb-12">
                
                {/* STEP BY STEP WORKFLOW */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-1">
                        <ListChecks className="h-3.5 w-3.5 text-primary" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step-by-Step Procedure</h4>
                    </div>
                    <div className="space-y-5">
                        {help.steps.map((step, idx) => (
                            <div key={idx} className="flex gap-4 items-start group">
                                <div className="flex flex-col items-center shrink-0">
                                    <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                        {idx + 1}
                                    </div>
                                    {idx < help.steps.length - 1 && <div className="w-0.5 h-full bg-slate-100 my-1" />}
                                </div>
                                <div className="space-y-1 pb-1 flex-1">
                                    <p className="text-[11px] font-black uppercase text-slate-800 tracking-tight leading-tight">{step.title}</p>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium italic">"{step.desc}"</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <Separator />

                {/* BUTTON DEFINITIONS */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-1">
                        <MousePointer2 className="h-3.5 w-3.5 text-primary" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Control Legend</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {help.buttons.map((btn, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg border bg-white shadow-sm flex items-start gap-3 group hover:border-primary/30 transition-all">
                                <Badge variant="secondary" className="h-5 px-1.5 text-[8px] font-black uppercase border-none bg-primary/5 text-primary shrink-0 mt-0.5">
                                    {btn.labelShort || btn.label}
                                </Badge>
                                <div className="space-y-0.5 min-w-0">
                                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-tighter truncate">{btn.label}</p>
                                    <p className="text-[9px] text-muted-foreground leading-tight">{btn.action}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {help.nextStep && (
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3 shadow-inner">
                        <Sparkles className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase text-blue-800 tracking-widest">Recommended Next Step</p>
                            <p className="text-[10px] text-blue-700 leading-relaxed font-bold italic">
                                "{help.nextStep}"
                            </p>
                        </div>
                    </div>
                )}
            </div>
          </ScrollArea>
        </CardContent>
        
        <CardFooter className="bg-muted/10 border-t py-3 px-6 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2 text-muted-foreground">
                <HelpCircle className="h-3 w-3" />
                <span className="text-[8px] font-bold uppercase tracking-tighter">Quality Assist v2.5</span>
            </div>
            <Button variant="link" className="p-0 h-auto text-[8px] font-black uppercase text-primary hover:no-underline" asChild>
                <Link href="/help/manual">Open full manual</Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
