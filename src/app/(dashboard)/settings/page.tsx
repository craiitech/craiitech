
'use client';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { UserManagement } from '@/components/admin/user-management';
import { CampusManagement } from '@/components/admin/campus-management';
import { RoleManagement } from '@/components/admin/role-management';
import { CampusSettingsManagement } from '@/components/admin/campus-settings-management';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminUnitManagement } from '@/components/admin/admin-unit-management';
import { DirectorUnitManagement } from '@/components/admin/director-unit-management';


export default function SettingsPage() {
  const { userProfile, isAdmin, isUserLoading, userRole } = useUser();
  
  const isCampusSupervisor = userRole === 'Campus Director' || userRole === 'Campus ODIMO';

  if (isUserLoading) {
     return (
       <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
            Loading settings...
        </p>
        <div className="space-y-4 pt-4">
            <Skeleton className="h-10 w-[400px]" />
            <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  
  const renderUnitManagementForSupervisor = () => {
    // Both Campus Director and Campus ODIMO should have the same unit management capabilities
    if (userRole === 'Campus Director' || userRole === 'Campus ODIMO') {
      return <DirectorUnitManagement />;
    }
    return null;
  }

  if (isAdmin) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
          <p className="text-muted-foreground">
            Manage users, campuses, units, roles, and campus-specific settings.
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
            <AdminUnitManagement />
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
  
  if (isCampusSupervisor) {
      return (
         <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Campus Settings</h2>
              <p className="text-muted-foreground">
                Manage settings and resources specific to your campus.
              </p>
            </div>
            <div>
                 <h3 className="text-xl font-semibold tracking-tight mb-2">Unit Management</h3>
                <DirectorUnitManagement />
            </div>
             <div>
                <h3 className="text-xl font-semibold tracking-tight mb-2">Campus Announcement</h3>
                <CampusSettingsManagement />
            </div>
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
