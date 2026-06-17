'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { AttendanceActivity } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Loader2, 
  Printer, 
  QrCode, 
  ArrowLeft, 
  Tv, 
  CheckCircle,
  HelpCircle,
  Maximize2
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

function KioskContent() {
  const searchParams = useSearchParams();
  const firestore = useFirestore();

  const activityId = searchParams.get('activityId');
  const [activity, setActivity] = useState<AttendanceActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    handleFullscreenChange();

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const enterFullscreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if ((element as any).webkitRequestFullscreen) {
      (element as any).webkitRequestFullscreen();
    } else if ((element as any).msRequestFullscreen) {
      (element as any).msRequestFullscreen();
    }
  };

  useEffect(() => {
    async function fetchActivity() {
      if (!firestore || !activityId) {
        setIsLoading(false);
        return;
      }
      try {
        const docRef = doc(firestore, 'unitActivities', activityId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setActivity({ id: docSnap.id, ...docSnap.data() } as AttendanceActivity);
        }
      } catch (err) {
        console.error('Error fetching activity details:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchActivity();
    
    // Poll for strategy changes every 10 seconds in case they regenerate PIN
    const timer = setInterval(fetchActivity, 10000);
    return () => clearInterval(timer);
  }, [firestore, activityId]);

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    window.close();
    setTimeout(() => {
      window.location.href = '/unit-activity';
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
        <Loader2 className="h-12 w-12 text-[#D4AF37] animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Booting Evaluation Kiosk...</p>
      </div>
    );
  }

  if (!activityId || !activity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6">
        <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-3xl text-center max-w-md space-y-4">
          <HelpCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h3 className="text-lg font-black uppercase tracking-tight text-slate-100">Kiosk Reference Missing</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            No active activity ID was provided in the URL query parameters. Please launch the kiosk screen directly from your Registered Activities list.
          </p>
          <Button onClick={handleClose} className="w-full mt-4">
            Back to Activities
          </Button>
        </div>
      </div>
    );
  }

  const evalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/unit-activity/evaluate?activityId=${activity.id}`
    : '';
  const qrCodeUrl = evalUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=450x450&ecc=H&data=${encodeURIComponent(evalUrl)}`
    : '';

  const strategy = activity.evaluationStrategy;
  const isPinRequired = strategy?.requirePin === true;
  const activePin = strategy?.pinCode || 'N/A';

  return (
    <div className="relative min-h-screen bg-slate-950 text-white overflow-hidden flex flex-col justify-between p-6 sm:p-12 font-sans selection:bg-[#D4AF37]/30">
      
      {/* Dynamic Animated Ambient Background Glows */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-500/5 blur-[120px] animate-pulse pointer-events-none" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#D4AF37]/5 blur-[120px] animate-pulse pointer-events-none" style={{ animationDuration: '12s' }} />

      {/* CSS Styles for animations and print rendering */}
      <style jsx global>{`
        @keyframes scanSweep {
          0%, 100% { transform: translateY(-130px); opacity: 0.1; }
          50% { transform: translateY(130px); opacity: 0.8; }
        }
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            border: 2px solid #ccc !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            margin: 0 auto !important;
            padding: 20px !important;
            max-width: 600px !important;
          }
          .print-qr {
            border: 1px solid #000 !important;
            padding: 10px !important;
          }
          .print-title {
            color: black !important;
            font-size: 24px !important;
            font-weight: 900 !important;
            text-align: center !important;
          }
          .print-instructions {
            color: #444 !important;
            font-size: 14px !important;
            text-align: center !important;
          }
          .print-pin {
            color: black !important;
            border: 2px dashed black !important;
            font-size: 28px !important;
            padding: 10px !important;
            background: #eee !important;
          }
          .print-qr img {
            opacity: 100 !important;
            filter: none !important;
            display: block !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Header bar */}
      <header className="relative z-10 flex items-center justify-between no-print border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <img src="/rsulogo.png" alt="RSU Logo" className="h-12 w-12 object-contain" />
          <div>
            <h1 className="text-sm font-black tracking-tight text-white uppercase flex items-center gap-1.5">
              <Tv className="h-4 w-4 text-[#D4AF37] animate-pulse" />
              RSU Evaluation Kiosk
            </h1>
            <p className="text-[10px] font-black text-[#D4AF37] tracking-widest uppercase mt-0.5">
              Quality Assurance Management System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isFullscreen && (
            <Button
              onClick={enterFullscreen}
              variant="outline"
              className="h-10 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 transition-all rounded-full flex items-center gap-1.5"
            >
              <Maximize2 className="h-4 w-4 animate-pulse" />
              Enter Fullscreen
            </Button>
          )}

          <Button
            onClick={handlePrint}
            variant="outline"
            className="h-10 text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:text-white bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border-[#D4AF37]/30 transition-all rounded-full flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" />
            Print QR Sheet
          </Button>

          <Button
            onClick={handleClose}
            variant="outline"
            className="h-10 text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 transition-all rounded-full flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Close Kiosk
          </Button>
        </div>
      </header>

      {/* Main Kiosk Card */}
      <main className="relative z-10 my-auto py-8 flex items-center justify-center">
        <Card className="w-full max-w-3xl bg-slate-900/60 border-white/10 backdrop-blur-2xl shadow-2xl rounded-3xl overflow-hidden print-card">
          <CardContent className="p-8 sm:p-12 flex flex-col md:flex-row items-center gap-10 md:gap-14">
            
            {/* Left Column: Interactive QR Code Display */}
            <div className="flex flex-col items-center shrink-0">
              <div className="relative bg-white p-6 rounded-3xl shadow-[0_0_50px_rgba(52,211,153,0.15)] border border-emerald-500/15 flex items-center justify-center w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] print-qr overflow-hidden">
                {/* Visual scanner Sweep line overlay (hidden on print and only active during fullscreen) */}
                {isFullscreen && (
                  <div 
                    className="absolute left-6 right-6 no-print"
                    style={{
                      height: 2,
                      background: 'linear-gradient(to right, transparent, #34d399, #6ee7b7, #34d399, transparent)',
                      animation: 'scanSweep 3s ease-in-out infinite',
                      boxShadow: '0 0 10px 2px rgba(52,211,153,0.4)',
                      zIndex: 10
                    }}
                  />
                )}
                
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="Evaluation Portal QR Link"
                    className={cn(
                      "w-full h-full object-contain transition-all duration-300",
                      !isFullscreen ? "opacity-0 scale-95 blur-md pointer-events-none no-print" : "opacity-100 scale-100"
                    )}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 text-[#D4AF37] animate-spin" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Rendering QR...</span>
                  </div>
                )}

                {/* Pause blocker overlay if not in fullscreen */}
                {!isFullscreen && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center space-y-3 no-print z-20 animate-in fade-in duration-300">
                    <div className="h-10 w-10 bg-[#D4AF37]/10 rounded-full flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/20">
                      <Tv className="h-5 w-5 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-black uppercase text-[#D4AF37] tracking-wider">Display Paused</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase max-w-[180px] leading-relaxed mx-auto">
                        Please enter Full Screen mode to display the QR Code.
                      </p>
                    </div>
                    <Button 
                      onClick={enterFullscreen}
                      size="sm"
                      className="h-8 text-[9px] font-black uppercase tracking-wider bg-[#D4AF37] hover:bg-[#b8942e] text-slate-950 rounded-lg px-4"
                    >
                      Enter Full Screen
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="no-print mt-4 flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-wider text-emerald-400">
                <QrCode className="h-3.5 w-3.5" />
                Scan Using Camera
              </div>
            </div>

            {/* Right Column: Instructions & Details */}
            <div className="flex-1 space-y-6 text-center md:text-left min-w-0">
              <div className="space-y-2">
                <Badge className="bg-[#D4AF37]/10 hover:bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] font-black uppercase text-[9px] tracking-wider px-3 py-1 rounded-full no-print">
                  Feedback Portal Live
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight print-title">
                  We Value Your Feedback
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate max-w-full">
                  {activity.name}
                </p>
              </div>

              {/* Step checklist */}
              <div className="space-y-4 text-xs font-semibold text-slate-300 print-instructions">
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <div className="h-6 w-6 rounded-full bg-slate-800 text-slate-200 border border-white/10 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                  <span>Scan the QR code with your mobile camera.</span>
                </div>
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <div className="h-6 w-6 rounded-full bg-slate-800 text-slate-200 border border-white/10 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                  <span>Rate the objective, delivery, venue, and quality.</span>
                </div>
                {isPinRequired && (
                  <div className="flex items-center gap-3 justify-center md:justify-start">
                    <div className="h-6 w-6 rounded-full bg-slate-800 text-slate-200 border border-white/10 flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                    <span>Enter the security PIN below to submit.</span>
                  </div>
                )}
              </div>

              {/* Secure PIN Indicator */}
              {isPinRequired && (
                <div className="pt-4 border-t border-white/5 space-y-2">
                  <span className="text-[10px] font-black uppercase text-[#D4AF37] tracking-wider block">
                    Security Submission PIN
                  </span>
                  <div className="inline-block px-8 py-3 rounded-2xl bg-[#D4AF37]/10 border-2 border-dashed border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.15)] animate-pulse print-pin">
                    <span className="text-3xl font-black font-mono tracking-[0.2em] text-[#D4AF37] pl-[0.2em]">
                      {activePin}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider max-w-xs leading-normal mx-auto md:mx-0 no-print">
                    PIN code refreshes automatically for event security.
                  </p>
                </div>
              )}
            </div>

          </CardContent>
        </Card>
      </main>

      {/* Footer bar */}
      <footer className="relative z-10 border-t border-white/5 pt-4 text-center flex flex-col gap-1 sm:flex-row sm:justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        <span>© 2026 Romblon State University</span>
        <span className="text-[#D4AF37]/40 font-black">Digital Evaluation Kiosk &bull; CRAIITech</span>
      </footer>

    </div>
  );
}

export default function PublicEvaluationKioskPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
        <Loader2 className="h-12 w-12 text-[#D4AF37] animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Initializing Kiosk Mode...</p>
      </div>
    }>
      <KioskContent />
    </Suspense>
  );
}
