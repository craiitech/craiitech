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

  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);

  // Check initial permission & service worker support & load persisted state
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
      const savedDeleted = localStorage.getItem('rsu_eoms_notification_deleted_ids');
      if (savedDeleted) {
        setDeletedIds(JSON.parse(savedDeleted));
      }
      const savedRead = localStorage.getItem('rsu_eoms_notification_read_ids');
      if (savedRead) {
        setReadIds(JSON.parse(savedRead));
      }
    } catch (e) {
      console.warn('Could not parse notification state from localStorage', e);
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

  // Save deleted IDs to localStorage
  const saveDeletedIds = useCallback((ids: string[]) => {
    setDeletedIds(ids);
    try {
      localStorage.setItem('rsu_eoms_notification_deleted_ids', JSON.stringify(ids));
    } catch (e) {
      console.warn('Failed to save deleted notification IDs', e);
    }
  }, []);

  // Save read IDs to localStorage
  const saveReadIds = useCallback((ids: string[]) => {
    setReadIds(ids);
    try {
      localStorage.setItem('rsu_eoms_notification_read_ids', JSON.stringify(ids));
    } catch (e) {
      console.warn('Failed to save read notification IDs', e);
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

      toast({
        title: `[Foreground OS Alert] ${title}`,
        description: options.body,
      });
    },
    [toast],
  );

  /**
   * 1B. WEB PUSH NOTIFICATIONS
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

      toast({
        title: `[Background Web Push] ${title}`,
        description: options.body,
      });
    },
    [toast],
  );

  /**
   * 2A. TOAST NOTIFICATION
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
   * 2B. MODAL / DIALOG ALERT
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
      const updatedInbox = inbox.map((item) => (item.id === id ? { ...item, read: true } : item));
      saveInbox(updatedInbox);

      if (!readIds.includes(id)) {
        saveReadIds([...readIds, id]);
      }
    },
    [inbox, readIds, saveInbox, saveReadIds],
  );

  const toggleRead = useCallback(
    (id: string, isCurrentlyRead?: boolean) => {
      const targetReadState = isCurrentlyRead !== undefined ? !isCurrentlyRead : !readIds.includes(id);

      const updatedInbox = inbox.map((item) => (item.id === id ? { ...item, read: targetReadState } : item));
      saveInbox(updatedInbox);

      if (targetReadState) {
        if (!readIds.includes(id)) {
          saveReadIds([...readIds, id]);
        }
        toast({
          title: 'Marked as Read',
          description: 'Notification status updated to read.',
        });
      } else {
        const updatedReadIds = readIds.filter((rId) => rId !== id);
        saveReadIds(updatedReadIds);
        toast({
          title: 'Marked as Unread',
          description: 'Notification status updated to unread.',
        });
      }
    },
    [inbox, readIds, saveInbox, saveReadIds, toast],
  );

  const markAllAsRead = useCallback(
    (allItemIds?: string[]) => {
      const updatedInbox = inbox.map((item) => ({ ...item, read: true }));
      saveInbox(updatedInbox);

      const targetIds = Array.from(new Set([...readIds, ...inbox.map((i) => i.id), ...(allItemIds || [])]));
      saveReadIds(targetIds);

      toast({
        title: 'All Notifications Checked',
        description: 'All notifications marked as read.',
      });
    },
    [inbox, readIds, saveInbox, saveReadIds, toast],
  );

  const deleteNotification = useCallback(
    (id: string) => {
      const updatedInbox = inbox.filter((item) => item.id !== id);
      saveInbox(updatedInbox);

      if (!deletedIds.includes(id)) {
        saveDeletedIds([...deletedIds, id]);
      }

      toast({
        title: 'Notification Deleted',
        description: 'The notification was removed from your hub.',
      });
    },
    [inbox, deletedIds, saveInbox, saveDeletedIds, toast],
  );

  const clearInbox = useCallback(
    (allItemIds?: string[]) => {
      const currentIds = [...inbox.map((i) => i.id), ...(allItemIds || [])];
      saveInbox([]);
      saveDeletedIds(Array.from(new Set([...deletedIds, ...currentIds])));

      toast({
        title: 'Notification Hub Cleared',
        description: 'All notifications have been removed.',
      });
    },
    [inbox, deletedIds, saveInbox, saveDeletedIds, toast],
  );

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
    deletedIds,
    readIds,
    unreadCount,
    markAsRead,
    toggleRead,
    markAllAsRead,
    deleteNotification,
    clearInbox,
  };
}
