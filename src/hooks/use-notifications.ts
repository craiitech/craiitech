'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export type NotificationType = 'local' | 'push' | 'toast' | 'modal';

export interface AppNotificationItem {
  id: string;
  title: string;
  description: string;
  category:
    'submissions' | 'communications' | 'car' | 'risk' | 'accreditation' | 'system' | 'timer' | 'chat' | 'upload';
  type: NotificationType;
  timestamp: string;
  read: boolean;
  link?: string;
  metadata?: Record<string, any>;
}

export function useNotifications() {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSwRegistered, setIsSwRegistered] = useState(false);
  const [inbox, setInbox] = useState<AppNotificationItem[]>([]);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'destructive' | 'default' | 'warning';
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
  });

  // Check initial permission & service worker support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setIsSwRegistered(true)).catch(() => {});
    }

    // Load persisted inbox items from localStorage
    try {
      const savedInbox = localStorage.getItem('rsu_eoms_notification_inbox');
      if (savedInbox) {
        setInbox(JSON.parse(savedInbox));
      }
    } catch (e) {
      console.warn('Could not parse notification inbox from localStorage', e);
    }
  }, []);

  // Save inbox changes to localStorage
  const saveInbox = useCallback((items: AppNotificationItem[]) => {
    setInbox(items);
    try {
      localStorage.setItem('rsu_eoms_notification_inbox', JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save notification inbox', e);
    }
  }, []);

  /**
   * Request OS level notification permissions
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast({
        title: 'Notifications Unsupported',
        description: 'Native OS notifications are not supported in this browser.',
        variant: 'destructive',
      });
      return 'denied';
    }

    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        toast({
          title: 'OS Notifications Enabled',
          description: 'You will now receive native OS popups for system events.',
        });
      } else {
        toast({
          title: 'Permission Declined',
          description: 'OS notifications permission was not granted. In-App toasts will be used.',
          variant: 'destructive',
        });
      }
      return res;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return 'denied';
    }
  }, [toast]);

  /**
   * 1A. LOCAL NOTIFICATIONS (Foreground Native OS Popup)
   * Uses Notification API in active browser tab.
   * Use cases: Active timers, live chat alerts, upload completion notices.
   */
  const triggerLocalNotification = useCallback(
    async (
      title: string,
      options: {
        body: string;
        icon?: string;
        tag?: string;
        category?: AppNotificationItem['category'];
        link?: string;
        onClick?: () => void;
      },
    ) => {
      // Always record in inbox
      const newItem: AppNotificationItem = {
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title,
        description: options.body,
        category: options.category || 'system',
        type: 'local',
        timestamp: new Date().toISOString(),
        read: false,
        link: options.link,
      };

      setInbox((prev) => {
        const next = [newItem, ...prev].slice(0, 50);
        try {
          localStorage.setItem('rsu_eoms_notification_inbox', JSON.stringify(next));
        } catch (e) {
          console.warn(e);
        }
        return next;
      });

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const notif = new Notification(title, {
            body: options.body,
            icon: options.icon || '/favicon.ico',
            tag: options.tag || 'rsu-local',
          });

          notif.onclick = () => {
            window.focus();
            if (options.onClick) options.onClick();
            else if (options.link) window.location.href = options.link;
            notif.close();
          };
          return notif;
        } catch (e) {
          console.warn('Native notification failed, falling back to Service Worker or Toast', e);
        }
      }

      // Fallback to in-app toast if OS notifications are denied or unsupported
      toast({
        title: `[Foreground OS Alert] ${title}`,
        description: options.body,
      });
    },
    [toast],
  );

  /**
   * 1B. WEB PUSH NOTIFICATIONS (Background & App Closed Native OS Popup)
   * Uses Service Worker showNotification to present popups even when tab is backgrounded/closed.
   * Use cases: Breaking news, abandoned reminders, incoming messages, order status updates.
   */
  const triggerWebPushNotification = useCallback(
    async (
      title: string,
      options: {
        body: string;
        icon?: string;
        badge?: string;
        category?: AppNotificationItem['category'];
        link?: string;
      },
    ) => {
      // Record in inbox
      const newItem: AppNotificationItem = {
        id: `push-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title,
        description: options.body,
        category: options.category || 'system',
        type: 'push',
        timestamp: new Date().toISOString(),
        read: false,
        link: options.link,
      };

      setInbox((prev) => {
        const next = [newItem, ...prev].slice(0, 50);
        try {
          localStorage.setItem('rsu_eoms_notification_inbox', JSON.stringify(next));
        } catch (e) {
          console.warn(e);
        }
        return next;
      });

      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          if (Notification.permission === 'granted') {
            await reg.showNotification(title, {
              body: options.body,
              icon: options.icon || '/favicon.ico',
              badge: options.badge || '/favicon.ico',
              vibrate: [100, 50, 100],
              data: { url: options.link || '/dashboard' },
            } as any);
            return;
          }
        } catch (e) {
          console.warn('Service Worker notification show failed', e);
        }
      }

      // Fallback to toast
      toast({
        title: `[Background Web Push] ${title}`,
        description: options.body,
      });
    },
    [toast],
  );

  /**
   * 2A. TOAST NOTIFICATION (In-App Non-Intrusive Banner)
   * Pops up in a corner and fades after 3-5 seconds.
   */
  const triggerToast = useCallback(
    (
      title: string,
      description?: string,
      variant: 'default' | 'destructive' | 'success' = 'default',
      category: AppNotificationItem['category'] = 'system',
    ) => {
      const newItem: AppNotificationItem = {
        id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title,
        description: description || '',
        category,
        type: 'toast',
        timestamp: new Date().toISOString(),
        read: false,
      };

      setInbox((prev) => {
        const next = [newItem, ...prev].slice(0, 50);
        try {
          localStorage.setItem('rsu_eoms_notification_inbox', JSON.stringify(next));
        } catch (e) {
          console.warn(e);
        }
        return next;
      });

      toast({
        title,
        description,
        variant: variant === 'destructive' ? 'destructive' : 'default',
      });
    },
    [toast],
  );

  /**
   * 2B. MODAL / DIALOG ALERT (In-App Intrusive Overlay)
   * Forces user interaction with confirm/cancel buttons.
   */
  const triggerModalAlert = useCallback(
    (options: {
      title: string;
      description: string;
      confirmLabel?: string;
      cancelLabel?: string;
      variant?: 'destructive' | 'default' | 'warning';
      onConfirm?: () => void;
      onCancel?: () => void;
      category?: AppNotificationItem['category'];
    }) => {
      const newItem: AppNotificationItem = {
        id: `modal-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: options.title,
        description: options.description,
        category: options.category || 'system',
        type: 'modal',
        timestamp: new Date().toISOString(),
        read: false,
      };

      setInbox((prev) => {
        const next = [newItem, ...prev].slice(0, 50);
        try {
          localStorage.setItem('rsu_eoms_notification_inbox', JSON.stringify(next));
        } catch (e) {
          console.warn(e);
        }
        return next;
      });

      setModalState({
        isOpen: true,
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        variant: options.variant || 'default',
        onConfirm: options.onConfirm,
        onCancel: options.onCancel,
      });
    },
    [],
  );

  const closeModalAlert = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const markAsRead = useCallback(
    (id: string) => {
      const updated = inbox.map((item) => (item.id === id ? { ...item, read: true } : item));
      saveInbox(updated);
    },
    [inbox, saveInbox],
  );

  const markAllAsRead = useCallback(() => {
    const updated = inbox.map((item) => ({ ...item, read: true }));
    saveInbox(updated);
  }, [inbox, saveInbox]);

  const clearInbox = useCallback(() => {
    saveInbox([]);
  }, [saveInbox]);

  const unreadCount = inbox.filter((item) => !item.read).length;

  return {
    permission,
    isSwRegistered,
    requestPermission,
    triggerLocalNotification,
    triggerWebPushNotification,
    triggerToast,
    triggerModalAlert,
    modalState,
    closeModalAlert,
    inbox,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearInbox,
  };
}
