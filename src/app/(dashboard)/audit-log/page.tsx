
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { ActivityLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function AuditLogPage() {
  const { isAdmin, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');

  // This query will only be constructed when firestore is ready and isAdmin is true.
  const logsQuery = useMemoFirebase(
    () => (firestore && isAdmin ? query(collection(firestore, 'activityLogs'), orderBy('timestamp', 'desc')) : null),
    [firestore, isAdmin]
  );

  const { data: logs, isLoading: isLoadingLogs } = useCollection<ActivityLog>(logsQuery);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    const lowercasedFilter = searchTerm.toLowerCase();
    return logs.filter(log => {
      return (
        log.userName?.toLowerCase().includes(lowercasedFilter) ||
        log.userRole?.toLowerCase().includes(lowercasedFilter) ||
        log.action?.toLowerCase().includes(lowercasedFilter) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(lowercasedFilter))
      );
    });
  }, [logs, searchTerm]);

  // If the main user object is still loading, show a loader.
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // After user loading is complete, if the user is NOT an admin, deny access.
  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  // If the user is confirmed as an admin, but the logs are still loading, show a loader.
  if (isLoadingLogs) {
      return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }


  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
        <p className="text-muted-foreground">A record of all user activities within the system.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Activity Stream</CardTitle>
          <CardDescription>
            Search and review logs to monitor user actions for security and compliance.
          </CardDescription>
          <div className="relative pt-4">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search logs by user, action, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full md:w-1/3"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {log.timestamp ? format(log.timestamp.toDate(), 'PPpp') : 'No date'}
                    </TableCell>
                    <TableCell>
                        <div className="font-medium">{log.userName}</div>
                        <div className="text-xs text-muted-foreground">{log.userRole}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.action}</TableCell>
                    <TableCell>
                        <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                        </pre>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No log entries found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
