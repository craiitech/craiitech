'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from '@/firebase/firestore-wrapper';
import type { ErrorReport } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  Mail,
  User,
  Shield,
  Info,
  ClipboardCopy,
  Copy,
  Search,
  X,
  Bug,
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  new: 'destructive',
  acknowledged: 'secondary',
  resolved: 'default',
};

export function ErrorReportManagement() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [filter, setFilter] = useState<'new' | 'acknowledged' | 'resolved' | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const errorReportsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'errorReports'), orderBy('timestamp', 'desc')) : null),
    [firestore],
  );
  const { data: reports, isLoading } = useCollection<ErrorReport>(errorReportsQuery);

  const filteredReports = useMemo(() => {
    if (!reports) return [];
    let list = [...reports];

    if (filter !== 'all') {
      list = list.filter((r) => r.status === filter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((r) => {
        const errorMsg = (r.errorMessage || '').toLowerCase();
        const userName = (r.userName || '').toLowerCase();
        const userEmail = (r.userEmail || '').toLowerCase();
        const userRole = (r.userRole || '').toLowerCase();
        const url = (r.url || '').toLowerCase();
        const digest = (r.errorDigest || '').toLowerCase();
        const stack = (r.errorStack || '').toLowerCase();
        return (
          errorMsg.includes(q) ||
          userName.includes(q) ||
          userEmail.includes(q) ||
          userRole.includes(q) ||
          url.includes(q) ||
          digest.includes(q) ||
          stack.includes(q)
        );
      });
    }

    return list;
  }, [reports, filter, searchTerm]);

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    if (!firestore) return;
    const reportRef = doc(firestore, 'errorReports', reportId);
    try {
      await updateDoc(reportRef, { status: newStatus });
      toast({
        title: 'Status Updated',
        description: `Report status changed to ${newStatus}.`,
      });
    } catch (error) {
      console.error('Error updating report status:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not update the report status.',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to Clipboard',
      description: `${label} has been copied.`,
    });
  };

  const hasActiveFilters = searchTerm.trim() !== '' || filter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setFilter('all');
  };

  return (
    <Card className="shadow-md border-primary/10">
      <CardHeader className="bg-muted/10 border-b py-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
              <Bug className="h-5 w-5 text-primary" />
              Error Reports
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              A log of all client-side and system errors reported by users across the application.
            </CardDescription>
          </div>
          {reports && (
            <Badge variant="outline" className="h-7 text-xs font-black uppercase px-3 bg-background">
              {filteredReports.length} of {reports.length} Reports
            </Badge>
          )}
        </div>

        {/* SEARCH AND FILTER TOOLBAR */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center pt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by error message, user, URL, or digest..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-8 h-9 text-xs bg-background"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-48">
            <Select onValueChange={(value) => setFilter(value as any)} value={filter}>
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="Filter by status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="h-9 text-[10px] font-black uppercase tracking-wider shrink-0 bg-background"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Reset Filters
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredReports.length > 0 ? (
          <Accordion type="multiple" className="w-full space-y-2">
            {filteredReports.map((report) => (
              <AccordionItem value={report.id} key={report.id} className="border rounded-lg px-2 shadow-sm">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pr-4 gap-2 text-left">
                    <div className="flex items-center gap-3">
                      <Badge variant={statusVariant[report.status] ?? 'secondary'} className="capitalize text-[10px]">
                        {report.status}
                      </Badge>
                      <span className="font-medium text-xs truncate max-w-xs sm:max-w-md">{report.errorMessage}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {report.timestamp ? format(report.timestamp.toDate(), 'PPpp') : 'No date'}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 bg-muted/30 rounded-b-md mt-1 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-xs mb-2 uppercase tracking-wider text-muted-foreground">
                        User Details
                      </h4>
                      <div className="space-y-2 text-xs">
                        <p className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-semibold">{report.userName || 'Anonymous'}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{report.userEmail || 'No email'}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                          <Badge variant="outline" className="text-[10px]">
                            {report.userRole || 'Unknown Role'}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs mb-2 uppercase tracking-wider text-muted-foreground">
                        Error Context
                      </h4>
                      <div className="space-y-2 text-xs">
                        <p className="flex items-center gap-2">
                          <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-mono text-[11px] break-all">{report.url}</span>
                        </p>
                        {report.errorDigest && (
                          <div className="flex items-center gap-2">
                            <ClipboardCopy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-mono text-[11px]">Digest: {report.errorDigest}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5 ml-1"
                              onClick={() => copyToClipboard(report.errorDigest || '', 'Error Digest')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {report.errorStack && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-xs mb-2 uppercase tracking-wider text-muted-foreground">
                        Stack Trace
                      </h4>
                      <pre className="text-[11px] bg-background p-3 rounded-md overflow-x-auto max-h-48 border font-mono">
                        {report.errorStack}
                      </pre>
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between pt-3 border-t">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Update Status:</span>
                    <Select
                      onValueChange={(value) => handleStatusChange(report.id, value)}
                      defaultValue={report.status}
                    >
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="Change status..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="acknowledged">Acknowledged</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="h-52 flex flex-col items-center justify-center text-center p-4">
            <CheckCircle className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs font-bold text-muted-foreground">
              {hasActiveFilters ? 'No error reports match your search criteria.' : 'No error reports found. Great job!'}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="mt-3 h-7 text-[10px] font-bold">
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
