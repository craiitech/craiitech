'use client';

/**
 * @fileOverview A dialog component that prompts users to install the portal as a PWA.
 * It listens for the 'beforeinstallprompt' event and offers a custom installation experience.
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
import { Smartphone, Monitor, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/badge';

export function InstallPwaDialog() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      // Check if user has previously dismissed the prompt in this browser
      const isDismissed = localStorage.getItem('rsu_eoms_install_dismissed');
      if (!isDismissed) {
        // Wait a few seconds after load to show the prompt for better UX
        const timer = setTimeout(() => setIsVisible(true), 5000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the native browser install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
        // User agreed to install
        localStorage.setItem('rsu_eoms_install_dismissed', 'true');
    }

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    // Save to localStorage so we don't show it again for a while
    localStorage.setItem('rsu_eoms_install_dismissed', 'true');
    setIsVisible(false);
  };

  return (
    <AlertDialog open={isVisible} onOpenChange={setIsVisible}>
      <AlertDialogContent className="max-w-md border-primary/20 shadow-2xl animate-in zoom-in duration-300">
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
          <AlertDialogCancel onClick={handleDismiss} className="font-bold text-[10px] uppercase tracking-widest h-11">Maybe Later</AlertDialogCancel>
          <AlertDialogAction onClick={handleInstall} className="bg-primary font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 px-10 h-11">
            Install Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
