'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Camera, QrCode, FlipHorizontal2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function QRScannerPage() {
  const [isScannerLibLoaded, setIsScannerLibLoaded] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scanResult, setScanResult] = useState<{
    status: 'success' | 'error' | 'loading' | 'none';
    message: string;
  }>({ status: 'none', message: 'Initializing camera...' });

  const html5QrCodeScannerRef = useRef<any>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const redirectTimeoutRef = useRef<any>(null);

  // Load html5-qrcode library from CDN dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).Html5Qrcode) {
      setIsScannerLibLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode';
    script.async = true;
    script.onload = () => {
      setIsScannerLibLoaded(true);
    };
    script.onerror = () => {
      setScanResult({
        status: 'error',
        message: 'Failed to load QR scanner resources. Please check your internet connection.',
      });
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const startScanning = (mode?: 'environment' | 'user') => {
    if (!isScannerLibLoaded || !(window as any).Html5Qrcode) return;

    // Stop any existing session
    stopScanning();

    const activeMode = mode ?? facingMode;
    setScannerActive(true);
    setScanResult({ status: 'loading', message: 'Starting camera stream...' });

    // Small delay to ensure the container DOM element is fully rendered and ready
    setTimeout(() => {
      if (!document.getElementById('mobile-scanner-reader')) {
        setScanResult({ status: 'error', message: 'Scanner element container not ready.' });
        setScannerActive(false);
        return;
      }

      try {
        const scanner = new (window as any).Html5Qrcode('mobile-scanner-reader');

        scanner
          .start(
            { facingMode: activeMode },
            {
              fps: 24,
              qrbox: (width: number, height: number) => {
                const size = Math.min(width, height) * 0.75;
                return { width: size, height: size };
              },
              aspectRatio: 1.0,
              experimentalFeatures: {
                useBarCodeDetectorIfSupported: true,
              },
            },
            (decodedText: string) => {
              handleScanSuccess(decodedText, scanner);
            },
            () => {
              // Silently swallow camera frames parsing errors
            },
          )
          .then(() => {
            html5QrCodeScannerRef.current = scanner;
            setScanResult({ status: 'none', message: 'Align the system QR code within the frame.' });

            // Apply continuous focus if possible
            try {
              scanner.applyVideoConstraints({ focusMode: 'continuous' }).catch(() => {});
            } catch (e) {
              // Ignore focus configuration errors
            }
          })
          .catch((err: any) => {
            console.error('Camera Access Error:', err);
            setScanResult({
              status: 'error',
              message:
                'Camera permission denied or camera unavailable. Please ensure permissions are granted in your browser settings.',
            });
            setScannerActive(false);
          });
      } catch (err: any) {
        console.error('Camera Init Error:', err);
        setScanResult({ status: 'error', message: `Camera error: ${err.message || err}` });
        setScannerActive(false);
      }
    }, 150);
  };

  const stopScanning = () => {
    if (html5QrCodeScannerRef.current) {
      const scanner = html5QrCodeScannerRef.current;
      html5QrCodeScannerRef.current = null;
      try {
        scanner.stop().catch((e: any) => {
          console.warn('Error stopping camera track:', e);
        });
      } catch (e) {
        console.error(e);
      }
    }
    setScannerActive(false);
  };

  const switchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startScanning(nextMode);
  };

  const handleScanSuccess = (decodedText: string, scannerInstance: any) => {
    // Attempt to stop scanning immediately to prevent double redirects
    try {
      scannerInstance.stop().catch((e: any) => console.warn(e));
      if (html5QrCodeScannerRef.current === scannerInstance) {
        html5QrCodeScannerRef.current = null;
      }
      setScannerActive(false);
    } catch (e) {
      // Ignore scanner stop errors
    }

    setScanResult({ status: 'success', message: 'Valid QR Code Detected! Redirecting...' });

    // Validate the scanned URL / data
    try {
      if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
        const url = new URL(decodedText);

        // Redirecting to relative path if it's on the same origin (safe redirect)
        if (url.origin === window.location.origin) {
          redirectTimeoutRef.current = setTimeout(() => {
            window.location.href = url.pathname + url.search + url.hash;
          }, 800);
        } else {
          // If it's an external link, show warning (we only scan system QR codes)
          setScanResult({
            status: 'error',
            message:
              'Scanned URL belongs to an external system. For security, we only redirect to system-generated QR codes.',
          });
          redirectTimeoutRef.current = setTimeout(() => {
            startScanning();
          }, 3500);
        }
      } else if (decodedText.startsWith('/')) {
        redirectTimeoutRef.current = setTimeout(() => {
          window.location.href = decodedText;
        }, 800);
      } else {
        setScanResult({
          status: 'error',
          message: 'The scanned code is not a valid EOMS portal link.',
        });
        redirectTimeoutRef.current = setTimeout(() => {
          startScanning();
        }, 3500);
      }
    } catch (e) {
      setScanResult({
        status: 'error',
        message: 'Invalid QR payload format.',
      });
      redirectTimeoutRef.current = setTimeout(() => {
        startScanning();
      }, 3500);
    }
  };

  // Start scanner when script is loaded
  useEffect(() => {
    if (isScannerLibLoaded) {
      startScanning();
    }
    return () => {
      stopScanning();
    };
  }, [isScannerLibLoaded]);

  return (
    <div className="relative min-h-screen w-full bg-[#0d2a18] flex flex-col justify-between overflow-x-hidden p-4 font-sans text-white">
      {/* Background Decorative Blur Gradients */}
      <div className="absolute top-0 -left-1/4 w-[300px] h-[300px] bg-[#1B6535]/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 -right-1/4 w-[300px] h-[300px] bg-[#D4AF37]/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Header bar */}
      <div className="w-full flex items-center justify-between z-10 pt-2 shrink-0">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full text-white/80 hover:text-white hover:bg-white/10"
          onClick={stopScanning}
        >
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/35 text-[#D4AF37] text-[8px] font-black uppercase tracking-wider">
            <Sparkles className="h-2.5 w-2.5" /> EOMS Scanner
          </span>
          <h1 className="text-sm font-black uppercase tracking-widest mt-1">
            System <span className="text-[#D4AF37]">QR Reader</span>
          </h1>
        </div>
        {scannerActive ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={switchCamera}
            className="h-10 w-10 rounded-full text-white/80 hover:text-white hover:bg-white/10"
            title="Switch Camera"
          >
            <FlipHorizontal2 className="h-5 w-5" />
          </Button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Scanner Box Area */}
      <div className="w-full max-w-sm mx-auto my-auto z-10 flex flex-col items-center justify-center py-6">
        <div className="relative w-full aspect-square max-w-[280px] sm:max-w-[320px] rounded-3xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl flex items-center justify-center">
          {/* html5-qrcode video wrapper */}
          <div
            id="mobile-scanner-reader"
            ref={readerRef}
            className="w-full h-full object-cover [&_video]:object-cover [&_video]:w-full [&_video]:h-full"
          />

          {/* Scanner Overlay UI Decoration */}
          {scannerActive && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-15">
              {/* Glassmorphic target box */}
              <div className="w-[75%] h-[75%] border-2 border-[#D4AF37]/45 rounded-2xl relative">
                {/* Corner Accents */}
                <div className="absolute -top-1.5 -left-1.5 w-5 h-5 border-t-4 border-l-4 border-[#D4AF37] rounded-tl-md" />
                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 border-t-4 border-r-4 border-[#D4AF37] rounded-tr-md" />
                <div className="absolute -bottom-1.5 -left-1.5 w-5 h-5 border-b-4 border-l-4 border-[#D4AF37] rounded-bl-md" />
                <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 border-b-4 border-r-4 border-[#D4AF37] rounded-br-md" />

                {/* Laser animation line */}
                <div
                  className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                  style={{
                    animation: 'scannerLaser 2.2s ease-in-out infinite',
                    top: '0%',
                  }}
                />
              </div>
            </div>
          )}

          {/* Fallback state renderer */}
          {!scannerActive && scanResult.status !== 'success' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/85 backdrop-blur-sm z-20 space-y-4">
              {scanResult.status === 'error' ? (
                <>
                  <AlertCircle className="h-10 w-10 text-rose-500" />
                  <p className="text-xs font-semibold text-slate-350 max-w-[200px] leading-relaxed">
                    {scanResult.message}
                  </p>
                  <Button
                    onClick={() => startScanning()}
                    className="bg-[#1B6535] hover:bg-[#1B6535]/80 text-white rounded-xl text-[10px] font-black uppercase tracking-wider py-1.5 px-4 h-8"
                  >
                    Retry Camera
                  </Button>
                </>
              ) : (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
                    Connecting Camera...
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info console / status text */}
      <div className="w-full max-w-sm mx-auto z-10 shrink-0 text-center pb-6 space-y-4">
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold leading-relaxed min-h-[72px] flex items-center justify-center ${
            scanResult.status === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : scanResult.status === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-white/5 border-white/10 text-slate-300'
          }`}
        >
          {scanResult.status === 'loading' && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
              <span>{scanResult.message}</span>
            </div>
          )}
          {scanResult.status !== 'loading' && (
            <span
              className={
                scanResult.status === 'success' ? 'font-black uppercase tracking-wide animate-pulse' : 'italic'
              }
            >
              {scanResult.message}
            </span>
          )}
        </div>

        <p className="text-[10px] text-slate-400 max-w-[280px] mx-auto leading-relaxed">
          Open the EOMS portal on a desktop or kiosk, locate a sign-in or survey QR code, and scan it with this camera
          reader.
        </p>
      </div>

      {/* Styles injected locally to handle the custom animations */}
      <style jsx global>{`
        @keyframes scannerLaser {
          0% {
            top: 0%;
          }
          50% {
            top: 100%;
          }
          100% {
            top: 0%;
          }
        }
        #mobile-scanner-reader {
          width: 100% !important;
          height: 100% !important;
        }
        #mobile-scanner-reader > div {
          border: none !important;
        }
        /* Hide html5-qrcode controls or default UI elements */
        #mobile-scanner-reader__dashboard_section_csr,
        #mobile-scanner-reader__dashboard_section_swaplink,
        #mobile-scanner-reader img {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
