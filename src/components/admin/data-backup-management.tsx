'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, getDocs, Timestamp, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Database, FileSpreadsheet, Loader2, ShieldCheck, History, Info, Link as LinkIcon, Save, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { BackupSettings } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

/**
 * DATA BACKUP MANAGEMENT COMPONENT
 * Manages institutional data redundancy and cloud synchronization targets.
 */
export function DataBackupManagement() {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [driveLink, setDriveLink] = useState('');

  // Fetch Current Backup Settings
  const backupSettingsRef = useMemoFirebase(
    () => (firestore && doc(firestore, 'system', 'backupSettings')),
    [firestore]
  );
  const { data: settings, isLoading: isLoadingSettings } = useDoc<BackupSettings>(backupSettingsRef);

  useEffect(() => {
    if (settings?.targetDriveLink) {
        setDriveLink(settings.targetDriveLink);
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    if (!firestore || !userProfile) return;
    setIsSavingSettings(true);
    try {
        await setDoc(doc(firestore, 'system', 'backupSettings'), {
            targetDriveLink: driveLink,
            lastConfiguredAt: serverTimestamp(),
            lastConfiguredBy: userProfile.id
        }, { merge: true });
        toast({ title: 'Settings Saved', description: 'Institutional backup target has been updated.' });
    } catch (e) {
        toast({ title: 'Error', description: 'Failed to update backup settings.', variant: 'destructive' });
    } finally {
        setIsSavingSettings(false);
    }
  };

  const exportCollection = async (collectionName: string) => {
    if (!firestore) return [];
    const snapshot = await getDocs(collection(firestore, collectionName));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const processed: Record<string, any> = { id: doc.id };
        for (const [key, value] of Object.entries(data)) {
            if (value instanceof Timestamp) {
                processed[key] = value.toDate().toISOString();
            } else if (typeof value === 'object' && value !== null) {
                processed[key] = JSON.stringify(value);
            } else {
                processed[key] = value;
            }
        }
        return processed;
    });
  };

  const handleFullBackup = async () => {
    if (!firestore) return;
    setIsExporting(true);
    
    try {
      toast({ title: 'Backup Initialized', description: 'Aggregating institutional data...' });

      const datasets = await Promise.all([
        exportCollection('submissions'),
        exportCollection('risks'),
        exportCollection('users'),
        exportCollection('units'),
        exportCollection('campuses'),
        exportCollection('academicPrograms'),
        exportCollection('programCompliances'),
      ]);

      const wb = XLSX.utils.book_new();
      const names = ['Submissions', 'Risks', 'Users', 'Units', 'Campuses', 'Programs', 'Compliance'];
      
      datasets.forEach((data, i) => {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), names[i]);
      });

      const dateStr = format(new Date(), 'yyyy-MM-dd_HHmm');
      XLSX.writeFile(wb, `RSU_EOMS_Institutional_Backup_${dateStr}.xlsx`);

      toast({ title: 'Local Snapshot Ready', description: 'XLSX file generated and downloaded.' });
    } catch (error) {
      console.error('Backup Error:', error);
      toast({ title: 'Backup Failed', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Institutional Backup Target Configuration */}
      <Card className="shadow-md border-primary/20 bg-primary/5 overflow-hidden">
        <CardHeader className="bg-primary/10 border-b py-4">
            <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="h-5 w-5 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Automation Registry</span>
            </div>
            <CardTitle>Institutional Backup Repository</CardTitle>
            <CardDescription>Configure the target Google Drive link for automated institutional snapshots.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
                <Alert variant="destructive" className="bg-white border-destructive/30">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="text-xs font-black uppercase tracking-tight">Configuration Prerequisite</AlertTitle>
                    <AlertDescription className="text-[11px] leading-relaxed font-medium">
                        <strong>Important:</strong> For "Direct Cloud Upload" to function, you must have a <strong>Google Service Account Key</strong> configured in the project environment variables. Without this key, the system will provide a local download only as a secure fail-safe.
                    </AlertDescription>
                </Alert>

                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-700 flex items-center gap-2">
                        <LinkIcon className="h-3.5 w-3.5" />
                        Target Google Drive Link (Root Backup Folder)
                    </Label>
                    <div className="flex gap-2">
                        <Input 
                            value={driveLink}
                            onChange={(e) => setDriveLink(e.target.value)}
                            placeholder="https://drive.google.com/..."
                            className="bg-white font-bold h-11 border-primary/20"
                        />
                        <Button 
                            onClick={handleSaveSettings} 
                            disabled={isSavingSettings || !driveLink}
                            className="h-11 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"
                        >
                            {isSavingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Apply Settings
                        </Button>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-md border-primary/20 bg-background overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/30 border-b py-4">
            <div className="flex items-center gap-2 mb-1">
                <Database className="h-5 w-5 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Data Redundancy Protocol</span>
            </div>
            <CardTitle>Manual Snapshot (XLSX)</CardTitle>
            <CardDescription>
                Generate a comprehensive multi-sheet Excel workbook of all university data.
            </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
            <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white border border-primary/10 shadow-sm space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-slate-800 flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        Snapshotted Datasets:
                    </h4>
                    <ul className="grid grid-cols-2 gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                        <li className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary" /> Submissions</li>
                        <li className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary" /> Risks Registry</li>
                        <li className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary" /> Users & Roles</li>
                        <li className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary" /> Campus Sites</li>
                        <li className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary" /> Program Registry</li>
                        <li className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary" /> Compliance Matrix</li>
                    </ul>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed italic font-medium">
                    This provides a point-in-time record essential for ISO certification maintenance.
                </p>
            </div>
            </CardContent>
            <CardFooter className="bg-muted/5 border-t py-4">
            <Button 
                className="w-full h-11 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 gap-2"
                onClick={handleFullBackup}
                disabled={isExporting}
            >
                {isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
                Download Full Snapshot
            </Button>
            </CardFooter>
        </Card>

        <Card className="shadow-md border-amber-200 bg-amber-50/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-amber-50 border-b py-4">
            <div className="flex items-center gap-2 mb-1">
                <History className="h-5 w-5 text-amber-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Accountability Record</span>
            </div>
            <CardTitle>System Activity Logs</CardTitle>
            <CardDescription>Export the permanent system audit trail for security reviews.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <div className="p-4 rounded-xl bg-white/50 border border-amber-100 space-y-3 shadow-inner">
                    <p className="text-[11px] text-amber-800 leading-relaxed font-medium italic">
                        The audit trail records every login, document view, and status change. Maintaining a copy is required for internal quality audits (IQA).
                    </p>
                </div>
            </CardContent>
            <CardFooter className="bg-white border-t py-4">
                <Button 
                    variant="outline"
                    className="w-full h-11 font-black uppercase text-xs tracking-widest border-amber-200 text-amber-700 hover:bg-amber-50 gap-2 shadow-sm"
                    onClick={async () => {
                        setIsExporting(true);
                        try {
                            const logs = await exportCollection('activityLogs');
                            const ws = XLSX.utils.json_to_sheet(logs);
                            const wb = XLSX.utils.book_new();
                            XLSX.utils.book_append_sheet(wb, ws, 'Audit_Trail');
                            XLSX.writeFile(wb, `RSU_EOMS_Audit_Log_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
                            toast({ title: 'Logs Exported' });
                        } catch(e) {
                            toast({ title: 'Export Failed', variant: 'destructive' });
                        } finally {
                            setIsExporting(false);
                        }
                    }}
                    disabled={isExporting}
                >
                    {isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
                    Export Audit Logs (.XLSX)
                </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
