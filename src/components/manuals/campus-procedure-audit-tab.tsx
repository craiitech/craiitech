'use client';

import React, { useMemo, useState } from 'react';
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import type { Campus, CampusProcedureAudit, ManualProcess, ProcedureManual, Unit, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  Eye,
  ListChecks,
  Loader2,
  Printer,
  Search,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const SHARED_ACADEMIC_ID = 'academic-shared';

export function getManualProcessKey(proc: ManualProcess, idx: number): string {
  const num = (proc.processNumber || `step-${idx + 1}`).trim();
  const title = (proc.processTitle || '').trim();
  return `${num}::${title}`;
}

export function normalizeManualProcesses(manual?: ProcedureManual | null): ManualProcess[] {
  if (!manual) return [];
  if (manual.processes && manual.processes.length > 0) {
    return manual.processes;
  }
  if (manual.numberOfProcesses && manual.numberOfProcesses > 0) {
    return Array.from({ length: manual.numberOfProcesses }, (_, i) => ({
      processNumber: `6.${i + 1}`,
      processTitle: `Process ${i + 1}`,
    }));
  }
  return [];
}

interface CampusProcedureAuditTabProps {
  units: Unit[] | null;
  manuals: ProcedureManual[] | null;
  campuses: Campus[] | null;
  audits: CampusProcedureAudit[] | null;
  userProfile: User | null;
  isAdmin: boolean;
  userRole: string | null;
  isLoading?: boolean;
  initialUnitId?: string | null;
  onViewManual?: (unitId: string) => void;
}

export function CampusProcedureAuditTab({
  units,
  manuals,
  campuses,
  audits,
  userProfile,
  isAdmin,
  userRole,
  isLoading = false,
  onViewManual,
}: CampusProcedureAuditTabProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const isCampusOdimo = Boolean(
    userRole &&
    (userRole === 'Campus ODIMO' ||
      userRole.toLowerCase().includes('campus odimo') ||
      userRole.toLowerCase().includes('campus director')),
  );
  const isUnitCoordinator = Boolean(
    userRole &&
    (userRole.toLowerCase().includes('coordinator') ||
      userRole.toLowerCase().includes('unit head') ||
      userRole.toLowerCase().includes('unit odimo')),
  );
  const canEditAnyCampus = isAdmin;
  const canLockToOwnCampus = !isAdmin && (isCampusOdimo || isUnitCoordinator) && Boolean(userProfile?.campusId);

  const [selectedCampusId, setSelectedCampusId] = useState<string>(userProfile?.campusId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'audited' | 'partial' | 'full' | 'pending'>('all');

  // Active dialog state
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editingManual, setEditingManual] = useState<ProcedureManual | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [notImplementedReasons, setNotImplementedReasons] = useState<Record<string, string>>({});
  const [generalRemarks, setGeneralRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const effectiveCampusId = useMemo(() => {
    if (canLockToOwnCampus && userProfile?.campusId) return userProfile.campusId;
    if (selectedCampusId) return selectedCampusId;
    if (userProfile?.campusId) return userProfile.campusId;
    return campuses?.[0]?.id || '';
  }, [canLockToOwnCampus, userProfile?.campusId, selectedCampusId, campuses]);

  const effectiveCampusName = useMemo(() => {
    return campuses?.find((c) => c.id === effectiveCampusId)?.name || 'Selected Campus';
  }, [campuses, effectiveCampusId]);

  const isOwnUnit = (unitId: string) => {
    if (!userProfile) return false;
    return userProfile.unitId === unitId || Boolean(userProfile.assignedUnitIds?.includes(unitId));
  };

  const canEditUnitRow = (unitId: string) => {
    if (canEditAnyCampus) return true;
    if (!userProfile?.campusId || effectiveCampusId !== userProfile.campusId) return false;
    if (isCampusOdimo) return true;
    if (isUnitCoordinator && isOwnUnit(unitId)) return true;
    return false;
  };

  const canEditDialogUnit = editingUnit ? canEditUnitRow(editingUnit.id) : false;

  const manualMap = useMemo(() => new Map((manuals || []).map((m) => [m.id, m])), [manuals]);
  const sharedAcademicManual = useMemo(() => manualMap.get(SHARED_ACADEMIC_ID) || null, [manualMap]);

  const auditMap = useMemo(() => {
    const map = new Map<string, CampusProcedureAudit>();
    (audits || []).forEach((a) => {
      if (a.campusId === effectiveCampusId) {
        map.set(a.unitId, a);
      }
    });
    return map;
  }, [audits, effectiveCampusId]);

  const rows = useMemo(() => {
    if (!units) return [];
    return units
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((unit) => {
        let manual = manualMap.get(unit.id) || null;
        let isShared = false;
        if (!manual && unit.category === 'Academic' && sharedAcademicManual) {
          manual = sharedAcademicManual;
          isShared = true;
        }
        const processes = normalizeManualProcesses(manual);
        const totalProcesses = processes.length;
        const audit = auditMap.get(unit.id) || null;

        // Filter implemented keys to only those still present in the manual
        const validKeySet = new Set(processes.map((p, idx) => getManualProcessKey(p, idx)));
        const validImplementedKeys = audit
          ? (audit.implementedProcessKeys || []).filter((k) => validKeySet.has(k))
          : [];
        const implementedCount = audit ? validImplementedKeys.length : 0;
        const pct = totalProcesses > 0 ? Math.round((implementedCount / totalProcesses) * 100) : 0;

        let auditStatus: 'pending' | 'full' | 'partial' = 'pending';
        if (audit && totalProcesses > 0) {
          auditStatus = implementedCount >= totalProcesses ? 'full' : 'partial';
        } else if (audit) {
          auditStatus = 'full';
        }

        return {
          unit,
          manual,
          isShared,
          processes,
          totalProcesses,
          audit,
          implementedCount,
          pct,
          auditStatus,
        };
      });
  }, [units, manualMap, sharedAcademicManual, auditMap]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchesSearch =
        !searchTerm.trim() ||
        r.unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.manual?.procedureNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.manual?.manualTitle || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (statusFilter === 'audited') return r.audit !== null;
      if (statusFilter === 'full') return r.auditStatus === 'full';
      if (statusFilter === 'partial') return r.auditStatus === 'partial';
      if (statusFilter === 'pending') return r.audit === null && r.totalProcesses > 0;
      return true;
    });
  }, [rows, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const unitsWithProcesses = rows.filter((r) => r.totalProcesses > 0);
    const auditedUnits = unitsWithProcesses.filter((r) => r.audit !== null);
    const totalProcesses = unitsWithProcesses.reduce((sum, r) => sum + r.totalProcesses, 0);
    const totalImplemented = auditedUnits.reduce((sum, r) => sum + r.implementedCount, 0);
    const pendingUnits = unitsWithProcesses.length - auditedUnits.length;
    const overallPct = totalProcesses > 0 ? Math.round((totalImplemented / totalProcesses) * 100) : 0;

    return {
      totalUnits: unitsWithProcesses.length,
      auditedCount: auditedUnits.length,
      pendingUnits,
      totalProcesses,
      totalImplemented,
      overallPct,
    };
  }, [rows]);

  const openAuditDialog = (row: (typeof rows)[number]) => {
    const processes = row.processes;
    const validKeySet = new Set(processes.map((p, idx) => getManualProcessKey(p, idx)));
    const existingKeys = row.audit
      ? (row.audit.implementedProcessKeys || []).filter((k) => validKeySet.has(k))
      : processes.map((p, idx) => getManualProcessKey(p, idx)); // Default to all checked on first audit for convenience

    setEditingUnit(row.unit);
    setEditingManual(row.manual);
    setSelectedKeys(existingKeys);
    setNotImplementedReasons(row.audit?.notImplementedReasons || {});
    setGeneralRemarks(row.audit?.generalRemarks || '');
  };

  const toggleProcessKey = (key: string) => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSaveAudit = async () => {
    if (!firestore || !editingUnit || !effectiveCampusId || !userProfile) return;
    setIsSaving(true);
    try {
      const processes = normalizeManualProcesses(editingManual);
      const validKeySet = new Set(processes.map((p, idx) => getManualProcessKey(p, idx)));
      const cleanedKeys = selectedKeys.filter((k) => validKeySet.has(k));

      // Keep reasons only for unimplemented processes
      const cleanedReasons: Record<string, string> = {};
      Object.entries(notImplementedReasons).forEach(([k, val]) => {
        if (!cleanedKeys.includes(k) && val.trim()) {
          cleanedReasons[k] = val.trim();
        }
      });

      const docId = `${effectiveCampusId}_${editingUnit.id}`;
      const auditedByName =
        `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || userProfile.email || 'Campus ODIMO';

      await setDoc(
        doc(firestore, 'campusProcedureAudits', docId),
        {
          id: docId,
          campusId: effectiveCampusId,
          campusName: effectiveCampusName,
          unitId: editingUnit.id,
          unitName: editingUnit.name,
          manualId: editingManual?.id || editingUnit.id,
          procedureNumber: editingManual?.procedureNumber || '',
          totalProcessCount: processes.length,
          implementedProcessKeys: cleanedKeys,
          implementedCount: cleanedKeys.length,
          notImplementedReasons: cleanedReasons,
          generalRemarks: generalRemarks.trim(),
          auditedBy: userProfile.id,
          auditedByName,
          auditedByRole: userProfile.role || userRole || 'Campus ODIMO',
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      toast({
        title: 'Campus Procedure Audit Saved',
        description: `${editingUnit.name}: ${cleanedKeys.length}/${processes.length} processes marked as implemented in ${effectiveCampusName}.`,
      });
      setEditingUnit(null);
      setEditingManual(null);
    } catch (error: any) {
      toast({
        title: 'Failed to Save Audit',
        description: error?.message || 'Permission denied or network error.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintAudit = () => {
    const htmlRows = rows
      .filter((r) => r.totalProcesses > 0)
      .map(
        (r, i) => `
        <tr>
          <td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:center;">${i + 1}</td>
          <td style="border:1px solid #cbd5e1;padding:6px 8px;font-weight:bold;">${r.unit.name}</td>
          <td style="border:1px solid #cbd5e1;padding:6px 8px;font-family:monospace;">${r.manual?.procedureNumber || '-'}</td>
          <td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:center;">${r.totalProcesses}</td>
          <td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:center;font-weight:bold;">${r.audit ? r.implementedCount : 'Not Audited'}</td>
          <td style="border:1px solid #cbd5e1;padding:6px 8px;text-align:center;">${r.audit ? `${r.pct}%` : '-'}</td>
          <td style="border:1px solid #cbd5e1;padding:6px 8px;">${r.audit?.auditedByName || '-'}</td>
        </tr>`,
      )
      .join('');

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Campus Procedure Audit - ${effectiveCampusName}</title>
          <style>
            @page { size: letter landscape; margin: 0.5in; }
            body { font-family: Arial, sans-serif; color: #0f172a; font-size: 11px; }
            h1 { font-size: 16px; margin: 0 0 4px; text-transform: uppercase; }
            p { margin: 0 0 12px; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom:12px;">
            <button onclick="window.print()" style="padding:8px 16px;background:#1d4ed8;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">Print Campus Procedure Audit</button>
          </div>
          <h1>Romblon State University &mdash; Campus Procedure Audit</h1>
          <p><strong>Campus:</strong> ${effectiveCampusName} &nbsp;|&nbsp; <strong>Units Audited:</strong> ${stats.auditedCount}/${stats.totalUnits} &nbsp;|&nbsp; <strong>Overall Process Implementation:</strong> ${stats.totalImplemented}/${stats.totalProcesses} (${stats.overallPct}%)</p>
          <table>
            <thead>
              <tr>
                <th style="width:40px;text-align:center;">#</th>
                <th>Unit / Office</th>
                <th>Procedure No.</th>
                <th style="text-align:center;">Registered Processes</th>
                <th style="text-align:center;">Implemented in Campus</th>
                <th style="text-align:center;">Rate</th>
                <th>Audited By</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
          </table>
        </body>
      </html>
    `);
    w.document.close();
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const dialogProcesses = normalizeManualProcesses(editingManual);

  return (
    <div className="space-y-4 pb-8">
      {/* Header & Controls */}
      <Card className="border-primary/15 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-black uppercase tracking-tight">Campus Procedure Audit</CardTitle>
                <Badge variant="outline" className="text-[10px] font-black uppercase border-primary/30 text-primary">
                  Campus ODIMO &amp; Unit Coordinator Workspace
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Identify which processes from each unit&apos;s Operating Processes Directory are actively implemented in{' '}
                <strong className="text-slate-900 dark:text-slate-100">{effectiveCampusName}</strong>. Campus ODIMOs can
                audit all units in their campus; Unit Coordinators can set processes for their own unit.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Select value={effectiveCampusId} onValueChange={setSelectedCampusId} disabled={canLockToOwnCampus}>
                  <SelectTrigger className="w-[220px] h-9 text-xs font-bold">
                    <SelectValue placeholder="Select Campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {(campuses || []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-bold" onClick={handlePrintAudit}>
                <Printer className="h-3.5 w-3.5" />
                Print Audit
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-primary/10">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Units Audited</p>
            <p className="text-2xl font-black mt-1">
              {stats.auditedCount} <span className="text-sm font-bold text-muted-foreground">/ {stats.totalUnits}</span>
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Implemented Processes
            </p>
            <p className="text-2xl font-black mt-1 text-emerald-600">
              {stats.totalImplemented}{' '}
              <span className="text-sm font-bold text-muted-foreground">/ {stats.totalProcesses}</span>
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Campus Implementation Rate
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-black text-primary">{stats.overallPct}%</p>
              <Progress value={stats.overallPct} className="h-2 flex-1" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardContent className="p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pending Audit</p>
            <p className="text-2xl font-black mt-1 text-amber-600">{stats.pendingUnits}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card className="border-primary/10">
        <CardHeader className="py-3 px-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search unit or procedure number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[180px] h-8 text-xs font-semibold">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units ({rows.length})</SelectItem>
                <SelectItem value="audited">Audited Only</SelectItem>
                <SelectItem value="full">100% Implemented</SelectItem>
                <SelectItem value="partial">Partially Implemented</SelectItem>
                <SelectItem value="pending">Pending Audit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-[10px] font-black uppercase">Unit / Office</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Procedure No.</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-center">Registered Processes</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Campus Implementation</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Last Audited By</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    No matching units found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.unit.id} className={cn(isOwnUnit(row.unit.id) && 'bg-amber-500/5')}>
                    <TableCell className="font-bold text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{row.unit.name}</span>
                        {isOwnUnit(row.unit.id) && (
                          <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0 border-none">
                            Your Unit
                          </Badge>
                        )}
                        {row.isShared && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                            Shared Academic
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.manual?.procedureNumber || '—'}</TableCell>
                    <TableCell className="text-center font-bold text-xs">{row.totalProcesses}</TableCell>
                    <TableCell>
                      {row.totalProcesses === 0 ? (
                        <span className="text-[11px] text-muted-foreground italic">No processes registered</span>
                      ) : row.audit ? (
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <span className="text-xs font-black">
                            {row.implementedCount}/{row.totalProcesses}
                          </span>
                          <Progress value={row.pct} className="h-1.5 w-20" />
                          <span className="text-[10px] font-bold text-muted-foreground">{row.pct}%</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Not yet audited</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.totalProcesses === 0 ? (
                        <Badge variant="outline" className="text-[9px] uppercase">
                          No Manual
                        </Badge>
                      ) : row.auditStatus === 'full' ? (
                        <Badge className="bg-emerald-600 text-white text-[9px] uppercase gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Audited &bull; 100%
                        </Badge>
                      ) : row.auditStatus === 'partial' ? (
                        <Badge className="bg-blue-600 text-white text-[9px] uppercase gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Audited &bull; Partial
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] uppercase text-amber-700 border-amber-300">
                          Pending Audit
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">
                      {row.audit ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-slate-700 dark:text-slate-300">
                              {row.audit.auditedByName}
                            </p>
                            {row.audit.auditedByRole && (
                              <Badge variant="outline" className="text-[8px] px-1 py-0 uppercase">
                                {row.audit.auditedByRole}
                              </Badge>
                            )}
                          </div>
                          {row.audit.updatedAt?.seconds && (
                            <p className="text-[10px]">
                              {format(new Date(row.audit.updatedAt.seconds * 1000), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onViewManual && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px] font-bold"
                            onClick={() => onViewManual(row.unit.id)}
                          >
                            Manual
                          </Button>
                        )}
                        <Button
                          variant={canEditUnitRow(row.unit.id) ? 'default' : 'outline'}
                          size="sm"
                          disabled={row.totalProcesses === 0}
                          className="h-7 px-2.5 text-[10px] font-bold gap-1"
                          onClick={() => openAuditDialog(row)}
                        >
                          {canEditUnitRow(row.unit.id) ? (
                            <>
                              <Edit3 className="h-3 w-3" />
                              {row.audit ? 'Update Audit' : 'Audit Processes'}
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3" />
                              View Audit
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Process Selection Dialog */}
      <Dialog
        open={Boolean(editingUnit)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingUnit(null);
            setEditingManual(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center gap-2 text-primary">
              <ListChecks className="h-5 w-5" />
              <DialogTitle className="text-base font-black uppercase tracking-tight">
                Campus Procedure Audit &mdash; {editingUnit?.name}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Select only the processes from the <strong>Operating Processes Directory</strong> that are actively
              implemented in <strong>{effectiveCampusName}</strong>.
              {editingManual?.procedureNumber && (
                <span className="ml-1 font-mono font-bold text-primary">({editingManual.procedureNumber})</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 py-2 border-b text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-bold">
                {selectedKeys.length} of {dialogProcesses.length} Processes Implemented
              </Badge>
            </div>
            {canEditDialogUnit && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] font-bold"
                  onClick={() => setSelectedKeys(dialogProcesses.map((p, idx) => getManualProcessKey(p, idx)))}
                >
                  Select All (100%)
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] font-bold"
                  onClick={() => setSelectedKeys([])}
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
            {dialogProcesses.map((proc, idx) => {
              const key = getManualProcessKey(proc, idx);
              const isChecked = selectedKeys.includes(key);
              return (
                <div
                  key={key}
                  className={cn(
                    'p-3 rounded-xl border transition-all space-y-2',
                    isChecked
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-800/50'
                      : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`proc-${idx}`}
                      checked={isChecked}
                      disabled={!canEditDialogUnit}
                      onCheckedChange={() => toggleProcessKey(key)}
                      className="mt-0.5"
                    />
                    <label htmlFor={`proc-${idx}`} className="flex-1 cursor-pointer space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="font-mono text-[10px] font-black bg-primary/10 text-primary border border-primary/20">
                          {proc.processNumber || `Step ${idx + 1}`}
                        </Badge>
                        {isChecked ? (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Implemented in Campus
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Not Implemented in Campus
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug pt-0.5">
                        {proc.processTitle}
                      </p>
                    </label>
                  </div>

                  {!isChecked && (
                    <div className="pl-7">
                      <Input
                        placeholder="Optional reason / remark (e.g., Handled by Main Campus, No facility on site)..."
                        value={notImplementedReasons[key] || ''}
                        disabled={!canEditDialogUnit}
                        onChange={(e) =>
                          setNotImplementedReasons((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className="h-8 text-[11px] bg-white dark:bg-slate-950"
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <div className="pt-2 space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                General Campus Audit Remarks (Optional)
              </Label>
              <Textarea
                placeholder="Additional notes regarding campus implementation of this procedure..."
                value={generalRemarks}
                disabled={!canEditDialogUnit}
                onChange={(e) => setGeneralRemarks(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingUnit(null);
                setEditingManual(null);
              }}
            >
              Close
            </Button>
            {canEditDialogUnit && (
              <Button type="button" onClick={handleSaveAudit} disabled={isSaving} className="gap-1.5 font-bold">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Save Campus Procedure Audit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
