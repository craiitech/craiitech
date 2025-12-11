'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Role } from './types';
import { users } from './data';

const AUTH_COOKIE_NAME = 'rsu-eoms-auth';

export async function login(role: Role) {
  const user = users.find((u) => u.role === role);
  if (!user) {
    throw new Error('Invalid role selected');
  }
  cookies().set(AUTH_COOKIE_NAME, user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // One week
    path: '/',
  });
  redirect('/dashboard');
}

export async function logout() {
  cookies().delete(AUTH_COOKIE_NAME);
  redirect('/login');
}
