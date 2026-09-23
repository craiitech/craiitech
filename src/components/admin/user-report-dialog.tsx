'use client';

import React, { useState, useMemo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { User, Role, Campus, Unit, Signatories } from '@/lib/types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, ZoomIn, ZoomOut, RotateCcw, Users, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { UserReportPrintTemplate } from './user-report-print-template';

interface UserReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  allUsers: User[];
  filteredUsers: User[];
  roles: Role[];
  campuses: Campus[];
  units: Unit[];
  signatories?: Signatories | null;
  adminName?: string;
  currentSearchTerm?: string;
  currentFilterTab?: string;
}

export function UserReportDialog({
  isOpen,
  onOpenChange,
  allUsers,
  filteredUsers,
  roles,
  campuses,
  units,
  signatories,
  adminName = 'System Administrator',
  currentSearchTerm = '',
  currentFilterTab = 'all',
}: UserReportDialogProps) {
  // Scope: 'all' | 'filtered'
  const [scope, setScope] = useState<'all' | 'filtered'>('all');
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all');
  const [zoomScale, setZoomScale] = useState<number>(90);

  // Exclude unapproved accounts and incomplete registrations: only bona fide users (verified === true AND completed profile) are included
  const isBonaFideApprovedUser = (u: User) => {
    if (!u.verified) return false;
    const isSystemAdmin = u.email === 'admin@eoms.com' || (u.role || '').toLowerCase().includes('admin');
    if (isSystemAdmin) return true;
    return Boolean(u.roleId || u.role) && Boolean(u.campusId);
  };

  const approvedAllUsers = useMemo(() => allUsers.filter(isBonaFideApprovedUser), [allUsers]);
  const approvedFilteredUsers = useMemo(() => filteredUsers.filter(isBonaFideApprovedUser), [filteredUsers]);

  // Compute users to display in report
  const displayUsers = useMemo(() => {
    let baseList = scope === 'filtered' ? [...approvedFilteredUsers] : [...approvedAllUsers];

    // Additional campus filter inside dialog
    if (selectedCampusId !== 'all') {
      baseList = baseList.filter((u) => u.campusId === selectedCampusId);
    }

    return baseList;
  }, [scope, approvedAllUsers, approvedFilteredUsers, selectedCampusId]);

  const selectedCampusName = useMemo(() => {
    if (selectedCampusId === 'all') return 'All Campuses';
    return campuses.find((c) => c.id === selectedCampusId)?.name || 'Specified Campus';
  }, [selectedCampusId, campuses]);

  const scopeTitle = useMemo(() => {
    if (scope === 'all') return `Approved Bona Fide Accounts (${displayUsers.length} Users)`;
    const searchNote = currentSearchTerm ? ` matching "${currentSearchTerm}"` : '';
    const tabNote = currentFilterTab !== 'all' ? ` [Tab: ${currentFilterTab}]` : '';
    return `Filtered Approved View: ${displayUsers.length} Users${searchNote}${tabNote}`;
  }, [scope, displayUsers.length, currentSearchTerm, currentFilterTab]);

  const handleZoomIn = () => setZoomScale((prev) => Math.min(prev + 10, 140));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(prev - 10, 60));
  const handleZoomReset = () => setZoomScale(90);

  const handlePrint = () => {
    try {
      const reportHtml = renderToStaticMarkup(
        <UserReportPrintTemplate
          users={displayUsers}
          roles={roles}
          campuses={campuses}
          units={units}
          signatories={signatories}
          generatedBy={adminName}
          scopeTitle={scopeTitle}
          selectedCampusName={selectedCampusName}
          selectedStatusName="Approved / Verified Accounts Only"
        />,
      );

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>RSU Bona Fide User Directory - Quality Assurance Office</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
              @page {
                size: 8.5in 13in portrait;
                margin: 0.35in 0.45in 0.45in 0.45in;
              }
              @media print {
                html, body {
                  margin: 0;
                  padding: 0;
                  background: white;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .no-print {
                  display: none !important;
                }
                tr {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                thead {
                  display: table-header-group;
                }
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background: #f8fafc;
                padding: 24px;
                margin: 0;
                color: #000;
              }
            </style>
          </head>
          <body>
            <div class="no-print mb-6 flex justify-center">
              <button 
                onclick="window.print()" 
                class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg shadow-xl font-black uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center gap-2"
              >
                Click to Print Official User Report
              </button>
            </div>
            <div id="print-content">
              ${reportHtml}
            </div>
            <script>
              window.onload = function() {
                window.focus();
              };
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      console.error('Print preview generation failed:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 dark:bg-slate-900 border-primary/20">
        {/* HEADER BAR */}
        <DialogHeader className="p-4 bg-white dark:bg-slate-950 border-b flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <DialogTitle className="text-base font-black uppercase tracking-tight">
                  User Management • Bona Fide Registry Report
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/30">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  RSU Standard Heading
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Official Romblon State University directory of approved and active bona fide personnel.
              </DialogDescription>
            </div>

            {/* QUICK ACTIONS */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 text-xs font-black uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print Document
              </Button>
            </div>
          </div>

          {/* FILTER & CONFIGURATION CONTROLS */}
          <div className="mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs items-center">
            {/* Scope Selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-muted-foreground whitespace-nowrap">Scope:</span>
              <Select value={scope} onValueChange={(val: any) => setScope(val)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Approved Users ({approvedAllUsers.length})</SelectItem>
                  <SelectItem value="filtered">Filtered Approved Users ({approvedFilteredUsers.length})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campus Selector */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-muted-foreground whitespace-nowrap">Campus:</span>
              <Select value={selectedCampusId} onValueChange={setSelectedCampusId}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campuses</SelectItem>
                  {campuses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Scope Indicator */}
            <div className="flex items-center">
              <Badge
                variant="secondary"
                className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px] font-bold py-1 px-2.5 flex items-center gap-1"
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Bona Fide (Approved Only)
              </Badge>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center justify-end gap-1">
              <span className="font-mono text-[10px] text-muted-foreground mr-1">{zoomScale}%</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoomScale <= 60}
                className="h-7 w-7"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleZoomReset} className="h-7 w-7" title="Reset Zoom">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoomScale >= 140}
                className="h-7 w-7"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* DOCUMENT PREVIEW CONTAINER */}
        <ScrollArea className="flex-1 p-4 overflow-y-auto">
          <div className="flex justify-center min-w-[700px]">
            <div
              style={{
                transform: `scale(${zoomScale / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
              }}
              className="bg-white text-black shadow-2xl rounded-sm border border-slate-300 my-4"
            >
              <UserReportPrintTemplate
                users={displayUsers}
                roles={roles}
                campuses={campuses}
                units={units}
                signatories={signatories}
                generatedBy={adminName}
                scopeTitle={scopeTitle}
                selectedCampusName={selectedCampusName}
                selectedStatusName="Approved / Verified Accounts Only"
              />
            </div>
          </div>
        </ScrollArea>

        {/* FOOTER BAR */}
        <DialogFooter className="p-3 bg-white dark:bg-slate-950 border-t flex flex-row items-center justify-between flex-shrink-0">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>
              Approved bona fide records: <strong className="text-foreground">{displayUsers.length}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
              Close Preview
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs font-black uppercase tracking-wider"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print Report
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default UserReportDialog;
