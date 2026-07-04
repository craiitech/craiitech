'use client';

import { useCollection, UseCollectionResult } from './use-collection';
import { Query, DocumentData, CollectionReference } from '@/firebase/firestore-wrapper';

export function useGetCollection<T = any>(
  memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean}) | null | undefined,
): UseCollectionResult<T> {
  return useCollection<T>(memoizedTargetRefOrQuery, { live: false });
}
