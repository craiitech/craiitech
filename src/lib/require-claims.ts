
'use client';

import { getAuth } from "firebase/auth";

/**
 * Checks for the presence of required custom claims on the current user's ID token.
 * Throws a specific error if a required claim is missing, allowing for "fail-fast" validation
 * before attempting a Firestore write that would be denied by security rules.
 *
 * @param required An object specifying the required claims.
 * @param required.role An array of role names, one of which the user must have.
 * @param required.campusId A boolean indicating if the campusId claim must be present.
 * @returns The user's claims object if all requirements are met.
 * @throws An error if the user is not authenticated or if a required claim is missing.
 */
export async function requireClaims(required: {
  role?: string[];
  campusId?: boolean;
}) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Authentication error: No user is currently signed in.");

  // Force a token refresh to get the latest claims. This is crucial.
  const token = await user.getIdTokenResult(true);

  const userRole = token.claims.role as string;

  if (required.role && (!userRole || !required.role.includes(userRole))) {
    throw new Error(`Permission Denied: Your role ('${userRole || "none"}') is not authorized for this action. Required roles: ${required.role.join(', ')}.`);
  }

  if (required.campusId && !token.claims.campusId) {
    throw new Error("Permission Denied: Your session is missing a 'campusId' claim. Please re-login or contact an administrator.");
  }

  return token.claims;
}
