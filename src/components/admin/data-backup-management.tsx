
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, getDocs, Timestamp, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Database, FileSpreadsheet, Loader2, ShieldCheck, History, Info, Link as LinkIcon, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { BackupSettings } from '@/lib/types';

/**
 * DATA BACKUP MANAGEMENT COMPONENT
 * Implements Phase 1 of the redundancy plan: Manual Institutional Data Export.
 * Only accessible to Administrators via System Settings.
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

  // Utility to fetch all documents from a collection and flatten timestamps
  const exportCollection = async (collectionName: string) => {
    if (!firestore) return [];
    const snapshot = await getDocs(collection(firestore, collectionName));
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const processed: Record<string, any> = { id: doc.id };
        
        // Flatten simple data and convert Timestamps to ISO strings for Excel compatibility
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
      toast({ title: 'Backup Initialized', description: 'Aggregating institutional data from Firestore...' });

      // Parallel fetching for speed
      const [submissions, risks, users, units, campuses, programs, compliances] = await Promise.all([
        exportCollection('submissions'),
        exportCollection('risks'),
        exportCollection('users'),
        exportCollection('units'),
        exportCollection('campuses'),
        exportCollection('academicPrograms'),
        exportCollection('programCompliances'),
      ]);

      const wb = XLSX.utils.book_new();

      // Append core datasets as separate sheets
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(submissions), 'Submissions');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(risks), 'Risks');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(users), 'Users');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(units), 'Units');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(campuses), 'Campuses');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(programs), 'Programs');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(compliances), 'Compliance_Records');

      const dateStr = format(new Date(), 'yyyy-MM-dd_HHmm');
      XLSX.writeFile(wb, `RSU_EOMS_Institutional_Backup_${dateStr}.xlsx`);

      toast({ title: 'Backup Complete', description: 'Institutional snapshot has been downloaded successfully.' });
    } catch (error) {
      console.error('Backup Error:', error);
      toast({ title: 'Backup Failed', description: 'An error occurred during data aggregation.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Institutional Backup Target Configuration */}
      <Card className="shadow-md border-primary/20 bg-primary/5">
        <CardHeader className="bg-primary/10 border-b py-4">
            <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="h-5 w-5 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Automation Settings</span>
            </div>
            <CardTitle>Institutional Backup Repository</CardTitle>
            <CardDescription>Configure the target Google Drive link for automated institutional snapshots.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-slate-700 flex items-center gap-2">
                        <LinkIcon className="h-3.5 w-3.5" />
                        Target Google Drive Link (For Direct Upload)
                    </Label>
                    <div className="flex gap-2">
                        <Input 
                            value={driveLink}
                            onChange={(e) => setDriveLink(e.target.value)}
                            placeholder="https://drive.google.com/..."
                            className="bg-white font-bold h-11"
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
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex gap-3">
                    <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-xs font-black uppercase text-blue-800">Direct Upload Note</p>
                        <p className="text-[11px] text-blue-800 leading-relaxed font-medium italic">
                            <strong>Technical Requirement:</strong> For background synchronization to work automatically, the university's Google Workspace must have a <strong>Service Account</strong> configured with write access to the target folder. Currently, the system will simulate the upload and trigger a download as a fail-safe.
                        </p>
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
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Portable Data Redundancy</span>
            </div>
            <CardTitle>Manual Snapshot (XLSX)</CardTitle>
            <CardDescription>
                Generate a comprehensive Excel workbook containing all registered records across EOMS modules.
            </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
            <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white border border-primary/10 shadow-sm space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-slate-800 flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        Encapsulated Datasets:
                    </h4>
                    <ul className="grid grid-cols-2 gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                        <li className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary" /> Submissions</li>
                        <li className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary" /> Risk Register</li>
                        <li className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary" /> User Registry</li>
                        <li className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary" /> Campus Units</li>
                        <li className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary" /> Academic Programs</li>
                        <li className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-primary" /> Compliance Matrix</li>
                    </ul>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed italic font-medium">
                    This snapshot provides a point-in-time record of all university quality data. It can be used for local backups or as evidence during ISO certification audits.
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
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Audit Compliance Requirement</span>
            </div>
            <CardTitle>System Activity Logs</CardTitle>
            <CardDescription>Export the permanent system audit trail for security and accountability reviews.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <div className="p-4 rounded-xl bg-white/50 border border-amber-100 space-y-3 shadow-inner">
                    <p className="text-[11px] text-amber-800 leading-relaxed font-medium italic">
                        The audit trail records every administrative interaction, login event, and status transition. Maintaining a portable copy of these logs is essential for institutional transparency and internal quality auditing (IQA).
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
                            toast({ title: 'Logs Exported', description: 'The permanent system audit trail has been saved locally.' });
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
