'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, getDocs, Timestamp, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Database, FileSpreadsheet, Loader2, ShieldCheck, History, Info, Link as LinkIcon, Save, RefreshCw, AlertTriangle, FileText, LayoutList, ClipboardCheck } from 'lucide-react';
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
      toast({ title: 'Backup Initialized', description: 'Aggregating all institutional data...' });

      const collectionsToBackup = [
        'submissions', 'risks', 'unitMonitoringRecords', 
        'auditPlans', 'auditSchedules', 'auditFindings', 
        'correctiveActionRequests', 'managementReviewOutputs',
        'academicPrograms', 'programCompliances',
        'users', 'units', 'campuses', 'qaAdvisories', 
        'procedureManuals', 'eomsPolicyManuals'
      ];

      const datasets = await Promise.all(collectionsToBackup.map(col => exportCollection(col)));

      const wb = XLSX.utils.book_new();
      
      datasets.forEach((data, i) => {
          const sheetName = collectionsToBackup[i].substring(0, 31);
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), sheetName);
      });

      const dateStr = format(new Date(), 'yyyy-MM-dd_HHmm');
      XLSX.writeFile(wb, `RSU_EOMS_Full_Institutional_Backup_${dateStr}.xlsx`);

      toast({ title: 'Snapshot Downloaded', description: 'The high-density backup workbook is ready.' });
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
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Continuous Redundancy</span>
            </div>
            <CardTitle>Institutional Backup Repository</CardTitle>
            <CardDescription>Configure the target Google Drive link for automated institutional snapshots.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
                <Alert variant="destructive" className="bg-white border-destructive/30">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="text-xs font-black uppercase tracking-tight">Configuration Note</AlertTitle>
                    <AlertDescription className="text-[11px] leading-relaxed font-medium">
                        For maximum efficiency, set the link to a dedicated "Institutional Backups" folder. The system will automatically open this folder whenever a backup is performed during logout.
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
                            Apply Target
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
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Full System Export</span>
            </div>
            <CardTitle>Comprehensive Snapshot (XLSX)</CardTitle>
            <CardDescription>
                Generate a multi-sheet workbook containing all documentation, cycles, and years.
            </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
            <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white border border-primary/10 shadow-sm space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-slate-800 flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        Included Registry Datasets:
                    </h4>
                    <ul className="grid grid-cols-2 gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                        <li className="flex items-center gap-1.5"><FileText className="h-3 w-3 text-primary" /> EOMS Submissions</li>
                        <li className="flex items-center gap-1.5"><ShieldAlert className="h-3 w-3 text-primary" /> Risk Registries</li>
                        <li className="flex items-center gap-1.5"><ClipboardCheck className="h-3 w-3 text-primary" /> IQA Conduct logs</li>
                        <li className="flex items-center gap-1.5"><LayoutList className="h-3 w-3 text-primary" /> Unit Monitoring</li>
                        <li className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary" /> CARs & MR Actions</li>
                        <li className="flex items-center gap-1.5"><Users className="h-3 w-3 text-primary" /> System Users</li>
                    </ul>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed italic font-medium">
                    This snapshot captures every document ever logged, making it the primary archive for ISO certification.
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
                Download Total Archive
            </Button>
            </CardFooter>
        </Card>

        <Card className="shadow-md border-amber-200 bg-amber-50/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-amber-50 border-b py-4">
            <div className="flex items-center gap-2 mb-1">
                <History className="h-5 w-5 text-amber-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Audit Trail Registry</span>
            </div>
            <CardTitle>System Activity Logs</CardTitle>
            <CardDescription>Export the permanent system audit trail for security reviews.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <div className="p-4 rounded-xl bg-white/50 border border-amber-100 space-y-3 shadow-inner">
                    <p className="text-[11px] text-amber-800 leading-relaxed font-medium italic">
                        Logs all system interactions, deletions, and verification events. Essential for Clause 7.5.3 (Control of documented information).
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
                    Export System Audit Trail
                </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
