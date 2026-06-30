'use client';

import { useState, useMemo } from 'react';
import type { Risk, User as AppUser } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, ArrowUpDown, Shield, TrendingUp, AlertCircle, CheckCircle, Clock, School, Building, FileSearch, Edit, Trash2, MessageSquare } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Timestamp } from '@/firebase/firestore-wrapper';
import { cn } from '@/lib/utils';

interface RiskTableProps {
  risks: Risk[];
  usersMap: Map<string, AppUser>;
  onEdit: (risk: Risk) => void;
  onDelete: (risk: Risk) => void;
  onViewForm?: (risk: Risk) => void;
  isAdmin?: boolean;
  isSupervisor?: boolean;
  campusMap?: Map<string, string>;
  unitMap?: Map<string, string>;
}

type SortConfig = {
    key: keyof Risk | 'responsiblePersonName' | 'magnitude' | 'campusName' | 'unitName';
    direction: 'ascending' | 'descending';
} | null;

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  'Open': 'destructive',
  'In Progress': 'secondary',
  'Closed': 'default',
};

const getTargetDateBadge = (risk: Risk) => {
  if (risk.status === 'Closed') {
    return <Badge className="bg-emerald-100 text-emerald-800 border-none text-[8px] font-black uppercase">Completed</Badge>;
  }
  if (!risk.targetDate) {
    if (risk.preTreatment.rating === 'Low' && risk.reviewInterval && risk.reviewInterval !== 'not-applicable') {
      return (
        <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[8px] font-black uppercase flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          Watch: {risk.reviewInterval === '6-months' ? '6 Mo' : 'Annual'}
        </Badge>
      );
    }
    return <span className="text-[10px] font-bold text-slate-400">No Target</span>;
  }

  const now = new Date();
  const target = risk.targetDate instanceof Timestamp ? risk.targetDate.toDate() : new Date(risk.targetDate);
  const daysDiff = differenceInDays(target, now);

  if (daysDiff < 0) {
    return (
      <Badge className="bg-rose-100 text-rose-700 border border-rose-300 animate-pulse text-[8px] font-black uppercase flex items-center gap-1">
        <AlertCircle className="h-2.5 w-2.5" />
        Overdue ({Math.abs(daysDiff)}d)
      </Badge>
    );
  }
  if (daysDiff <= 14) {
    return (
      <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-[8px] font-black uppercase flex items-center gap-1">
        <Clock className="h-2.5 w-2.5" />
        Due ({daysDiff}d)
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 text-[8px] font-black uppercase flex items-center gap-1">
      <Clock className="h-2.5 w-2.5" />
      {format(target, 'MMM dd, yyyy')}
    </Badge>
  );
};

export function RiskTable({ risks, usersMap, onEdit, onDelete, onViewForm, isAdmin, isSupervisor, campusMap, unitMap }: RiskTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'updatedAt', direction: 'descending' });

  const sortedRisks = useMemo(() => {
    let sortableItems = [...risks];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any, bValue: any;
        
        if (sortConfig.key === 'magnitude') {
            aValue = a.preTreatment.magnitude;
            bValue = b.preTreatment.magnitude;
        } else if (sortConfig.key === 'campusName') {
            aValue = campusMap?.get(a.campusId) || '';
            bValue = campusMap?.get(b.campusId) || '';
        } else if (sortConfig.key === 'unitName') {
            aValue = unitMap?.get(a.unitId) || '';
            bValue = unitMap?.get(b.unitId) || '';
        } else {
            aValue = a[sortConfig.key as keyof Risk];
            bValue = b[sortConfig.key as keyof Risk];
        }

        const getTime = (val: any) => {
            if (val instanceof Timestamp) return val.toMillis();
            if (val instanceof Date) return val.getTime();
            if (typeof val === 'string') {
                const d = new Date(val);
                return isNaN(d.getTime()) ? 0 : d.getTime();
            }
            return 0;
        };

        if (sortConfig.key === 'createdAt' || sortConfig.key === 'updatedAt' || sortConfig.key === 'targetDate') {
            const timeA = getTime(aValue);
            const timeB = getTime(bValue);
            return (timeA - timeB) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [risks, sortConfig, campusMap, unitMap]);

  const requestSort = (key: keyof Risk | 'responsiblePersonName' | 'magnitude' | 'campusName' | 'unitName') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof Risk | 'responsiblePersonName' | 'magnitude' | 'campusName' | 'unitName') => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
        case 'Open': return <AlertCircle className="h-4 w-4 mr-2" />;
        case 'In Progress': return <Clock className="h-4 w-4 mr-2" />;
        case 'Closed': return <CheckCircle className="h-4 w-4 mr-2" />;
        default: return null;
    }
  }

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date instanceof Timestamp ? date.toDate() : new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, 'PP');
  }

  const getRatingBadgeStyle = (type: 'Risk' | 'Opportunity', rating: string) => {
    if (type === 'Risk') {
        switch (rating) {
            case 'High': return 'bg-rose-600 text-white border-none';
            case 'Medium': return 'bg-amber-400 text-amber-950 border-none';
            case 'Low': return 'bg-emerald-600 text-white border-none';
            default: return '';
        }
    } else {
        switch (rating) {
            case 'High': return 'bg-emerald-600 text-white border-none';
            case 'Medium': return 'bg-amber-400 text-amber-950 border-none';
            case 'Low': return 'bg-rose-600 text-white border-none';
            default: return '';
        }
    }
  }

  if (risks.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground italic">
        No entries found matching the current filters.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {isAdmin && (
            <TableHead>
              <Button variant="ghost" onClick={() => requestSort('campusName')} className="-ml-4 text-[10px] font-black uppercase">
                Campus {getSortIndicator('campusName')}
              </Button>
            </TableHead>
          )}
          {(isAdmin || isSupervisor) && (
            <TableHead>
              <Button variant="ghost" onClick={() => requestSort('unitName')} className="-ml-4 text-[10px] font-black uppercase">
                Unit {getSortIndicator('unitName')}
              </Button>
            </TableHead>
          )}
          <TableHead>
            <Button variant="ghost" onClick={() => requestSort('type')} className="-ml-4 text-[10px] font-black uppercase">
              Type {getSortIndicator('type')}
            </Button>
          </TableHead>
          <TableHead>
             <Button variant="ghost" onClick={() => requestSort('description')} className="-ml-4 text-[10px] font-black uppercase">
              Description {getSortIndicator('description')}
            </Button>
          </TableHead>
          <TableHead>
            <Button variant="ghost" onClick={() => requestSort('magnitude')} className="-ml-4 text-[10px] font-black uppercase">
              Rating {getSortIndicator('magnitude')}
            </Button>
          </TableHead>
           <TableHead>
            <Button variant="ghost" onClick={() => requestSort('status')} className="-ml-4 text-[10px] font-black uppercase">
              Status {getSortIndicator('status')}
            </Button>
          </TableHead>
          <TableHead>
            <Button variant="ghost" onClick={() => requestSort('targetDate')} className="-ml-4 text-[10px] font-black uppercase">
              Target / Timeline {getSortIndicator('targetDate')}
            </Button>
          </TableHead>
           <TableHead>
            <Button variant="ghost" onClick={() => requestSort('responsiblePersonName')} className="-ml-4 text-[10px] font-black uppercase">
              Accountable {getSortIndicator('responsiblePersonName')}
            </Button>
          </TableHead>
          <TableHead>
            <Button variant="ghost" onClick={() => requestSort('updatedAt')} className="-ml-4 text-[10px] font-black uppercase">
                Updated {getSortIndicator('updatedAt')}
            </Button>
          </TableHead>
          <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedRisks.map((risk) => (
          <TableRow key={risk.id} className="hover:bg-muted/30 transition-colors group">
            {isAdmin && (
              <TableCell className="text-[10px] font-bold">
                <div className="flex items-center gap-2">
                  <School className="h-3.5 w-3.5 text-primary opacity-40" />
                  {campusMap?.get(risk.campusId) || '...'}
                </div>
              </TableCell>
            )}
            {(isAdmin || isSupervisor) && (
              <TableCell className="text-[10px] font-bold">
                <div className="flex items-center gap-2">
                  <Building className="h-3.5 w-3.5 text-primary opacity-40" />
                  {unitMap?.get(risk.unitId) || '...'}
                </div>
              </TableCell>
            )}
            <TableCell>
                <div className={`flex items-center gap-2 ${risk.type === 'Risk' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {risk.type === 'Risk' ? <Shield className="h-3 w-3"/> : <TrendingUp className="h-3 w-3"/>}
                    <span className="font-black text-[9px] uppercase tracking-widest">{risk.type}</span>
                </div>
            </TableCell>
            <TableCell className="max-w-xs font-bold text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="truncate" title={risk.description}>{risk.description}</span>
                    {risk.preTreatment.rating === 'Low' && risk.escalationTrigger && (
                        <Badge variant="outline" className="h-4 text-[7px] font-black bg-blue-50 border-blue-200 text-blue-700 uppercase tracking-tighter shrink-0" title={`Escalation Trigger: ${risk.escalationTrigger}`}>
                            Watchlist
                        </Badge>
                    )}
                </div>
                <p className="text-[9px] text-muted-foreground truncate font-medium mt-0.5" title={risk.objective}>Obj: {risk.objective}</p>
                {risk.auditorRemarks && (
                    <div className="mt-1.5 p-1.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 text-[9.5px] leading-tight text-amber-800 dark:text-amber-300 font-semibold flex items-start gap-1.5 max-w-[280px]">
                        <MessageSquare className="h-3 w-3 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <div className="flex flex-col">
                            <span className="text-[7.5px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">Feedback:</span>
                            <span className="font-medium italic">"{risk.auditorRemarks}"</span>
                        </div>
                    </div>
                )}
            </TableCell>
            <TableCell>
                <Badge className={cn("text-[9px] font-black h-5 uppercase px-2 shadow-sm", getRatingBadgeStyle(risk.type, risk.preTreatment.rating))}>
                    {risk.preTreatment.rating} ({risk.preTreatment.magnitude})
                </Badge>
            </TableCell>
            <TableCell>
                <div className="space-y-1.5">
                    <Badge variant={statusVariant[risk.status] ?? 'outline'} className="flex items-center w-fit text-[9px] font-black uppercase h-5 px-2 border-none shadow-sm">
                        {getStatusIcon(risk.status)}
                        {risk.status}
                    </Badge>
                    {risk.verification?.status && (
                        <Badge className={cn(
                            "flex items-center w-fit text-[8px] font-black uppercase h-4 px-1.5 border-none shadow-sm",
                            risk.verification.status === 'Correct' || risk.verification.status === 'Updated' || risk.verification.status === 'Implemented'
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 animate-pulse"
                        )}>
                            {risk.verification.status}
                        </Badge>
                    )}
                </div>
            </TableCell>
            <TableCell>
                {getTargetDateBadge(risk)}
            </TableCell>
            <TableCell className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{risk.responsiblePersonName}</TableCell>
            <TableCell className="text-[10px] font-bold text-muted-foreground tabular-nums">{formatDate(risk.updatedAt)}</TableCell>
            <TableCell className="text-right pr-6 whitespace-nowrap">
              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-[9px] font-black uppercase tracking-widest bg-white shadow-sm"
                    onClick={() => onEdit(risk)}
                >
                    Edit | Update
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="text-[10px] uppercase font-black">Controls</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEdit(risk)} className="text-xs font-bold">
                        <Edit className="h-3.5 w-3.5 mr-2" /> Modify Entry
                    </DropdownMenuItem>
                    {onViewForm && (
                        <DropdownMenuItem onClick={() => onViewForm(risk)} className="text-xs font-bold text-primary">
                            <FileSearch className="h-3.5 w-3.5 mr-2" /> View Submitted Form
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDelete(risk)} 
                      className="text-xs font-bold text-destructive hover:bg-destructive/10"
                    >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Entry
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
