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
    limit,
    getDocsFromCache
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
    Search,
    FileCheck,
    AlertTriangle,
    ArrowRight,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

/**
 * AUDITOR OFFLINE MANAGER v5.1 (Deep Mirror Protocol)
 * Manages local data mirroring, network state locking, and aggressive code prefetching.
 * Now features a collapsible UI with persistent status badges.
 */
export function AuditorOfflineManager() {
  const firestore = useFirestore();
  const { user, userProfile } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const isOnline = useNetworkStatus();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isNetworkDisabled, setIsNetworkDisabled] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string>('');
  const [lastDownload, setLastDownload] = useState<Date | null>(null);
  const [mirrorStatus, setMirrorStatus] = useState<'none' | 'found' | 'expired'>('none');
  const [hasScanned, setHasScanned] = useState(false);

  const MIRROR_EXPIRY_MS = 2 * 60 * 60 * 1000; // 2 Hours

  useEffect(() => {
    const storedTime = localStorage.getItem('rsu_eoms_last_mirror_time');
    if (storedTime) {
        const date = new Date(storedTime);
        if (!isNaN(date.getTime())) {
            setLastDownload(date);
            const diff = Date.now() - date.getTime();
            setMirrorStatus(diff > MIRROR_EXPIRY_MS ? 'expired' : 'found');
        }
    }

    // Check if network was previously disabled manually
    const storedNetState = localStorage.getItem('rsu_eoms_net_disabled');
    if (storedNetState === 'true' && firestore) {
        disableNetwork(firestore);
        setIsNetworkDisabled(true);
    }
  }, [firestore, MIRROR_EXPIRY_MS]);

  const handleDownloadForOffline = async () => {
    if (!firestore || !user || !isOnline) return;

    setIsDownloading(true);
    setDownloadProgress('Initializing local repository...');

    try {
        // 1. MIRROR CORE SYSTEM DATA
        setDownloadProgress('Mirroring University Standards...');
        await getDocs(collection(firestore, 'isoClauses'));
        await getDocs(collection(firestore, 'units'));
        await getDocs(collection(firestore, 'campuses'));
        await getDoc(doc(firestore, 'system', 'signatories'));
        await getDoc(doc(firestore, 'system', 'settings'));

        // 2. MIRROR PERSONAL AUDIT ITINERARY (Critical for Conduct)
        setDownloadProgress('Mirroring Audit Itinerary...');
        const mySchedQuery = query(collection(firestore, 'auditSchedules'), where('auditorId', '==', user.uid));
        const schedSnap = await getDocs(mySchedQuery);
        const myScheds = schedSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        // 3. DEEP MIRROR & AGGRESSIVE PREFETCH
        setDownloadProgress('Caching Conduct Workspace...');
        for (const s of myScheds) {
            if (s.auditPlanId) {
                await getDoc(doc(firestore, 'auditPlans', s.auditPlanId));
            }
            const qFindings = query(collection(firestore, 'auditFindings'), where('auditScheduleId', '==', s.id));
            await getDocs(qFindings);
            router.prefetch(`/audit/${s.id}`);
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // 4. MIRROR OPERATIONAL DATA FOR CONTEXT
        setDownloadProgress('Mirroring Operational Logs...');
        await getDocs(collection(firestore, 'risks'));
        await getDocs(collection(firestore, 'unitMonitoringRecords'));
        await getDocs(collection(firestore, 'procedureManuals'));
        await getDocs(collection(firestore, 'eomsPolicyManuals'));

        // 5. PREFETCH CORE ROUTES
        setDownloadProgress('Finalizing Handshake...');
        const coreRoutes = ['/dashboard', '/audit', '/monitoring', '/risk-register', '/activity-log'];
        coreRoutes.forEach(r => router.prefetch(r));

        const now = new Date();
        setLastDownload(now);
        setMirrorStatus('found');
        setHasScanned(true);
        localStorage.setItem('rsu_eoms_last_mirror_time', now.toISOString());

        toast({ 
            title: 'Workspace Handshake Complete', 
            description: 'Application logic and audit data are now stored locally and prefetched.' 
        });
    } catch (e) {
        console.error("Mirroring error:", e);
        toast({ title: 'Mirror Failed', variant: 'destructive' });
    } finally {
        setIsDownloading(false);
        setDownloadProgress('');
    }
  };

  const handleSearchMirror = async () => {
    if (!firestore) return;
    setIsScanning(true);
    setHasScanned(true);
    
    try {
        const unitsRef = collection(firestore, 'units');
        const cacheSnapshot = await getDocsFromCache(query(unitsRef, limit(1)));
        const storedTime = localStorage.getItem('rsu_eoms_last_mirror_time');

        if (!cacheSnapshot.empty && storedTime) {
            const date = new Date(storedTime);
            setLastDownload(date);
            setMirrorStatus('found');
            toast({
                title: 'Local Mirror Verified',
                description: `Successfully located valid offline data from ${format(date, 'p')}.`,
            });
        } else {
            setMirrorStatus('none');
            toast({
                title: 'No Mirror Detected',
                description: 'Local repository is empty.',
                variant: 'destructive'
            });
        }
    } catch (e) {
        setMirrorStatus('none');
        toast({ title: 'Scan Error', description: 'Could not access local database cache.', variant: 'destructive' });
    } finally {
        setIsScanning(false);
    }
  };

  const toggleNetworkLock = async (forceOffline: boolean) => {
      if (!firestore) return;
      
      if (forceOffline && mirrorStatus === 'none') {
          toast({
              variant: "destructive",
              title: "Preparation Required",
              description: "Cannot force offline mode without a local data mirror. Please click 'Prepare Full Workspace' first.",
          });
          return;
      }
      
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
                        DO NOT CLOSE OR REFRESH THE PAGE UNTIL COMPLETE.<br/>
                        WE ARE CACHING ALL CONDUCT LOGIC FOR YOUR ITINERARY.
                    </p>
                </CardContent>
            </Card>
        </div>
    )}

    <Card className="border-primary/20 bg-primary/5 shadow-xl overflow-hidden transition-all duration-500">
      <CardHeader className="bg-primary/10 border-b py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Workspace Offline Control Hub
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                    Manage institutional data mirroring and connectivity state.
                </CardDescription>
            </div>
            <div className="flex items-center gap-3">
                {/* 1. Mirror Readiness Badge */}
                <Badge variant={mirrorStatus === 'found' ? 'default' : 'outline'} className={cn(
                    "h-7 px-3 font-black uppercase text-[9px] gap-2 transition-all",
                    mirrorStatus === 'found' ? "bg-emerald-600 text-white border-none" : "bg-white text-muted-foreground border-slate-200"
                )}>
                    {mirrorStatus === 'found' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5 opacity-40" />}
                    {mirrorStatus === 'found' ? 'Mirror Ready' : 'No Local Mirror'}
                </Badge>

                {/* 2. Network State Badge */}
                <Badge variant={isNetworkDisabled ? 'destructive' : 'outline'} className={cn(
                    "h-7 px-3 font-black uppercase text-[9px] gap-2 transition-all",
                    isNetworkDisabled ? "bg-rose-600 text-white border-none" : "bg-white text-primary border-primary/20"
                )}>
                    {isNetworkDisabled ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    {isNetworkDisabled ? 'Network Locked' : 'Cloud Sync Active'}
                </Badge>

                {/* 3. Collapse Toggle */}
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-8 px-3 text-[10px] font-black uppercase text-primary hover:bg-primary/10 border border-primary/10"
                >
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 mr-1.5" /> : <ChevronDown className="h-3.5 w-3.5 mr-1.5" />}
                    {isExpanded ? 'Hide Controls' : 'Manage Workspace'}
                </Button>
            </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
          <CardContent className="p-6 animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-5 rounded-2xl bg-white border border-primary/20 shadow-sm space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Download className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-xs font-black uppercase text-slate-800">1. Mirror Content</h4>
                                <p className="text-[10px] text-muted-foreground italic">Prepare local repository for field conduct.</p>
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

                    {mirrorStatus !== 'none' ? (
                        <div className={cn(
                            "p-3 rounded-xl border flex items-center justify-between transition-all animate-in zoom-in duration-300",
                            mirrorStatus === 'found' ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
                        )}>
                            <div className="flex items-center gap-3">
                                <div className={cn("h-7 w-7 rounded-full flex items-center justify-center", mirrorStatus === 'found' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600")}>
                                    {mirrorStatus === 'found' ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                </div>
                                <div className="space-y-0.5">
                                    <p className={cn("text-[10px] font-black uppercase", mirrorStatus === 'found' ? "text-emerald-700" : "text-amber-700")}>
                                        {mirrorStatus === 'found' ? 'READY FOR CONDUCT' : 'MIRROR EXPIRED'}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-500">Last Sync: {lastDownload ? format(lastDownload, 'p') : '--'}</p>
                                </div>
                            </div>
                            {mirrorStatus === 'found' && <Badge className="bg-emerald-600 h-4 text-[7px] font-black">LOCAL ACTIVE</Badge>}
                        </div>
                    ) : hasScanned && (
                        <div className="animate-in slide-in-from-top-4 duration-500">
                            <Alert variant="destructive" className="bg-rose-50 border-rose-200 shadow-sm">
                                <AlertTriangle className="h-4 w-4 text-rose-600" />
                                <AlertTitle className="text-[10px] font-black uppercase tracking-tight text-rose-800">Local Mirror Not Found</AlertTitle>
                                <AlertDescription className="space-y-4 pt-1">
                                    <p className="text-[11px] font-medium text-rose-700 leading-relaxed italic">
                                        "No cached institutional data was detected on this device. Would you like to download a fresh copy of the online mirror now?"
                                    </p>
                                    <Button 
                                        size="sm" 
                                        variant="destructive" 
                                        onClick={handleDownloadForOffline}
                                        disabled={!isOnline}
                                        className="h-8 w-full font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-rose-200"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        Prepare Workspace Now
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}

                    <Button 
                        onClick={handleDownloadForOffline} 
                        disabled={!isOnline || isDownloading || isNetworkDisabled}
                        className="w-full h-11 font-black uppercase text-[10px] tracking-widest shadow-lg"
                    >
                        {isDownloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                        {mirrorStatus === 'found' ? 'REFRESH LOCAL MIRROR' : 'PREPARE FULL WORKSPACE'}
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
                    <div className="p-3 bg-muted/20 rounded-lg border border-dashed flex gap-2">
                        <Info className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-muted-foreground leading-tight italic">
                            Enable "Force Offline" during actual conduct to prevent UI hangs if the university Wi-Fi is unstable.
                        </p>
                    </div>
                </div>
            </div>
          </CardContent>
      )}
    </Card>
    </>
  );
}