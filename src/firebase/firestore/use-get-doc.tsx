'use client';

import { useDoc, UseDocResult } from './use-doc';
import { DocumentReference, DocumentData } from '@/firebase/firestore-wrapper';

export function useGetDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  return useDoc<T>(memoizedDocRef, { live: false });
}
