
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import type { UnitMonitoringRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Calendar, School, ShieldAlert, DoorOpen, History, LayoutDashboard, User, ClipboardCheck, Building, AlertTriangle, FileDown, Printer, CalendarSearch } from 'lucide-react';
import { format } from 'date-fns';
import { MonitoringFormDialog } from '@/components/monitoring/monitoring-form-dialog';
import { MonitoringAnalytics } from '@/components/monitoring/monitoring-analytics';
import { MonitoringFindings } from '@/components/monitoring/monitoring-findings';
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
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { monitoringGroups } from '@/lib/monitoring-checklist-items';
import ReactDOMServer from 'react-dom/server';
import { MonitoringPrintTemplate } from '@/components/monitoring/monitoring-print-template';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

export default function MonitoringPage() {
  const { isAdmin, isUserLoading, user, userProfile, isSupervisor, userRole } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<UnitMonitoringRecord | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Use a strictly gated flag to prevent early permission errors
  const canInitiateQueries = !isUserLoading && !!user && (!!userProfile || isAdmin);

  const monitoringRecordsQuery = useMemoFirebase(
    () => {
        if (!firestore || !canInitiateQueries) return null;
        
        const baseRef = collection(firestore, 'unitMonitoringRecords');

        // Oversight roles execute unfiltered queries
        if (isAdmin || userRole === 'Auditor') {
            return query(baseRef, orderBy('visitDate', 'desc'));
        }
        
        if (!userProfile) return null;

        // Supervisors filter by campus
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

        // Unit Users filter by unit
        if (userProfile.unitId) {
            return query(
                baseRef, 
                where('unitId', '==', userProfile.unitId), 
                orderBy('visitDate', 'desc')
            );
        }

        return null;
    },
    [firestore, canInitiateQueries, userProfile, isAdmin, isSupervisor, userRole]
  );
  
  const { data: allRecords, isLoading: isLoadingRecords } = useCollection<UnitMonitoringRecord>(monitoringRecordsQuery);

  const filteredRecords = useMemo(() => {
    if (!allRecords) return [];
    return allRecords.filter(record => {
        const vDate = record.visitDate instanceof Timestamp ? record.visitDate.toDate() : new Date(record.visitDate);
        return vDate.getFullYear() === selectedYear;
    });
  }, [allRecords, selectedYear]);

  const campusesQuery = useMemoFirebase(() => (firestore && canInitiateQueries ? collection(firestore, 'campuses') : null), [firestore, canInitiateQueries]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore && canInitiateQueries ? collection(firestore, 'units') : null), [firestore, canInitiateQueries]);
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
        if (!printWindow) {
            alert('Please allow popups to print the monitoring report.');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Monitoring Report - ${uName}</title>
                <meta charset="utf-8">
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                @media print {
                    body { margin: 0; padding: 0; background: white; }
                    .no-print { display: none; }
                    @page { margin: 1cm; }
                }
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid black !important; padding: 8px; }
                </style>
            </head>
            <body class="bg-white">
                <div id="print-content">
                    ${reportHtml}
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(() => {
                            window.print();
                            window.onafterprint = function() { window.close(); };
                        }, 1000);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
    } catch (err) {
        console.error("Print generation error:", err);
        alert("Failed to generate the print report.");
    }
  };

  /**
   * Refined Compliance Calculation
   * Items marked "Not Applicable" are removed from both numerator and denominator.
   */
  const calculateCompliance = (record: UnitMonitoringRecord) => {
    if (!record.observations || record.observations.length === 0) return 0;
    
    // Denominator: All items EXCEPT those marked "Not Applicable"
    const applicable = record.observations.filter(o => o.status !== 'Not Applicable');
    if (applicable.length === 0) return 0;
    
    // Numerator: Only items marked "Available"
    const available = applicable.filter(o => o.status === 'Available').length;
    
    return Math.round((available / applicable.length) * 100);
  };

  const getComplianceVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 50) return 'secondary';
    return 'destructive';
  };

  const safeFormatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return format(d, 'PPP');
  };

  const handleExportToExcel = () => {
    if (!filteredRecords || filteredRecords.length === 0) return;

    const exportData = filteredRecords.flatMap(record => {
        const vDate = record.visitDate instanceof Timestamp ? record.visitDate.toDate() : new Date(record.visitDate);
        
        return record.observations.map(obs => {
            const category = monitoringGroups.find(group => group.items.includes(obs.item))?.category || 'General';
            
            return {
                'Campus': campusMap.get(record.campusId) || 'Unknown',
                'Unit': unitMap.get(record.unitId) || 'Unknown',
                'Visit Date': format(vDate, 'yyyy-MM-dd'),
                'Office/Room': record.roomNumber || 'N/A',
                'Officer in Charge': record.officerInCharge || 'N/A',
                'Monitor': record.monitorName || 'N/A',
                'Category': category,
                'Checklist Item': obs.item,
                'Status': obs.status,
                'Findings/Remarks': obs.remarks || ''
            };
        });
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Monitoring Findings');
    XLSX.writeFile(workbook, `RSU-EOMS-Monitoring-Report-${selectedYear}.xlsx`);
  };

  const isLoading = isUserLoading || isLoadingRecords || isLoadingCampuses || isLoadingUnits;

  if (!isUserLoading && !canInitiateQueries) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <ShieldAlert className="h-16 w-16 text-destructive opacity-50" />
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to access the monitoring module.</p>
        </div>
        <Button onClick={() => router.push('/dashboard')}>Return to Home</Button>
      </div>
    );
  }

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
                <Button variant="outline" onClick={handleExportToExcel} disabled={isLoading || !filteredRecords || filteredRecords.length === 0}>
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

        {!isLoading && filteredRecords?.length === 0 && isUnitOnlyView ? (
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
                                    <TableHead>Date of Visit</TableHead>
                                    {!isUnitOnlyView && <TableHead>Campus</TableHead>}
                                    {!isUnitOnlyView && <TableHead>Unit</TableHead>}
                                    <TableHead>Room</TableHead>
                                    <TableHead>Officer in Charge</TableHead>
                                    <TableHead>Compliance %</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {filteredRecords && filteredRecords.length > 0 ? (
                                    filteredRecords.map(record => {
                                      const score = calculateCompliance(record);
                                      return (
                                        <TableRow key={record.id} className="cursor-pointer" onClick={() => handleViewRecord(record)}>
                                            <TableCell className="font-medium text-xs">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                {safeFormatDate(record.visitDate)}
                                            </div>
                                            </TableCell>
                                            {!isUnitOnlyView && (
                                                <TableCell className="text-xs">
                                                <div className="flex items-center gap-2">
                                                    <School className="h-4 w-4 text-muted-foreground" />
                                                    {campusMap.get(record.campusId) || '...'}
                                                </div>
                                                </TableCell>
                                            )}
                                            {!isUnitOnlyView && (
                                                <TableCell className="text-xs">
                                                <div className="flex items-center gap-2">
                                                    <Building className="h-4 w-4 text-muted-foreground" />
                                                    {unitMap.get(record.unitId) || '...'}
                                                </div>
                                                </TableCell>
                                            )}
                                            <TableCell className="text-xs">
                                            <div className="flex items-center gap-2">
                                                <DoorOpen className="h-3 w-3 text-muted-foreground" />
                                                {record.roomNumber || 'N/A'}
                                            </div>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                            <div className="flex items-center gap-2">
                                                <User className="h-3 w-3 text-muted-foreground" />
                                                {record.officerInCharge || 'N/A'}
                                            </div>
                                            </TableCell>
                                            <TableCell>
                                              <Badge 
                                                variant={getComplianceVariant(score)}
                                                className={cn(
                                                  "text-[10px]",
                                                  score >= 80 && "bg-green-500 hover:bg-green-600 text-white"
                                                )}
                                              >
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
                                    <TableCell colSpan={8} className="h-24 text-center">
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
