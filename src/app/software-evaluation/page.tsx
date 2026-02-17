import { redirect } from 'next/navigation';

/**
 * CONFLICT RESOLUTION PAGE
 * This file is kept only to satisfy Next.js build constraints during migration.
 * It redirects all legacy /software-evaluation traffic to the new public instrument.
 */
export default function LegacyRedirect() {
  redirect('/evaluate');
}