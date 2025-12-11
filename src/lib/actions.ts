'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Role } from './types';
import { users } from './data';

const AUTH_COOKIE_NAME = 'rsu-eoms-auth';

// This function is kept for compatibility but Firebase auth is handled client-side
export async function login(role: Role) {
  // The actual login is now handled on the client with Firebase.
  // This server action could be used for other server-side logic after login if needed.
  // For now, we just redirect.
  redirect('/dashboard');
}

export async function logout() {
  // Client-side will handle Firebase signout. This is for any server-side session cleanup.
  cookies().delete(AUTH_COOKIE_NAME);
  redirect('/login');
}
