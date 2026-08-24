'use client';

import React, { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Printer,
  FileDown,
  BookOpen,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { SupportCenterPrintTemplate } from './support-center-print-template';

interface SupportCenterPdfDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  preparedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
}

export function SupportCenterPdfDialog({
  isOpen,
  onOpenChange,
  preparedBy,
  reviewedBy,
  approvedBy,
}: SupportCenterPdfDialogProps) {
  const [zoomScale, setZoomScale] = useState<number>(100);

  const handleZoomIn = () => setZoomScale((prev) => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(prev - 10, 60));
  const handleZoomReset = () => setZoomScale(100);

  const handlePrint = () => {
    try {
      const reportHtml = renderToStaticMarkup(
        <SupportCenterPrintTemplate preparedBy={preparedBy} reviewedBy={reviewedBy} approvedBy={approvedBy} />,
      );

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>RSU EOMS Portal - Support Center & User Manual</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
              @page {
                size: 8.5in 11in;
                margin: 0.4in;
              }
              @media print {
                html, body {
                  margin: 0;
                  padding: 0;
                  background: white;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                  overflow: visible;
                }
                .no-print {
                  display: none !important;
                }
                .page-break-inside-avoid {
                  break-inside: avoid;
                  page-break-inside: avoid;
                }
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background: #f8fafc;
                padding: 0;
                margin: 0;
                color: #000;
              }
              table {
                border-collapse: collapse !important;
                table-layout: fixed !important;
                width: 100% !important;
                border: 1.5px solid #000 !important;
                margin-top: 6px !important;
                margin-bottom: 12px !important;
              }
              td, th {
                border: 1px solid #000 !important;
                overflow: hidden !important;
                word-wrap: break-word !important;
                padding: 4px 6px !important;
              }
              th {
                text-align: center !important;
                vertical-align: middle !important;
                background-color: #f1f5f9 !important;
                font-weight: 900 !important;
                text-transform: uppercase !important;
                color: #000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            </style>
          </head>
          <body>
            <div class="no-print" style="padding: 16px 24px; background: #0f172a; color: white; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; position: sticky; top: 0; z-index: 1000;">
              <div>
                <h2 style="margin: 0; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">RSU EOMS Support Center & Operations Manual (PDF)</h2>
                <p style="margin: 2px 0 0 0; font-size: 11px; color: #94a3b8;">Comprehensive Enterprise User Guide & Quality Standard</p>
              </div>
              <button onclick="window.print()" style="padding: 10px 24px; background: #1B6535; color: white; border: none; border-radius: 6px; font-weight: 900; font-size: 12px; text-transform: uppercase; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                Print / Save as PDF
              </button>
            </div>
            <div id="print-content" style="padding: 20px 0;">
              ${reportHtml}
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      console.error('Failed to open support center print window', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-900 border-slate-800 text-white">
        {/* HEADER BAR */}
        <DialogHeader className="p-4 bg-slate-950/80 border-b border-slate-800 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-primary/20 text-primary border-primary/30 text-[10px] font-black uppercase tracking-wider"
                >
                  Official Standard
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-black uppercase tracking-wider"
                >
                  ISO 21001:2018 Compliant
                </Badge>
              </div>
              <DialogTitle className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-100 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Support Center &amp; User Operations Manual
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Official institutional handbook covering all portal workflows, role guides, risk protocols, FAQs, and
                support SLAs.
              </DialogDescription>
            </div>

            {/* CONTROLS */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              {/* ZOOM CONTROLS */}
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-300 hover:text-white"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[10px] font-mono font-bold px-1.5 text-slate-300 min-w-[40px] text-center">
                  {zoomScale}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-300 hover:text-white"
                  onClick={handleZoomIn}
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-300 hover:text-white"
                  onClick={handleZoomReset}
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* ACTION PRINT / DOWNLOAD BUTTON */}
              <Button
                onClick={handlePrint}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider h-8 gap-1.5 shadow-md"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Print / Download PDF</span>
                <span className="sm:hidden">Print PDF</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* PREVIEW CANVAS */}
        <ScrollArea className="flex-1 bg-slate-950 p-4 sm:p-8">
          <div
            className="mx-auto transition-transform origin-top shadow-2xl rounded"
            style={{
              transform: `scale(${zoomScale / 100})`,
              transformOrigin: 'top center',
              width: '8.5in',
            }}
          >
            <div className="bg-white text-black p-4 rounded shadow-lg">
              <SupportCenterPrintTemplate preparedBy={preparedBy} reviewedBy={reviewedBy} approvedBy={approvedBy} />
            </div>
          </div>
        </ScrollArea>

        {/* FOOTER */}
        <DialogFooter className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Standard Software Support Manual • Letter / Folio Compatible</span>
          </div>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold text-xs h-8"
          >
            <FileDown className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Save as PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
