
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * CONFLICT RESOLUTION PAGE
 * This path is deprecated to avoid parallel route clashes in Next.js.
 * Users are redirected to the new public evaluation path.
 */
export default function SoftwareEvaluationClashFix() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/evaluate');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        <p className="text-sm font-medium animate-pulse">Redirecting to evaluation portal...</p>
      </div>
    </div>
  );
}
