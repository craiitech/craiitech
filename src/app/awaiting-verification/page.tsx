'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { CheckCircle } from 'lucide-react';

export default function AwaitingVerificationPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold">Registration Submitted</CardTitle>
          <CardDescription>
            Thank you for completing your registration. Your account is now pending verification by an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You will be notified via email once your account has been approved. You can then log in to access the RSU EOMS Portal.
          </p>
          <Button onClick={() => router.push('/login')} className="w-full">
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
