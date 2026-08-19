'use client';

import React, { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ManagementReviewOutput, Signatories } from '@/lib/types';
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
  FileText,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  CheckCircle2,
  ListFilter,
  ShieldCheck,
} from 'lucide-react';
import {
  ActionableDecisionPrintTemplate,
  ActionableDecisionsRegisterPrintTemplate,
} from './actionable-decision-print-template';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ActionableDecisionPrintPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  output?: ManagementReviewOutput | null;
  outputs?: ManagementReviewOutput[];
  reviewMap: Map<string, { title: string; year: string }>;
  unitMap: Map<string, string>;
  campusMap: Map<string, string>;
  signatories?: Signatories;
  selectedYear?: string;
}

export function ActionableDecisionPrintPreviewDialog({
  isOpen,
  onOpenChange,
  output,
  outputs = [],
  reviewMap,
  unitMap,
  campusMap,
  signatories,
  selectedYear = 'all',
}: ActionableDecisionPrintPreviewDialogProps) {
  // 'single' | 'register'
  const [reportMode, setReportMode] = useState<'single' | 'register'>(output ? 'single' : 'register');
  const [selectedOutputId, setSelectedOutputId] = useState<string>(output?.id || outputs[0]?.id || '');
  const [zoomScale, setZoomScale] = useState<number>(100);

  // If output prop changes or dialog opens, sync
  React.useEffect(() => {
    if (output) {
      setSelectedOutputId(output.id);
      setReportMode('single');
    } else if (outputs.length > 0 && !selectedOutputId) {
      setSelectedOutputId(outputs[0].id);
    }
  }, [output, outputs]);

  const activeOutput = React.useMemo(() => {
    if (output && output.id === selectedOutputId) return output;
    return outputs.find((o) => o.id === selectedOutputId) || output || outputs[0] || null;
  }, [output, outputs, selectedOutputId]);

  const reviewInfo = React.useMemo(() => {
    if (!activeOutput)
      return { title: 'Institutional Management Review', year: selectedYear !== 'all' ? selectedYear : '' };
    return reviewMap.get(activeOutput.mrId) || { title: 'Institutional Management Review', year: '' };
  }, [activeOutput, reviewMap, selectedYear]);

  const handlePrint = () => {
    try {
      let reportHtml = '';
      let pageTitle = '';
      let pageSizeStyle = '@page { size: 8.5in 13in !important; margin: 0.5in !important; }';

      if (reportMode === 'single' && activeOutput) {
        pageTitle = `Decision Report - ${activeOutput.description?.substring(0, 30) || 'MR Directive'}`;
        reportHtml = renderToStaticMarkup(
          <ActionableDecisionPrintTemplate
            output={activeOutput}
            reviewTitle={reviewInfo.title}
            reviewYear={reviewInfo.year}
            unitMap={unitMap}
            campusMap={campusMap}
            signatories={signatories}
          />,
        );
      } else {
        pageTitle = `Actionable Decisions Control Register - ${selectedYear !== 'all' ? `Year ${selectedYear}` : 'All Sessions'}`;
        pageSizeStyle = '@page { size: 13in 8.5in !important; margin: 0.5in !important; }';
        reportHtml = renderToStaticMarkup(
          <ActionableDecisionsRegisterPrintTemplate
            outputs={outputs}
            reviewTitle={selectedYear !== 'all' ? `Review Year ${selectedYear}` : undefined}
            year={selectedYear}
            unitMap={unitMap}
            campusMap={campusMap}
            signatories={signatories}
          />,
        );
      }

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
                ${pageSizeStyle}
                @media print {
                  body {
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
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  background: #f1f5f9;
                  padding: 30px;
                  color: black;
                }
              </style>
            </head>
            <body>
              <div class="no-print mb-6 flex justify-center items-center gap-4">
                <button
                  onclick="window.print()"
                  style="cursor: pointer;"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg shadow-xl font-bold uppercase text-xs tracking-widest transition-all"
                >
                  Click to Print Document
                </button>
                <button
                  onclick="window.close()"
                  style="cursor: pointer;"
                  class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg shadow-md font-bold uppercase text-xs tracking-widest transition-all"
                >
                  Close Window
                </button>
              </div>
              <div id="print-content">${reportHtml}</div>
              <script>
                // Auto trigger print prompt on load
                window.onload = function() {
                  // Optional auto-print or leave user control
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      console.error('Error generating print view:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[92vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-slate-900/95 text-slate-100 backdrop-blur-md">
        {/* Header Toolbar */}
        <DialogHeader className="p-4 px-6 bg-slate-950/90 border-b border-slate-800 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20 text-primary">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                  Actionable Decisions Report &amp; Print Preview
                  <Badge variant="outline" className="border-primary/40 text-primary text-[10px] font-black uppercase">
                    EOMS ISO 21001
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Official Institutional Management Review decision tracking documentation.
                </DialogDescription>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Report Type Selector */}
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                <Button
                  size="sm"
                  variant={reportMode === 'single' ? 'default' : 'ghost'}
                  onClick={() => setReportMode('single')}
                  className={cn(
                    'h-7 text-[10px] font-black uppercase tracking-wider px-3',
                    reportMode === 'single' ? 'bg-primary text-primary-foreground' : 'text-slate-300 hover:text-white',
                  )}
                >
                  <FileText className="h-3 w-3 mr-1" /> Single Decision
                </Button>
                <Button
                  size="sm"
                  variant={reportMode === 'register' ? 'default' : 'ghost'}
                  onClick={() => setReportMode('register')}
                  className={cn(
                    'h-7 text-[10px] font-black uppercase tracking-wider px-3',
                    reportMode === 'register'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-slate-300 hover:text-white',
                  )}
                >
                  <Layers className="h-3 w-3 mr-1" /> Control Register ({outputs.length})
                </Button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-slate-300 hover:text-white"
                  onClick={() => setZoomScale((z) => Math.max(50, z - 10))}
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-[10px] font-mono font-bold px-1 text-slate-300">{zoomScale}%</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-slate-300 hover:text-white"
                  onClick={() => setZoomScale((z) => Math.min(150, z + 10))}
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-slate-300 hover:text-white"
                  onClick={() => setZoomScale(100)}
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Sub-selector for single decision mode if multiple decisions exist */}
          {reportMode === 'single' && outputs.length > 1 && (
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-2">
              <label className="text-[10px] font-black uppercase text-slate-400 whitespace-nowrap">
                Select Decision:
              </label>
              <Select value={selectedOutputId} onValueChange={setSelectedOutputId}>
                <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700 text-white font-medium">
                  <SelectValue placeholder="Choose a decision item..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {outputs.map((opt, i) => (
                    <SelectItem key={opt.id} value={opt.id} className="text-xs">
                      #{i + 1} - {opt.lineNumber ? `[Line ${opt.lineNumber}] ` : ''}
                      {opt.description?.substring(0, 80)}... ({opt.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </DialogHeader>

        {/* Scrollable Paper Preview Viewport */}
        <ScrollArea className="flex-1 bg-slate-950/70 p-6 overflow-auto">
          <div className="flex justify-center items-start min-h-full py-4">
            <div
              style={{
                transform: `scale(${zoomScale / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
              }}
              className="bg-white text-black shadow-2xl rounded-sm p-10 border border-slate-300 min-w-fit"
            >
              {reportMode === 'single' ? (
                activeOutput ? (
                  <ActionableDecisionPrintTemplate
                    output={activeOutput}
                    reviewTitle={reviewInfo.title}
                    reviewYear={reviewInfo.year}
                    unitMap={unitMap}
                    campusMap={campusMap}
                    signatories={signatories}
                  />
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p className="font-bold">No decision record selected for preview.</p>
                  </div>
                )
              ) : (
                <ActionableDecisionsRegisterPrintTemplate
                  outputs={outputs}
                  reviewTitle={selectedYear !== 'all' ? `Review Year ${selectedYear}` : undefined}
                  year={selectedYear}
                  unitMap={unitMap}
                  campusMap={campusMap}
                  signatories={signatories}
                />
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="p-4 px-6 bg-slate-950 border-t border-slate-800 shrink-0 flex flex-row justify-between items-center">
          <div className="text-[11px] text-slate-400">
            {reportMode === 'single' ? (
              <span>Document formatted for Standard Folio / Letter (8.5" x 13" Portrait)</span>
            ) : (
              <span>Document formatted for Long Landscape Folio (13" x 8.5" Landscape)</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-bold uppercase"
            >
              Close Preview
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider px-6 shadow-lg shadow-primary/20"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Print Report Now
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
