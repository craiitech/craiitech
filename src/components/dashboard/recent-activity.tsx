'use client'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { useFirestore, useUser } from '@/firebase';
import type { Submission, User as AppUser } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { collection, query, where, getDocs } from 'firebase/firestore';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive',
    submitted: 'outline'
}

interface RecentActivityProps {
    submissions: Submission[] | null;
    isLoading: boolean;
}

export function RecentActivity({ submissions, isLoading: isLoadingSubmissions }: RecentActivityProps) {
  const { userProfile, isAdmin } = useUser();
  const firestore = useFirestore();
  const [users, setUsers] = useState<Record<string, AppUser>>({});
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);

  // Use the denormalized role from userProfile
  const userRoleName = isAdmin ? 'Admin' : userProfile?.role;
  const isSupervisor = userRoleName === 'Admin' || userRoleName === 'Campus Director' || userRoleName === 'Campus ODIMO' || userRoleName === 'Unit ODIMO';


  useEffect(() => {
    if (!isSupervisor || !submissions || submissions.length === 0 || !firestore) return;

    const fetchUsers = async () => {
        setIsFetchingUsers(true);
        const userIdsToFetch = [...new Set(submissions.map(s => s.userId))].filter(id => !users[id]);
        
        if (userIdsToFetch.length > 0) {
            try {
                // Firestore 'in' query is limited to 30 elements. We need to chunk it.
                const chunks: string[][] = [];
                for (let i = 0; i < userIdsToFetch.length; i += 30) {
                    chunks.push(userIdsToFetch.slice(i, i + 30));
                }
                const userPromises = chunks.map(chunk => 
                    getDocs(query(collection(firestore, 'users'), where('id', 'in', chunk)))
                );
                const userSnapshots = await Promise.all(userPromises);
                const fetchedUsers: Record<string, AppUser> = {};
                userSnapshots.forEach(snap => {
                     snap.docs.forEach(doc => {
                        fetchedUsers[doc.id] = doc.data() as AppUser;
                    });
                });
                setUsers(prev => ({...prev, ...fetchedUsers}));
            } catch (error) {
                console.error("Error fetching users for recent activity:", error);
            }
        }
        setIsFetchingUsers(false);
    }
    fetchUsers();
  }, [submissions, isSupervisor, firestore, users]);
  
  const recentSubmissions = useMemo(() => {
    if (!submissions) return [];
    // Sort by date just in case they aren't already
    return [...submissions]
      .sort((a, b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime())
      .slice(0, 5);
  }, [submissions]);

  const isLoading = isLoadingSubmissions || (isSupervisor && isFetchingUsers);
  
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
          <div className="flex h-full items-center justify-center text-muted-foreground">
              No recent activity.
          </div>
      )
  }

  const getUserName = (userId: string) => {
    if (isSupervisor) {
        const user = users[userId];
        return user ? `${user.firstName} ${user.lastName}` : '...';
    }
    return userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'You';
  }
   const getUserAvatar = (userId: string) => {
    if (isSupervisor) return users[userId]?.avatar;
    return userProfile?.avatar;
   }
   const getUserFallback = (userId: string) => {
      const name = getUserName(userId);
      if (name === '...' || !name) return '?';
      const parts = name.split(' ');
      return `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts[parts.length - 1]?.[0] : ''}`.toUpperCase();
   }


  return (
    <div className="space-y-8">
      {recentSubmissions.map(submission => (
        <div key={submission.id} className="flex items-center">
            <Avatar className="h-9 w-9">
                <AvatarImage src={getUserAvatar(submission.userId)} alt={getUserName(submission.userId)} />
                <AvatarFallback>{getUserFallback(submission.userId)}</AvatarFallback>
            </Avatar>
            <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none max-w-[150px] truncate" title={submission.reportType}>
                    {submission.reportType}
                </p>
                <p className="text-sm text-muted-foreground">
                    by {getUserName(submission.userId)}
                </p>
            </div>
            <div className="ml-auto font-medium">
                 <Badge variant={statusVariant[submission.statusId] ?? 'secondary'} className="capitalize">
                    {submission.statusId}
                </Badge>
            </div>
        </div>
      ))}
    </div>
  );
}
