'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { 
    collection, 
    getDocs, 
    getDoc,
    query, 
    where, 
    doc,
    enableNetwork, 
    disableNetwork,
    waitForPendingWrites,
    limit
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
    Lock,
    Unlock,
    Activity,
    X,
    Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

/**
 * AUDITOR OFFLINE MANAGER v3.6 (Enhanced Visibility)
 * Manages local data mirroring, network state locking, and mirror validation.
 */
export function AuditorOfflineManager() {
  const firestore = useFirestore();
  const { user, userProfile } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const isOnline = useNetworkStatus();
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isNetworkDisabled, setIsNetworkDisabled] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string>('');
  const [lastDownload, setLastDownload] = useState<Date | null>(null);

  const MIRROR_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 Hours

  useEffect(() => {
    const storedTime = localStorage.getItem('rsu_eoms_last_mirror_time');
    if (storedTime) {
        const date = new Date(storedTime);
        if (!isNaN(date.getTime())) setLastDownload(date);
    }

    // Check if network was previously disabled manually
    const storedNetState = localStorage.getItem('rsu_eoms_net_disabled');
    if (storedNetState === 'true' && firestore) {
        disableNetwork(firestore);
        setIsNetworkDisabled(true);
    }
  }, [firestore]);

  const handleDownloadForOffline = async () => {
    if (!firestore || !user || !isOnline) return;

    if (lastDownload) {
        const diff = Date.now() - lastDownload.getTime();
        if (diff < MIRROR_EXPIRY_MS) {
            toast({
                title: 'Workspace Up-to-Date',
                description: `Your local mirror is fresh (created ${format(lastDownload, 'p')}).`,
            });
            return;
        }
    }

    setIsDownloading(true);
    setDownloadProgress('Initializing local repository...');

    try {
        setDownloadProgress('Caching Workspace Logic...');
        const routes = ['/dashboard', '/audit', '/monitoring', '/risk-register', '/manuals', '/eoms-policy-manual', '/activity-log'];
        routes.forEach(route => router.prefetch(route));

        setDownloadProgress('Mirroring University Registry...');
        await getDocs(collection(firestore, 'isoClauses'));
        await getDocs(collection(firestore, 'units'));
        await getDocs(collection(firestore, 'campuses'));
        await getDocs(collection(firestore, 'system'));

        setDownloadProgress('Mirroring Audit Content...');
        const allSchedSnap = await getDocs(collection(firestore, 'auditSchedules'));
        const allScheds = allSchedSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        for (const s of allScheds) {
            router.prefetch(`/audit/${s.id}`);
            if (s.auditPlanId) await getDoc(doc(firestore, 'auditPlans', s.auditPlanId));
            const qFindings = query(collection(firestore, 'auditFindings'), where('auditScheduleId', '==', s.id));
            await getDocs(qFindings);
        }

        setDownloadProgress('Mirroring Operational Logs...');
        await getDocs(collection(firestore, 'risks'));
        await getDocs(collection(firestore, 'unitMonitoringRecords'));
        await getDocs(collection(firestore, 'procedureManuals'));
        await getDocs(collection(firestore, 'eomsPolicyManuals'));

        const now = new Date();
        setLastDownload(now);
        localStorage.setItem('rsu_eoms_last_mirror_time', now.toISOString());

        toast({ 
            title: 'Workspace Handshake Complete', 
            description: 'Application logic and data are now stored locally.' 
        });
    } catch (e) {
        console.error("Mirroring error:", e);
        toast({ title: 'Mirror Failed', variant: 'destructive' });
    } finally {
        setIsDownloading(false);
        setDownloadProgress('');
    }
  };

  /**
   * SEARCH AND VALIDATE LOCAL MIRROR
   * Explicitly looks for the latest mirrored files in the local cache.
   */
  const handleSearchMirror = async () => {
    if (!firestore) return;
    setIsScanning(true);
    
    try {
        // 1. Check timestamp in localStorage
        const storedTime = localStorage.getItem('rsu_eoms_last_mirror_time');
        
        // 2. Perform a verify read from cache to ensure IndexedDB is holding data
        const q = query(collection(firestore, 'units'), limit(1));
        const snap = await getDocs(q);

        if (storedTime && !snap.empty) {
            const date = new Date(storedTime);
            setLastDownload(date);
            toast({
                title: 'Local Mirror Located',
                description: `Found valid offline files from ${format(date, 'PPP p')}.`,
            });
        } else {
            toast({
                title: 'No Mirror Detected',
                description: 'Local repository is empty or expired. Please prepare the workspace.',
                variant: 'destructive'
            });
        }
    } catch (e) {
        toast({ title: 'Scan Error', description: 'Could not verify local cache state.', variant: 'destructive' });
    } finally {
        setIsScanning(false);
    }
  };

  const toggleNetworkLock = async (forceOffline: boolean) => {
      if (!firestore) return;
      
      if (forceOffline) {
          await disableNetwork(firestore);
          setIsNetworkDisabled(true);
          localStorage.setItem('rsu_eoms_net_disabled', 'true');
          toast({ title: 'Network Locked: Offline', description: 'System is now in pure local mode. Cloud sync is disabled.' });
      } else {
          setIsSyncing(true);
          try {
              await enableNetwork(firestore);
              await waitForPendingWrites(firestore);
              setIsNetworkDisabled(false);
              localStorage.setItem('rsu_eoms_net_disabled', 'false');
              toast({ title: 'System Online', description: 'Network restored and data synchronized.' });
          } catch(e) {
              toast({ title: 'Sync Error', variant: 'destructive' });
          } finally {
              setIsSyncing(false);
          }
      }
  };

  return (
    <>
    {isDownloading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
            <Card className="w-full max-w-xl border-destructive border-4 shadow-2xl bg-white">
                <CardHeader className="text-center space-y-4 pb-2 bg-destructive/10 border-b-2 border-destructive">
                    <div className="mx-auto h-24 w-24 rounded-full bg-destructive flex items-center justify-center text-white animate-pulse">
                        <ShieldAlert className="h-12 w-12" />
                    </div>
                    <CardTitle className="text-3xl font-black uppercase text-destructive animate-emergency-flash">
                        SYSTEM MIRRORING ACTIVE
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-8 px-10 pb-10 space-y-8">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-black text-primary uppercase">
                            <span>{downloadProgress}</span>
                            <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                        <Progress value={undefined} className="h-3" />
                    </div>
                    <p className="text-[11px] font-bold leading-relaxed text-center text-destructive">
                        DO NOT CLOSE OR REFRESH THE PAGE UNTIL COMPLETE.
                    </p>
                </CardContent>
            </Card>
        </div>
    )}

    <Card className="border-primary/20 bg-primary/5 shadow-xl overflow-hidden">
      <CardHeader className="bg-primary/10 border-b py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Workspace Offline Control Hub
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                    Lock the system into local mode to prevent connectivity interruptions.
                </CardDescription>
            </div>
            <Badge variant={isNetworkDisabled ? 'destructive' : 'default'} className="h-6 px-3 font-black uppercase text-[10px] gap-2 border-none">
                {isNetworkDisabled ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                {isNetworkDisabled ? 'NETWORK LOCKED: OFFLINE' : 'CLOUD SYNC ACTIVE'}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-5 rounded-2xl bg-white border border-primary/20 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Download className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xs font-black uppercase text-slate-800">1. Mirror Content</h4>
                            <p className="text-[10px] text-muted-foreground italic">Prepare local repository (Last handshake: {lastDownload ? format(lastDownload, 'p') : 'Never'}).</p>
                        </div>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleSearchMirror} 
                        disabled={isScanning || isDownloading}
                        className="h-9 px-4 font-black uppercase text-[10px] tracking-widest bg-white border-primary/20 text-primary gap-2 shadow-sm"
                    >
                        {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        Scan Local Registry
                    </Button>
                </div>
                <Button 
                    onClick={handleDownloadForOffline} 
                    disabled={!isOnline || isDownloading || isNetworkDisabled}
                    className="w-full h-11 font-black uppercase text-[10px] tracking-widest shadow-lg"
                >
                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                    PREPARE FULL WORKSPACE
                </Button>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-indigo-100 shadow-sm space-y-4">
                <div className="flex items-start gap-4">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", isNetworkDisabled ? "bg-rose-100 text-rose-600" : "bg-indigo-100 text-indigo-600")}>
                        {isNetworkDisabled ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase text-slate-800">2. Network State Control</h4>
                        <p className="text-[10px] text-muted-foreground italic">Toggle between Local Storage and Cloud Synchronization.</p>
                    </div>
                </div>
                {isNetworkDisabled ? (
                    <Button 
                        variant="outline"
                        onClick={() => toggleNetworkLock(false)} 
                        disabled={!isOnline || isSyncing}
                        className="w-full h-11 border-indigo-200 text-indigo-700 font-black uppercase text-[10px] tracking-widest hover:bg-indigo-50"
                    >
                        {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />}
                        SYNC TO CLOUD & UNLOCK
                    </Button>
                ) : (
                    <Button 
                        variant="outline"
                        onClick={() => toggleNetworkLock(true)} 
                        className="w-full h-11 border-rose-200 text-rose-600 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50"
                    >
                        <CloudOff className="mr-2 h-4 w-4" />
                        FORCE OFFLINE MODE
                    </Button>
                )}
            </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
}
