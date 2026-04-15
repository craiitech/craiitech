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
import { MoreHorizontal, ArrowUpDown, Shield, TrendingUp, AlertCircle, CheckCircle, Clock, School, Building, FileSearch } from 'lucide-react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface RiskTableProps {
  risks: Risk[];
  usersMap: Map<string, AppUser>;
  onEdit: (risk: Risk) => void;
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

export function RiskTable({ risks, usersMap, onEdit, onViewForm, isAdmin, isSupervisor, campusMap, unitMap }: RiskTableProps) {
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
                <p className="truncate" title={risk.description}>{risk.description}</p>
                <p className="text-[9px] text-muted-foreground truncate font-medium mt-0.5" title={risk.objective}>Obj: {risk.objective}</p>
            </TableCell>
            <TableCell>
                <Badge className={cn("text-[9px] font-black h-5 uppercase px-2 shadow-sm", getRatingBadgeStyle(risk.type, risk.preTreatment.rating))}>
                    {risk.preTreatment.rating} ({risk.preTreatment.magnitude})
                </Badge>
            </TableCell>
            <TableCell>
                <Badge variant={statusVariant[risk.status] ?? 'outline'} className="flex items-center w-fit text-[9px] font-black uppercase h-5 px-2 border-none shadow-sm">
                    {getStatusIcon(risk.status)}
                    {risk.status}
                </Badge>
            </TableCell>
            <TableCell className="text-[10px] font-bold text-slate-600">{risk.responsiblePersonName}</TableCell>
            <TableCell className="text-[10px] font-bold text-muted-foreground tabular-nums">{formatDate(risk.updatedAt)}</TableCell>
            <TableCell className="text-right pr-6 whitespace-nowrap">
              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-[9px] font-black uppercase tracking-widest bg-white shadow-sm"
                    onClick={() => onEdit(risk)}
                >
                    Edit
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
                        <Edit className="h-3 w-3 mr-2" /> View Full Details
                    </DropdownMenuItem>
                    {onViewForm && (
                        <DropdownMenuItem onClick={() => onViewForm(risk)} className="text-xs font-bold text-primary">
                            <FileSearch className="h-3 w-3 mr-2" /> View Submitted Form
                        </DropdownMenuItem>
                    )}
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