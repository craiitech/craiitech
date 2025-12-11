
'use client';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { UserManagement } from '@/components/admin/user-management';
import { CampusManagement } from '@/components/admin/campus-management';
import { UnitManagement } from '@/components/admin/unit-management';
import { RoleManagement } from '@/components/admin/role-management';
import { useUser } from '@/firebase';
import { useMemo } from 'react';

export default function SettingsPage() {
  const { userProfile, isAdmin } = useUser();

  const isCampusLevelManager = useMemo(() => {
    if (!userProfile?.role) return false;
    return ['Campus Director', 'Campus ODIMO'].includes(userProfile.role);
  }, [userProfile]);

  if (isAdmin) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
          <p className="text-muted-foreground">
            Manage users, campuses, units, roles, and system settings.
          </p>
        </div>
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="campuses">Campuses</TabsTrigger>
            <TabsTrigger value="units">Units</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
          <TabsContent value="campuses" className="space-y-4">
            <CampusManagement />
          </TabsContent>
          <TabsContent value="units" className="space-y-4">
            <UnitManagement />
          </TabsContent>
          <TabsContent value="roles" className="space-y-4">
            <RoleManagement />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (isCampusLevelManager) {
     return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Campus Settings</h2>
          <p className="text-muted-foreground">
            Manage units within your campus.
          </p>
        </div>
         <UnitManagement />
      </div>
    );
  }

  return (
     <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            You do not have permission to modify system settings.
          </p>
        </div>
      </div>
  )
}
