
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import type { UnitMonitoringRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Calendar, School, ShieldAlert, DoorOpen, History, LayoutDashboard, User, ClipboardCheck, Building, AlertTriangle, FileDown, Printer } from 'lucide-react';
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

export default function MonitoringPage() {
  const { isAdmin, isUserLoading, user, userProfile, isSupervisor, userRole } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<UnitMonitoringRecord | null>(null);

  // Admins can view monitoring even if they don't have a profile doc in /users
  const canViewMonitoring = !!userProfile || isAdmin;

  const monitoringRecordsQuery = useMemoFirebase(
    () => {
        if (!firestore || !user || !canViewMonitoring) return null;
        
        const baseRef = collection(firestore, 'unitMonitoringRecords');

        // Oversight roles execute unfiltered queries (authorized by isAuditor/isAdmin in rules)
        if (isAdmin || userRole === 'Auditor') {
            return query(baseRef, orderBy('visitDate', 'desc'));
        }
        
        if (!userProfile) return null;

        // Supervisors filter by campus (authorized by resource.data.campusId in rules)
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

        // Unit Users filter by unit (authorized by resource.data.unitId in rules)
        if (userProfile.unitId) {
            return query(
                baseRef, 
                where('unitId', '==', userProfile.unitId), 
                orderBy('visitDate', 'desc')
            );
        }

        return null;
    },
    [firestore, user, userProfile, isAdmin, isSupervisor, userRole, canViewMonitoring]
  );
  
  const { data: records, isLoading: isLoadingRecords } = useCollection<UnitMonitoringRecord>(monitoringRecordsQuery);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
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
                    // Fallback for browsers where window.onload might not trigger correctly
                    setTimeout(() => {
                        if (!window.printDone) {
                            window.print();
                        }
                    }, 3000);
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
    } catch (err) {
        console.error("Print generation error:", err);
        alert("Failed to generate the print report. Please check the browser console for details.");
    }
  };

  const calculateCompliance = (record: UnitMonitoringRecord) => {
    if (!record.observations || record.observations.length === 0) return 0;
    const applicable = record.observations.filter(o => o.status !== 'Not Applicable');
    if (applicable.length === 0) return 0;
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
    if (!records || records.length === 0) return;

    const exportData = records.flatMap(record => {
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

    // Auto-size columns for better readability
    const max_width = exportData.reduce((w, r) => Math.max(w, String(r.Unit).length), 10);
    worksheet['!cols'] = [{ wch: 20 }, { wch: max_width + 5 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 50 }];

    XLSX.writeFile(workbook, `RSU-EOMS-Monitoring-Report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const isLoading = isUserLoading || isLoadingRecords || isLoadingCampuses || isLoadingUnits;

  if (!isUserLoading && !canViewMonitoring) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <ShieldAlert className="h-16 w-16 text-destructive opacity-50" />
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to access the field monitoring module.</p>
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
            {!isUnitOnlyView && (
                <Button variant="outline" onClick={handleExportToExcel} disabled={isLoading || !records || records.length === 0}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export to Excel
                </Button>
            )}
            {isAdmin && (
                <Button onClick={handleNewVisit}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Visit Record
                </Button>
            )}
          </div>
        </div>

        {!isLoading && records?.length === 0 && isUnitOnlyView ? (
            <Card className="border-dashed py-12 flex flex-col items-center justify-center text-center">
                <div className="bg-muted h-16 w-16 rounded-full flex items-center justify-center mb-4">
                    <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="text-xl">Not Yet Monitored</CardTitle>
                <CardDescription className="max-w-md mx-auto mt-2">
                    Your unit has not yet been monitored by the Quality Assurance Office. 
                    Monitoring findings and compliance scores will appear here after your first scheduled on-site visit.
                </CardDescription>
                <Button variant="outline" className="mt-6" asChild>
                    <a href="/help/manual" target="_blank">Learn about QA Monitoring</a>
                </Button>
            </Card>
        ) : (
            <Tabs defaultValue="history" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="history">
                        <History className="mr-2 h-4 w-4" />
                        Monitoring History
                    </TabsTrigger>
                    <TabsTrigger value="performance">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {isUnitOnlyView ? 'Our Performance' : 'Overall Performance'}
                    </TabsTrigger>
                    <TabsTrigger value="findings">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Non-Compliance
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="history" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Visit Log</CardTitle>
                            <CardDescription>
                                {isAdmin ? 'A record of all past unit monitoring visits across all sites.' : 'Findings from on-site monitoring visits for your scope.'}
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
                                {records && records.length > 0 ? (
                                    records.map(record => {
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
                                                  score >= 80 && "bg-green-500 hover:bg-green-600 text-white",
                                                  (score < 80 && score >= 50) && "bg-amber-500 hover:bg-amber-600 text-white"
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
                                        No monitoring records found.
                                    </TableCell>
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="performance">
                    <MonitoringAnalytics 
                        records={records || []} 
                        campuses={campuses || []} 
                        units={units || []} 
                        isLoading={isLoading} 
                    />
                </TabsContent>

                <TabsContent value="findings">
                    <MonitoringFindings 
                        records={records || []} 
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
