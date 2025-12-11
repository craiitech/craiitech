
'use client'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Submission, User } from '@/lib/types';
import { useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';

export function RecentSubmissions() {
  const firestore = useFirestore();

  const submissionsQuery = useMemoFirebase(
    () =>
      firestore
        ? query(
            collection(firestore, 'submissions'),
            orderBy('submissionDate', 'desc'),
            limit(5)
          )
        : null,
    [firestore]
  );
  const { data: submissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const usersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const userMap = useMemo(() => {
    if (!users) return new Map();
    return new Map(users.map((user) => [user.id, user]));
  }, [users]);
  
  const isLoading = isLoadingSubmissions || isLoadingUsers;

  if (isLoading) {
    return (
        <div className="space-y-8">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="ml-4 space-y-2">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-4 w-[100px]" />
                    </div>
                    <Skeleton className="ml-auto h-4 w-[50px]" />
                </div>
            ))}
        </div>
    )
  }

  if (!submissions || submissions.length === 0) {
      return (
          <div className="text-center py-10 text-muted-foreground">
              No recent submissions.
          </div>
      )
  }

  return (
    <div className="space-y-8">
      {submissions.map(submission => {
          const user = userMap.get(submission.userId);
          const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
          const userInitial = userName.charAt(0);

          return (
            <div key={submission.id} className="flex items-center">
                <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatar} alt={userName} />
                <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
                <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{submission.googleDriveLink.substring(0,25)}...</p>
                <p className="text-sm text-muted-foreground">
                    by {userName}
                </p>
                </div>
                <div className="ml-auto font-medium capitalize">{submission.statusId}</div>
            </div>
          )
      })}
    </div>
  );
}
