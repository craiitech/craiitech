
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface FeedbackDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  feedback: string;
}

export function FeedbackDialog({ isOpen, onOpenChange, feedback }: FeedbackDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejection Feedback</DialogTitle>
          <DialogDescription>
            This is the feedback provided by the approver for the rejected submission.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 rounded-md border bg-muted p-4 text-sm">
          {feedback}
        </div>
      </DialogContent>
    </Dialog>
  );
}
