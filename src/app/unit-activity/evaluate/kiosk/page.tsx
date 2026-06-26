'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from '@/firebase/firestore-wrapper';
import type { AttendanceActivity } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Printer, 
  QrCode, 
  ArrowLeft, 
  Tv, 
  HelpCircle,
  Maximize2,
  Calendar,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

// Helper to safely parse Firestore Timestamp or ISO string to Date
function toDate(val: any): Date | null {
  if (!val) return null;
  if (val?.toDate) return val.toDate();
  if (val?.seconds) return new Date(val.seconds * 1000);
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

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
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const enterFullscreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if ((element as any).webkitRequestFullscreen) {
      (element as any).webkitRequestFullscreen();
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
    const timer = setInterval(fetchActivity, 10000);
    return () => clearInterval(timer);
  }, [firestore, activityId]);

  const handlePrint = () => window.print();

  const handleClose = () => {
    window.close();
    setTimeout(() => { window.location.href = '/unit-activity'; }, 100);
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
            No active activity ID was provided in the URL. Please launch the kiosk from your Registered Activities list.
          </p>
          <Button onClick={handleClose} className="w-full mt-4">Back to Activities</Button>
        </div>
      </div>
    );
  }

  const evalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/unit-activity/evaluate?activityId=${activity.id}`
    : '';
  const qrCodeUrl = evalUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=500x500&ecc=H&data=${encodeURIComponent(evalUrl)}`
    : '';

  const strategy = activity.evaluationStrategy;
  const isPinRequired = strategy?.requirePin === true;
  const activePin = strategy?.pinCode || 'N/A';

  const startDate = toDate(activity.startDateTime);
  const endDate = toDate(activity.endDateTime);

  const formatSchedule = () => {
    if (!startDate) return null;
    if (!endDate) return format(startDate, 'MMMM d, yyyy • h:mm a');
    const sameDay = format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');
    if (sameDay) {
      return `${format(startDate, 'MMMM d, yyyy')} • ${format(startDate, 'h:mm a')} – ${format(endDate, 'h:mm a')}`;
    }
    return `${format(startDate, 'MMMM d')} – ${format(endDate, 'MMMM d, yyyy')}`;
  };

  const schedule = formatSchedule();

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-sans text-white flex flex-col">

      {/* ===== BACKGROUND: rsupage.png ===== */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/rsupage.png"
          alt="RSU Campus"
          className="w-full h-full object-cover"
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px]" />
        {/* Subtle gold vignette at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#D4AF37]/10 to-transparent pointer-events-none" />
      </div>

      {/* ===== PRINT STYLES ===== */}
      <style jsx global>{`
        @keyframes scanSweep {
          0%, 100% { transform: translateY(-200px); opacity: 0.1; }
          50% { transform: translateY(200px); opacity: 0.9; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-card {
            border: 2px solid #ccc !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            margin: 0 auto !important;
            padding: 20px !important;
          }
          .print-qr { border: 1px solid #000 !important; padding: 10px !important; }
          .print-title { color: black !important; font-size: 20px !important; font-weight: 900 !important; text-align: center !important; }
          .print-pin { color: black !important; border: 2px dashed black !important; font-size: 28px !important; padding: 10px !important; background: #eee !important; }
          .print-qr img { opacity: 100 !important; filter: none !important; display: block !important; transform: none !important; }
        }
      `}</style>

      {/* ===== TOP TOOLBAR (hidden in fullscreen for cleaner look) ===== */}
      {!isFullscreen && (
        <header className="relative z-20 no-print flex items-center justify-between px-6 py-3 bg-black/40 backdrop-blur-md border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <img src="/rsulogo.png" alt="RSU Logo" className="h-9 w-9 object-contain" />
            <div>
              <h1 className="text-xs font-black tracking-tight text-white uppercase flex items-center gap-1.5">
                <Tv className="h-3.5 w-3.5 text-[#D4AF37] animate-pulse" />
                RSU Activity Evaluation Kiosk
              </h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                CRAIITech Digital Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={enterFullscreen}
              variant="outline"
              className="h-9 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 transition-all rounded-full flex items-center gap-1.5"
            >
              <Maximize2 className="h-3.5 w-3.5 animate-pulse" />
              Fullscreen
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="h-9 text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:text-white bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border-[#D4AF37]/30 transition-all rounded-full flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Print QR
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="h-9 text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 transition-all rounded-full flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Close
            </Button>
          </div>
        </header>
      )}

      {/* ===== MAIN KIOSK CONTENT ===== */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-10 gap-8">

        {/* ---- INSTITUTION HEADER ---- */}
        <div className="flex flex-col items-center text-center gap-4">
          {/* Large Logo */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#D4AF37]/20 blur-2xl scale-150 pointer-events-none" />
            <img
              src="/rsulogo.png"
              alt="Romblon State University"
              className="relative h-28 w-28 sm:h-36 sm:w-36 object-contain drop-shadow-2xl"
            />
          </div>

          {/* Main Title */}
          <div className="space-y-2">
            <h1
              className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-none text-white drop-shadow-2xl"
              style={{
                textShadow: '0 2px 20px rgba(212,175,55,0.4), 0 0 60px rgba(212,175,55,0.15)',
              }}
            >
              RSU ACTIVITY
            </h1>
            <h1
              className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-none drop-shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #f0d060 40%, #D4AF37 70%, #b8942e 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shimmer 4s linear infinite',
                textShadow: 'none',
              }}
            >
              EVALUATION KIOSK
            </h1>
          </div>

          {/* Gold divider */}
          <div className="flex items-center gap-3 w-full max-w-lg">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#D4AF37]/60" />
            <div className="h-2 w-2 rounded-full bg-[#D4AF37]" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#D4AF37]/60" />
          </div>

          {/* Event Name */}
          <div className="space-y-2 max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#D4AF37]/70">
              Activity
            </p>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase tracking-tight text-white leading-tight drop-shadow-lg">
              {activity.name}
            </h2>
          </div>

          {/* Schedule */}
          {schedule && (
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-2.5 shadow-xl">
              <Calendar className="h-4 w-4 text-[#D4AF37] shrink-0" />
              <span className="text-sm font-black uppercase tracking-wider text-white/90">{schedule}</span>
            </div>
          )}
        </div>

        {/* ---- QR CODE SECTION ---- */}
        <div className="flex flex-col items-center gap-4">

          {/* QR wrapper */}
          <div className="relative">
            {/* Outer glow ring */}
            <div className="absolute -inset-4 rounded-3xl bg-emerald-500/10 blur-2xl pointer-events-none" />
            <div className="absolute -inset-1.5 rounded-3xl border-2 border-emerald-400/30 animate-pulse pointer-events-none" />

            <div className="relative bg-white p-5 rounded-3xl shadow-2xl border-4 border-emerald-500/30 flex items-center justify-center w-[240px] h-[240px] sm:w-[300px] sm:h-[300px] lg:w-[360px] lg:h-[360px] print-qr overflow-hidden">

              {/* Scan sweep animation (fullscreen only) */}
              {isFullscreen && (
                <div
                  className="absolute left-5 right-5 no-print pointer-events-none"
                  style={{
                    height: 3,
                    background: 'linear-gradient(to right, transparent, #34d399, #6ee7b7, #34d399, transparent)',
                    animation: 'scanSweep 3s ease-in-out infinite',
                    boxShadow: '0 0 14px 4px rgba(52,211,153,0.5)',
                    zIndex: 10,
                  }}
                />
              )}

              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="Evaluation QR Code"
                  className={`w-full h-full object-contain transition-all duration-500 ${
                    !isFullscreen
                      ? 'opacity-0 scale-95 blur-md pointer-events-none no-print'
                      : 'opacity-100 scale-100'
                  }`}
                />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 text-[#D4AF37] animate-spin" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Rendering QR...</span>
                </div>
              )}

              {/* Pause overlay when not fullscreen */}
              {!isFullscreen && (
                <div className="absolute inset-0 bg-slate-950/92 flex flex-col items-center justify-center p-4 text-center space-y-3 no-print z-20 animate-in fade-in duration-300">
                  <div className="h-12 w-12 bg-[#D4AF37]/10 rounded-full flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/20">
                    <Tv className="h-6 w-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black uppercase text-[#D4AF37] tracking-wider">QR Paused</p>
                    <p className="text-[10px] text-slate-400 font-bold max-w-[160px] leading-relaxed mx-auto">
                      Enter Full Screen to display the QR Code
                    </p>
                  </div>
                  <Button
                    onClick={enterFullscreen}
                    size="sm"
                    className="h-9 text-[10px] font-black uppercase tracking-wider bg-[#D4AF37] hover:bg-[#b8942e] text-slate-950 dark:text-white rounded-xl px-5"
                  >
                    <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
                    Enter Full Screen
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Scan instruction label */}
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-5 py-2 shadow-lg">
            <QrCode className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-black uppercase tracking-widest text-emerald-300">
              Scan with your mobile camera to evaluate
            </span>
          </div>

          {/* Step instructions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mt-1">
            {[
              { step: '1', text: 'Open your phone camera' },
              { step: '2', text: 'Scan the QR Code above' },
              { step: '3', text: 'Rate & submit your feedback' },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-2 text-white/70">
                <div className="h-6 w-6 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[10px] font-black text-white shrink-0">
                  {item.step}
                </div>
                <span className="text-xs font-bold uppercase tracking-wide">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ---- SECURITY PIN (if required) ---- */}
        {isPinRequired && (
          <div className="flex flex-col items-center gap-3 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-3xl px-10 py-5 shadow-2xl backdrop-blur-md">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">
              Security Submission PIN
            </span>
            <div className="px-10 py-3 rounded-2xl bg-[#D4AF37]/10 border-2 border-dashed border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.2)] animate-pulse print-pin">
              <span className="text-4xl font-black font-mono tracking-[0.3em] text-[#D4AF37] pl-[0.3em]">
                {activePin}
              </span>
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center max-w-xs no-print">
              Participants must enter this PIN to submit their evaluation
            </p>
          </div>
        )}
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="relative z-10 shrink-0 border-t border-white/5 py-3 px-6 flex items-center justify-between text-[9px] font-bold text-white/30 uppercase tracking-widest no-print">
        <span>© 2026 Romblon State University</span>
        <span className="text-[#D4AF37]/30 font-black">Digital Evaluation Kiosk • CRAIITech</span>
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
