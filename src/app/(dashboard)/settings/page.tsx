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
import { AnnouncementManagement } from '@/components/admin/announcement-management';
import { Separator } from '@/components/ui/separator';
import { CycleManagement } from '@/components/admin/cycle-management';
import { ErrorReportManagement } from '@/components/admin/error-report-management';
import { ProcedureManualManagement } from '@/components/admin/procedure-manual-management';
import { EomsPolicyManualManagement } from '@/components/admin/eoms-policy-manual-management';
import { UnitGroupingExplorer } from '@/components/admin/unit-grouping-explorer';
import { AdvisoryManagement } from '@/components/advisories/advisory-management';
import { SignatoryManagement } from '@/components/admin/signatory-management';
import { DataBackupManagement } from '@/components/admin/data-backup-management';
import { GadSettingsManagement } from '@/components/admin/gad-settings-management';
import { LogoManagement } from '@/components/admin/logo-management';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function SettingsPage() {
  const { userProfile, isAdmin, isUserLoading, userRole } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = searchParams.get('tab') || 'users';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };
  
  if (isUserLoading) {
     return (
       <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
            Loading settings...
        </p>
        <div className="space-y-4 pt-4">
            <Skeleton className="h-10 w-full md:w-[400px]" />
            <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }
  
  if (isAdmin) {
    return (
      <div className="space-y-4">
        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b space-y-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
                <p className="text-muted-foreground">
                  Manage users, campuses, units, roles, and institutional signatories.
                </p>
              </div>
              <ScrollArea className="w-full">
                  <TabsList className="flex md:inline-flex min-w-max h-auto bg-muted p-1 animate-tab-highlight rounded-md whitespace-nowrap">
                    <TabsTrigger value="users" className="text-[10px] font-black uppercase tracking-widest px-6 h-8">Users</TabsTrigger>
                    <TabsTrigger value="logo" className="text-[10px] font-black uppercase tracking-widest px-6 h-8">System Logo</TabsTrigger>
                    <TabsTrigger value="signatories" className="text-[10px] font-black uppercase tracking-widest px-6 h-8">Signatories</TabsTrigger>
                    <TabsTrigger value="gad" className="text-[10px] font-black uppercase tracking-widest px-6 h-8">GAD Corner</TabsTrigger>
                    <TabsTrigger value="campuses" className="text-[10px] font-black uppercase tracking-widest px-6 h-8">Campuses</TabsTrigger>
                    <TabsTrigger value="units" className="text-[10px] font-black uppercase tracking-widest px-6 h-8">Units</TabsTrigger>
                    <TabsTrigger value="unit-grouping" className="text-[10px] font-black uppercase tracking-widest px-6 h-8">Unit Explorer</TabsTrigger>
                    <TabsTrigger value="roles" className="text-[10px] font-black uppercase tracking-widest px-6 h-8">Roles</TabsTrigger>
                    <TabsTrigger value="advisories" className="text-[10px] font-black uppercase tracking-widest px-6 h-8">QA Advisories</TabsTrigger>
                    <TabsTrigger value="procedure-manuals" className="text-[10px] font-black uppercase tracking-widest px-6 h-8">Procedure Manuals</TabsTrigger>
                    <TabsTrigger value="eoms-policy-manual" className="text-[10px] font-black uppercase tracking-widest px-6 h-8">RSU EOMS Manual</TabsTrigger>
                    <TabsTrigger value="cycles" className="text-[10px] font-black uppercase tracking-widest px-6 h-8">Cycles & Deadlines</TabsTrigger>
                    <TabsTrigger value="campus-settings" className="text-[10px] font-black uppercase tracking-widest px-6 h-8">Campus Settings</TabsTrigger>
                    <TabsTrigger value="backups" className="text-[10px] font-black uppercase tracking-widest px-6 h-8">Data & Backups</TabsTrigger>
                    <TabsTrigger value="error-reports" className="text-[10px] font-black uppercase tracking-widest px-6 h-8">Error Reports</TabsTrigger>
                  </TabsList>
              </ScrollArea>
          </div>

          <TabsContent value="users" className="space-y-4 animate-in fade-in duration-500">
            <UserManagement />
          </TabsContent>
          <TabsContent value="logo" className="space-y-4 animate-in fade-in duration-500">
            <LogoManagement />
          </TabsContent>
          <TabsContent value="signatories" className="space-y-4 animate-in fade-in duration-500">
            <SignatoryManagement />
          </TabsContent>
          <TabsContent value="gad" className="space-y-4 animate-in fade-in duration-500">
            <GadSettingsManagement />
          </TabsContent>
          <TabsContent value="campuses" className="space-y-4 animate-in fade-in duration-500">
            <CampusManagement />
          </TabsContent>
          <TabsContent value="units" className="space-y-4 animate-in fade-in duration-500">
            <AdminUnitManagement />
          </TabsContent>
          <TabsContent value="unit-grouping" className="space-y-4 animate-in fade-in duration-500">
            <UnitGroupingExplorer />
          </TabsContent>
          <TabsContent value="roles" className="space-y-4 animate-in fade-in duration-500">
            <RoleManagement />
          </TabsContent>
          <TabsContent value="advisories" className="space-y-4 animate-in fade-in duration-500">
            <AdvisoryManagement />
          </TabsContent>
          <TabsContent value="procedure-manuals" className="space-y-4 animate-in fade-in duration-500">
            <ProcedureManualManagement />
          </TabsContent>
          <TabsContent value="eoms-policy-manual" className="space-y-4 animate-in fade-in duration-500">
            <EomsPolicyManualManagement />
          </TabsContent>
           <TabsContent value="cycles" className="space-y-4 animate-in fade-in duration-500">
            <CycleManagement />
          </TabsContent>
           <TabsContent value="campus-settings" className="space-y-6 animate-in fade-in duration-500">
            <CampusSettingsManagement />
            <Separator />
            <AnnouncementManagement />
          </TabsContent>
          <TabsContent value="backups" className="space-y-4 animate-in fade-in duration-500">
            <DataBackupManagement />
          </TabsContent>
           <TabsContent value="error-reports" className="space-y-4 animate-in fade-in duration-500">
            <ErrorReportManagement />
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  
  if (userRole === 'Campus Director') {
      return (
         <div className="space-y-6">
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b">
              <h2 className="text-2xl font-bold tracking-tight">Campus Settings</h2>
              <p className="text-muted-foreground">
                Manage settings and resources specific to your campus.
              </p>
            </div>
            <div className="space-y-8 pt-4">
                <div>
                    <h3 className="text-lg font-black uppercase tracking-tight mb-4 text-primary">Unit Management</h3>
                    <DirectorUnitManagement />
                </div>
                <Separator />
                <div>
                    <h3 className="text-lg font-black uppercase tracking-tight mb-4 text-primary">Campus Announcement</h3>
                    <CampusSettingsManagement />
                </div>
            </div>
        </div>
      )
  }

  return (
     <div className="space-y-4">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b">
          <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
          <p className="text-muted-foreground">
            You do not have permission to modify system settings.
          </p>
        </div>
      </div>
  )
}
