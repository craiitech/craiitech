'use client';

import { useState, useCallback } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { 
    collection, 
    getDocs, 
    getDoc,
    query, 
    where, 
    doc,
    enableNetwork, 
    waitForPendingWrites
} from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
    Download, 
    ShieldCheck, 
    Loader2, 
    Info, 
    CloudOff, 
    Wifi, 
    WifiOff,
    CheckCircle2,
    CloudUpload
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

/**
 * AUDITOR OFFLINE MANAGER
 * Component responsible for "Priming" the local Firestore cache while online
 * and prefetching the code bundles for assigned audit pages.
 */
export function AuditorOfflineManager() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const isOnline = useNetworkStatus();
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string>('');
  const [lastDownload, setLastDownload] = useState<Date | null>(null);

  /**
   * DATA & CODE PRIMING ENGINE
   * 1. Fetches essential data into IndexedDB.
   * 2. Programmatically prefetches Next.js route bundles for assignments.
   */
  const handleDownloadForOffline = async () => {
    if (!firestore || !user || !isOnline) return;

    setIsDownloading(true);
    setDownloadProgress('Initializing local repository...');

    try {
        // 1. Fetch Structural Reference Data
        setDownloadProgress('Caching Standard (ISO Clauses)...');
        await getDocs(collection(firestore, 'isoClauses'));
        
        setDownloadProgress('Caching Organizational Registry...');
        await getDocs(collection(firestore, 'units'));
        await getDocs(collection(firestore, 'campuses'));

        // 2. Fetch Auditor's Schedules
        setDownloadProgress('Identifying My Assignments...');
        const qSched = query(collection(firestore, 'auditSchedules'), where('auditorId', '==', user.uid));
        const schedSnap = await getDocs(qSched);
        const myScheds = schedSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        // 3. Deep cache related data AND Prefetch Routes
        setDownloadProgress('Mirroring Evidence Log Resources...');
        for (const s of myScheds) {
            // A. Prefetch the Next.js page bundle (CRITICAL: Fixes the "No Internet" browser error)
            router.prefetch(`/audit/${s.id}`);

            // B. Cache the parent plan
            if (s.auditPlanId) {
                await getDoc(doc(firestore, 'auditPlans', s.auditPlanId));
            }
            // C. Cache findings for this schedule
            const qFindings = query(collection(firestore, 'auditFindings'), where('auditScheduleId', '==', s.id));
            await getDocs(qFindings);
            
            // D. Cache CARs for the auditee unit
            if (s.targetId) {
                const qCars = query(collection(firestore, 'correctiveActionRequests'), where('unitId', '==', s.targetId));
                await getDocs(qCars);
            }
        }

        // 4. System Parameters
        setDownloadProgress('Caching System Signatories...');
        await getDocs(collection(firestore, 'system'));

        setLastDownload(new Date());
        toast({ title: 'Ready for Offline Use', description: 'Deep data mirror and page code bundles have been cached.' });
    } catch (e) {
        console.error("Priming error:", e);
        toast({ title: 'Download Incomplete', description: 'An error occurred during local data mirroring.', variant: 'destructive' });
    } finally {
        setIsDownloading(false);
        setDownloadProgress('');
    }
  };

  const handleSyncOnline = async () => {
    if (!firestore || !isOnline) return;
    
    setIsSyncing(true);
    try {
        toast({ title: 'Syncing Changes', description: 'Uploading local audit findings to cloud...' });
        
        // Re-enable network to force a push
        await enableNetwork(firestore);
        
        // Wait for all local writes to be acknowledged by the server
        await waitForPendingWrites(firestore);
        
        toast({ title: 'Synchronization Complete', description: 'All local records are now in the cloud.' });
    } catch (e) {
        toast({ title: 'Sync Failed', variant: 'destructive' });
    } finally {
        setIsSyncing(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5 shadow-xl overflow-hidden animate-in slide-in-from-top-4 duration-500">
      <CardHeader className="bg-primary/10 border-b py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Offline Audit Workspace</CardTitle>
                </div>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                    Prepare your device for audit conduct in zero-connectivity environments.
                </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Badge variant={isOnline ? 'default' : 'destructive'} className="h-6 px-3 font-black uppercase text-[10px] gap-2 border-none">
                    {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                    {isOnline ? 'Network Connected' : 'Offline Mode'}
                </Badge>
            </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-white border border-primary/20 shadow-sm space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Download className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xs font-black uppercase text-slate-800 tracking-widest">Full Bundle Priming</h4>
                            <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                                Mirrored code and data bundles for assigned Audit Plans, Schedules, Findings, and ISO Clauses.
                            </p>
                        </div>
                    </div>
                    
                    {isDownloading ? (
                        <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between text-[10px] font-black text-primary uppercase">
                                <span>{downloadProgress}</span>
                                <Loader2 className="h-3 w-3 animate-spin" />
                            </div>
                            <Progress value={50} className="h-1.5" />
                        </div>
                    ) : (
                        <Button 
                            onClick={handleDownloadForOffline} 
                            disabled={!isOnline}
                            className="w-full h-11 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            PREPARE OFFLINE DATA
                        </Button>
                    )}
                    
                    {lastDownload && (
                        <div className="flex items-center gap-2 pt-2 text-[9px] font-bold text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Ready for Offline: {format(lastDownload, 'PP p')}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-white border border-indigo-100 shadow-sm space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                            <CloudUpload className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xs font-black uppercase text-indigo-900 tracking-widest">Cloud Synchronization</h4>
                            <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                                Pushes findings recorded while offline to the university central database once reconnected.
                            </p>
                        </div>
                    </div>
                    <Button 
                        variant="outline"
                        onClick={handleSyncOnline} 
                        disabled={!isOnline || isSyncing}
                        className="w-full h-11 border-indigo-200 text-indigo-700 font-black uppercase text-[10px] tracking-widest hover:bg-indigo-50"
                    >
                        {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CloudUpload className="h-4 w-4 mr-2" />}
                        SYNC ONLINE NOW
                    </Button>
                </div>
            </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/5 border-t py-3 px-8">
          <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                  <strong>Auditor Protocol:</strong> Clicking "PREPARE OFFLINE DATA" caches the visual components of the Evidence Logsheet. Once the progress bar completes, you can navigate to and record data in your assigned sessions even without internet.
              </p>
          </div>
      </CardFooter>
    </Card>
  );
}
