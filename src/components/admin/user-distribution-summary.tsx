'use client';

import { useMemo, useState, useCallback } from 'react';
import type { User, Unit, Campus, Role } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Building2,
  Users,
  School,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Shield,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserDistributionSummaryProps {
  users: User[];
  units: Unit[];
  campuses: Campus[];
  roles: Role[];
  onSelectUnit?: (unitName: string) => void;
  onSelectCampus?: (campusName: string) => void;
}

export function UserDistributionSummary({
  users,
  units,
  campuses,
  roles,
  onSelectUnit,
  onSelectCampus,
}: UserDistributionSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [unitSearch, setUnitSearch] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPresence, setSelectedPresence] = useState<'all' | 'with-users' | 'no-users'>('all');
  const [sortBy, setSortBy] = useState<'count' | 'name'>('count');

  const campusMap = useMemo(() => new Map(campuses.map((c) => [c.id, c.name])), [campuses]);
  const roleMap = useMemo(() => new Map(roles.map((r) => [r.id, r.name])), [roles]);

  const isUserComplete = (user: User) => {
    const isSystemAdmin = user.email === 'admin@eoms.com' || (user.role || '').toLowerCase().includes('admin');
    if (isSystemAdmin) return true;
    return Boolean(user.roleId || user.role) && Boolean(user.campusId);
  };

  // Helper to resolve unit name for a user
  const getUserUnitName = useCallback(
    (user: User) => {
      if (user.unitId) {
        const matched = units.find((u) => u.id === user.unitId);
        if (matched) return matched.name;
      }
      if (user.unitName && user.unitName.trim() !== '') {
        return user.unitName;
      }
      const roleName = roleMap.get(user.roleId) || user.role || '';
      const roleLower = roleName.toLowerCase();

      if (roleLower.includes('campus odimo') || roleLower.includes('campus director')) {
        const directorUnit = units.find(
          (u) =>
            u.campusIds?.includes(user.campusId) &&
            (u.name.toLowerCase().includes('campus director') ||
              u.name.toLowerCase().includes('office of the campus director')),
        );
        return directorUnit?.name || 'Office of the Campus Director';
      }

      if (roleLower === 'auditor') {
        const iqaUnit = units.find(
          (u) => u.name.toLowerCase() === 'internal quality audit' || u.name.toLowerCase() === 'iqa',
        );
        return iqaUnit?.name || 'Internal Quality Audit';
      }

      return 'Unassigned / Independent';
    },
    [units, roleMap],
  );

  // Detailed Unit Mapping with user counts
  const unitStats = useMemo(() => {
    const unitMapData = new Map<
      string,
      {
        id: string;
        name: string;
        category: string;
        campusNames: string[];
        users: User[];
        activeCount: number;
        pendingCount: number;
      }
    >();

    // Initialize with all known units from the system
    units.forEach((u) => {
      const cNames = (u.campusIds || []).map((cid) => campusMap.get(cid)).filter(Boolean) as string[];

      unitMapData.set(u.id, {
        id: u.id,
        name: u.name,
        category: u.category || 'Administrative',
        campusNames: cNames.length > 0 ? cNames : ['All Campuses / Central'],
        users: [],
        activeCount: 0,
        pendingCount: 0,
      });
    });

    // Special catch-all entry for unassigned accounts
    const unassignedId = '__unassigned__';
    unitMapData.set(unassignedId, {
      id: unassignedId,
      name: 'Unassigned / External Accounts',
      category: 'Support',
      campusNames: ['Unassigned'],
      users: [],
      activeCount: 0,
      pendingCount: 0,
    });

    // Bucket all users
    users.forEach((u) => {
      const isActive = u.verified && isUserComplete(u);
      let targetId = u.unitId;

      if (!targetId || !unitMapData.has(targetId)) {
        // Fallback by name lookup
        const resolvedName = getUserUnitName(u);
        const matchByName = units.find((unit) => unit.name.toLowerCase() === resolvedName.toLowerCase());
        targetId = matchByName ? matchByName.id : unassignedId;
      }

      const entry = unitMapData.get(targetId);
      if (entry) {
        entry.users.push(u);
        if (isActive) entry.activeCount++;
        else entry.pendingCount++;
      }
    });

    // Convert map to list and clean up unassigned if empty
    let list = Array.from(unitMapData.values());
    if (unitMapData.get(unassignedId)?.users.length === 0) {
      list = list.filter((item) => item.id !== unassignedId);
    }

    return list;
  }, [units, users, campusMap, getUserUnitName]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.verified && isUserComplete(u)).length;
    const pendingUsers = totalUsers - activeUsers;
    const ndaSigned = users.filter((u) => u.ndaAccepted).length;

    const officialUnits = unitStats.filter((u) => u.id !== '__unassigned__');
    const unitsWithUsers = officialUnits.filter((u) => u.users.length > 0);
    const unitsWithoutUsers = officialUnits.filter((u) => u.users.length === 0);
    const coveragePct = officialUnits.length > 0 ? Math.round((unitsWithUsers.length / officialUnits.length) * 100) : 0;

    // Campus breakdown
    const campusCounts = new Map<
      string,
      { id: string; name: string; count: number; active: number; pending: number }
    >();
    campuses.forEach((c) => {
      campusCounts.set(c.id, { id: c.id, name: c.name, count: 0, active: 0, pending: 0 });
    });
    const unassignedCampus = { id: '__unassigned_c__', name: 'Central / Unassigned', count: 0, active: 0, pending: 0 };

    users.forEach((u) => {
      const isActive = u.verified && isUserComplete(u);
      const camp = campusCounts.get(u.campusId);
      if (camp) {
        camp.count++;
        if (isActive) camp.active++;
        else camp.pending++;
      } else {
        unassignedCampus.count++;
        if (isActive) unassignedCampus.active++;
        else unassignedCampus.pending++;
      }
    });

    const campusList = Array.from(campusCounts.values())
      .concat(unassignedCampus.count > 0 ? [unassignedCampus] : [])
      .sort((a, b) => b.count - a.count);

    const topCampus = campusList[0] || { name: 'N/A', count: 0 };
    const topCampusPct = totalUsers > 0 ? Math.round((topCampus.count / totalUsers) * 100) : 0;

    // Role breakdown
    const roleCounts = new Map<string, { name: string; count: number }>();
    users.forEach((u) => {
      const rName = roleMap.get(u.roleId) || u.role || 'Unassigned Role';
      if (!roleCounts.has(rName)) {
        roleCounts.set(rName, { name: rName, count: 0 });
      }
      roleCounts.get(rName)!.count++;
    });

    const roleList = Array.from(roleCounts.values()).sort((a, b) => b.count - a.count);

    return {
      totalUsers,
      activeUsers,
      pendingUsers,
      activePct: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
      ndaSigned,
      ndaRate: totalUsers > 0 ? Math.round((ndaSigned / totalUsers) * 100) : 0,
      totalUnits: officialUnits.length,
      unitsWithUsersCount: unitsWithUsers.length,
      unitsWithoutUsersCount: unitsWithoutUsers.length,
      coveragePct,
      topCampus,
      topCampusPct,
      campusList,
      roleList,
    };
  }, [users, unitStats, campuses, roleMap]);

  // Filtered and sorted unit breakdown list
  const filteredUnitStats = useMemo(() => {
    let result = [...unitStats];

    // Filter by search query
    if (unitSearch.trim()) {
      const q = unitSearch.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.category.toLowerCase().includes(q) ||
          u.campusNames.some((c) => c.toLowerCase().includes(q)),
      );
    }

    // Filter by campus
    if (selectedCampus !== 'all') {
      const targetCampusName = campusMap.get(selectedCampus);
      if (targetCampusName) {
        result = result.filter(
          (u) => u.campusNames.includes(targetCampusName) || u.campusNames.includes('All Campuses / Central'),
        );
      }
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter((u) => u.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Filter by presence of users
    if (selectedPresence === 'with-users') {
      result = result.filter((u) => u.users.length > 0);
    } else if (selectedPresence === 'no-users') {
      result = result.filter((u) => u.users.length === 0);
    }

    // Sort
    if (sortBy === 'count') {
      result.sort((a, b) => b.users.length - a.users.length || a.name.localeCompare(b.name));
    } else {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [unitStats, unitSearch, selectedCampus, selectedCategory, selectedPresence, sortBy, campusMap]);

  const maxUnitCount = useMemo(() => {
    return Math.max(...unitStats.map((u) => u.users.length), 1);
  }, [unitStats]);

  return (
    <Card className="border border-indigo-100 dark:border-indigo-950/50 shadow-md bg-gradient-to-br from-white via-indigo-50/15 to-slate-50 dark:from-slate-900 dark:via-indigo-950/10 dark:to-slate-900 overflow-hidden">
      {/* Header bar with toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b bg-indigo-50/40 dark:bg-indigo-950/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                User Census & Unit Distribution
              </h3>
              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-black">
                {users.length} Accounts Registered
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live census of registered personnel distributed across academic units, administrative offices, and
              campuses
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 text-xs font-black uppercase tracking-wider gap-1.5 self-start sm:self-auto bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
        >
          <span>{isExpanded ? 'Collapse Analytics' : 'Expand Analytics'}</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Collapsed Compact Preview Bar */}
      {!isExpanded && (
        <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs bg-white/70 dark:bg-slate-900/70 border-b">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Quick Census:</span>
            <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-black">
              Total: {kpis.totalUsers}
            </Badge>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-black">
              Active: {kpis.activeUsers} ({kpis.activePct}%)
            </Badge>
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-black">
              Pending: {kpis.pendingUsers}
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-black">
              Offices Represented: {kpis.unitsWithUsersCount} / {kpis.totalUnits} ({kpis.coveragePct}%)
            </Badge>
          </div>
          <div className="text-[10px] font-bold text-slate-500">
            Top Campus: <strong className="text-slate-800 dark:text-slate-200">{kpis.topCampus.name}</strong> (
            {kpis.topCampus.count} accounts)
          </div>
        </div>
      )}

      {/* Expanded Full Visualization Content */}
      {isExpanded && (
        <CardContent className="p-6 space-y-6">
          {/* Row 1: 4 High-Level Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Users */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Registered Accounts
                </span>
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {kpis.totalUsers}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">Total</span>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[9px] font-bold">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {kpis.activeUsers} Active ({kpis.activePct}%)
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    {kpis.pendingUsers} Pending
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Units with Registered Personnel */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-blue-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Offices & Units Coverage
                </span>
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-blue-700 dark:text-blue-400 tracking-tight">
                    {kpis.unitsWithUsersCount}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">of {kpis.totalUnits} Units</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[9px] font-bold">
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    {kpis.coveragePct}% Coverage
                  </span>
                  {kpis.unitsWithoutUsersCount > 0 ? (
                    <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      {kpis.unitsWithoutUsersCount} Without Users
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">100% Onboarded</span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: Top Campus Density */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-violet-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-violet-700 dark:text-violet-400">
                  Campus Distribution
                </span>
                <div className="p-1.5 rounded-lg bg-violet-50 text-violet-600">
                  <School className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-violet-700 dark:text-violet-400 tracking-tight">
                    {kpis.topCampus.count}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">Users ({kpis.topCampusPct}%)</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[9px]">
                  <span
                    className="font-bold text-slate-600 dark:text-slate-300 truncate max-w-[140px]"
                    title={kpis.topCampus.name}
                  >
                    {kpis.topCampus.name}
                  </span>
                  <span className="font-black text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200">
                    {kpis.campusList.length} Sites Active
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Account Onboarding & Verification */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-emerald-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Verification & NDA
                </span>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <Shield className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-emerald-600 tracking-tight">{kpis.ndaSigned}</span>
                  <span className="text-[11px] font-bold text-slate-400">of {kpis.totalUsers} Signed</span>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[9px] font-bold">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {kpis.ndaRate}% NDA Accepted
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    {kpis.activeUsers} Institutional Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Detailed Registered Personnel by Unit & Office */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Personnel Count by Unit & Office
                  </h4>
                  <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 dark:bg-slate-700">
                    {filteredUnitStats.length} Offices Displayed
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Click on any office to filter and locate its registered staff members in the table below
                </p>
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[180px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search unit or office..."
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  />
                </div>

                <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                  <SelectTrigger className="h-8 w-[140px] text-[10px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="All Campuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[10px] font-bold">
                      All Campuses
                    </SelectItem>
                    {campuses.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-[10px]">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-8 w-[130px] text-[10px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[10px] font-bold">
                      All Categories
                    </SelectItem>
                    <SelectItem value="academic" className="text-[10px]">
                      Academic
                    </SelectItem>
                    <SelectItem value="administrative" className="text-[10px]">
                      Administrative
                    </SelectItem>
                    <SelectItem value="support" className="text-[10px]">
                      Support
                    </SelectItem>
                    <SelectItem value="research" className="text-[10px]">
                      Research
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={selectedPresence}
                  onValueChange={(val: 'all' | 'with-users' | 'no-users') => setSelectedPresence(val)}
                >
                  <SelectTrigger className="h-8 w-[130px] text-[10px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="All Presence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[10px] font-bold">
                      All Offices
                    </SelectItem>
                    <SelectItem value="with-users" className="text-[10px]">
                      With Users
                    </SelectItem>
                    <SelectItem value="no-users" className="text-[10px]">
                      Without Users (0)
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortBy(sortBy === 'count' ? 'name' : 'count')}
                  className="h-8 text-[10px] font-black uppercase tracking-wider gap-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  title="Toggle sort between user count and alphabetical"
                >
                  <ArrowUpDown className="h-3 w-3" />
                  <span>{sortBy === 'count' ? 'By Count' : 'A-Z'}</span>
                </Button>
              </div>
            </div>

            {/* Scrollable Unit Cards Grid */}
            <div className="max-h-[380px] overflow-y-auto pr-1 border border-slate-100 dark:border-slate-700/50 rounded-xl p-2 bg-slate-50/40 dark:bg-slate-900/40">
              {filteredUnitStats.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No units or offices match the selected filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredUnitStats.map((item) => {
                    const hasUsers = item.users.length > 0;
                    const pctOfMax = Math.round((item.users.length / maxUnitCount) * 100);

                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectUnit?.(item.name)}
                        className={cn(
                          'p-3 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between group',
                          hasUsers
                            ? 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm'
                            : 'bg-slate-50/60 dark:bg-slate-800/40 border-dashed border-slate-200 dark:border-slate-700/60 opacity-80 hover:opacity-100',
                        )}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1">
                              {item.name}
                            </h5>
                            <span
                              className={cn(
                                'text-[11px] font-black px-2 py-0.5 rounded-full shrink-0',
                                hasUsers
                                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
                              )}
                            >
                              {item.users.length} {item.users.length === 1 ? 'User' : 'Users'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {item.category}
                            </span>
                            <span className="text-[9px] font-medium text-slate-400 truncate max-w-[160px]">
                              {item.campusNames.join(', ')}
                            </span>
                          </div>
                        </div>

                        {/* Progress bar and active count */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60">
                          {hasUsers ? (
                            <>
                              <div className="flex items-center justify-between text-[9px] font-bold mb-1">
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  {item.activeCount} Active
                                </span>
                                {item.pendingCount > 0 && (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    {item.pendingCount} Pending
                                  </span>
                                )}
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.max(pctOfMax, 8)}%` }}
                                />
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-400 italic">
                              <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                              <span>No registered accounts</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Coverage Gap Callout */}
            {kpis.unitsWithoutUsersCount > 0 && selectedPresence !== 'no-users' && (
              <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
                    <strong>{kpis.unitsWithoutUsersCount} units/offices</strong> currently have zero registered
                    accounts.
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPresence('no-users')}
                  className="h-7 text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-800 border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-100"
                >
                  View Unrepresented Offices
                </Button>
              </div>
            )}
          </div>

          {/* Section 3: Campus & Role Breakdown (Side by Side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campus Distribution Panel */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <School className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Distribution by Campus
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold">
                    {kpis.campusList.length} Campuses
                  </Badge>
                </div>

                <div className="space-y-2 mt-3 max-h-[190px] overflow-y-auto pr-1">
                  {kpis.campusList.map((c) => {
                    const pct = kpis.totalUsers > 0 ? Math.round((c.count / kpis.totalUsers) * 100) : 0;
                    return (
                      <div
                        key={c.id}
                        onClick={() => onSelectCampus?.(c.name)}
                        className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">{c.name}</span>
                          <div className="flex items-center gap-1.5 font-bold text-[10px]">
                            <span className="text-slate-900 dark:text-slate-100 font-black">{c.count}</span>
                            <span className="text-slate-400">({pct}%)</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-500 font-medium flex items-center justify-between">
                <span>Central + Satellite Distribution</span>
                <span>Click campus to search</span>
              </div>
            </div>

            {/* Role Distribution Panel */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-violet-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Distribution by Role
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold">
                    {kpis.roleList.length} Roles Assigned
                  </Badge>
                </div>

                <div className="space-y-2 mt-3 max-h-[190px] overflow-y-auto pr-1">
                  {kpis.roleList.slice(0, 8).map((r, idx) => {
                    const pct = kpis.totalUsers > 0 ? Math.round((r.count / kpis.totalUsers) * 100) : 0;
                    return (
                      <div
                        key={idx}
                        className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                            {r.name}
                          </span>
                          <div className="flex items-center gap-1.5 font-bold text-[10px]">
                            <span className="text-slate-900 dark:text-slate-100 font-black">{r.count}</span>
                            <span className="text-slate-400">({pct}%)</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-500 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-500 font-medium flex items-center justify-between">
                <span>Governance & Role Hierarchy</span>
                <span>Top roles shown</span>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
