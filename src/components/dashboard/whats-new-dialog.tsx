
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
    ChevronRight,
    Globe,
    QrCode,
    SlidersHorizontal,
    MessageSquareText
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
        title: "Online CSM Evaluation",
        desc: "Clients can now submit CSM feedback online without logging in or out. Each unit gets a unique shareable link and QR code accessible from the Visitor Logbook Hub dialog — perfect for email and social media distribution.",
        icon: <Globe className="h-5 w-5 text-sky-500" />,
        tag: "CSM"
    },
    {
        title: "Admin CSM QR Management",
        desc: "Admins and IPDO can generate QR codes and CSM links for all units from the new 'CSM QR Codes' tab under Reports. Includes search, campus filter, and A-Z sorting for easy navigation.",
        icon: <QrCode className="h-5 w-5 text-emerald-600" />,
        tag: "ADMIN"
    },
    {
        title: "Per-Unit Service Configuration",
        desc: "Configure the service offerings for each unit directly from the CSM QR Codes tab. Add or remove services so that online clients see the correct options in their CSM survey dropdown.",
        icon: <SlidersHorizontal className="h-5 w-5 text-indigo-600" />,
        tag: "CONFIGURATION"
    },
    {
        title: "CSM Message Templates",
        desc: "Copy a complete pre-formatted message with the CSM link and instructions for clients. Available in the Visitor Logbook Hub — paste directly into email or social media.",
        icon: <MessageSquareText className="h-5 w-5 text-amber-500" />,
        tag: "COMMUNICATION"
    },
    {
        title: "Communication",
        desc: "Stay connected with institutional announcements, QAO advisories, and direct messaging through the new Communication hub. Receive important updates and collaborate efficiently across units.",
        icon: <MessageSquareText className="h-5 w-5 text-sky-500" />,
        tag: "COLLABORATION"
    },
    {
        title: "Visitor Logbook",
        desc: "Digitized visitor registration with QR code sign-in and automated time tracking. Supports mobile and kiosk modes for seamless visitor management across all units.",
        icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />,
        tag: "SERVICE"
    },
    {
        title: "CSM Based on ARTA",
        desc: "Client Satisfaction Measurement aligned with ARTA standards. Collect CC1-CC3 and SQD0-SQD8 feedback through kiosk, mobile, or online channels with bilingual EN/FIL support.",
        icon: <Globe className="h-5 w-5 text-amber-500" />,
        tag: "COMPLIANCE"
    },
    {
        title: "Unit Activity QR Attendance & Evaluation",
        desc: "Track attendance and conduct evaluations using QR codes for unit activities, seminars, and events. Scan codes for quick check-in and real-time participation monitoring.",
        icon: <QrCode className="h-5 w-5 text-indigo-600" />,
        tag: "MONITORING"
    },
    {
        title: "RSU EOMS Mobile Application",
        desc: "Access the EOMS portal on the go with the new Android mobile app. Available for download from the /get-app page. Includes visitor logbook, CSM surveys, and activity monitoring.",
        icon: <Zap className="h-5 w-5 text-primary" />,
        tag: "MOBILE"
    }
];

export function WhatsNewDialog({ isOpen, onOpenChange, onAcknowledge }: WhatsNewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80dvh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-gradient-to-br from-primary to-indigo-900 text-white shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Platform Evolution</span>
          </div>
          <DialogTitle className="text-3xl font-black tracking-tight">What's New in RSU EOMS</DialogTitle>
          <DialogDescription className="text-white/70 text-sm font-medium mt-2 leading-relaxed">
            New CSM online evaluation tools — generate unit-specific QR codes and shareable links, manage client feedback services, and send pre-formatted evaluation messages to online clients.
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
                    v2.6.0 Release Candidate
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
