'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  getDoc,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from '@/firebase/firestore-wrapper';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type WithId<T> = T & { id: string };

export interface UseDocResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

interface UseDocOptions {
  live?: boolean;
}

export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
  options?: UseDocOptions,
): UseDocResult<T> {
  const { live = true } = options ?? {};
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!memoizedDocRef);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  const [prevRef, setPrevRef] = useState<DocumentReference<DocumentData> | null | undefined>(memoizedDocRef);

  if (memoizedDocRef !== prevRef) {
    setPrevRef(memoizedDocRef);
    setIsLoading(!!memoizedDocRef);
    if (!memoizedDocRef) {
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

    const handleSnapshot = (snapshot: DocumentSnapshot<DocumentData>) => {
      if (snapshot.exists()) {
        setData({ ...(snapshot.data() as T), id: snapshot.id });
      } else {
        setData(null);
      }
      setError(null);
      setIsLoading(false);
    };

    const handleError = (error: FirestoreError) => {
      console.error("Firestore error in useDoc:", error);

      const contextualError = new FirestorePermissionError({
        operation: 'get',
        path: memoizedDocRef.path,
        originalError: error,
      })

      setError(contextualError)
      setData(null)
      setIsLoading(false)
      errorEmitter.emit('permission-error', contextualError);
    };

    if (live) {
      const unsubscribe = onSnapshot(
        memoizedDocRef,
        handleSnapshot,
        handleError
      );
      return () => unsubscribe();
    } else {
      getDoc(memoizedDocRef)
        .then(handleSnapshot)
        .catch(handleError);
    }
  }, [memoizedDocRef, live]);

  return { data, isLoading, error };
}
