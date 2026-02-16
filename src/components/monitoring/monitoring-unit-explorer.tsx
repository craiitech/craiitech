
'use client';

import { useState, useMemo } from 'react';
import type { UnitMonitoringRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, Building, School, History, Printer, Eye, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface MonitoringUnitExplorerProps {
  records: UnitMonitoringRecord[];
  campuses: Campus[];
  units: Unit[];
  isLoading: boolean;
  onViewRecord: (record: UnitMonitoringRecord) => void;
  onPrintRecord: (record: UnitMonitoringRecord) => void;
}

export function MonitoringUnitExplorer({ 
  records, 
  campuses, 
  units, 
  isLoading, 
  onViewRecord,
  onPrintRecord 
}: MonitoringUnitExplorerProps) {
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const campusesWithRecords = useMemo(() => {
    const campusIds = new Set(records.map(r => r.campusId));
    return campuses
      .filter(c => campusIds.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [campuses, records]);

  const unitsInSelectedCampus = useMemo(() => {
    if (!selectedCampusId) return [];
    const unitIds = new Set(records.filter(r => r.campusId === selectedCampusId).map(r => r.unitId));
    return units
      .filter(u => unitIds.has(u.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCampusId, records, units]);

  const recordsForSelectedUnit = useMemo(() => {
    if (!selectedUnitId) return [];
    return records
      .filter(r => r.unitId === selectedUnitId && r.campusId === selectedCampusId)
      .sort((a, b) => b.visitDate.toMillis() - a.visitDate.toMillis());
  }, [selectedUnitId, selectedCampusId, records]);

  const calculateScore = (record: UnitMonitoringRecord) => {
    const applicable = record.observations.filter(o => o.status !== 'Not Applicable');
    const available = applicable.filter(o => o.status === 'Available');
    return applicable.length > 0 ? Math.round((available.length / applicable.length) * 100) : 0;
  };

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-16rem)]">
      <Card className="md:col-span-1 flex flex-col overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Unit Selection</CardTitle>
          <CardDescription className="text-[10px]">Select a site to view its unit history.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <Accordion type="single" collapsible value={selectedCampusId || ''} onValueChange={setSelectedCampusId}>
              {campusesWithRecords.map(campus => (
                <AccordionItem key={campus.id} value={campus.id} className="border-none">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <School className="h-3.5 w-3.5 text-muted-foreground" />
                      {campus.name}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="flex flex-col">
                      {unitsInSelectedCampus.map(unit => (
                        <Button
                          key={unit.id}
                          variant="ghost"
                          onClick={() => setSelectedUnitId(unit.id)}
                          className={cn(
                            "w-full justify-start text-left h-auto py-2.5 px-8 text-xs rounded-none border-l-2",
                            selectedUnitId === unit.id 
                              ? "bg-primary/5 text-primary border-primary font-bold" 
                              : "border-transparent text-muted-foreground"
                          )}
                        >
                          <Building className="h-3 w-3 mr-2" />
                          <span className="truncate">{unit.name}</span>
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {campusesWithRecords.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground">No records found.</div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="md:col-span-3">
        <Card className="h-full flex flex-col overflow-hidden">
          <CardHeader className="border-b bg-muted/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              {selectedUnitId 
                ? `Visit History: ${units.find(u => u.id === selectedUnitId)?.name}`
                : "Unit Monitoring History"
              }
            </CardTitle>
            <CardDescription>
              {selectedUnitId 
                ? "Browse all recorded monitoring visits for this unit."
                : "Select a unit from the explorer on the left."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {selectedUnitId ? (
                <div className="divide-y">
                  {recordsForSelectedUnit.map(record => {
                    const score = calculateScore(record);
                    const vDate = record.visitDate instanceof Timestamp ? record.visitDate.toDate() : new Date(record.visitDate);
                    return (
                      <div key={record.id} className="p-6 hover:bg-muted/30 transition-colors flex items-center justify-between group">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold">{format(vDate, 'MMMM d, yyyy')}</span>
                            <Badge variant={score >= 80 ? 'default' : score >= 50 ? 'secondary' : 'destructive'} className="text-[10px] h-5">
                              {score}% Compliance
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                            <span className="flex items-center gap-1">Room: {record.roomNumber || 'N/A'}</span>
                            <span className="flex items-center gap-1">OIC: {record.officerInCharge || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="outline" size="sm" onClick={() => onPrintRecord(record)}>
                            <Printer className="h-3.5 w-3.5 mr-2" /> Print
                          </Button>
                          <Button variant="default" size="sm" onClick={() => onViewRecord(record)}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> Details
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {recordsForSelectedUnit.length === 0 && (
                    <div className="p-12 text-center text-muted-foreground">No records for this unit.</div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 text-muted-foreground">
                  <div className="bg-muted h-16 w-16 rounded-full flex items-center justify-center mb-4">
                    <ChevronRight className="h-8 w-8 opacity-20" />
                  </div>
                  <p className="text-sm font-medium">No Unit Selected</p>
                  <p className="text-xs max-w-xs mt-1">Select a campus and unit from the selection panel to browse its monitoring history.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
