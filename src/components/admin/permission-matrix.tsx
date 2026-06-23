'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase'
import { collection, doc, updateDoc, writeBatch, serverTimestamp } from '@/firebase/firestore-wrapper'
import type { Role } from '@/lib/types'
import { PERMISSION_GROUPS, ALL_PERMISSION_IDS, getDefaultPermissions } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save, RefreshCw, ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PermissionMatrix() {
  const firestore = useFirestore()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isAutoConfiguring, setIsAutoConfiguring] = useState(false)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    const all: Record<string, boolean> = {}
    for (const key of Object.keys(PERMISSION_GROUPS)) all[key] = true
    return all
  })

  const rolesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'roles') : null),
    [firestore],
  )
  const { data: roles, isLoading } = useCollection<Role>(rolesQuery)

  const [localPerms, setLocalPerms] = useState<Record<string, Record<string, boolean>>>({})
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (!roles) return
    const initial: Record<string, Record<string, boolean>> = {}
    for (const role of roles) {
      initial[role.id] = { ...(role.permissions || {}) }
    }
    setLocalPerms(initial)
    setHasChanges(false)
  }, [roles])

  const togglePermission = useCallback((roleId: string, permId: string) => {
    setLocalPerms((prev) => {
      const rolePerms = { ...(prev[roleId] || {}) }
      rolePerms[permId] = !rolePerms[permId]
      setHasChanges(true)
      return { ...prev, [roleId]: rolePerms }
    })
  }, [])

  const toggleModuleForRole = useCallback((roleId: string, moduleKey: string, value: boolean) => {
    setLocalPerms((prev) => {
      const rolePerms = { ...(prev[roleId] || {}) }
      const modulePermIds = Object.keys(PERMISSION_GROUPS[moduleKey].permissions)
      for (const permId of modulePermIds) {
        rolePerms[permId] = value
      }
      setHasChanges(true)
      return { ...prev, [roleId]: rolePerms }
    })
  }, [])

  const toggleModuleForAllRoles = useCallback((moduleKey: string, value: boolean) => {
    if (!roles) return
    setLocalPerms((prev) => {
      const next = { ...prev }
      const modulePermIds = Object.keys(PERMISSION_GROUPS[moduleKey].permissions)
      for (const role of roles) {
        const rolePerms = { ...(next[role.id] || {}) }
        for (const permId of modulePermIds) {
          rolePerms[permId] = value
        }
        next[role.id] = rolePerms
      }
      setHasChanges(true)
      return next
    })
  }, [roles])

  const handleAutoConfigure = useCallback(async () => {
    if (!firestore || !roles) return
    setIsAutoConfiguring(true)
    try {
      const batch = writeBatch(firestore)
      for (const role of roles) {
        const defaults = getDefaultPermissions(role.name)
        batch.update(doc(firestore, 'roles', role.id), {
          permissions: defaults,
          updatedAt: serverTimestamp(),
        })
      }
      await batch.commit()

      const updated: Record<string, Record<string, boolean>> = {}
      for (const role of roles) {
        updated[role.id] = getDefaultPermissions(role.name)
      }
      setLocalPerms(updated)
      setHasChanges(false)

      toast({
        title: 'Permissions Configured',
        description: `Default permissions applied to ${roles.length} roles based on their titles.`,
      })
    } catch {
      toast({ title: 'Error', description: 'Could not set default permissions.', variant: 'destructive' })
    } finally {
      setIsAutoConfiguring(false)
    }
  }, [firestore, roles, toast])

  const handleSave = useCallback(async () => {
    if (!firestore || !roles) return
    setIsSaving(true)
    try {
      const batch = writeBatch(firestore)
      for (const role of roles) {
        const perms = localPerms[role.id] || {}
        batch.update(doc(firestore, 'roles', role.id), {
          permissions: perms,
          updatedAt: serverTimestamp(),
        })
      }
      await batch.commit()
      setHasChanges(false)
      toast({
        title: 'Permissions Saved',
        description: `Updated permissions for ${roles.length} roles.`,
      })
    } catch {
      toast({ title: 'Error', description: 'Could not save permissions.', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }, [firestore, roles, localPerms, toast])

  const toggleModule = useCallback((key: string) => {
    setExpandedModules((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const getPermissionValue = useCallback(
    (roleId: string, permId: string): boolean => {
      return localPerms[roleId]?.[permId] === true
    },
    [localPerms],
  )

  const isModuleFullyEnabled = useCallback(
    (roleId: string, moduleKey: string): boolean => {
      const permIds = Object.keys(PERMISSION_GROUPS[moduleKey].permissions)
      return permIds.every((pid) => getPermissionValue(roleId, pid))
    },
    [getPermissionValue],
  )

  const isModuleFullyDisabled = useCallback(
    (roleId: string, moduleKey: string): boolean => {
      const permIds = Object.keys(PERMISSION_GROUPS[moduleKey].permissions)
      return permIds.every((pid) => !getPermissionValue(roleId, pid))
    },
    [getPermissionValue],
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-40" />
      </div>
    )
  }

  const allPermIds = ALL_PERMISSION_IDS
  const roleList = roles || []

  return (
    <Card className="shadow-md border-primary/10">
      <CardHeader className="bg-primary/5 border-b py-6">
        <div className="flex items-center gap-2 text-primary mb-1">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-[10px] font-black uppercase tracking-widest text-primary">
            Access Control
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
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
              className="text-[10px] font-black uppercase tracking-widest"
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
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              {hasChanges ? 'Save Changes' : 'Saved'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[600px]">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-20">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase pl-6 py-3 min-w-[240px] sticky left-0 bg-muted/50 z-10">
                  Permission
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
              {Object.entries(PERMISSION_GROUPS).map(([moduleKey, module]) => {
                const isExpanded = expandedModules[moduleKey] !== false
                const permIds = Object.keys(module.permissions)

                return (
                  <TableRow key={moduleKey} className="group">
                    <TableCell
                      colSpan={roleList.length + 1}
                      className="p-0"
                    >
                      <table className="w-full">
                        <tbody>
                          {/* Module header row */}
                          <TableRow
                            className="cursor-pointer hover:bg-muted/30 border-b"
                            onClick={() => toggleModule(moduleKey)}
                          >
                            <TableCell className="pl-6 py-2.5 font-black text-[10px] uppercase tracking-widest text-primary sticky left-0 bg-background z-10 flex items-center gap-2 border-r">
                              {isExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                              {module.label}
                            </TableCell>
                            {roleList.map((role) => (
                              <TableCell
                                key={role.id}
                                className="text-center py-2.5 px-2 border-r"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    className="text-[8px] font-black uppercase text-muted-foreground hover:text-primary px-1"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleModuleForRole(role.id, moduleKey, true)
                                    }}
                                    title="Enable all"
                                  >
                                    All
                                  </button>
                                  <button
                                    type="button"
                                    className="text-[8px] font-black uppercase text-muted-foreground hover:text-destructive px-1"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleModuleForRole(role.id, moduleKey, false)
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
                              const permLabel = module.permissions[permId]
                              return (
                                <TableRow key={permId} className="hover:bg-muted/20 border-b border-muted/30">
                                  <TableCell className="pl-10 py-2 text-[11px] font-medium text-muted-foreground sticky left-0 bg-background z-10 border-r">
                                    {permLabel}
                                  </TableCell>
                                  {roleList.map((role) => {
                                    const checked = getPermissionValue(role.id, permId)
                                    return (
                                      <TableCell
                                        key={role.id}
                                        className="text-center py-2 px-2 border-r"
                                      >
                                        <Checkbox
                                          checked={checked}
                                          onCheckedChange={() =>
                                            togglePermission(role.id, permId)
                                          }
                                          className="mx-auto"
                                        />
                                      </TableCell>
                                    )
                                  })}
                                </TableRow>
                              )
                            })}
                        </tbody>
                      </table>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
      <CardFooter className="bg-muted/10 border-t py-3 px-6">
        <p className="text-[9px] text-muted-foreground italic">
          Users with {roleList.length > 0 ? 'Admin' : ''} role automatically bypass permission
          checks. Use "Set Defaults" to auto-assign permissions based on the current role name
          conventions.
        </p>
      </CardFooter>
    </Card>
  )
}
