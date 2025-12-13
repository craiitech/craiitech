
'use client';

import { useMemo } from 'react';
import type { Unit, User as AppUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, User } from 'lucide-react';
import { Badge } from '../ui/badge';

interface UnitUserOverviewProps {
  allUsers: AppUser[] | null;
  allUnits: Unit[] | null;
  isLoading: boolean;
  userProfile: AppUser | null;
}

export function UnitUserOverview({
  allUsers,
  allUnits,
  isLoading,
  userProfile,
}: UnitUserOverviewProps) {

  const usersByUnit = useMemo(() => {
    if (!allUsers || !allUnits || !userProfile?.campusId) {
      return [];
    }

    const campusUnits = allUnits.filter(u => u.campusIds?.includes(userProfile.campusId));
    
    const unitMap = new Map(campusUnits.map(unit => [unit.id, { ...unit, users: [] as AppUser[] }]));

    for (const user of allUsers) {
      if (user.unitId && unitMap.has(user.unitId)) {
        unitMap.get(user.unitId)?.users.push(user);
      }
    }

    return Array.from(unitMap.values());

  }, [allUsers, allUnits, userProfile]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (usersByUnit.length === 0) {
    return null; 
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registered Users by Unit</CardTitle>
        <CardDescription>
          An overview of all registered user accounts within each unit of your campus.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {usersByUnit.map(unit => (
            <AccordionItem value={unit.id} key={unit.id}>
              <AccordionTrigger className="font-medium hover:no-underline">
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{unit.name}</span>
                  <Badge variant="secondary">{unit.users.length} User(s)</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {unit.users.length > 0 ? (
                  <div className="space-y-3 pl-6">
                    {unit.users.map(user => (
                      <div key={user.id} className="flex items-center gap-3 rounded-md border p-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} alt={user.firstName} />
                          <AvatarFallback>
                            {user.firstName?.charAt(0)}
                            {user.lastName?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-muted-foreground">{user.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pl-6 text-sm text-muted-foreground">
                    No registered users in this unit yet.
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

    
