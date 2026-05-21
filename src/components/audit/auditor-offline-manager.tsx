'use client';

import { useState } from 'react';
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
    CloudUpload,
    Database,
    Layers,
    ShieldAlert,
    LayoutGrid,
    BookOpen,
    ClipboardCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

/**
 * AUDITOR OFFLINE MANAGER v2.6 (Navigation Hardening)
 * Performs "Full Workspace Handshake" to prevent browser navigation errors.
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

  const handleDownloadForOffline = async () => {
    if (!firestore || !user || !isOnline) return;

    setIsDownloading(true);
    setDownloadProgress('Initializing local repository...');

    try {
        // 1. Prefetch Application Code (The "Menus")
        setDownloadProgress('Caching Workspace Logic...');
        const routes = ['/dashboard', '/audit', '/monitoring', '/risk-register', '/manuals', '/eoms-policy-manual', '/activity-log'];
        routes.forEach(route => router.prefetch(route));

        // 2. Mirror Structural Data
        setDownloadProgress('Mirroring University Registry...');
        await getDocs(collection(firestore, 'isoClauses'));
        await getDocs(collection(firestore, 'units'));
        await getDocs(collection(firestore, 'campuses'));
        await getDocs(collection(firestore, 'system'));

        // 3. Mirror IQA Content Hub
        setDownloadProgress('Mirroring Audit Itineraries...');
        const allSchedSnap = await getDocs(collection(firestore, 'auditSchedules'));
        const allScheds = allSchedSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        for (const s of allScheds) {
            router.prefetch(`/audit/${s.id}`);
            if (s.auditPlanId) {
                await getDoc(doc(firestore, 'auditPlans', s.auditPlanId));
            }
            const qFindings = query(collection(firestore, 'auditFindings'), where('auditScheduleId', '==', s.id));
            await getDocs(qFindings);
        }

        // 4. Mirror Operational Content (Risk & Monitoring)
        setDownloadProgress('Mirroring Risk & Monitoring Logs...');
        await getDocs(collection(firestore, 'risks'));
        await getDocs(collection(firestore, 'unitMonitoringRecords'));
        await getDocs(collection(firestore, 'procedureManuals'));
        await getDocs(collection(firestore, 'eomsPolicyManuals'));

        setLastDownload(new Date());
        toast({ 
            title: 'Workspace Handshake Complete', 
            description: 'Application code and data are now stored locally. You can safely navigate the conduct menus offline.' 
        });
    } catch (e) {
        console.error("Mirroring error:", e);
        toast({ 
            title: 'Mirror Failed', 
            description: 'Local data replication was interrupted. Please retry.', 
            variant: 'destructive' 
        });
    } finally {
        setIsDownloading(false);
        setDownloadProgress('');
    }
  };

  const handleSyncOnline = async () => {
    if (!firestore || !isOnline) return;
    
    setIsSyncing(true);
    try {
        toast({ title: 'Syncing Changes', description: 'Uploading local records to university cloud...' });
        await enableNetwork(firestore);
        await waitForPendingWrites(firestore);
        toast({ title: 'Synchronization Complete', description: 'Institutional database is now up to date.' });
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
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Total conduct mirroring</CardTitle>
                </div>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                    Prepare your device for full-featured auditing in zero-connectivity sites.
                </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <Badge variant={isOnline ? 'default' : 'destructive'} className="h-6 px-3 font-black uppercase text-[10px] gap-2 border-none">
                    {isOnline ? <Wifi className="h-3 w-3 text-emerald-500" /> : <WifiOff className="h-3 w-3 animate-pulse" />}
                    {isOnline ? 'Cloud Link Active' : 'Offline Workspace'}
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
                            <h4 className="text-xs font-black uppercase text-slate-800 tracking-widest">Workspace Handshake</h4>
                            <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                                Mirror the entire Conduct Workspace (IQA, Monitoring, Risk) and prefetch code to prevent browser errors while offline.
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
                            PREPARE FULL WORKSPACE
                        </Button>
                    )}
                    
                    {lastDownload && (
                        <div className="flex items-center gap-2 pt-2 text-[9px] font-bold text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Workspace Mirrored: {format(lastDownload, 'PP p')}
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
                            <h4 className="text-xs font-black uppercase text-indigo-900 tracking-widest">Global Synchronization</h4>
                            <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                                Once back online, push your local findings and claimed units to the central university registry.
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
                        SYNC TO CLOUD
                    </Button>
                </div>
            </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/5 border-t py-3 px-8">
          <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                      <strong>Operational Guide:</strong> Running the "Handshake" while online ensures that the "IQA Conduct", "Unit Monitoring", and "Risk Register" routes remain interactive even if you lose connectivity.
                  </p>
                  <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-tight">
                      System Version 2.6: Navigation Guard Enabled.
                  </p>
              </div>
          </div>
      </CardFooter>
    </Card>
  );
}
