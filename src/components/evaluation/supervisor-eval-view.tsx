
'use client';

import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { User, EvaluationCycle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCircle, ShieldCheck, ClipboardList, CheckCircle2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function SupervisorEvalView() {
  const { userProfile, userRole } = useUser();
  const firestore = useFirestore();

  // In a real system, supervisors are assigned to a list of faculty. 
  // For this prototype, we'll show all faculty in the same department.
  const facultyQuery = useMemoFirebase(
    () => (firestore && userProfile ? query(collection(firestore, 'users'), where('role', '==', 'Faculty'), where('unitId', '==', userProfile.unitId)) : null),
    [firestore, userProfile]
  );
  const { data: facultyMembers, isLoading } = useCollection<User>(facultyQuery);

  const activeCycleQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'evaluationCycles'), where('status', '==', 'Active')) : null),
    [firestore]
  );
  const { data: activeCycles } = useCollection<EvaluationCycle>(activeCycleQuery);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Supervisor Evaluation Hub</h2>
          <p className="text-muted-foreground">Academic performance review for {userProfile?.unitId} faculty members.</p>
        </div>
        {activeCycles?.[0] && (
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 h-9 px-4 font-black uppercase text-[10px] tracking-widest">
            {activeCycles[0].academicYear} &bull; {activeCycles[0].semester} Active
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Assigned Faculty Registry
          </CardTitle>
          <CardDescription>Select a faculty member to conduct the formal performance review.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facultyMembers?.map((faculty) => (
                  <TableRow key={faculty.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserCircle className="h-8 w-8 text-muted-foreground opacity-40" />
                        <span className="font-bold">{faculty.firstName} {faculty.lastName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{faculty.email}</TableCell>
                    <TableCell className="text-xs font-medium uppercase">{faculty.unitId}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" className="font-black text-[10px] uppercase tracking-widest h-8 px-4">
                        Conduct Evaluation
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {facultyMembers?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">
                      No faculty members found in your department.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="p-6 rounded-lg bg-emerald-50 border border-emerald-100 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-black uppercase text-emerald-800 tracking-tight">Institutional Compliance Note</p>
          <p className="text-[10px] text-emerald-700/80 leading-relaxed font-medium">
            Supervisor evaluations are weighted as part of the overall Faculty Maturity Index. Please ensure ratings are supported by objective evidence such as syllabi, research publications, and participation in unit-level activities.
          </p>
        </div>
      </div>
    </div>
  );
}
