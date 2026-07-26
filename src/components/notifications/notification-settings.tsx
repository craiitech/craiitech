'use client';

import { useState } from 'react';
import { useNotifications, AppNotificationItem } from '@/hooks/use-notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ModalAlertDialog } from '@/components/notifications/modal-alert-dialog';
import {
  Bell,
  BellRing,
  Smartphone,
  Globe,
  MessageSquare,
  Timer,
  UploadCloud,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function NotificationSettingsManagement() {
  const {
    permission,
    isSwRegistered,
    requestPermission,
    triggerLocalNotification,
    triggerWebPushNotification,
    triggerToast,
    triggerModalAlert,
    modalState,
    closeModalAlert,
  } = useNotifications();

  const [activeTimerSec, setActiveTimerSec] = useState<number | null>(null);

  const handleTestTimer = () => {
    setActiveTimerSec(5);
    let current = 5;
    const interval = setInterval(() => {
      current -= 1;
      if (current <= 0) {
        clearInterval(interval);
        setActiveTimerSec(null);
        triggerLocalNotification('⏱️ Quality Audit Timer Completed!', {
          body: 'Your 5-second scheduled Quality Audit task session has concluded.',
          category: 'timer',
          link: '/dashboard',
        });
      } else {
        setActiveTimerSec(current);
      }
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Intrusive Modal Alert Dialog Component */}
      <ModalAlertDialog
        isOpen={modalState.isOpen}
        title={modalState.title}
        description={modalState.description}
        confirmLabel={modalState.confirmLabel}
        cancelLabel={modalState.cancelLabel}
        variant={modalState.variant}
        onConfirm={modalState.onConfirm}
        onCancel={modalState.onCancel}
        onClose={closeModalAlert}
      />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BellRing className="h-6 w-6 text-primary animate-bounce" />
            <h3 className="text-xl font-black uppercase tracking-tight text-foreground">Notification & Push Center</h3>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            Configure device OS popups, background Service Worker push subscriptions, and on-screen UI components.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Badge
            variant={permission === 'granted' ? 'default' : 'outline'}
            className={cn(
              'px-3 py-1.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 rounded-xl',
              permission === 'granted'
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : permission === 'denied'
                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                  : 'bg-amber-500/10 text-amber-600 border-amber-500/30',
            )}
          >
            {permission === 'granted' && <CheckCircle2 className="h-4 w-4" />}
            {permission === 'denied' && <AlertCircle className="h-4 w-4" />}
            {permission === 'default' && <Bell className="h-4 w-4" />}
            OS Permission: {permission.toUpperCase()}
          </Badge>

          {permission !== 'granted' && (
            <Button
              onClick={requestPermission}
              size="sm"
              className="font-black uppercase text-xs tracking-wider rounded-xl shadow-md gap-2"
            >
              <Bell className="h-4 w-4" /> Enable Native OS Alerts
            </Button>
          )}
        </div>
      </div>

      {/* 2 Grid Sections: 1. System/OS Level Web Notifications & 2. In-App On-Screen UI Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: System/OS Level Web Notifications */}
        <Card className="rounded-2xl border-primary/20 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-black uppercase tracking-tight">
                1. System / OS Level Web Notifications
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Device native popups triggering Windows Action Center, macOS Notification Center, or Mobile Lockscreen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 1A. Foreground Local Notifications */}
            <div className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wide text-foreground">
                    A. Local Notifications (Foreground Tab)
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600"
                >
                  Active Tab Only
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Uses the Notification API directly when your web app is open in an active tab.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestTimer}
                  disabled={activeTimerSec !== null}
                  className="text-xs font-bold gap-2 rounded-lg"
                >
                  <Timer className="h-3.5 w-3.5 text-emerald-600" />
                  {activeTimerSec !== null ? `Timer Running (${activeTimerSec}s)...` : 'Test Active Timer (5s)'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    triggerLocalNotification('💬 Live Chat Alert', {
                      body: 'QA Officer sent a new message in the EOMS accreditation workspace.',
                      category: 'chat',
                    })
                  }
                  className="text-xs font-bold gap-2 rounded-lg"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                  Test Live Chat Notice
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    triggerLocalNotification('✅ Upload Complete', {
                      body: 'SWOT Analysis document (AY 2025-2026) was successfully archived.',
                      category: 'upload',
                    })
                  }
                  className="text-xs font-bold gap-2 rounded-lg"
                >
                  <UploadCloud className="h-3.5 w-3.5 text-indigo-600" />
                  Test Upload Notice
                </Button>
              </div>
            </div>

            {/* 1B. Web Push Notifications (Background & Closed) */}
            <div className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-black uppercase tracking-wide text-foreground">
                    B. Web Push (Background / App Closed)
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[9px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-600"
                >
                  Service Worker Powered
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Triggers native OS popups even when the tab is closed or backgrounded via Service Worker push events.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    triggerWebPushNotification('📰 Breaking Institutional Update', {
                      body: 'New Quality Standard Policy approved for Romblon State University campuses.',
                      category: 'communications',
                      link: '/communications',
                    })
                  }
                  className="text-xs font-bold gap-2 rounded-lg"
                >
                  <Send className="h-3.5 w-3.5 text-purple-600" />
                  Test News Web Push
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    triggerWebPushNotification('⚠️ Pending Approval Reminder', {
                      body: 'Action required: 3 Submissions are pending review in your campus queue.',
                      category: 'submissions',
                      link: '/approvals',
                    })
                  }
                  className="text-xs font-bold gap-2 rounded-lg"
                >
                  <Bell className="h-3.5 w-3.5 text-amber-600" />
                  Test Status Update Push
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: In-App / On-Screen Notifications (UI Component) */}
        <Card className="rounded-2xl border-primary/20 shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-black uppercase tracking-tight">
                2. In-App / On-Screen UI Components
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Rendered inside application UI code (HTML/CSS/React). Does not require OS permissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Toast Notifications */}
            <div className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wide text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Toast Notifications
                </span>
                <Badge
                  variant="outline"
                  className="text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600"
                >
                  Corner Banner (3-5s)
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Non-intrusive banners popping up in corner for brief feedback.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => triggerToast('Settings Saved', 'System preferences updated successfully.', 'default')}
                  className="text-xs font-bold rounded-lg"
                >
                  Test Success Toast
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    triggerToast('Connection Interrupted', 'Offline mode active. Data saved locally.', 'destructive')
                  }
                  className="text-xs font-bold rounded-lg text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                >
                  Test Error Toast
                </Button>
              </div>
            </div>

            {/* Modal / Dialog Alerts */}
            <div className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wide text-foreground flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-500" /> Modal / Dialog Alerts
                </span>
                <Badge
                  variant="outline"
                  className="text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-600"
                >
                  Intrusive Overlay
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Modal overlays that block user interaction until explicitly confirmed or cancelled.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    triggerModalAlert({
                      title: 'Delete Quality Record?',
                      description:
                        'Are you sure you want to permanently delete this submission draft? This action cannot be undone.',
                      variant: 'destructive',
                      confirmLabel: 'Yes, Delete Record',
                      onConfirm: () =>
                        triggerToast('Record Deleted', 'Draft submission has been removed.', 'destructive'),
                    })
                  }
                  className="text-xs font-bold rounded-lg text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                >
                  Test Delete Modal Alert
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    triggerModalAlert({
                      title: 'Confirm Final Institutional Approval',
                      description: 'You are about to authorize the University-Wide communication for all 8 campuses.',
                      variant: 'default',
                      confirmLabel: 'Authorize & Send',
                      onConfirm: () => triggerToast('Approved', 'Institutional communication dispatched.', 'default'),
                    })
                  }
                  className="text-xs font-bold rounded-lg"
                >
                  Test High Priority Action Modal
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
