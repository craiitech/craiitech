'use client';

/**
 * @fileOverview A dialog component that manages the PWA lifecycle.
 * - Prompts for installation if not yet installed.
 * - Detects if already installed and suggests switching to the standalone app if in a browser.
 */

import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Smartphone, Monitor, Download, ShieldCheck, CheckCircle2, LayoutTemplate, ExternalLink } from 'lucide-react';
import { Badge } from '../ui/badge';

export function InstallPwaDialog() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [view, setView] = useState<'install' | 'switch' | null>(null);

  useEffect(() => {
    // 1. Detect if we are already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    
    // 2. Check installation flag in local storage
    const isInstalledFlag = localStorage.getItem('rsu_pwa_installed') === 'true';

    // 3. Logic for "Already Installed but in Browser"
    if (!isStandalone && isInstalledFlag) {
        const isDismissed = localStorage.getItem('rsu_pwa_switch_dismissed');
        if (!isDismissed) {
            const timer = setTimeout(() => setView('switch'), 3000);
            return () => clearTimeout(timer);
        }
    }

    // 4. Logic for "Available to Install"
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const isDismissed = localStorage.getItem('rsu_eoms_install_dismissed');
      const isInstalled = localStorage.getItem('rsu_pwa_installed') === 'true';

      if (!isDismissed && !isInstalled && !isStandalone) {
        const timer = setTimeout(() => setView('install'), 5000);
        return () => clearTimeout(timer);
      }
    };

    // 5. Track successful installation
    const handleAppInstalled = () => {
        localStorage.setItem('rsu_pwa_installed', 'true');
        setView(null);
        setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
        localStorage.setItem('rsu_pwa_installed', 'true');
    }
    setDeferredPrompt(null);
    setView(null);
  };

  const handleDismiss = (type: 'install' | 'switch') => {
    const key = type === 'install' ? 'rsu_eoms_install_dismissed' : 'rsu_pwa_switch_dismissed';
    localStorage.setItem(key, 'true');
    setView(null);
  };

  if (!view) return null;

  return (
    <AlertDialog open={!!view} onOpenChange={() => setView(null)}>
      <AlertDialogContent className="max-w-md border-primary/20 shadow-2xl animate-in zoom-in duration-300">
        {view === 'install' ? (
            <>
                <AlertDialogHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                        <Download className="h-6 w-6" />
                        </div>
                        <AlertDialogTitle className="text-lg font-black uppercase tracking-tight leading-tight">Install RSU EOMS Portal</AlertDialogTitle>
                    </div>
                    <Badge variant="outline" className="h-5 text-[8px] font-black border-primary/20 text-primary uppercase">v2.5 PWA</Badge>
                  </div>
                  <AlertDialogDescription className="space-y-6">
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">
                        Experience the Quality Management System as a professional standalone application. Installing provides several institutional benefits:
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                          { icon: <ShieldCheck className="h-4 w-4 text-emerald-600" />, text: "Standalone Workspace (No Tabs)" },
                          { icon: <Monitor className="h-4 w-4 text-blue-600" />, text: "Desktop & Taskbar One-Click Access" },
                          { icon: <Smartphone className="h-4 w-4 text-purple-600" />, text: "Optimized Mobile Navigation" },
                          { icon: <CheckCircle2 className="h-4 w-4 text-indigo-600" />, text: "Faster Load Times & Reliability" }
                      ].map((benefit, i) => (
                          <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                              {benefit.icon}
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{benefit.text}</span>
                          </div>
                      ))}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6 gap-2 sm:gap-0">
                  <AlertDialogCancel onClick={() => handleDismiss('install')} className="font-bold text-[10px] uppercase tracking-widest h-11">Maybe Later</AlertDialogCancel>
                  <AlertDialogAction onClick={handleInstall} className="bg-primary font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 px-10 h-11">
                    Install Now
                  </AlertDialogAction>
                </AlertDialogFooter>
            </>
        ) : (
            <>
                <AlertDialogHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                            <LayoutTemplate className="h-6 w-6" />
                        </div>
                        <AlertDialogTitle className="text-lg font-black uppercase tracking-tight leading-tight">Switch to App Experience?</AlertDialogTitle>
                    </div>
                  </div>
                  <AlertDialogDescription className="space-y-6">
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">
                        Our records indicate that you already have the <strong>RSU EOMS Portal</strong> installed on this device.
                    </p>
                    <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start gap-4">
                        <Info className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-[11px] font-black uppercase text-indigo-900">How to Open</p>
                            <p className="text-[11px] text-indigo-800/80 leading-relaxed font-medium italic">
                                "Close this browser tab and locate the <strong>RSU EOMS Portal</strong> icon on your desktop or home screen for a more stable and focused environment."
                            </p>
                        </div>
                    </div>
                    <div className="p-4 rounded-xl border border-dashed bg-muted/20 space-y-2">
                         <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">System Note</p>
                         <p className="text-[10px] text-slate-500 leading-tight">Running as a standalone application avoids accidental tab closures and ensures persistent data synchronization.</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6 gap-2 sm:gap-0">
                  <AlertDialogCancel onClick={() => handleDismiss('switch')} className="font-bold text-[10px] uppercase tracking-widest h-11">Stay in Browser</AlertDialogCancel>
                  <AlertDialogAction onClick={() => setView(null)} className="bg-primary font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 px-10 h-11">
                    I'll Switch Now
                  </AlertDialogAction>
                </AlertDialogFooter>
            </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
