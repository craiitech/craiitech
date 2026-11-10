'use client';

import { useParams } from 'next/navigation';
import { EomsRevisionWorkspace } from '@/components/manuals/eoms-revision-workspace';

export default function EomsRevisionWorkspacePage() {
  const params = useParams<{ requestId: string }>();
  const requestId = Array.isArray(params?.requestId) ? params.requestId[0] : params?.requestId;

  if (!requestId) {
    return <div className="p-8 text-sm text-muted-foreground">Invalid revision request.</div>;
  }

  return <EomsRevisionWorkspace requestId={requestId} />;
}
