'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * REDIRECTOR TO RESOLVE PATH CONFLICT
 * This page is moved to /software-quality to allow /software-evaluation to be root-level public.
 */
export default function SoftwareEvaluationRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/software-quality');
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
    </div>
  );
}
