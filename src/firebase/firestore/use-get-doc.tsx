'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  getDoc,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from '@/firebase/firestore-wrapper';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type WithId<T> = T & { id: string };

import { UseDocResult } from './use-doc';

/**
 * React hook to fetch a single Firestore document ONCE (no real-time subscription).
 * Identical API interface to useDoc.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedDocRef.
 */
export function useGetDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!memoizedDocRef);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  const [prevRef, setPrevRef] = useState<DocumentReference<DocumentData> | null | undefined>(memoizedDocRef);

  if (memoizedDocRef !== prevRef) {
    setPrevRef(memoizedDocRef);
    setIsLoading(!!memoizedDocRef);
    if (!prevRef) {
        setData(null);
    }
  }

  useEffect(() => {
    if (!memoizedDocRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    getDoc(memoizedDocRef)
      .then((snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id });
        } else {
          setData(null);
        }
        setError(null);
        setIsLoading(false);
      })
      .catch((err: FirestoreError) => {
        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: memoizedDocRef.path,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);
        errorEmitter.emit('permission-error', contextualError);
      });
  }, [memoizedDocRef]);

  return { data, isLoading, error };
}
