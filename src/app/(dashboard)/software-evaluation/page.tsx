'use client';

import { redirect } from 'next/navigation';

/**
 * REDIRECTOR TO RESOLVE PATH CONFLICT
 * This page is moved to the root /software-evaluation to allow public stakeholder access.
 * We redirect authenticated attempts to the consolidated root page.
 */
export default function SoftwareEvaluationRedirect() {
  redirect('/software-evaluation');
}