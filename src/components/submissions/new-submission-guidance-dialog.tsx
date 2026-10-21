'use client';

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
import { Badge } from '@/components/ui/badge';
import { FileEdit, FolderGit2, FileCheck2, ArrowRight, Sparkles, Info, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NewSubmissionGuidanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed?: () => void;
}

export function NewSubmissionGuidanceDialog({ open, onOpenChange, onProceed }: NewSubmissionGuidanceDialogProps) {
  const router = useRouter();

  const handleProceed = () => {
    onOpenChange(false);
    if (onProceed) {
      onProceed();
    } else {
      router.push('/submissions/new');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-primary/20 shadow-2xl rounded-2xl">
        <AlertDialogHeader className="p-6 pb-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-primary text-primary-foreground font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5">
              Protocol Update
            </Badge>
            <Badge
              variant="outline"
              className="text-primary font-bold text-[9px] uppercase tracking-widest border-primary/30"
            >
              EOMS Submission Standards
            </Badge>
          </div>
          <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            New Submission Data Entry Protocol
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground font-medium mt-1 leading-relaxed">
            Please read and acknowledge the updated institutional submission guidelines before proceeding to data entry.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="p-6 space-y-4 text-xs">
          {/* Item 1: Direct System Input */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm shrink-0 mt-0.5">
              <FileEdit className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-[11px] tracking-wide">
                1. Direct System Data Entry Required (No Document Drive Links)
              </h4>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                All required operational plan metrics, SWOT analyses, stakeholder expectations, quality objectives, and
                risk registers must be <strong>inputted directly into the system forms and interactive wizards</strong>.
                Entering standalone Google Drive links as the main document body is <strong>no longer accepted</strong>.
              </p>
            </div>
          </div>

          {/* Item 2: Google Drive Exclusively for Evidences */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20">
            <div className="p-2 rounded-lg bg-amber-600 text-white shadow-sm shrink-0 mt-0.5">
              <FolderGit2 className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-[11px] tracking-wide">
                2. Google Drive Links Exclusively for PPAs Evidences
              </h4>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                Google Drive links are now reserved exclusively for{' '}
                <strong>means of verification and supporting evidences</strong> (e.g., photo documentation, attendance
                sheets, activity outputs, approved activity requests) proving the implementation of your unit&apos;s
                Programs, Projects, and Activities (PPAs). Ensure all shared links have viewing access enabled (
                <strong>&quot;Anyone with the link can view&quot;</strong>).
              </p>
            </div>
          </div>

          {/* Item 3: Terminal Report & Complete Staff Work */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20">
            <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-sm shrink-0 mt-0.5">
              <FileCheck2 className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-[11px] tracking-wide">
                3. Terminal Report Type &amp; Complete Staff Work (CSW)
              </h4>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                Submissions must be prepared in the format of a <strong>Terminal Report</strong> and adhere strictly to{' '}
                <strong>Complete Staff Work (CSW)</strong> principles. Every submission must be thoroughly vetted,
                complete with all supporting evidence, fully calculated, and ready for immediate executive review and
                audit approval.
              </p>
            </div>
          </div>

          {/* Notice Box */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/60 border border-muted-foreground/10 text-[11px] text-muted-foreground">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>
              By proceeding, you confirm that your unit will enter all form data directly into the system and attach
              appropriate Google Drive verification folders.
            </span>
          </div>
        </div>

        <AlertDialogFooter className="p-6 pt-4 bg-muted/30 border-t flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <AlertDialogCancel className="w-full sm:w-auto font-black uppercase text-[10px] tracking-widest h-9 border-muted-foreground/20">
            Review Guidelines Later
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleProceed}
            className="w-full sm:w-auto font-black uppercase text-[10px] tracking-widest h-9 shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
          >
            I Understand — Proceed to Submission
            <ArrowRight className="h-3.5 w-3.5" />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
