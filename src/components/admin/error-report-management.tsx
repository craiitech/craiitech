'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import type { ErrorReport } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertTriangle, CheckCircle, Mail, User, Shield, Info, ClipboardCopy, Copy } from 'lucide-react';
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
  const [filter, setFilter] = useState<'new' | 'acknowledged' | 'resolved' | 'all'>('new');

  const errorReportsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'errorReports'), orderBy('timestamp', 'desc')) : null),
    [firestore]
  );
  const { data: reports, isLoading } = useCollection<ErrorReport>(errorReportsQuery);
  
  const filteredReports = useMemo(() => {
    if (!reports) return [];
    if (filter === 'all') return reports;
    return reports.filter(r => r.status === filter);
  }, [reports, filter]);

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
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Error Reports</CardTitle>
          <CardDescription>A log of all errors reported by users.</CardDescription>
        </div>
        <div className="w-48">
            <Select onValueChange={(value) => setFilter(value as any)} value={filter}>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by status..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {filteredReports.map((report) => (
              <AccordionItem value={report.id} key={report.id}>
                <AccordionTrigger>
                    <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-4">
                             <Badge variant={statusVariant[report.status] ?? 'secondary'} className="capitalize">{report.status}</Badge>
                            <span className="font-medium truncate max-w-sm">{report.errorMessage}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {report.timestamp ? format(report.timestamp.toDate(), 'PPpp') : 'No date'}
                        </span>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 bg-muted/50 rounded-b-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-semibold mb-2">User Details</h4>
                            <div className="space-y-2 text-sm">
                                <p className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground"/>{report.userName}</p>
                                <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground"/>{report.userEmail}</p>
                                <p className="flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground"/>{report.userRole}</p>
                            </div>
                        </div>
                         <div>
                            <h4 className="font-semibold mb-2">Error Context</h4>
                            <div className="space-y-2 text-sm">
                                <p className="flex items-center gap-2"><Info className="h-4 w-4 text-muted-foreground"/>URL: <span className="truncate">{report.url}</span></p>
                                <div className="flex items-center gap-2">
                                  <ClipboardCopy className="h-4 w-4 text-muted-foreground"/>
                                  <span>Digest: {report.errorDigest}</span>
                                   <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => copyToClipboard(report.errorDigest, 'Error Digest')}>
                                      <Copy className="h-3 w-3" />
                                   </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <h4 className="font-semibold mb-2">Stack Trace</h4>
                        <pre className="text-xs bg-background p-3 rounded-md overflow-x-auto h-48 border">{report.errorStack}</pre>
                    </div>
                    <div className="mt-4 flex justify-end">
                       <Select onValueChange={(value) => handleStatusChange(report.id, value)} defaultValue={report.status}>
                           <SelectTrigger className="w-[180px]">
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
        )}
        {!isLoading && filteredReports.length === 0 && (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <CheckCircle className="mr-2 h-5 w-5"/>
            <span>No {filter !== 'all' && filter} error reports found. Great job!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
