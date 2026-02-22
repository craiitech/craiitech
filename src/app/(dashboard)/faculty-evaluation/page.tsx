
'use client';

import { useUser } from '@/firebase';
import { AdminEvalView } from '@/components/evaluation/admin-eval-view';
import { StudentEvalView } from '@/components/evaluation/student-eval-view';
import { SupervisorEvalView } from '@/components/evaluation/supervisor-eval-view';
import { FacultyEvalView } from '@/components/evaluation/faculty-eval-view';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FacultyEvaluationPage() {
  const { userProfile, isAdmin, userRole, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Session Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Could not retrieve your institutional profile. Please try logging in again.</p>
        </CardContent>
      </Card>
    );
  }

  // Route by role
  if (isAdmin) {
    return <AdminEvalView />;
  }

  if (userRole === 'Student') {
    return <StudentEvalView />;
  }

  if (userRole === 'Dean' || userRole === 'Program Chair' || userRole === 'Campus Director') {
    return <SupervisorEvalView />;
  }

  if (userRole === 'Faculty') {
    return <FacultyEvalView />;
  }

  return (
    <div className="p-8 text-center">
      <h2 className="text-xl font-bold">Access Denied</h2>
      <p className="text-muted-foreground mt-2">Your role ({userRole}) does not have access to the evaluation system.</p>
    </div>
  );
}
