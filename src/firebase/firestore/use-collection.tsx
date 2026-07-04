'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  getDocs,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from '@/firebase/firestore-wrapper';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

interface UseCollectionOptions {
  live?: boolean;
}

export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
    options?: UseCollectionOptions,
): UseCollectionResult<T> {
  const { live = true } = options ?? {};
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!memoizedTargetRefOrQuery);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  const [prevTarget, setPrevTarget] = useState<any>(memoizedTargetRefOrQuery);

  if (memoizedTargetRefOrQuery !== prevTarget) {
    setPrevTarget(memoizedTargetRefOrQuery);
    setIsLoading(!!memoizedTargetRefOrQuery);
    if (!memoizedTargetRefOrQuery) {
        setData(null);
    }
  }

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const handleSnapshot = (snapshot: QuerySnapshot<DocumentData>) => {
      const results: ResultItemType[] = [];
      for (const doc of snapshot.docs) {
        results.push({ ...(doc.data() as T), id: doc.id });
      }

      try {
        const path: string =
          memoizedTargetRefOrQuery.type === 'collection'
            ? (memoizedTargetRefOrQuery as CollectionReference).path
            : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString();
        if (path === 'campuses' || path.split('/').includes('campuses')) {
          results.sort((a: any, b: any) => {
            const nameA = String(a.name || '').trim();
            const nameB = String(b.name || '').trim();
            return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
          });
        }
      } catch (e) {
        console.error("Error sorting campuses in useCollection:", e);
      }

      setData(results);
      setError(null);
      setIsLoading(false);
    };

    const handleError = (error: FirestoreError) => {
      const path: string =
        memoizedTargetRefOrQuery.type === 'collection'
          ? (memoizedTargetRefOrQuery as CollectionReference).path
          : (memoizedTargetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString()

      console.error("Firestore error in useCollection:", error);

      const contextualError = new FirestorePermissionError({
        operation: 'list',
        path,
        originalError: error,
      })

      setError(contextualError)
      setData(null)
      setIsLoading(false)
      errorEmitter.emit('permission-error', contextualError);
    };

    if (live) {
      const unsubscribe = onSnapshot(
        memoizedTargetRefOrQuery,
        handleSnapshot,
        handleError
      );
      return () => unsubscribe();
    } else {
      getDocs(memoizedTargetRefOrQuery)
        .then(handleSnapshot)
        .catch(handleError);
    }
  }, [memoizedTargetRefOrQuery, live]);

  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error(memoizedTargetRefOrQuery + ' was not properly memoized using useMemoFirebase');
  }
  return { data, isLoading, error };
}
