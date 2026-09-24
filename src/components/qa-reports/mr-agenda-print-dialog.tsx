'use client';

import React, { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ManagementReview, Signatories } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, FileText, ZoomIn, ZoomOut, RotateCcw, CheckCircle2, ShieldCheck, ExternalLink } from 'lucide-react';
import { MRAgendaPrintTemplate } from './mr-agenda-print-template';

interface MRAgendaPrintDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  review: ManagementReview | null;
  signatories?: Signatories | null;
  campusName?: string;
}

export function MRAgendaPrintDialog({
  isOpen,
  onOpenChange,
  review,
  signatories,
  campusName = 'University-Wide (Institutional)',
}: MRAgendaPrintDialogProps) {
  const [zoomScale, setZoomScale] = useState<number>(100);

  if (!review) return null;

  const handlePrint = () => {
    try {
      const pageTitle = `MR Agenda & Presentation Matrix - ${review.title || 'Management Review'}`;
      const reportHtml = renderToStaticMarkup(
        <MRAgendaPrintTemplate review={review} signatories={signatories} campusName={campusName} />,
      );

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${pageTitle}</title>
              <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
              <style>
                @page {
                  size: 11in 8.5in landscape !important;
                  margin: 0.4in !important;
                }
                @media print {
                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                }
              </style>
            </head>
            <body class="bg-white">
              ${reportHtml}
              <script>
                window.onload = function() {
                  window.focus();
                  window.print();
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      console.error('Print preview failed:', err);
      window.print();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-4 border-b bg-slate-50 dark:bg-slate-800/60 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Institutional Print Preview</span>
              </div>
              <DialogTitle className="text-base font-black uppercase tracking-tight">
                ISO 21001:2018 MR Agenda &amp; Presentation Matrix
              </DialogTitle>
              <DialogDescription className="text-xs">
                Official document with Romblon State University headings, ISO 21001:2018 Clause 9.3 inputs, and
                signatories.
              </DialogDescription>
            </div>

            {/* Zoom Controls & Print Button */}
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-md bg-white dark:bg-slate-900 shadow-sm p-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-xs"
                  onClick={() => setZoomScale((prev) => Math.max(50, prev - 10))}
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[10px] font-mono font-bold px-2 text-muted-foreground w-12 text-center">
                  {zoomScale}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-xs"
                  onClick={() => setZoomScale((prev) => Math.min(150, prev + 10))}
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-xs border-l"
                  onClick={() => setZoomScale(100)}
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>

              <Button
                onClick={handlePrint}
                className="h-9 font-black uppercase text-xs tracking-wider gap-2 shadow-md shadow-primary/20"
              >
                <Printer className="h-4 w-4" /> Print Document
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Scaled Preview Canvas */}
        <ScrollArea className="flex-1 bg-slate-200/70 dark:bg-slate-950 p-6">
          <div className="flex justify-center items-start min-h-full pb-8">
            <div
              className="bg-white text-black shadow-2xl rounded-sm border border-slate-300 dark:border-slate-800 transition-transform origin-top"
              style={{
                transform: `scale(${zoomScale / 100})`,
                marginBottom: `${Math.max(0, (zoomScale - 100) * 8)}px`,
              }}
            >
              <MRAgendaPrintTemplate review={review} signatories={signatories} campusName={campusName} />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-3 border-t bg-slate-50 dark:bg-slate-800/60 shrink-0 flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Formatted for standard 11" x 8.5" (Landscape) or Legal sheet</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-1.5 font-bold">
              <Printer className="h-3.5 w-3.5" /> Print Now
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
