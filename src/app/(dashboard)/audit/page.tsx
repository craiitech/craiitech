'use client';

import { useUser } from '@/firebase';
import { AdminAuditView } from '@/components/audit/admin-audit-view';
import { AuditorAuditView } from '@/components/audit/auditor-audit-view';
import { AuditeeAuditView } from '@/components/audit/auditee-audit-view';

export default function AuditPage() {
  const { isAdmin, userRole, isUserLoading } = useUser();

  if (isUserLoading) {
    return <div>Loading...</div>;
  }

  if (isAdmin) {
    return <AdminAuditView />;
  }
  
  if (userRole === 'Auditor') {
      return <AuditorAuditView />;
  }

  // Any other role is an auditee for this page's purpose
  return <AuditeeAuditView />;
}
