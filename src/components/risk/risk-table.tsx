
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
import { MoreHorizontal, ArrowUpDown, Shield, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface RiskTableProps {
  risks: Risk[];
  usersMap: Map<string, AppUser>;
  onEdit: (risk: Risk) => void;
  // onDelete: (riskId: string) => void;
}

type SortConfig = {
    key: keyof Risk | 'responsiblePersonName' | 'magnitude';
    direction: 'ascending' | 'descending';
} | null;

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  'Open': 'destructive',
  'In Progress': 'secondary',
  'Closed': 'default',
};

const ratingVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  'High': 'destructive',
  'Medium': 'secondary',
  'Low': 'default',
};

export function RiskTable({ risks, usersMap, onEdit }: RiskTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'updatedAt', direction: 'descending' });

  const sortedRisks = useMemo(() => {
    let sortableItems = [...risks];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any, bValue: any;
        
        if (sortConfig.key === 'magnitude') {
            aValue = a.preTreatment.magnitude;
            bValue = b.preTreatment.magnitude;
        } else {
            aValue = a[sortConfig.key as keyof Risk];
            bValue = b[sortConfig.key as keyof Risk];
        }

        // Resilient Timestamp/Date comparison
        const getTime = (val: any) => {
            if (val instanceof Timestamp) return val.toMillis();
            if (val instanceof Date) return val.getTime();
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
  }, [risks, sortConfig]);

  const requestSort = (key: keyof Risk | 'responsiblePersonName' | 'magnitude') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof Risk | 'responsiblePersonName' | 'magnitude') => {
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
    return format(d, 'PP');
  }

  if (risks.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No risks or opportunities have been logged for this unit yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Button variant="ghost" onClick={() => requestSort('type')}>
              Type {getSortIndicator('type')}
            </Button>
          </TableHead>
          <TableHead>
             <Button variant="ghost" onClick={() => requestSort('description')}>
              Description {getSortIndicator('description')}
            </Button>
          </TableHead>
          <TableHead>
            <Button variant="ghost" onClick={() => requestSort('magnitude')}>
              Rating {getSortIndicator('magnitude')}
            </Button>
          </TableHead>
           <TableHead>
            <Button variant="ghost" onClick={() => requestSort('status')}>
              Status {getSortIndicator('status')}
            </Button>
          </TableHead>
           <TableHead>
            <Button variant="ghost" onClick={() => requestSort('responsiblePersonName')}>
              Accountable {getSortIndicator('responsiblePersonName')}
            </Button>
          </TableHead>
          <TableHead>
            <Button variant="ghost" onClick={() => requestSort('updatedAt')}>
                Last Updated {getSortIndicator('updatedAt')}
            </Button>
          </TableHead>
          <TableHead><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedRisks.map((risk) => (
          <TableRow key={risk.id}>
            <TableCell>
                <div className={`flex items-center gap-2 ${risk.type === 'Risk' ? 'text-destructive' : 'text-green-600'}`}>
                    {risk.type === 'Risk' ? <Shield className="h-4 w-4"/> : <TrendingUp className="h-4 w-4"/>}
                    <span>{risk.type}</span>
                </div>
            </TableCell>
            <TableCell className="max-w-xs truncate">{risk.description}</TableCell>
            <TableCell>
                <Badge variant={ratingVariant[risk.preTreatment.rating] ?? 'outline'}>{risk.preTreatment.rating}</Badge>
            </TableCell>
            <TableCell>
                <Badge variant={statusVariant[risk.status] ?? 'outline'} className="flex items-center w-fit">
                    {getStatusIcon(risk.status)}
                    {risk.status}
                </Badge>
            </TableCell>
            <TableCell>{risk.responsiblePersonName}</TableCell>
            <TableCell>{formatDate(risk.updatedAt)}</TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onEdit(risk)}>
                    View / Edit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
