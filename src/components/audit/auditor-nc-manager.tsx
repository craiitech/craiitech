'use client';

import { useMemo, useState } from 'react';
import type { AuditFinding, AuditSchedule, CorrectiveActionRequest, Campus, Unit, Signatories } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    ShieldAlert, 
    Gavel, 
    Printer, 
    Search, 
    TrendingUp, 
    Building2, 
    CheckCircle2, 
    ExternalLink, 
    PlusCircle, 
    Loader2,
    Activity,
    ClipboardCheck,
    Target,
    User,
    Info,
    ArrowUpRight
} from 'lucide-react';
import { format } from 'date-fns';
import { Timestamp } from '@/firebase/firestore-wrapper';
import { cn, parseDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { renderToStaticMarkup } from 'react-dom/server';
import { CARPrintTemplate } from '@/components/qa-reports/car-print-template';

interface AuditorNCManagerProps {
  findings: AuditFinding[];
  schedules: AuditSchedule[];
  cars: CorrectiveActionRequest[];
  campuses: Campus[];
  units: Unit[];
  signatories?: Signatories;
  campusFilter: string;
  searchTerm: string;
}

export function AuditorNCManager({ 
    findings, 
    schedules, 
    cars, 
    campuses, 
    units, 
    signatories,
    campusFilter,
    searchTerm 
}: AuditorNCManagerProps) {
  const router = useRouter();

  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

  const ncData = useMemo(() => {
    // 1. Filter for Non-Conformance findings only
    let filteredFindings = findings.filter(f => f.type === 'Non-Conformance');

    // 2. Map findings with their parent schedules and existing CARs
    return filteredFindings.map(finding => {
        const schedule = schedules.find(s => s.id === finding.auditScheduleId);
        const linkedCar = cars.find(car => car.findingId === finding.id);
        
        if (!schedule) return null;

        // Apply filters
        if (campusFilter !== 'all' && schedule.campusId !== campusFilter) return null;
        
        const lowerSearch = searchTerm.toLowerCase();
        if (searchTerm) {
            const matches = schedule.targetName.toLowerCase().includes(lowerSearch) ||
                          (schedule.auditorName || '').toLowerCase().includes(lowerSearch) ||
                          finding.isoClause.toLowerCase().includes(lowerSearch);
            if (!matches) return null;
        }

        return {
            finding,
            schedule,
            linkedCar,
            isIssued: !!linkedCar
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => {
        const dateA = parseDate(a.finding.createdAt).getTime();
        const dateB = parseDate(b.finding.createdAt).getTime();
        return dateB - dateA;
    });
  }, [findings, schedules, cars, campusFilter, searchTerm]);

  const stats = useMemo(() => {
    const total = ncData.length;
    const issued = ncData.filter(i => i.isIssued).length;
    const pending = total - issued;
    const closureRate = total > 0 ? Math.round((issued / total) * 100) : 100;

    return { total, issued, pending, closureRate };
  }, [ncData]);

  const handleIssueCar = (item: any) => {
    const params = new URLSearchParams();
    params.set('tab', 'car');
    params.set('action', 'new');
    params.set('findingId', item.finding.id);
    params.set('scheduleId', item.finding.auditScheduleId);
    router.push(`/qa-reports?${params.toString()}`);
  };

  const handlePrintCar = (car: CorrectiveActionRequest) => {
    const cName = campusMap.get(car.campusId) || 'Unknown Campus';
    const uName = unitMap.get(car.unitId) || 'Unknown Unit';

    try {
        const reportHtml = renderToStaticMarkup(
            <CARPrintTemplate 
                car={car} 
                unitName={uName} 
                campusName={cName} 
                signatories={signatories} 
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <html>
                <head>
                    <title>CAR - ${car.carNumber}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @page { size: 8.5in 13in !important; margin: 0.5in !important; }
                        @media print { body { margin: 0 !important; padding: 0 !important; background: white; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }
                        body { font-family: serif; background: #f9fafb; padding: 40px; color: black; font-size: 11pt; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl font-black uppercase text-xs tracking-widest transition-all">Click to Print CAR</button>
                    </div>
                    <div id="print-content" style="padding: 0.1in;">${reportHtml}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      {/* KPI Layer */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-rose-50 border-rose-100 shadow-sm flex flex-col">
              <CardHeader className="pb-2 pt-5 px-6"><CardTitle className="text-[10px] font-black uppercase text-rose-700 tracking-widest">Total NC Findings</CardTitle></CardHeader>
              <CardContent className="px-6 pb-5"><div className="text-3xl font-black text-rose-600 tabular-nums">{stats.total}</div></CardContent>
          </Card>
          <Card className="bg-indigo-50 border-indigo-100 shadow-sm flex flex-col">
              <CardHeader className="pb-2 pt-5 px-6"><CardTitle className="text-[10px] font-black uppercase text-indigo-700 tracking-widest">CARs Formalized</CardTitle></CardHeader>
              <CardContent className="px-6 pb-5"><div className="text-3xl font-black text-indigo-600 tabular-nums">{stats.issued}</div></CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-100 shadow-sm flex flex-col">
              <CardHeader className="pb-2 pt-5 px-6"><CardTitle className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Issuance Pending</CardTitle></CardHeader>
              <CardContent className="px-6 pb-5"><div className="text-3xl font-black text-amber-600 tabular-nums">{stats.pending}</div></CardContent>
          </Card>
          <Card className="bg-emerald-50 border-emerald-100 shadow-sm flex flex-col">
              <CardHeader className="pb-2 pt-5 px-6"><CardTitle className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">Issuance Velocity</CardTitle></CardHeader>
              <CardContent className="px-6 pb-5"><div className="text-3xl font-black text-emerald-600 tabular-nums">{stats.closureRate}%</div></CardContent>
          </Card>
      </div>

      {/* Main NC Table */}
      <Card className="shadow-md border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-4">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-rose-600" />
                      <CardTitle className="text-sm font-black uppercase tracking-tight">Non-Conformance & CAR Bridge Registry</CardTitle>
                  </div>
                  <Badge variant="outline" className="h-5 text-[9px] font-black uppercase border-primary/20 bg-white">
                      Scope: {campusFilter === 'all' ? 'System-Wide' : campusMap.get(campusFilter)}
                  </Badge>
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <div className="overflow-x-auto">
                  <Table>
                      <TableHeader className="bg-muted/30">
                          <TableRow>
                              <TableHead className="pl-8 py-4 text-[10px] font-black uppercase">Unit & Auditor</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Finding & Clause</TableHead>
                              <TableHead className="text-center text-[10px] font-black uppercase">CAR Status</TableHead>
                              <TableHead className="text-right pr-8 text-[10px] font-black uppercase">Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {ncData.map((item, idx) => (
                              <TableRow key={idx} className="hover:bg-muted/20 transition-colors group">
                                  <TableCell className="pl-8 py-5">
                                      <div className="space-y-1">
                                          <p className="font-black text-sm text-slate-900 dark:text-slate-100 leading-tight uppercase group-hover:text-primary transition-colors">{item.schedule.targetName}</p>
                                          <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase">
                                              <User className="h-3 w-3" /> {item.schedule.auditorName || 'TBA'}
                                          </div>
                                      </div>
                                  </TableCell>
                                  <TableCell className="max-w-md py-5">
                                      <div className="space-y-2">
                                          <Badge className="bg-rose-600 text-white border-none h-4 px-1.5 text-[8px] font-black">ISO Clause {item.finding.isoClause}</Badge>
                                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed italic line-clamp-2">"{item.finding.ncStatement || item.finding.description}"</p>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                      {item.linkedCar ? (
                                          <div className="flex flex-col items-center gap-1">
                                              <Badge className="bg-emerald-600 text-white font-black text-[9px] h-5 px-2">CAR {item.linkedCar.carNumber}</Badge>
                                              <p className="text-[7px] font-black text-muted-foreground uppercase">{item.linkedCar.status}</p>
                                          </div>
                                      ) : (
                                          <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 h-5 text-[9px] font-black uppercase animate-pulse">CAR PENDING</Badge>
                                      )}
                                  </TableCell>
                                  <TableCell className="text-right pr-8">
                                      <div className="flex items-center justify-end gap-2">
                                          {item.isIssued ? (
                                              <>
                                                  <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-8 text-[9px] font-black bg-white gap-1.5"
                                                    onClick={() => handlePrintCar(item.linkedCar!)}
                                                  >
                                                      <Printer className="h-3 w-3" /> PRINT
                                                  </Button>
                                                  <Button 
                                                    variant="secondary" 
                                                    size="sm" 
                                                    className="h-8 text-[9px] font-black bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 gap-1.5"
                                                    onClick={() => router.push(`/qa-reports?tab=car&id=${item.linkedCar!.id}`)}
                                                  >
                                                      <Target className="h-3 w-3" /> MANAGE
                                                  </Button>
                                              </>
                                          ) : (
                                              <Button 
                                                size="sm" 
                                                onClick={() => handleIssueCar(item)} 
                                                className="h-8 text-[9px] font-black uppercase bg-indigo-600 hover:bg-indigo-700 shadow-md gap-1.5"
                                              >
                                                  <Gavel className="h-3.5 w-3.5" /> ISSUE CAR
                                              </Button>
                                          )}
                                      </div>
                                  </TableCell>
                              </TableRow>
                          ))}
                          {ncData.length === 0 && (
                              <TableRow>
                                  <TableCell colSpan={4} className="h-40 text-center opacity-20">
                                      <Activity className="h-10 w-10 mx-auto mb-2" />
                                      <p className="text-[10px] font-black uppercase tracking-widest">No unresolved NCs detected for this scope</p>
                                  </TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              </div>
          </CardContent>
          <CardFooter className="bg-muted/5 border-t py-3 px-8">
              <div className="flex items-start gap-4">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                      <strong>Auditor Guideline:</strong> All Non-Conformance (NC) findings must result in an official Corrective Action Request (CAR). This bridge ensures no audit gaps are missed in the institutional quality cycle.
                  </p>
              </div>
          </CardFooter>
      </Card>
    </div>
  );
}
