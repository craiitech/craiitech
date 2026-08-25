'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, deleteDoc } from '@/firebase/firestore-wrapper';
import type { UnitOrgStructure, Unit, Campus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Building2,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Printer,
  Trash2,
  Copy,
  Check,
  Calendar,
  Hash,
  School,
  Building,
  Loader2,
  FileBadge,
  Sparkles,
  Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface OrgStructureDirectoryViewProps {
  allUnits: Unit[] | null;
  allCampuses: Campus[] | null;
  selectedYear: string;
}

export function OrgStructureDirectoryView({ allUnits, allCampuses, selectedYear }: OrgStructureDirectoryViewProps) {
  const firestore = useFirestore();
  const { userProfile, isAdmin } = useUser();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Deletion state
  const [deletingRecord, setDeletingRecord] = useState<UnitOrgStructure | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Query all org structures for the selected year
  const orgStructuresQuery = useMemoFirebase(() => {
    if (!firestore || !selectedYear || selectedYear === 'all') {
      return firestore ? collection(firestore, 'unitOrgStructures') : null;
    }
    return query(collection(firestore, 'unitOrgStructures'), where('year', '==', Number(selectedYear)));
  }, [firestore, selectedYear]);

  const { data: orgStructures, isLoading } = useCollection<UnitOrgStructure>(orgStructuresQuery);

  const campusMap = useMemo(() => new Map(allCampuses?.map((c) => [c.id, c.name])), [allCampuses]);

  // Group structures by unitId
  const structuresByUnit = useMemo(() => {
    const map = new Map<string, { first?: UnitOrgStructure; final?: UnitOrgStructure }>();
    if (!orgStructures) return map;

    orgStructures.forEach((rec) => {
      const existing = map.get(rec.unitId) || {};
      if (rec.cycleId === 'first') {
        existing.first = rec;
      } else if (rec.cycleId === 'final') {
        existing.final = rec;
      }
      map.set(rec.unitId, existing);
    });

    return map;
  }, [orgStructures]);

  // Filter units and combine with org structures
  const combinedUnitRows = useMemo(() => {
    if (!allUnits) return [];

    return allUnits.map((unit) => {
      const records = structuresByUnit.get(unit.id) || {};
      const first = records.first;
      const final = records.final;

      let complianceStatus: 'complete' | 'first_only' | 'final_only' | 'missing' = 'missing';
      if (first && final) complianceStatus = 'complete';
      else if (first && !final) complianceStatus = 'first_only';
      else if (!first && final) complianceStatus = 'final_only';

      const primaryCampusId = unit.campusIds?.[0] || 'unknown';
      const campusName = campusMap.get(primaryCampusId) || (unit.campusIds?.length ? 'Multi-Campus' : 'Unknown');

      return {
        unit,
        campusName,
        primaryCampusId,
        first,
        final,
        complianceStatus,
        hasCarriedOver: !!final?.isCarriedOver,
      };
    });
  }, [allUnits, structuresByUnit, campusMap]);

  // Apply filters
  const filteredRows = useMemo(() => {
    return combinedUnitRows.filter((row) => {
      // Campus filter
      if (campusFilter !== 'all') {
        const matchesCampus = row.unit.campusIds?.includes(campusFilter);
        if (!matchesCampus) return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if (row.unit.category !== categoryFilter) return false;
      }

      // Status filter
      if (statusFilter === 'complete' && row.complianceStatus !== 'complete') return false;
      if (statusFilter === 'first_only' && row.complianceStatus !== 'first_only') return false;
      if (statusFilter === 'missing_first' && !!row.first) return false;
      if (statusFilter === 'missing_final' && !!row.final) return false;
      if (statusFilter === 'missing_all' && row.complianceStatus !== 'missing') return false;
      if (statusFilter === 'carried_over' && !row.hasCarriedOver) return false;

      // Search query
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = row.unit.name?.toLowerCase().includes(term);
        const matchesCampus = row.campusName?.toLowerCase().includes(term);
        const matchesSubmitter =
          row.first?.submittedBy?.toLowerCase().includes(term) || row.final?.submittedBy?.toLowerCase().includes(term);
        const matchesRev =
          row.first?.revisionNumber?.toLowerCase().includes(term) ||
          row.final?.revisionNumber?.toLowerCase().includes(term);

        if (!matchesName && !matchesCampus && !matchesSubmitter && !matchesRev) {
          return false;
        }
      }

      return true;
    });
  }, [combinedUnitRows, campusFilter, categoryFilter, statusFilter, searchTerm]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalUnits = combinedUnitRows.length;
    if (totalUnits === 0) {
      return {
        total: 0,
        firstCount: 0,
        finalCount: 0,
        completeCount: 0,
        carriedCount: 0,
        firstPct: 0,
        finalPct: 0,
        completePct: 0,
      };
    }

    const firstCount = combinedUnitRows.filter((r) => !!r.first).length;
    const finalCount = combinedUnitRows.filter((r) => !!r.final).length;
    const completeCount = combinedUnitRows.filter((r) => r.complianceStatus === 'complete').length;
    const carriedCount = combinedUnitRows.filter((r) => r.hasCarriedOver).length;

    return {
      total: totalUnits,
      firstCount,
      finalCount,
      completeCount,
      carriedCount,
      firstPct: Math.round((firstCount / totalUnits) * 100),
      finalPct: Math.round((finalCount / totalUnits) * 100),
      completePct: Math.round((completeCount / totalUnits) * 100),
    };
  }, [combinedUnitRows]);

  const handleCopyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast({ title: 'Link Copied', description: 'Google Drive URL copied to clipboard.' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleConfirmDelete = async () => {
    if (!firestore || !deletingRecord) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'unitOrgStructures', deletingRecord.id));
      toast({ title: 'Record Removed', description: 'Organizational structure entry deleted.' });
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to delete record.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setDeletingRecord(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!filteredRows.length) {
      toast({ title: 'No Data', description: 'No records to export.', variant: 'destructive' });
      return;
    }

    const headers = [
      'Unit Name',
      'Campus',
      'Category',
      '1st Cycle Status',
      '1st Cycle Rev',
      '1st Cycle Date',
      '1st Cycle Submitter',
      '1st Cycle Link',
      'Final Cycle Status',
      'Final Cycle Rev',
      'Final Cycle Date',
      'Final Cycle Submitter',
      'Final Cycle Carried Over',
      'Final Cycle Link',
    ];

    const rows = filteredRows.map((r) => [
      `"${r.unit.name}"`,
      `"${r.campusName}"`,
      `"${r.unit.category || 'N/A'}"`,
      r.first ? 'Uploaded' : 'Missing',
      `"${r.first?.revisionNumber || ''}"`,
      `"${r.first?.revisionDate || ''}"`,
      `"${r.first?.submittedBy || ''}"`,
      `"${r.first?.googleDriveLink || ''}"`,
      r.final ? 'Uploaded' : 'Missing',
      `"${r.final?.revisionNumber || ''}"`,
      `"${r.final?.revisionDate || ''}"`,
      `"${r.final?.submittedBy || ''}"`,
      r.hasCarriedOver ? 'Yes' : 'No',
      `"${r.final?.googleDriveLink || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Institutional_Org_Structures_AY_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/10 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                Total Units Monitored
              </p>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{stats.total}</p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase">
                Across {allCampuses?.length || 0} Campuses
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Building2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200/50 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 tracking-widest">
                1st Cycle Submissions
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-blue-700 dark:text-blue-300">{stats.firstCount}</p>
                <span className="text-xs font-black text-blue-600">({stats.firstPct}%)</span>
              </div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase">
                {stats.total - stats.firstCount} Outstanding
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600">
              <Sparkles className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200/50 bg-gradient-to-br from-white to-green-50/30 dark:from-slate-900 dark:to-green-950/20 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-green-700 dark:text-green-400 tracking-widest">
                Final Cycle Submissions
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-green-700 dark:text-green-300">{stats.finalCount}</p>
                <span className="text-xs font-black text-green-600">({stats.finalPct}%)</span>
              </div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase">{stats.carriedCount} Carried Over</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/50 bg-gradient-to-br from-white to-emerald-50/40 dark:from-slate-900 dark:to-emerald-950/20 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-widest">
                Full-Year Compliance
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{stats.completeCount}</p>
                <span className="text-xs font-black text-emerald-600">({stats.completePct}%)</span>
              </div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase">Both Cycles Approved</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600">
              <Building className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Filter & Action Bar */}
      <Card className="border-primary/10 shadow-sm bg-muted/10">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by unit name, campus, submitter, or rev..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 bg-white dark:bg-slate-900 border-primary/10 font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-10 text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-900 border-primary/20 hover:bg-primary/5 shadow-sm"
              >
                <Download className="mr-2 h-4 w-4 text-primary" /> Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-10 text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-900 border-primary/20 hover:bg-primary/5 shadow-sm"
              >
                <Printer className="mr-2 h-4 w-4 text-primary" /> Print Directory
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                <School className="h-3 w-3" /> Campus Site
              </label>
              <Select value={campusFilter} onValueChange={setCampusFilter}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
                  <SelectValue placeholder="All Campuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campuses</SelectItem>
                  {allCampuses?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                <Filter className="h-3 w-3" /> Compliance Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="complete">Fully Compliant (Both Cycles)</SelectItem>
                  <SelectItem value="first_only">1st Cycle Only</SelectItem>
                  <SelectItem value="missing_first">Missing 1st Cycle</SelectItem>
                  <SelectItem value="missing_final">Missing Final Cycle</SelectItem>
                  <SelectItem value="carried_over">Carried Over Final Cycle</SelectItem>
                  <SelectItem value="missing_all">Missing All Cycles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                <Building className="h-3 w-3" /> Unit Category
              </label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Academic">Academic Units</SelectItem>
                  <SelectItem value="Administrative">Administrative Units</SelectItem>
                  <SelectItem value="Executive">Executive / Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Directory Table */}
      <Card className="border-primary/10 shadow-md bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="bg-muted/15 border-b px-6 py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" /> Institutional Organizational Structure Directory
            </CardTitle>
            <CardDescription className="text-xs font-semibold">
              Master register of organizational structures uploaded by units for Academic Year {selectedYear}
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-xs px-3 py-1 bg-white dark:bg-slate-800">
            {filteredRows.length} {filteredRows.length === 1 ? 'Unit' : 'Units'} Displayed
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-24 text-center flex flex-col items-center justify-center gap-3 opacity-60">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Loading Institutional Directory...
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-24 text-center text-muted-foreground flex flex-col items-center gap-3 border-dashed">
              <Building2 className="h-12 w-12 opacity-15" />
              <p className="font-bold text-xs uppercase tracking-widest">No matching units found</p>
              <p className="text-xs max-w-sm text-muted-foreground">
                Try modifying your search or clearing active filters to view all units.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-black text-[10px] uppercase tracking-wider pl-6 w-[280px]">
                      Unit / Office & Campus
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider min-w-[320px]">
                      1st Cycle Org Structure
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider min-w-[320px]">
                      Final Cycle Org Structure
                    </TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider text-center w-[130px] pr-6">
                      Compliance
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.unit.id} className="hover:bg-muted/20 transition-colors">
                      {/* Unit Info */}
                      <TableCell className="pl-6 py-4 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-tight">
                              {row.unit.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                            <School className="h-3 w-3 opacity-60" />
                            <span>{row.campusName}</span>
                          </div>
                          {row.unit.category && (
                            <Badge
                              variant="secondary"
                              className="text-[8px] font-black uppercase px-1.5 py-0 tracking-tighter"
                            >
                              {row.unit.category}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* 1st Cycle Card */}
                      <TableCell className="py-4 align-top">
                        {row.first ? (
                          <div className="rounded-lg border bg-blue-50/20 dark:bg-blue-950/10 border-blue-200/60 p-3 space-y-2 max-w-sm">
                            <div className="flex items-center justify-between gap-2">
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200 text-[8px] font-black uppercase"
                              >
                                1st Cycle
                              </Badge>
                              <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
                                <Hash className="h-2.5 w-2.5 text-blue-600" />
                                <span>Rev {row.first.revisionNumber}</span>
                                <span className="opacity-40">•</span>
                                <Calendar className="h-2.5 w-2.5 text-blue-600" />
                                <span>{row.first.revisionDate}</span>
                              </div>
                            </div>

                            <div className="text-[9px] text-muted-foreground flex items-center gap-1 truncate">
                              <FileBadge className="h-2.5 w-2.5 opacity-60" />
                              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                                {row.first.submittedBy}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-blue-200/40">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-[9px] font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-xs px-2.5"
                                onClick={() => window.open(row.first?.googleDriveLink, '_blank')}
                              >
                                <ExternalLink className="h-2.5 w-2.5 mr-1" /> Open PDF
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                onClick={() => handleCopyLink(row.first!.googleDriveLink, `first-${row.unit.id}`)}
                                title="Copy Google Drive Link"
                              >
                                {copiedId === `first-${row.unit.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10 ml-auto"
                                  onClick={() => setDeletingRecord(row.first!)}
                                  title="Delete Record"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed p-3 text-center bg-muted/10 max-w-sm">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center justify-center gap-1.5">
                              <AlertTriangle className="h-3 w-3 text-amber-500/70" /> Not Uploaded
                            </span>
                          </div>
                        )}
                      </TableCell>

                      {/* Final Cycle Card */}
                      <TableCell className="py-4 align-top">
                        {row.final ? (
                          <div className="rounded-lg border bg-green-50/20 dark:bg-green-950/10 border-green-200/60 p-3 space-y-2 max-w-sm">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className="bg-green-50 text-green-700 border-green-200 text-[8px] font-black uppercase"
                                >
                                  Final Cycle
                                </Badge>
                                {row.hasCarriedOver && (
                                  <Badge className="bg-slate-100 text-slate-700 border-none text-[7px] font-black uppercase gap-1 px-1.5 h-4">
                                    <RotateCcw className="h-2 w-2" /> Carried Over
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground">
                                <Hash className="h-2.5 w-2.5 text-green-600" />
                                <span>Rev {row.final.revisionNumber}</span>
                                <span className="opacity-40">•</span>
                                <Calendar className="h-2.5 w-2.5 text-green-600" />
                                <span>{row.final.revisionDate}</span>
                              </div>
                            </div>

                            <div className="text-[9px] text-muted-foreground flex items-center gap-1 truncate">
                              <FileBadge className="h-2.5 w-2.5 opacity-60" />
                              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                                {row.final.submittedBy}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-green-200/40">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-[9px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs px-2.5"
                                onClick={() => window.open(row.final?.googleDriveLink, '_blank')}
                              >
                                <ExternalLink className="h-2.5 w-2.5 mr-1" /> Open PDF
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                onClick={() => handleCopyLink(row.final!.googleDriveLink, `final-${row.unit.id}`)}
                                title="Copy Google Drive Link"
                              >
                                {copiedId === `final-${row.unit.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                              {isAdmin && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive hover:bg-destructive/10 ml-auto"
                                  onClick={() => setDeletingRecord(row.final!)}
                                  title="Delete Record"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed p-3 text-center bg-muted/10 max-w-sm">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center justify-center gap-1.5">
                              <AlertTriangle className="h-3 w-3 text-amber-500/70" /> Not Uploaded
                            </span>
                          </div>
                        )}
                      </TableCell>

                      {/* Compliance Status Badge */}
                      <TableCell className="pr-6 py-4 text-center align-middle">
                        {row.complianceStatus === 'complete' && (
                          <Badge className="bg-emerald-600 text-white border-none font-black text-[8px] uppercase tracking-wider px-2.5 py-1 shadow-xs">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Compliant
                          </Badge>
                        )}
                        {row.complianceStatus === 'first_only' && (
                          <Badge className="bg-blue-600 text-white border-none font-black text-[8px] uppercase tracking-wider px-2 py-1 shadow-xs">
                            1st Cycle Only
                          </Badge>
                        )}
                        {row.complianceStatus === 'final_only' && (
                          <Badge className="bg-amber-600 text-white border-none font-black text-[8px] uppercase tracking-wider px-2 py-1 shadow-xs">
                            Final Cycle Only
                          </Badge>
                        )}
                        {row.complianceStatus === 'missing' && (
                          <Badge className="bg-rose-600 text-white border-none font-black text-[8px] uppercase tracking-wider px-2.5 py-1 shadow-xs">
                            Missing
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingRecord} onOpenChange={() => setDeletingRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Remove Organizational Structure
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2">
              <p>
                Are you sure you want to delete the{' '}
                <strong>{deletingRecord?.cycleId === 'first' ? '1st Cycle' : 'Final Cycle'}</strong> organizational
                structure for <strong>{deletingRecord?.unitName}</strong> (AY {deletingRecord?.year})?
              </p>
              <p className="text-xs text-muted-foreground">
                This action cannot be undone. The unit will need to re-upload their organizational chart.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-white font-bold"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
