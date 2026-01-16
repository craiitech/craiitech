
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Home, FileWarning } from 'lucide-react';
import { useEffect, useState } from 'react';
import { logError } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isReporting, setIsReporting] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // You can also log the error to an external service here
    console.error("Global Error Boundary Caught:", error);
  }, [error]);

  const handleReportError = async () => {
    setIsReporting(true);
    try {
        await logError({
            errorMessage: error.message,
            errorStack: error.stack,
            errorDigest: error.digest,
            url: window.location.href,
        });
        setReportSent(true);
        toast({
            title: 'Error Reported',
            description: 'Thank you for your feedback. Our development team will investigate the issue.',
        });
    } catch (e) {
        console.error("Failed to log error report:", e);
        toast({
            title: 'Reporting Failed',
            description: 'Could not send the error report. Please try again.',
            variant: 'destructive',
        });
    } finally {
        setIsReporting(false);
    }
  }

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-lg text-center">
                <CardHeader>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                        <AlertCircle className="h-10 w-10 text-destructive" />
                    </div>
                    <CardTitle className="mt-4 text-2xl font-bold">
                        Oops! Something Went Wrong
                    </CardTitle>
                    <CardDescription>
                        We've encountered an unexpected error. You can try to recover or report this issue to our team.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-md border bg-muted p-4 text-left text-sm">
                        <p className="font-semibold text-destructive">Error Details:</p>
                        <p className="text-muted-foreground">{error.message}</p>
                        {error.digest && (
                            <p className="mt-2 text-xs text-muted-foreground">Error ID: {error.digest}</p>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <div className="flex w-full gap-3">
                         <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                            Try Again
                        </Button>
                        <Button className="w-full" onClick={handleReportError} disabled={isReporting || reportSent}>
                           {isReporting ? 'Sending...' : (reportSent ? 'Report Sent!' : 'Report Error')}
                        </Button>
                    </div>
                     <Button variant="ghost" className="w-full" asChild>
                        <a href="/dashboard">
                            <Home className="mr-2 h-4 w-4" />
                            Go Back to Dashboard
                        </a>
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </body>
    </html>
  );
}
