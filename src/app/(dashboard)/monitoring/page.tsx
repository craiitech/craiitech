
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import type { UnitMonitoringRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, History, LayoutDashboard, ClipboardCheck, AlertTriangle, FileDown, Printer, CalendarSearch, SearchCode } from 'lucide-react';
import { format } from 'date-fns';
import { MonitoringFormDialog } from '@/components/monitoring/monitoring-form-dialog';
import { MonitoringAnalytics } from '@/components/monitoring/monitoring-analytics';
import { MonitoringFindings } from '@/components/monitoring/monitoring-findings';
import { MonitoringUnitExplorer } from '@/components/monitoring/monitoring-unit-explorer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import ReactDOMServer from 'react-dom/server';
import { MonitoringPrintTemplate } from '@/components/monitoring/monitoring-print-template';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

export default function MonitoringPage() {
  const { isAdmin, isUserLoading, userProfile, isSupervisor, userRole } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<UnitMonitoringRecord | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const monitoringRecordsQuery = useMemoFirebase(
    () => {
        if (!firestore || isUserLoading || !userProfile) return null;
        
        const baseRef = collection(firestore, 'unitMonitoringRecords');

        if (isAdmin || userRole === 'Auditor') {
            return query(baseRef, orderBy('visitDate', 'desc'));
        }

        if (isSupervisor) {
             if (userProfile.campusId) {
                 return query(
                    baseRef, 
                    where('campusId', '==', userProfile.campusId), 
                    orderBy('visitDate', 'desc')
                );
             }
             return null;
        }

        if (userProfile.unitId) {
            return query(
                baseRef, 
                where('unitId', '==', userProfile.unitId), 
                orderBy('visitDate', 'desc')
            );
        }

        return null;
    },
    [firestore, isUserLoading, userProfile, isAdmin, isSupervisor, userRole]
  );
  
  const { data: allRecords, isLoading: isLoadingRecords } = useCollection<UnitMonitoringRecord>(monitoringRecordsQuery);

  const filteredRecords = useMemo(() => {
    if (!allRecords) return [];
    return allRecords.filter(record => {
        const vDate = record.visitDate instanceof Timestamp ? record.visitDate.toDate() : new Date(record.visitDate);
        return vDate.getFullYear() === selectedYear;
    });
  }, [allRecords, selectedYear]);

  const campusesQuery = useMemoFirebase(() => (firestore && !isUserLoading && userProfile ? collection(firestore, 'campuses') : null), [firestore, isUserLoading, userProfile]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore && !isUserLoading && userProfile ? collection(firestore, 'units') : null), [firestore, isUserLoading, userProfile]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const campusMap = useMemo(() => new Map(campuses?.map(c => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units?.map(u => [u.id, u.name])), [units]);

  const handleNewVisit = () => {
    setSelectedRecord(null);
    setIsFormOpen(true);
  };

  const handleViewRecord = (record: UnitMonitoringRecord) => {
    setSelectedRecord(record);
    setIsFormOpen(true);
  };

  const handlePrintRecord = (record: UnitMonitoringRecord) => {
    const cName = campusMap.get(record.campusId) || 'Unknown Campus';
    const uName = unitMap.get(record.unitId) || 'Unknown Unit';

    try {
        const reportHtml = ReactDOMServer.renderToStaticMarkup(
          <MonitoringPrintTemplate 
            record={record} 
            campusName={cName} 
            unitName={uName} 
          />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Monitoring Report - ${uName}</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                    @media print { body { margin: 0; padding: 0; background: white; } }
                    body { font-family: sans-serif; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid black !important; padding: 8px; }
                    </style>
                </head>
                <body>${reportHtml}</body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 1000);
        }
    } catch (err) {
        console.error("Print error:", err);
    }
  };

  const calculateCompliance = (record: UnitMonitoringRecord) => {
    if (!record.observations) return 0;
    const applicable = record.observations.filter(o => o.status !== 'Not Applicable');
    const available = applicable.filter(o => o.status === 'Available').length;
    return applicable.length > 0 ? Math.round((available / applicable.length) * 100) : 0;
  };

  const getComplianceVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 50) return 'secondary';
    return 'destructive';
  };

  const safeFormatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return format(d, 'PP');
  };

  const handleExportToExcel = () => {
    if (!filteredRecords.length) return;
    const exportData = filteredRecords.flatMap(record => 
        record.observations.map(obs => ({
            'Campus': campusMap.get(record.campusId) || 'Unknown',
            'Unit': unitMap.get(record.unitId) || 'Unknown',
            'Visit Date': safeFormatDate(record.visitDate),
            'Room': record.roomNumber || 'N/A',
            'OIC': record.officerInCharge || 'N/A',
            'Checklist Item': obs.item,
            'Status': obs.status,
            'Findings': obs.remarks || ''
        }))
    );
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monitoring');
    XLSX.writeFile(workbook, `Monitoring-Report-${selectedYear}.xlsx`);
  };

  const isLoading = isUserLoading || isLoadingRecords || isLoadingCampuses || isLoadingUnits;

  const isUnitOnlyView = !isAdmin && !isSupervisor && userRole !== 'Auditor';

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
                {isUnitOnlyView ? 'Unit Monitoring Status' : 'Unit Monitoring'}
            </h2>
            <p className="text-muted-foreground">
                {isUnitOnlyView ? 'View results from on-site QA monitoring visits.' : 'Record and review on-site monitoring visit findings.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[120px]">
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger>
                        <CalendarSearch className="h-4 w-4 mr-2 opacity-50" />
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            {!isUnitOnlyView && (
                <Button variant="outline" onClick={handleExportToExcel} disabled={isLoading || filteredRecords.length === 0}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export
                </Button>
            )}
            {isAdmin && (
                <Button onClick={handleNewVisit}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Visit
                </Button>
            )}
          </div>
        </div>

        {!isLoading && filteredRecords.length === 0 && isUnitOnlyView ? (
            <Card className="border-dashed py-12 flex flex-col items-center justify-center text-center">
                <div className="bg-muted h-16 w-16 rounded-full flex items-center justify-center mb-4">
                    <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl">Not Yet Monitored in {selectedYear}</CardTitle>
                <CardDescription className="max-w-md mx-auto mt-2">
                    Your unit has no monitoring records logged for the year {selectedYear}. 
                </CardDescription>
            </Card>
        ) : (
            <Tabs defaultValue="performance" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="performance">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        Performance
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        <History className="mr-2 h-4 w-4" />
                        Visit Log
                    </TabsTrigger>
                    <TabsTrigger value="findings">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Gaps & Findings
                    </TabsTrigger>
                    {!isUnitOnlyView && (
                      <TabsTrigger value="explorer">
                          <SearchCode className="mr-2 h-4 w-4" />
                          Unit Explorer
                      </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="performance">
                    <MonitoringAnalytics 
                        records={filteredRecords} 
                        campuses={campuses || []} 
                        units={units || []} 
                        isLoading={isLoading}
                        selectedYear={selectedYear}
                    />
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Monitoring History - {selectedYear}</CardTitle>
                            <CardDescription>
                                Results from on-site monitoring visits for your scope.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                            <div className="flex h-64 items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                            ) : (
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    {!isUnitOnlyView && <TableHead>Campus</TableHead>}
                                    {!isUnitOnlyView && <TableHead>Unit</TableHead>}
                                    <TableHead>Room</TableHead>
                                    <TableHead>Officer in Charge</TableHead>
                                    <TableHead>Compliance %</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {filteredRecords.length > 0 ? (
                                    filteredRecords.map(record => {
                                      const score = calculateCompliance(record);
                                      return (
                                        <TableRow key={record.id} className="cursor-pointer" onClick={() => handleViewRecord(record)}>
                                            <TableCell className="font-medium text-xs">
                                                {safeFormatDate(record.visitDate)}
                                            </TableCell>
                                            {!isUnitOnlyView && (
                                                <TableCell className="text-xs">
                                                    {campusMap.get(record.campusId) || '...'}
                                                </TableCell>
                                            )}
                                            {!isUnitOnlyView && (
                                                <TableCell className="text-xs">
                                                    {unitMap.get(record.unitId) || '...'}
                                                </TableCell>
                                            )}
                                            <TableCell className="text-xs">{record.roomNumber || 'N/A'}</TableCell>
                                            <TableCell className="text-xs">{record.officerInCharge || 'N/A'}</TableCell>
                                            <TableCell>
                                              <Badge variant={getComplianceVariant(score)} className="text-[10px]">
                                                {score}%
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-right space-x-1">
                                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handlePrintRecord(record); }}>
                                                <Printer className="h-4 w-4" />
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleViewRecord(record); }}>
                                                {isAdmin ? 'Edit' : 'View'}
                                            </Button>
                                            </TableCell>
                                        </TableRow>
                                      );
                                    })
                                ) : (
                                    <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                        No monitoring records found for {selectedYear}.
                                    </TableCell>
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="findings">
                    <MonitoringFindings 
                        records={filteredRecords} 
                        campuses={campuses || []} 
                        units={units || []} 
                        isLoading={isLoading} 
                    />
                </TabsContent>

                {!isUnitOnlyView && (
                  <TabsContent value="explorer">
                      <MonitoringUnitExplorer 
                          records={allRecords || []}
                          campuses={campuses || []}
                          units={units || []}
                          isLoading={isLoading}
                          onViewRecord={handleViewRecord}
                          onPrintRecord={handlePrintRecord}
                      />
                  </TabsContent>
                )}
            </Tabs>
        )}
      </div>

      <MonitoringFormDialog
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        record={selectedRecord}
        campuses={campuses || []}
        units={units || []}
        onPrint={handlePrintRecord}
      />
    </>
  );
}
