import { cookies } from 'next/headers';
import { users } from './data';
import type { User } from './types';

const AUTH_COOKIE_NAME = 'rsu-eoms-auth';

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = cookies();
  const userId = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!userId) {
    return null;
  }

  const user = users.find((u) => u.id === userId);
  return user || null;
}
