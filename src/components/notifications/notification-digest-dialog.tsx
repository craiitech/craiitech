'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Sparkles,
  FileCheck,
  AlertTriangle,
  MessageSquare,
  ShieldCheck,
  FileText,
  Activity,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationDigestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Array<{
    id: string;
    module?: string;
    label?: string;
    description?: string;
    link?: string;
    timestamp?: string;
  }>;
  onAcknowledge: () => void;
  onMarkAllAsRead?: () => void;
}

export function NotificationDigestDialog({
  isOpen,
  onOpenChange,
  notifications = [],
  onAcknowledge,
  onMarkAllAsRead,
}: NotificationDigestDialogProps) {
  const router = useRouter();
  const [filterTab, setFilterTab] = useState<'all' | 'actions' | 'comms'>('all');

  const getModuleIcon = (module?: string) => {
    switch (module) {
      case 'submissions':
        return <FileCheck className="h-4 w-4 text-emerald-500" />;
      case 'car':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'risk':
        return <Activity className="h-4 w-4 text-rose-500" />;
      case 'accreditation':
        return <ShieldCheck className="h-4 w-4 text-indigo-500" />;
      case 'decisions':
        return <Sparkles className="h-4 w-4 text-purple-500" />;
      case 'communications':
        return <MessageSquare className="h-4 w-4 text-sky-500" />;
      case 'unit-forms':
      case 'manuals':
        return <FileText className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const getModuleBadgeLabel = (module?: string) => {
    switch (module) {
      case 'submissions':
        return 'Submission';
      case 'car':
        return 'CAR / Audit';
      case 'risk':
        return 'Risk';
      case 'accreditation':
        return 'Accreditation';
      case 'decisions':
        return 'MR Decision';
      case 'communications':
        return 'Communication';
      case 'unit-forms':
        return 'Form Request';
      case 'manuals':
        return 'Procedure Manual';
      default:
        return 'System';
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filterTab === 'actions') {
      return ['submissions', 'car', 'risk', 'accreditation', 'decisions', 'unit-forms', 'manuals'].includes(
        item.module || '',
      );
    }
    if (filterTab === 'comms') {
      return item.module === 'communications';
    }
    return true;
  });

  const handleNavigate = (link?: string) => {
    onAcknowledge();
    onOpenChange(false);
    if (link) {
      router.push(link);
    }
  };

  const handleDismiss = () => {
    onAcknowledge();
    onOpenChange(false);
  };

  const handleMarkAllAndDismiss = () => {
    if (onMarkAllAsRead) {
      onMarkAllAsRead();
    }
    onAcknowledge();
    onOpenChange(false);
  };

  if (!notifications.length) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90dvh] flex flex-col p-0 overflow-hidden border border-primary/20 shadow-2xl rounded-3xl bg-background/95 backdrop-blur-2xl">
        {/* Header with Institutional Gradient */}
        <div className="p-6 pb-5 bg-gradient-to-br from-primary via-primary/95 to-slate-900 text-white shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md shadow-inner">
                <Bell className="h-6 w-6 text-yellow-300 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <AlertDialogTitle className="text-lg font-black uppercase tracking-tight text-white">
                    Institutional Notifications
                  </AlertDialogTitle>
                  <Badge className="bg-yellow-400 hover:bg-yellow-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                    {notifications.length} New
                  </Badge>
                </div>
                <AlertDialogDescription className="text-xs text-white/80 font-medium mt-1">
                  You have pending action items, updates, and communications requiring your attention.
                </AlertDialogDescription>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <Tabs value={filterTab} onValueChange={(v: any) => setFilterTab(v)} className="w-full">
              <TabsList className="bg-black/20 p-1 rounded-xl h-8 border border-white/10">
                <TabsTrigger
                  value="all"
                  className="text-[10px] font-black uppercase tracking-wider rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900"
                >
                  All ({notifications.length})
                </TabsTrigger>
                <TabsTrigger
                  value="actions"
                  className="text-[10px] font-black uppercase tracking-wider rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900"
                >
                  Action Required
                </TabsTrigger>
                <TabsTrigger
                  value="comms"
                  className="text-[10px] font-black uppercase tracking-wider rounded-lg data-[state=active]:bg-white data-[state=active]:text-slate-900"
                >
                  Communications
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Scrollable Notification List */}
        <ScrollArea className="flex-1 p-6 max-h-[50dvh] overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Sparkles className="h-8 w-8 mx-auto text-primary/40" />
              <p className="text-xs font-bold uppercase tracking-wider">No notifications in this category</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notif, idx) => (
                <div
                  key={notif.id || idx}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-primary/10 bg-card/60 hover:bg-primary/5 transition-all shadow-sm hover:shadow-md hover:border-primary/20"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-background border border-primary/15 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      {getModuleIcon(notif.module)}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border-primary/20 bg-primary/5 text-primary"
                        >
                          {getModuleBadgeLabel(notif.module)}
                        </Badge>
                      </div>
                      <p className="text-xs font-bold text-foreground leading-snug line-clamp-2">
                        {notif.label || 'Notification Item'}
                      </p>
                      {notif.description && (
                        <p className="text-[11px] text-muted-foreground font-medium line-clamp-2">
                          {notif.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      size="sm"
                      onClick={() => handleNavigate(notif.link)}
                      className="h-8 px-3 text-[10px] font-black uppercase tracking-wider gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm group/btn"
                    >
                      <span>Take Action</span>
                      <ChevronRight className="h-3 w-3 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <AlertDialogFooter className="p-4 bg-muted/40 border-t border-primary/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {onMarkAllAsRead && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAndDismiss}
                className="text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-primary gap-1.5 h-9 px-3 rounded-xl"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark All Read & Dismiss</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <AlertDialogCancel
              onClick={handleDismiss}
              className="text-xs font-black uppercase tracking-wider rounded-xl h-9 px-4 border-primary/20 hover:bg-muted m-0"
            >
              Later
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDismiss}
              className="text-xs font-black uppercase tracking-wider rounded-xl h-9 px-5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md m-0"
            >
              Acknowledge & Continue
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
