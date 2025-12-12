
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
import { CampusSettingsManagement } from '@/components/admin/campus-settings-management';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
  const { userProfile, isAdmin, isUserLoading } = useUser();
  
  const isCampusDirector = userProfile?.role === 'Campus Director' || userProfile?.role === 'Campus ODIMO';

  if (isUserLoading) {
     return (
       <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-96" />
        <div className="space-y-4 pt-4">
            <Skeleton className="h-10 w-[400px]" />
            <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

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
            <TabsTrigger value="campus-settings">Campus Settings</TabsTrigger>
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
           <TabsContent value="campus-settings" className="space-y-4">
            <CampusSettingsManagement />
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  
  if (isCampusDirector) {
      return (
         <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Campus Settings</h2>
              <p className="text-muted-foreground">
                Manage settings specific to your campus.
              </p>
            </div>
            <CampusSettingsManagement />
        </div>
      )
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
