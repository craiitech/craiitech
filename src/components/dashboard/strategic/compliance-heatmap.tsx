'use client';

import { useMemo } from 'react';
import type { Submission, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { Check, X, Clock, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface ComplianceHeatmapProps {
  units: Unit[];
  submissions: Submission[];
  selectedYear: number;
  title?: string;
}

const REPORT_ABBREVIATIONS: Record<string, string> = {
  'Operational Plan': 'OPE',
  'Quality Objectives Monitoring': 'QOM',
  'Risk and Opportunity Registry': 'ROR',
  'Risk and Opportunity Action Plan': 'ROA',
  'Needs and Expectation of Interested Parties': 'NEP',
  'SWOT Analysis': 'SWO',
};

export function ComplianceHeatmap({ units, submissions, selectedYear, title = "Campus Compliance Heatmap" }: ComplianceHeatmapProps) {
  const heatmapData = useMemo(() => {
    const yearSubmissions = submissions.filter(s => s.year === selectedYear);
    
    return units.map(unit => {
      const unitSubs = yearSubmissions.filter(s => s.unitId === unit.id);
      
      // Determine if ROA is N/A
      const ror = unitSubs.find(s => s.reportType === 'Risk and Opportunity Registry');
      const isActionPlanNA = ror?.riskRating === 'low';

      const reportStatuses = submissionTypes.map(type => {
        const sub = unitSubs.find(s => s.reportType === type);
        const isNA = type === 'Risk and Opportunity Action Plan' && isActionPlanNA;
        
        return {
          type,
          status: isNA ? 'na' : (sub?.statusId || 'missing'),
          id: sub?.id
        };
      });

      return {
        unitId: unit.id,
        unitName: unit.name,
        reports: reportStatuses
      };
    }).sort((a, b) => a.unitName.localeCompare(b.unitName));
  }, [units, submissions, selectedYear]);

  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Check className="h-3 w-3 text-emerald-600" />;
      case 'submitted': return <Clock className="h-3 w-3 text-amber-600" />;
      case 'rejected': return <AlertCircle className="h-3 w-3 text-rose-600" />;
      case 'na': return <span className="text-[8px] font-black text-muted-foreground/40">N/A</span>;
      default: return <X className="h-3 w-3 text-slate-300" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-50 border-emerald-200';
      case 'submitted': return 'bg-amber-50 border-amber-200';
      case 'rejected': return 'bg-rose-50 border-rose-200';
      case 'na': return 'bg-slate-50 border-slate-100 opacity-50';
      default: return 'bg-white border-slate-100';
    }
  };

  return (
    <Card className="shadow-md border-primary/10 overflow-hidden">
      <CardHeader className="bg-muted/30 border-b pb-4">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    {title}
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                    Operational gap analysis for {selectedYear}.
                </CardDescription>
            </div>
            <div className="flex gap-3 text-[8px] font-black uppercase tracking-tighter">
                <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-emerald-500" /> Verified</div>
                <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-amber-500" /> Pending</div>
                <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-rose-500" /> Rejected</div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="p-4">
            <table className="w-full border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="text-left text-[9px] font-black uppercase text-muted-foreground p-1 min-w-[150px]">Unit / Office</th>
                  {submissionTypes.map(type => (
                    <th key={type} className="text-center p-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="h-5 text-[9px] font-black border-primary/20 bg-primary/5 text-primary">
                              {REPORT_ABBREVIATIONS[type]}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent><p className="text-[10px] font-bold">{type}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.map(unit => (
                  <tr key={unit.unitId} className="group">
                    <td className="text-[10px] font-bold text-slate-700 truncate max-w-[150px] p-1 group-hover:text-primary transition-colors">
                      {unit.unitName}
                    </td>
                    {unit.reports.map((report, idx) => (
                      <td key={idx} className="p-0.5">
                        <div 
                          className={cn(
                            "h-8 w-full rounded border flex items-center justify-center transition-all group-hover:scale-105",
                            getStatusBg(report.status)
                          )}
                        >
                          {renderStatusIcon(report.status)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
