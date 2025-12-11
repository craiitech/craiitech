
'use client'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Submission } from '@/lib/types';
import { useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';

export function RecentSubmissions() {
  const firestore = useFirestore();
  const { user: authUser, userProfile } = useUser();

  const submissionsQuery = useMemoFirebase(
    () =>
      firestore && authUser
        ? query(
            collection(firestore, 'users', authUser.uid, 'submissions'),
            orderBy('submissionDate', 'desc'),
            limit(5)
          )
        : null,
    [firestore, authUser]
  );
  const { data: submissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const isLoading = isLoadingSubmissions || !userProfile;
  
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

  const userName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Unknown User';
  const userInitial = userName.charAt(0);
  const avatar = userProfile?.avatar;

  return (
    <div className="space-y-8">
      {submissions.map(submission => {
          return (
            <div key={submission.id} className="flex items-center">
                <Avatar className="h-9 w-9">
                <AvatarImage src={avatar} alt={userName} />
                <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
                <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none max-w-[150px] truncate" title={submission.googleDriveLink}>{submission.googleDriveLink}</p>
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
