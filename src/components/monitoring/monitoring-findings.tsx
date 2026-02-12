'use client';

import { useMemo } from 'react';
import type { UnitMonitoringRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building, School, AlertTriangle, ListFilter, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface MonitoringFindingsProps {
  records: UnitMonitoringRecord[];
  campuses: Campus[];
  units: Unit[];
  isLoading: boolean;
}

export function MonitoringFindings({ records, campuses, units, isLoading }: MonitoringFindingsProps) {
  const findingsData = useMemo(() => {
    if (!records || records.length === 0) return [];

    const campusMap = new Map(campuses.map(c => [c.id, c.name]));
    const unitMap = new Map(units.map(u => [u.id, u.name]));

    return records.map(record => {
      const criticalItems = record.observations.filter(
        o => o.status === 'Not Available' || o.status === 'For Improvement' || o.status === 'Needs Updating'
      );
      
      if (criticalItems.length === 0) return null;

      return {
        id: record.id,
        unitName: unitMap.get(record.unitId) || 'Unknown Unit',
        campusName: campusMap.get(record.campusId) || '...',
        visitDate: record.visitDate,
        findings: criticalItems,
        totalCritical: criticalItems.length
      };
    }).filter(Boolean).sort((a, b) => b!.totalCritical - a!.totalCritical);
  }, [records, campuses, units]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="h-40 animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  const safeFormatDate = (date: any) => {
    if (!date) return '...';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    return format(d, 'PPP');
  };

  if (findingsData.length === 0) {
    return (
      <Card className="border-dashed py-12 flex flex-col items-center justify-center text-center">
        <div className="bg-green-100 h-16 w-16 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-xl">Zero Critical Findings</CardTitle>
        <CardDescription className="max-w-md mx-auto mt-2">
          Excellent work! Based on the latest monitoring records, all units are currently compliant with the quality standards.
        </CardDescription>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/20 shadow-md">
      <CardHeader className="bg-destructive/5 border-b pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle>Non-Compliance Action List</CardTitle>
            </div>
            <CardDescription>
              Detailed breakdown of units with findings requiring immediate attention, updates, or improvement.
            </CardDescription>
          </div>
          <Badge variant="destructive" className="animate-pulse">
            {findingsData.length} Units Flagged
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-20rem)]">
          <div className="divide-y">
            {findingsData.map((unit: any) => (
              <div key={unit.id} className="p-6 hover:bg-muted/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-primary" />
                      <h4 className="font-bold text-lg">{unit.unitName}</h4>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                      <span className="flex items-center gap-1">
                        <School className="h-3 w-3" />
                        {unit.campusName}
                      </span>
                      <span className="flex items-center gap-1">
                        <ListFilter className="h-3 w-3" />
                        Last Visited: {safeFormatDate(unit.visitDate)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-destructive leading-none">{unit.totalCritical}</div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">Findings Identified</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {unit.findings.map((finding: any, idx: number) => (
                    <div key={idx} className="flex flex-col gap-1.5 p-3 rounded-md bg-background border border-destructive/10 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate pr-2" title={finding.item}>
                          {finding.item}
                        </span>
                        <Badge 
                          variant={finding.status === 'Not Available' ? 'destructive' : 'secondary'} 
                          className={cn(
                            "text-[9px] h-4 py-0 px-1.5 whitespace-nowrap",
                            finding.status === 'Needs Updating' && "bg-indigo-100 text-indigo-700 border-indigo-200"
                          )}
                        >
                          {finding.status}
                        </Badge>
                      </div>
                      {finding.remarks && (
                        <p className="text-[10px] text-muted-foreground italic leading-tight line-clamp-2 border-t pt-1.5 mt-0.5">
                          "{finding.remarks}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
