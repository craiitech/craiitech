
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * CONFLICT RESOLUTION PAGE
 * Redirection to /software-quality to ensure no clashes with the public evaluation path.
 */
export default function InternalEvaluationRedirect() {
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
