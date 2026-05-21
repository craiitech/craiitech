'use client';

import { useState, useEffect } from 'react';
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
    ClipboardCheck,
    X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

/**
 * AUDITOR OFFLINE MANAGER v2.8 (High-Visibility Preparation)
 * Performs "Full Workspace Handshake" with a prominent safety warning during data mirror.
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

  const MIRROR_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 Hours in milliseconds

  // 1. Load persistent mirror timestamp on mount
  useEffect(() => {
    const storedTime = localStorage.getItem('rsu_eoms_last_mirror_time');
    if (storedTime) {
        const date = new Date(storedTime);
        if (!isNaN(date.getTime())) {
            setLastDownload(date);
        }
    }
  }, []);

  const handleDownloadForOffline = async () => {
    if (!firestore || !user || !isOnline) return;

    // 2. CHECK FOR EXISTING FRESH MIRROR
    if (lastDownload) {
        const diff = Date.now() - lastDownload.getTime();
        if (diff < MIRROR_EXPIRY_MS) {
            toast({
                title: 'Workspace Up-to-Date',
                description: `Your local mirror is fresh (created ${format(lastDownload, 'p')}). Using existing local version.`,
            });
            return;
        }
    }

    setIsDownloading(true);
    setDownloadProgress('Initializing local repository...');

    try {
        // 3. Prefetch Application Code (The "Menus")
        setDownloadProgress('Caching Workspace Logic...');
        const routes = ['/dashboard', '/audit', '/monitoring', '/risk-register', '/manuals', '/eoms-policy-manual', '/activity-log'];
        routes.forEach(route => router.prefetch(route));

        // 4. Mirror Structural Data
        setDownloadProgress('Mirroring University Registry...');
        await getDocs(collection(firestore, 'isoClauses'));
        await getDocs(collection(firestore, 'units'));
        await getDocs(collection(firestore, 'campuses'));
        await getDocs(collection(firestore, 'system'));

        // 5. Mirror IQA Content Hub (All Active/Available sessions)
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

        // 6. Mirror Operational Content (Risk & Monitoring)
        setDownloadProgress('Mirroring Risk & Monitoring Logs...');
        await getDocs(collection(firestore, 'risks'));
        await getDocs(collection(firestore, 'unitMonitoringRecords'));
        await getDocs(collection(firestore, 'procedureManuals'));
        await getDocs(collection(firestore, 'eomsPolicyManuals'));

        // 7. Persist Timestamp
        const now = new Date();
        setLastDownload(now);
        localStorage.setItem('rsu_eoms_last_mirror_time', now.toISOString());

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
    <>
    {/* --- PERSISTENT DANGER ALERT DURING DOWNLOAD --- */}
    {isDownloading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-500">
            <Card className="w-full max-w-xl border-destructive border-4 shadow-[0_0_100px_rgba(220,38,38,0.5)] bg-white animate-in zoom-in duration-300 overflow-hidden">
                <CardHeader className="text-center space-y-4 pb-2 bg-destructive/10 border-b-2 border-destructive">
                    <div className="mx-auto h-24 w-24 rounded-full bg-destructive flex items-center justify-center text-white animate-pulse shadow-xl">
                        <ShieldAlert className="h-12 w-12" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-3xl font-black uppercase text-destructive tracking-tighter animate-emergency-flash">
                            SYSTEM MIRRORING IN PROGRESS
                        </CardTitle>
                        <Badge variant="destructive" className="h-6 px-4 font-black uppercase tracking-widest text-[10px]">Institutional Safety Gate</Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-8 px-10 pb-10 space-y-8">
                    <div className="text-center space-y-2">
                        <p className="text-lg font-black text-slate-900 leading-tight">
                            The portal is currently downloading the official registry for offline conduct.
                        </p>
                        <p className="text-sm font-bold text-rose-600 italic">
                            "Please remain on this screen to ensure data integrity."
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-black text-primary uppercase tracking-[0.2em]">
                            <span>{downloadProgress}</span>
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="animate-pulse">Active Handshake</span>
                            </div>
                        </div>
                        <Progress value={undefined} className="h-3 bg-muted" />
                    </div>

                    <div className="p-5 rounded-2xl bg-destructive border-2 border-destructive text-white shadow-lg space-y-2">
                        <div className="flex items-center gap-2 justify-center mb-1">
                            <Info className="h-4 w-4" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest">Crucial Protocol Warning</h4>
                        </div>
                        <p className="text-[11px] font-bold leading-relaxed text-center">
                            DO NOT CLOSE THE BROWSER, REFRESH THE PAGE, OR DISCONNECT FROM THE NETWORK UNTIL THIS PROCESS IS FINALIZED.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )}

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
                    
                    <Button 
                        onClick={handleDownloadForOffline} 
                        disabled={!isOnline || isDownloading}
                        className="w-full h-11 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20"
                    >
                        {isDownloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                        PREPARE FULL WORKSPACE
                    </Button>
                    
                    {lastDownload && (
                        <div className="flex items-center gap-2 pt-2 text-[9px] font-bold text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Mirror created: {format(lastDownload, 'PP p')}
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
                        disabled={!isOnline || isSyncing || isDownloading}
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
                      System Version 2.8: High-Visibility Mirroring Enabled.
                  </p>
              </div>
          </div>
      </CardFooter>
    </Card>
    </>
  );
}
