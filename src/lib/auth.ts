// This file is no longer the primary source of truth for authentication.
// It is kept for reference or for parts of the app that might still use it.
// The primary authentication is now handled by `src/firebase/provider.tsx` and the `useUser` hook.

import { cookies } from 'next/headers';
import { users } from './data';
import type { User } from './types';

const AUTH_COOKIE_NAME = 'rsu-eoms-auth';

/**
 * @deprecated Use the `useUser` hook from `@/firebase` in client components instead.
 * This function provides a mock user based on a cookie and is not connected to Firebase.
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = cookies();
  const userId = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!userId) {
    return null;
  }

  const user = users.find((u) => u.id === userId);
  return user || null;
}
