
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import type { EvaluationCycle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Loader2, Calendar, Settings2, BarChart3, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AdminEvalView() {
  const firestore = useFirestore();
  const [isCycleDialogOpen, setIsCycleDialogOpen] = useState(false);

  const cyclesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'evaluationCycles'), orderBy('startDate', 'desc')) : null),
    [firestore]
  );
  const { data: cycles, isLoading } = useCollection<EvaluationCycle>(cyclesQuery);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AFES Administration</h2>
          <p className="text-muted-foreground">Manage evaluation cycles, instrument weights, and institutional reporting.</p>
        </div>
        <Button onClick={() => setIsCycleDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Cycle
        </Button>
      </div>

      <Tabs defaultValue="cycles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cycles"><Calendar className="mr-2 h-4 w-4" /> Cycles</TabsTrigger>
          <TabsTrigger value="subjects"><Settings2 className="mr-2 h-4 w-4" /> Faculty Assignments</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="mr-2 h-4 w-4" /> System Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="cycles">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Cycles</CardTitle>
              <CardDescription>Scheduled periods for student and supervisor evaluations.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Weights (S/D)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cycles?.map((cycle) => (
                      <TableRow key={cycle.id}>
                        <TableCell className="font-bold">{cycle.academicYear}</TableCell>
                        <TableCell>{cycle.semester}</TableCell>
                        <TableCell>{cycle.type}</TableCell>
                        <TableCell className="text-xs">
                          {format(new Date(cycle.startDate), 'PP')} - {format(new Date(cycle.endDate), 'PP')}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {cycle.studentWeight * 100}% / {cycle.supervisorWeight * 100}%
                        </TableCell>
                        <TableCell>
                          <Badge variant={cycle.status === 'Active' ? 'default' : 'secondary'}>
                            {cycle.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {cycles?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          No evaluation cycles defined yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
