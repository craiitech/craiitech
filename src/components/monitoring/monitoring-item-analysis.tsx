
'use client';

import { useState, useMemo } from 'react';
import type { UnitMonitoringRecord, Campus, Unit } from '@/lib/types';
import { monitoringChecklistItems } from '@/lib/monitoring-checklist-items';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileWarning, Search, Building, School } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonitoringItemAnalysisProps {
  records: UnitMonitoringRecord[];
  campuses: Campus[];
  units: Unit[];
  isLoading: boolean;
  selectedYear: number;
}

const statusColors: Record<string, string> = {
  'Not Available': 'bg-red-100 text-red-700 border-red-200',
  'For Improvement': 'bg-amber-100 text-amber-700 border-amber-200',
  'Needs Updating': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Need to revisit': 'bg-blue-100 text-blue-700 border-blue-200',
};

export function MonitoringItemAnalysis({ records, campuses, units, isLoading, selectedYear }: MonitoringItemAnalysisProps) {
  const [selectedItem, setSelectedItem] = useState<string>(monitoringChecklistItems[0]);

  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);

  const analysisData = useMemo(() => {
    if (!records || records.length === 0) return [];

    return records.map(record => {
      const observation = record.observations.find(o => o.item === selectedItem);
      
      // We only care about gaps (Available and Not Applicable are hidden)
      if (!observation || observation.status === 'Available' || observation.status === 'Not Applicable') {
        return null;
      }

      return {
        id: record.id,
        campusName: campusMap.get(record.campusId) || 'Unknown',
        unitName: unitMap.get(record.unitId) || 'Unknown Unit',
        status: observation.status,
        remarks: observation.remarks,
        visitDate: record.visitDate
      };
    }).filter(Boolean).sort((a: any, b: any) => a.campusName.localeCompare(b.campusName));
  }, [records, selectedItem, campusMap, unitMap]);

  if (isLoading) {
    return <Card className="h-64 flex items-center justify-center">Loading Analysis...</Card>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Item Compliance Analysis
            </CardTitle>
            <CardDescription>
              Identify specific gaps for a selected monitoring item across all sites in {selectedYear}.
            </CardDescription>
          </div>
          <div className="w-[300px]">
            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger>
                <SelectValue placeholder="Select Monitoring Item" />
              </SelectTrigger>
              <SelectContent>
                {monitoringChecklistItems.map(item => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {analysisData.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Campus</TableHead>
                    <TableHead>Unit / Office</TableHead>
                    <TableHead>Current Status</TableHead>
                    <TableHead>Monitor's Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysisData.map((row: any) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <School className="h-3.5 w-3.5 text-muted-foreground" />
                          {row.campusName}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-muted-foreground" />
                          {row.unitName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[9px] h-5 uppercase tracking-tighter", statusColors[row.status])}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground italic">
                        {row.remarks || '--'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed rounded-lg">
              <div className="bg-green-100 h-12 w-12 rounded-full flex items-center justify-center mb-4">
                <FileWarning className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-bold text-sm">No Compliance Gaps Detected</h4>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                All monitored units currently have "{selectedItem}" marked as Available or Not Applicable.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
