'use client';

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
import { ShieldAlert, AlertTriangle, Info, FileCheck, Activity, MessageSquare, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalAlertDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default' | 'warning';
  actionUrl?: string;
  category?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose: () => void;
}

export function ModalAlertDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  actionUrl,
  category,
  onConfirm,
  onCancel,
  onClose,
}: ModalAlertDialogProps) {
  const router = useRouter();

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    if (actionUrl) {
      router.push(actionUrl);
    }
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  const renderIcon = () => {
    if (category === 'submissions') return <FileCheck className="h-5 w-5" />;
    if (category === 'risk') return <Activity className="h-5 w-5" />;
    if (category === 'communications') return <MessageSquare className="h-5 w-5" />;
    if (category === 'accreditation') return <Sparkles className="h-5 w-5" />;
    if (variant === 'destructive') return <ShieldAlert className="h-5 w-5" />;
    if (variant === 'warning') return <AlertTriangle className="h-5 w-5" />;
    return <Info className="h-5 w-5" />;
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md rounded-2xl border-primary/20 bg-background/95 backdrop-blur-xl shadow-2xl p-6">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
                variant === 'destructive' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                variant === 'warning' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                variant === 'default' && 'bg-primary/10 text-primary',
              )}
            >
              {renderIcon()}
            </div>
            <div>
              <AlertDialogTitle className="text-base font-black uppercase tracking-tight text-foreground">
                {title}
              </AlertDialogTitle>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                {category ? `${category.toUpperCase()} ALERT` : 'SYSTEM ALERT'}
              </span>
            </div>
          </div>
          <AlertDialogDescription className="text-xs font-medium text-muted-foreground leading-relaxed pt-1">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 gap-2 sm:gap-0">
          <AlertDialogCancel
            onClick={handleCancel}
            className="text-xs font-black uppercase tracking-wider rounded-xl h-10 border-primary/20 hover:bg-muted"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={cn(
              'text-xs font-black uppercase tracking-wider rounded-xl h-10 shadow-md transition-all',
              variant === 'destructive' && 'bg-rose-600 hover:bg-rose-700 text-white',
              variant === 'warning' && 'bg-amber-600 hover:bg-amber-700 text-white',
              variant === 'default' && 'bg-primary hover:bg-primary/90 text-primary-foreground',
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
