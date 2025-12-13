
'use client'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import type { Submission, User as AppUser } from '@/lib/types';
import { useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive',
    submitted: 'outline'
}

interface RecentActivityProps {
    submissions: Submission[] | null;
    isLoading: boolean;
    users: Map<string, AppUser>;
    userProfile: AppUser | null;
}

export function RecentActivity({ submissions, isLoading, users, userProfile }: RecentActivityProps) {
  
  const recentSubmissions = useMemo(() => {
    if (!submissions) return [];
    // Sort by date just in case they aren't already
    return [...submissions]
      .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime())
      .slice(0, 5);
  }, [submissions]);

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
                    <Skeleton className="ml-auto h-6 w-[60px] rounded-full" />
                </div>
            ))}
        </div>
    )
  }

  if (!recentSubmissions || recentSubmissions.length === 0) {
      return (
          <div className="flex h-[280px] items-center justify-center text-center text-sm text-muted-foreground">
              No recent activity to display.
          </div>
      )
  }

  const getUserName = (userId: string) => {
    const user = users.get(userId);
    return user ? `${user.firstName} ${user.lastName}` : '...';
  }
   const getUserAvatar = (userId: string) => {
    return users.get(userId)?.avatar;
   }
   const getUserFallback = (userId: string) => {
      const name = getUserName(userId);
      if (name === '...' || !name) return '?';
      const parts = name.split(' ');
      return `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts[parts.length - 1]?.[0] : ''}`.toUpperCase();
   }


  return (
    <div className="space-y-6">
      {recentSubmissions.map(submission => (
        <div key={submission.id} className="flex items-center">
            <Avatar className="h-9 w-9">
                <AvatarImage src={getUserAvatar(submission.userId)} alt={getUserName(submission.userId)} />
                <AvatarFallback>{getUserFallback(submission.userId)}</AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none max-w-[180px] truncate" title={submission.reportType}>
                    {submission.reportType}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                   {submission.unitName} &bull; {submission.cycleId} Cycle {submission.year}
                </p>
            </div>
            <div className="ml-auto font-medium text-right">
                 <Badge variant={statusVariant[submission.statusId] ?? 'secondary'} className="capitalize">
                    {submission.statusId}
                </Badge>
                 <p className="text-xs text-muted-foreground mt-1">
                    by {getUserName(submission.userId)}
                </p>
            </div>
        </div>
      ))}
    </div>
  );
}
