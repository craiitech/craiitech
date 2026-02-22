
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Subject, EvaluationCycle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ClipboardCheck, UserCheck, Star, ArrowRight } from 'lucide-react';

export function StudentEvalView() {
  const { userProfile } = useUser();
  const firestore = useFirestore();

  const subjectsQuery = useMemoFirebase(
    () => (firestore && userProfile ? query(collection(firestore, 'subjects'), where('enrolledStudentIds', 'array-contains', userProfile.id)) : null),
    [firestore, userProfile]
  );
  const { data: subjects, isLoading: isLoadingSubjects } = useCollection<Subject>(subjectsQuery);

  const activeCycleQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'evaluationCycles'), where('status', '==', 'Active')) : null),
    [firestore]
  );
  const { data: activeCycles } = useCollection<EvaluationCycle>(activeCycleQuery);

  if (isLoadingSubjects) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black tracking-tight">Faculty Evaluation</h2>
        <p className="text-muted-foreground">Your feedback is vital for the continuous improvement of academic excellence at RSU.</p>
      </div>

      {!activeCycles || activeCycles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>There is no active evaluation cycle at this time. Please check back later.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <Card className="bg-primary/5 border-primary/10">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Current Session</CardTitle>
              <CardDescription className="text-lg font-bold text-slate-900">
                {activeCycles[0].academicYear} &bull; {activeCycles[0].semester} ({activeCycles[0].type})
              </CardDescription>
            </CardHeader>
          </Card>

          <h3 className="font-bold text-lg mt-4 px-1">Your Instructors to Evaluate</h3>
          {subjects?.map((subject) => (
            <Card key={subject.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <Badge variant="outline" className="font-mono text-[10px]">{subject.code}</Badge>
                  <h4 className="font-bold text-lg">{subject.name}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserCheck className="h-4 w-4" />
                    <span>Faculty ID: {subject.facultyId}</span>
                  </div>
                </div>
                <Button className="font-bold uppercase text-xs tracking-widest gap-2">
                  Launch Instrument
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {subjects?.length === 0 && (
            <div className="text-center py-20 border rounded-lg border-dashed">
              <p className="text-muted-foreground">No subjects found in your current enrollment.</p>
            </div>
          )}
        </div>
      )}

      <Card className="border-none bg-slate-100/50">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-700">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Evaluation Guidelines & Anonymity
          </div>
          <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-2 leading-relaxed">
            <li><strong>Strict Anonymity:</strong> Your identity will never be shown to the faculty member or their supervisors. Results are only released as aggregated averages.</li>
            <li><strong>Honesty:</strong> Please provide objective and constructive feedback based on your actual classroom experience.</li>
            <li><strong>One-Time Submission:</strong> Once you submit an evaluation for a subject, it cannot be modified or repeated.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
