'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications, AppNotificationItem } from '@/hooks/use-notifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Bell,
  Check,
  CheckCircle2,
  Trash2,
  MessageSquare,
  FileCheck,
  AlertTriangle,
  Send,
  Timer,
  UploadCloud,
  Smartphone,
  Globe,
  Settings,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface NotificationInboxProps {
  initialNotifications?: any[];
  totalNotificationsCount?: number;
}

export function NotificationInbox({ initialNotifications = [], totalNotificationsCount = 0 }: NotificationInboxProps) {
  const router = useRouter();
  const {
    inbox,
    deletedIds,
    readIds,
    markAsRead,
    toggleRead,
    markAllAsRead,
    deleteNotification,
    clearInbox,
    triggerLocalNotification,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'submissions' | 'communications'>('all');

  // Convert system notifications with deterministic IDs and persistent read status
  const sysItems: AppNotificationItem[] = initialNotifications.map((item: any, idx: number) => {
    const stableId =
      item.id || `sys-${item.module || 'mod'}-${item.label ? item.label.replace(/\s+/g, '-').toLowerCase() : idx}`;
    return {
      id: stableId,
      title: item.label || 'System Notification',
      description: item.description || '',
      category: (item.module || 'system') as AppNotificationItem['category'],
      type: 'toast' as const,
      timestamp: new Date().toISOString(),
      read: readIds.includes(stableId),
      link: item.link || '/dashboard',
    };
  });

  // Combine inbox items and system notifications
  const combinedItems: AppNotificationItem[] = [
    ...inbox.map((item) => ({
      ...item,
      read: item.read || readIds.includes(item.id),
    })),
    ...sysItems,
  ];

  // Deduplicate and filter out deleted notifications
  const uniqueItemsMap = new Map<string, AppNotificationItem>();
  combinedItems.forEach((item) => {
    if (!deletedIds.includes(item.id)) {
      uniqueItemsMap.set(item.id, item);
    }
  });
  const allItems = Array.from(uniqueItemsMap.values());

  const filteredItems = allItems.filter((item) => {
    if (activeTab === 'unread') return !item.read;
    if (activeTab === 'submissions') return item.category === 'submissions' || item.category === 'car';
    if (activeTab === 'communications') return item.category === 'communications';
    return true;
  });

  const displayUnreadCount = allItems.filter((item) => !item.read).length;

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-full text-primary hover:bg-primary/5 focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <Bell className="h-5 w-5" />
                {displayUnreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] font-bold text-white items-center justify-center">
                      {displayUnreadCount > 99 ? '99+' : displayUnreadCount}
                    </span>
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-[10px] font-bold uppercase">Notifications ({displayUnreadCount})</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent
        className="w-96 p-0 rounded-2xl border border-primary/10 shadow-2xl overflow-hidden bg-background/95 backdrop-blur-xl"
        align="end"
        forceMount
      >
        {/* Header */}
        <div className="bg-primary/5 p-4 border-b border-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-wider text-primary">Notifications Hub</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge
                variant="destructive"
                className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
              >
                {displayUnreadCount} Unread
              </Badge>
              {allItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => markAllAsRead(allItems.map((i) => i.id))}
                  className="h-6 w-6 text-muted-foreground hover:text-primary"
                  title="Mark all as read"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              )}
              {allItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => clearInbox(allItems.map((i) => i.id))}
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  title="Clear notification inbox"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mt-3">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
              <TabsList className="grid grid-cols-4 h-7 bg-muted/60 p-0.5 rounded-lg">
                <TabsTrigger value="all" className="text-[9px] font-black uppercase tracking-wider py-1">
                  All ({allItems.length})
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-[9px] font-black uppercase tracking-wider py-1">
                  Unread
                </TabsTrigger>
                <TabsTrigger value="submissions" className="text-[9px] font-black uppercase tracking-wider py-1">
                  Submissions
                </TabsTrigger>
                <TabsTrigger value="communications" className="text-[9px] font-black uppercase tracking-wider py-1">
                  Comms
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-border/40 max-h-[360px] overflow-y-auto">
          {filteredItems.map((item) => {
            let icon = <Bell className="h-4 w-4" />;
            let iconBg = 'bg-primary/10 text-primary';

            if (item.category === 'submissions') {
              icon = <FileCheck className="h-4 w-4" />;
              iconBg = 'bg-teal-500/10 text-teal-600 dark:text-teal-400';
            } else if (item.category === 'car') {
              icon = <AlertTriangle className="h-4 w-4" />;
              iconBg = 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
            } else if (item.category === 'communications') {
              icon = <Send className="h-4 w-4" />;
              iconBg = 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
            } else if (item.category === 'timer') {
              icon = <Timer className="h-4 w-4" />;
              iconBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
            } else if (item.category === 'chat') {
              icon = <MessageSquare className="h-4 w-4" />;
              iconBg = 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
            } else if (item.category === 'upload') {
              icon = <UploadCloud className="h-4 w-4" />;
              iconBg = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
            }

            return (
              <DropdownMenuItem
                key={item.id}
                onClick={() => {
                  markAsRead(item.id);
                  if (item.link) router.push(item.link);
                }}
                className={cn(
                  'p-3.5 hover:bg-muted/50 cursor-pointer transition-colors focus:bg-muted/50 flex items-start justify-between gap-3 group',
                  !item.read && 'bg-primary/[0.03]',
                )}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center ${iconBg}`}>{icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] font-black uppercase text-foreground leading-tight truncate">
                        {item.title}
                      </p>
                      {!item.read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" title="Unread" />}
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground mt-0.5 leading-tight line-clamp-2">
                      {item.description}
                    </p>
                    <span className="text-[8px] font-bold text-muted-foreground/70 uppercase tracking-wider block mt-1">
                      {item.timestamp ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }) : 'Recently'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0 rounded-md border-primary/20"
                  >
                    {item.type === 'local' && <Smartphone className="h-2.5 w-2.5 mr-1 text-emerald-500" />}
                    {item.type === 'push' && <Globe className="h-2.5 w-2.5 mr-1 text-purple-500" />}
                    {item.type === 'toast' && <Sparkles className="h-2.5 w-2.5 mr-1 text-amber-500" />}
                    {item.type}
                  </Badge>

                  {/* Row Actions: Check (Mark/Toggle Read) & Delete */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleRead(item.id, item.read);
                      }}
                      className="h-6 w-6 text-muted-foreground hover:text-emerald-500 rounded-full p-0"
                      title={item.read ? 'Mark as unread' : 'Mark as read'}
                    >
                      <CheckCircle2
                        className={cn(
                          'h-3.5 w-3.5',
                          item.read ? 'text-emerald-500 fill-emerald-500/20' : 'text-muted-foreground/60',
                        )}
                      />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteNotification(item.id);
                      }}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive rounded-full p-0"
                      title="Delete notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-muted-foreground italic flex flex-col items-center gap-2">
              <Bell className="h-8 w-8 text-muted-foreground/30" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                No Notifications Found
              </span>
              <p className="text-[9px] not-italic text-slate-400 uppercase tracking-tighter">
                All quality updates and system alerts are clear.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-2 bg-muted/30 border-t border-primary/10 flex items-center justify-between gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('rsu-open-notification-digest'));
              }
            }}
            className="text-[10px] font-black uppercase tracking-wider h-7 text-primary hover:bg-primary/10 gap-1.5"
          >
            <Sparkles className="h-3 w-3" /> Digest View
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/settings?tab=comm-settings')}
            className="text-[10px] font-black uppercase tracking-wider h-7 text-muted-foreground hover:text-primary gap-1.5"
          >
            <Settings className="h-3 w-3" /> Settings
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
