'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlinePrivacyNoticeProps {
  purpose?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Reusable RA 10173 (Data Privacy Act of 2012) inline privacy notice
 * for public-facing intake forms, kiosks, and evaluation portals.
 */
export function InlinePrivacyNotice({
  purpose = 'institutional quality assurance, documentation, and statutory reporting',
  className,
  compact = false,
}: InlinePrivacyNoticeProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-primary/20 bg-primary/5 text-slate-700 dark:text-slate-300',
        compact ? 'p-3 text-[11px]' : 'p-4 text-xs',
        className,
      )}
      role="note"
      aria-label="Data Privacy Notice"
    >
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <p className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide text-[10px]">
            Data Privacy Notice (RA 10173)
          </p>
          <p>
            Romblon State University collects and processes the information in this form strictly for {purpose}. Data is
            stored securely and retained only as needed under University retention schedules. By submitting, you
            acknowledge our{' '}
            <Link href="/privacy" className="text-primary underline font-semibold hover:text-primary/80">
              Data Privacy Statement
            </Link>
            . For privacy concerns or data subject requests, email{' '}
            <a href="mailto:dpo@rsu.edu.ph" className="text-primary underline font-semibold hover:text-primary/80">
              dpo@rsu.edu.ph
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
