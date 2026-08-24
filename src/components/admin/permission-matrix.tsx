'use client';

import { useState, useMemo, useCallback, useEffect, Fragment } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp } from '@/firebase/firestore-wrapper';
import type { Role } from '@/lib/types';
import { PERMISSION_GROUPS, ALL_PERMISSION_IDS, getDefaultPermissions } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, RefreshCw, ShieldCheck, ChevronDown, ChevronRight, Search, X, Filter } from 'lucide-react';

export function PermissionMatrix() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoConfiguring, setIsAutoConfiguring] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    const all: Record<string, boolean> = {};
    for (const key of Object.keys(PERMISSION_GROUPS)) all[key] = true;
    return all;
  });

  const rolesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'roles') : null), [firestore]);
  const { data: roles, isLoading } = useCollection<Role>(rolesQuery);

  const [localPerms, setLocalPerms] = useState<Record<string, Record<string, boolean>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!roles) return;
    const initial: Record<string, Record<string, boolean>> = {};
    for (const role of roles) {
      initial[role.id] = { ...(role.permissions || {}) };
    }
    setLocalPerms(initial);
    setHasChanges(false);
  }, [roles]);

  const togglePermission = useCallback((roleId: string, permId: string) => {
    setLocalPerms((prev) => {
      const rolePerms = { ...(prev[roleId] || {}) };
      rolePerms[permId] = !rolePerms[permId];
      setHasChanges(true);
      return { ...prev, [roleId]: rolePerms };
    });
  }, []);

  const toggleModuleForRole = useCallback((roleId: string, moduleKey: string, value: boolean) => {
    setLocalPerms((prev) => {
      const rolePerms = { ...(prev[roleId] || {}) };
      const modulePermIds = Object.keys(PERMISSION_GROUPS[moduleKey].permissions);
      for (const permId of modulePermIds) {
        rolePerms[permId] = value;
      }
      setHasChanges(true);
      return { ...prev, [roleId]: rolePerms };
    });
  }, []);

  const handleAutoConfigure = useCallback(async () => {
    if (!firestore || !roles) return;
    setIsAutoConfiguring(true);
    try {
      const batch = writeBatch(firestore);
      for (const role of roles) {
        const defaults = getDefaultPermissions(role.name);
        batch.update(doc(firestore, 'roles', role.id), {
          permissions: defaults,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();

      const updated: Record<string, Record<string, boolean>> = {};
      for (const role of roles) {
        updated[role.id] = getDefaultPermissions(role.name);
      }
      setLocalPerms(updated);
      setHasChanges(false);

      toast({
        title: 'Permissions Configured',
        description: `Default permissions applied to ${roles.length} roles based on their titles.`,
      });
    } catch {
      toast({ title: 'Error', description: 'Could not set default permissions.', variant: 'destructive' });
    } finally {
      setIsAutoConfiguring(false);
    }
  }, [firestore, roles, toast]);

  const handleSave = useCallback(async () => {
    if (!firestore || !roles) return;
    setIsSaving(true);
    try {
      const batch = writeBatch(firestore);
      for (const role of roles) {
        const perms = localPerms[role.id] || {};
        batch.update(doc(firestore, 'roles', role.id), {
          permissions: perms,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      setHasChanges(false);
      toast({
        title: 'Permissions Saved',
        description: `Updated permissions for ${roles.length} roles.`,
      });
    } catch {
      toast({ title: 'Error', description: 'Could not save permissions.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [firestore, roles, localPerms, toast]);

  const toggleModule = useCallback((key: string) => {
    setExpandedModules((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const getPermissionValue = useCallback(
    (roleId: string, permId: string): boolean => {
      return localPerms[roleId]?.[permId] === true;
    },
    [localPerms],
  );

  const roleList = useMemo(() => {
    if (!roles) return [];
    if (selectedRoleFilter === 'all') return roles;
    return roles.filter((r) => r.id === selectedRoleFilter);
  }, [roles, selectedRoleFilter]);

  const filteredGroups = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    const result: Record<string, { label: string; permissions: Record<string, string> }> = {};

    for (const [moduleKey, module] of Object.entries(PERMISSION_GROUPS)) {
      if (selectedModuleFilter !== 'all' && moduleKey !== selectedModuleFilter) {
        continue;
      }

      const matchingPerms: Record<string, string> = {};
      const moduleLabelMatches = module.label.toLowerCase().includes(query);

      for (const [permId, permLabel] of Object.entries(module.permissions)) {
        if (
          !query ||
          moduleLabelMatches ||
          permLabel.toLowerCase().includes(query) ||
          permId.toLowerCase().includes(query)
        ) {
          matchingPerms[permId] = permLabel;
        }
      }

      if (Object.keys(matchingPerms).length > 0) {
        result[moduleKey] = {
          label: module.label,
          permissions: matchingPerms,
        };
      }
    }

    return result;
  }, [searchTerm, selectedModuleFilter]);

  const totalFilteredPermissionsCount = useMemo(() => {
    return Object.values(filteredGroups).reduce((sum, g) => sum + Object.keys(g.permissions).length, 0);
  }, [filteredGroups]);

  const hasActiveFilters = searchTerm.trim() !== '' || selectedModuleFilter !== 'all' || selectedRoleFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedModuleFilter('all');
    setSelectedRoleFilter('all');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-40" />
      </div>
    );
  }

  return (
    <Card className="shadow-md border-primary/10">
      <CardHeader className="bg-primary/5 border-b py-5 space-y-4">
        <div className="flex items-center gap-2 text-primary mb-1">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Access Control</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <CardTitle>Permission Matrix</CardTitle>
            <CardDescription>
              Assign granular permissions to each role. Admins automatically have full access.
            </CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoConfigure}
              disabled={isAutoConfiguring}
              className="text-[10px] font-black uppercase tracking-widest bg-background"
            >
              {isAutoConfiguring ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Set Defaults
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              {hasChanges ? 'Save Changes' : 'Saved'}
            </Button>
          </div>
        </div>

        {/* SEARCH AND FILTER TOOLBAR */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search permissions or modules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-8 h-9 text-xs bg-background"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="w-full md:w-56">
            <Select value={selectedModuleFilter} onValueChange={setSelectedModuleFilter}>
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules ({Object.keys(PERMISSION_GROUPS).length})</SelectItem>
                {Object.entries(PERMISSION_GROUPS).map(([key, group]) => (
                  <SelectItem key={key} value={key}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-56">
            <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
              <SelectTrigger className="h-9 text-xs bg-background">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles ({roles?.length || 0})</SelectItem>
                {roles?.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="h-9 text-[10px] font-black uppercase tracking-wider shrink-0 bg-background"
            >
              <X className="h-3.5 w-3.5 mr-1" /> Reset Filters
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {Object.keys(filteredGroups).length > 0 ? (
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-20">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase pl-6 py-3 min-w-[240px] sticky left-0 bg-muted/50 z-10">
                    <div className="flex items-center justify-between pr-2">
                      <span>Permission</span>
                      <Badge variant="outline" className="text-[9px] font-normal px-1.5 h-4">
                        {totalFilteredPermissionsCount} items
                      </Badge>
                    </div>
                  </TableHead>
                  {roleList.map((role) => (
                    <TableHead
                      key={role.id}
                      className="text-[10px] font-black uppercase text-center py-3 min-w-[120px] max-w-[140px] px-2"
                    >
                      <div className="truncate" title={role.name}>
                        {role.name}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(filteredGroups).map(([moduleKey, module]) => {
                  const isExpanded = expandedModules[moduleKey] !== false;
                  const permIds = Object.keys(module.permissions);

                  return (
                    <Fragment key={moduleKey}>
                      {/* Module header row */}
                      <TableRow
                        className="cursor-pointer hover:bg-muted/30 border-b group"
                        onClick={() => toggleModule(moduleKey)}
                      >
                        <TableCell className="pl-6 py-2.5 font-black text-[10px] uppercase tracking-widest text-primary sticky left-0 bg-background z-10 border-r min-w-[240px]">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            {module.label}
                            <span className="text-[9px] font-normal text-muted-foreground">({permIds.length})</span>
                          </div>
                        </TableCell>
                        {roleList.map((role) => (
                          <TableCell
                            key={role.id}
                            className="text-center py-2.5 px-2 border-r min-w-[120px] max-w-[140px]"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                className="text-[8px] font-black uppercase text-muted-foreground hover:text-primary px-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleModuleForRole(role.id, moduleKey, true);
                                }}
                                title="Enable all"
                              >
                                All
                              </button>
                              <button
                                type="button"
                                className="text-[8px] font-black uppercase text-muted-foreground hover:text-destructive px-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleModuleForRole(role.id, moduleKey, false);
                                }}
                                title="Disable all"
                              >
                                None
                              </button>
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>

                      {/* Sub-rows for each permission */}
                      {isExpanded &&
                        permIds.map((permId) => {
                          const permLabel = module.permissions[permId];
                          return (
                            <TableRow key={permId} className="hover:bg-muted/20 border-b border-muted/30 group">
                              <TableCell className="pl-10 py-2 text-[11px] font-medium text-muted-foreground sticky left-0 bg-background z-10 border-r min-w-[240px]">
                                <div>
                                  <span>{permLabel}</span>
                                  <span className="block text-[9px] font-mono text-muted-foreground/60">{permId}</span>
                                </div>
                              </TableCell>
                              {roleList.map((role) => {
                                const checked = getPermissionValue(role.id, permId);
                                return (
                                  <TableCell
                                    key={role.id}
                                    className="text-center py-2 px-2 border-r min-w-[120px] max-w-[140px]"
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={() => togglePermission(role.id, permId)}
                                      className="mx-auto"
                                    />
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-52 text-center p-4">
            <ShieldCheck className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs font-bold text-muted-foreground">No permissions found matching search filters.</p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="mt-3 h-7 text-[10px] font-bold">
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-muted/10 border-t py-3 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-[9px] text-muted-foreground italic">
          Users with Admin role automatically bypass permission checks. Use &quot;Set Defaults&quot; to auto-assign
          permissions based on the current role name conventions.
        </p>
        {hasChanges && (
          <Badge variant="default" className="text-[9px] font-black uppercase bg-amber-500 text-white shrink-0">
            Unsaved Changes
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}
