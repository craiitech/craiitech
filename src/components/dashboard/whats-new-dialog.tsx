
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
    Zap, 
    Accessibility, 
    BarChart3, 
    Activity, 
    CheckCircle2, 
    ShieldCheck,
    Sparkles,
    ChevronRight
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface WhatsNewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledge: () => void;
}

const updates = [
    {
        title: "Automated Strategic SWOT",
        desc: "The system now automatically derives institutional Strengths and Weaknesses based on your verified evidence, CHED compliance, and audit findings.",
        icon: <Zap className="h-5 w-5 text-amber-500" />,
        tag: "SYSTEM INTELLIGENCE"
    },
    {
        title: "Advanced PWD Accessibility",
        desc: "Enhanced inclusivity features including Font Size Scaling (80% - 140%), High Contrast mode, and Dyslexic-friendly layouts accessible via your Profile.",
        icon: <Accessibility className="h-5 w-5 text-primary" />,
        tag: "INCLUSIVITY"
    },
    {
        title: "Term-Specific Enrollment",
        desc: "Disaggregated student statistics with separate visualizations for 1st Semester, 2nd Semester, and Summer terms for better GAD reporting.",
        icon: <BarChart3 className="h-5 w-5 text-emerald-600" />,
        tag: "ANALYTICS"
    },
    {
        title: "Optimized Layout & Navigation",
        desc: "A compact, scrollable dashboard grid with Single-Collapse accordions for a cleaner data-dense experience on all screen sizes.",
        icon: <ShieldCheck className="h-5 w-5 text-indigo-600" />,
        tag: "USER INTERFACE"
    }
];

export function WhatsNewDialog({ isOpen, onOpenChange, onAcknowledge }: WhatsNewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-gradient-to-br from-primary to-indigo-900 text-white shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Platform Evolution</span>
          </div>
          <DialogTitle className="text-3xl font-black tracking-tight">What's New in RSU EOMS</DialogTitle>
          <DialogDescription className="text-white/70 text-sm font-medium mt-2 leading-relaxed">
            We've upgraded the portal with new strategic tools and accessibility features to better support our institutional quality assurance mission.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 bg-white overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
                <div className="p-8 space-y-8 pb-12">
                    {updates.map((update, idx) => (
                        <div key={idx} className="flex gap-6 group">
                            <div className="h-12 w-12 rounded-2xl bg-muted/50 border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                                {update.icon}
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <h4 className="font-black text-slate-900 uppercase tracking-tight">{update.title}</h4>
                                    <Badge variant="outline" className="text-[8px] font-black tracking-tighter border-primary/20 text-primary h-4">{update.tag}</Badge>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">{update.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>

        <DialogFooter className="p-6 border-t bg-slate-50 shrink-0">
            <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    <Activity className="h-3 w-3" />
                    v2.5.0 Release Candidate
                </div>
                <Button 
                    onClick={onAcknowledge}
                    className="h-11 px-8 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                    Acknowledge Updates
                    <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
