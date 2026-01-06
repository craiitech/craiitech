
'use client';

// This file is no longer needed as the authorization model has been changed to be purely database-driven.
// Keeping it to prevent import errors in case it's referenced somewhere unexpectedly,
// but its functionality is now handled by Firestore security rules and role collections.

export async function requireClaims(required: any) {
    console.warn("requireClaims is deprecated and should no longer be used.");
    return {};
}
