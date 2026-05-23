'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { 
    collection, 
    getDocs, 
    getDoc,
    query, 
    where, 
    doc,
    setDoc,
    enableNetwork, 
    disableNetwork,
    waitForPendingWrites,
    limit,
    getDocsFromCache,
    DocumentData
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
    ChevronUp,
    Share2,
    UploadCloud,
    FileUp,
    Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

/**
 * AUDITOR OFFLINE MANAGER v6.0
 * Features:
 * 1. Mirror Logic: Local caching of institutional data.
 * 2. Network Lock: Forced offline state to prevent browser hangs.
 * 3. Portability: Export/Import .eoms packages for cross-browser data transfer.
 */
export function AuditorOfflineManager() {
  const firestore = useFirestore();
  const { user, userProfile } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
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
        await getDocs(collection(firestore, 'isoClauses'));
        await getDocs(collection(firestore, 'units'));
        await getDocs(collection(firestore, 'campuses'));
        await getDoc(doc(firestore, 'system', 'signatories'));
        await getDoc(doc(firestore, 'system', 'settings'));

        const mySchedQuery = query(collection(firestore, 'auditSchedules'), where('auditorId', '==', user.uid));
        const schedSnap = await getDocs(mySchedQuery);
        const myScheds = schedSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        for (const s of myScheds) {
            if (s.auditPlanId) {
                await getDoc(doc(firestore, 'auditPlans', s.auditPlanId));
            }
            const qFindings = query(collection(firestore, 'auditFindings'), where('auditScheduleId', '==', s.id));
            await getDocs(qFindings);
            router.prefetch(`/audit/${s.id}`);
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        await getDocs(collection(firestore, 'risks'));
        await getDocs(collection(firestore, 'unitMonitoringRecords'));
        await getDocs(collection(firestore, 'procedureManuals'));
        await getDocs(collection(firestore, 'eomsPolicyManuals'));

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
            toast({ title: 'Local Mirror Verified' });
        } else {
            setMirrorStatus('none');
            toast({ title: 'No Mirror Detected', variant: 'destructive' });
        }
    } catch (e) {
        setMirrorStatus('none');
    } finally {
        setIsScanning(false);
    }
  };

  /**
   * WORKSPACE EXPORT LOGIC
   * Grabs all essential data from the local cache and packages it into a file.
   */
  const handleExportWorkspace = async () => {
    if (!firestore || mirrorStatus === 'none') {
        toast({ title: "Export Restricted", description: "Establish a local mirror first.", variant: "destructive" });
        return;
    }

    setIsExporting(true);
    try {
        const collections = ['isoClauses', 'units', 'campuses', 'auditPlans', 'auditSchedules', 'auditFindings', 'risks', 'procedureManuals', 'eomsPolicyManuals'];
        const packageData: Record<string, any[]> = {};

        for (const colName of collections) {
            const snap = await getDocsFromCache(collection(firestore, colName));
            packageData[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        const blob = new Blob([JSON.stringify({
            version: '2.5',
            exportedAt: new Date().toISOString(),
            data: packageData
        })], { type: 'application/json' });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RSU_EOMS_Workspace_${format(new Date(), 'yyyy-MM-dd_HHmm')}.eoms`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({ title: 'Workspace Exported', description: 'Your portable offline package (.eoms) is ready.' });
    } catch (e) {
        toast({ title: 'Export Failed', variant: 'destructive' });
    } finally {
        setIsExporting(false);
    }
  };

  /**
   * WORKSPACE IMPORT LOGIC
   * Accepts an .eoms file and writes its content into the local IndexedDB cache.
   */
  const handleImportWorkspace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const content = JSON.parse(event.target?.result as string);
            if (!content.data) throw new Error('Invalid format');

            for (const [colName, docs] of Object.entries(content.data)) {
                const batchPromises = (docs as any[]).map(d => {
                    const { id, ...data } = d;
                    return setDoc(doc(firestore, colName, id), data, { merge: true });
                });
                await Promise.all(batchPromises);
            }

            localStorage.setItem('rsu_eoms_last_mirror_time', content.exportedAt || new Date().toISOString());
            setMirrorStatus('found');
            setLastDownload(new Date(content.exportedAt || Date.now()));
            
            toast({ title: 'Workspace Imported', description: 'Local database updated with the portable package.' });
            router.refresh();
        } catch (err) {
            toast({ title: 'Import Error', description: 'The file is invalid or corrupted.', variant: 'destructive' });
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };

  const toggleNetworkLock = async (forceOffline: boolean) => {
      if (!firestore) return;
      if (forceOffline && mirrorStatus === 'none') {
          toast({ variant: "destructive", title: "Preparation Required", description: "Establishing local mirror first." });
          return;
      }
      
      if (forceOffline) {
          await disableNetwork(firestore);
          setIsNetworkDisabled(true);
          localStorage.setItem('rsu_eoms_net_disabled', 'true');
          toast({ title: 'Network Locked: Offline' });
      } else {
          setIsSyncing(true);
          try {
              await enableNetwork(firestore);
              await waitForPendingWrites(firestore);
              setIsNetworkDisabled(false);
              localStorage.setItem('rsu_eoms_net_disabled', 'false');
              toast({ title: 'System Online' });
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
                    <CardTitle className="text-3xl font-black uppercase text-destructive animate-emergency-flash">SYSTEM MIRRORING ACTIVE</CardTitle>
                </CardHeader>
                <CardContent className="pt-8 px-10 pb-10 space-y-8">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px] font-black text-primary uppercase">
                            <span>{downloadProgress}</span>
                            <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                        <Progress value={undefined} className="h-3" />
                    </div>
                    <p className="text-[11px] font-bold leading-relaxed text-center text-destructive uppercase">DO NOT CLOSE OR REFRESH THE PAGE UNTIL COMPLETE.</p>
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
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Mirroring, Connectivity & Portability Management.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
                <Badge variant={mirrorStatus === 'found' ? 'default' : 'outline'} className={cn("h-7 px-3 font-black uppercase text-[9px] gap-2", mirrorStatus === 'found' ? "bg-emerald-600 text-white border-none" : "bg-white text-muted-foreground border-slate-200")}>
                    {mirrorStatus === 'found' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5 opacity-40" />}
                    {mirrorStatus === 'found' ? 'Mirror Ready' : 'No Local Mirror'}
                </Badge>
                <Badge variant={isNetworkDisabled ? 'destructive' : 'outline'} className={cn("h-7 px-3 font-black uppercase text-[9px] gap-2", isNetworkDisabled ? "bg-rose-600 text-white border-none" : "bg-white text-primary border-primary/20")}>
                    {isNetworkDisabled ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    {isNetworkDisabled ? 'Network Locked' : 'Cloud Sync Active'}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="h-8 px-3 text-[10px] font-black uppercase text-primary hover:bg-primary/10 border border-primary/10">
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 mr-1.5" /> : <ChevronDown className="h-3.5 w-3.5 mr-1.5" />}
                    {isExpanded ? 'Hide Controls' : 'Manage Workspace'}
                </Button>
            </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
          <CardContent className="p-6 animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. MIRRORING */}
                <div className="p-5 rounded-2xl bg-white border border-primary/20 shadow-sm space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <h4 className="text-xs font-black uppercase text-slate-800">1. Mirror Content</h4>
                            <p className="text-[10px] text-muted-foreground italic">Sync cloud data to device cache.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleSearchMirror} disabled={isScanning || isDownloading} className="h-8 px-3 font-black uppercase text-[9px] bg-white border-primary/20 text-primary gap-1.5">
                            {isScanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                            Scan Local
                        </Button>
                    </div>
                    {mirrorStatus !== 'none' ? (
                        <div className={cn("p-3 rounded-xl border flex items-center justify-between", mirrorStatus === 'found' ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200")}>
                            <div className="flex items-center gap-3">
                                {mirrorStatus === 'found' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-amber-600" />}
                                <div className="space-y-0.5">
                                    <p className={cn("text-[9px] font-black uppercase", mirrorStatus === 'found' ? "text-emerald-700" : "text-amber-700")}>{mirrorStatus === 'found' ? 'READY FOR CONDUCT' : 'EXPIRED'}</p>
                                    <p className="text-[8px] font-bold text-slate-500">Sync: {lastDownload ? format(lastDownload, 'p') : '--'}</p>
                                </div>
                            </div>
                        </div>
                    ) : hasScanned && (
                        <Alert variant="destructive" className="bg-rose-50 border-rose-200 py-3">
                            <AlertTitle className="text-[9px] font-black uppercase">No Mirror Detected</AlertTitle>
                            <Button size="sm" variant="destructive" onClick={handleDownloadForOffline} disabled={!isOnline} className="h-7 w-full font-black text-[9px] mt-2">DOWNLOAD NOW</Button>
                        </Alert>
                    )}
                    {!(mirrorStatus === 'none' && hasScanned) && (
                        <Button onClick={handleDownloadForOffline} disabled={!isOnline || isDownloading || isNetworkDisabled} className="w-full h-10 font-black uppercase text-[10px]">
                            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}
                            {mirrorStatus === 'found' ? 'REFRESH MIRROR' : 'START HANDSHAKE'}
                        </Button>
                    )}
                </div>

                {/* 2. NETWORK LOCK */}
                <div className="p-5 rounded-2xl bg-white border border-indigo-100 shadow-sm space-y-4">
                    <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase text-slate-800">2. Network Lock</h4>
                        <p className="text-[10px] text-muted-foreground italic">Force local-only execution.</p>
                    </div>
                    {isNetworkDisabled ? (
                        <Button variant="outline" onClick={() => toggleNetworkLock(false)} disabled={!isOnline || isSyncing} className="w-full h-10 border-indigo-200 text-indigo-700 font-black uppercase text-[10px] hover:bg-indigo-50">
                            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />}
                            SYNC & UNLOCK
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={() => toggleNetworkLock(true)} className="w-full h-10 border-rose-200 text-rose-600 font-black uppercase text-[10px] hover:bg-rose-50">
                            <CloudOff className="mr-2 h-4 w-4" />
                            FORCE OFFLINE
                        </Button>
                    )}
                    <div className="p-2 bg-muted/20 rounded-lg border border-dashed text-[9px] text-muted-foreground">LOCK preventing UI hangs in unstable Wi-Fi zones.</div>
                </div>

                {/* 3. PORTABILITY (EXPORT/IMPORT) */}
                <div className="p-5 rounded-2xl bg-white border border-blue-100 shadow-sm space-y-4">
                    <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase text-slate-800">3. Portability</h4>
                        <p className="text-[10px] text-muted-foreground italic">Cross-browser data transfer.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={handleExportWorkspace} disabled={isExporting || mirrorStatus === 'none'} className="h-10 border-blue-200 text-blue-700 font-black uppercase text-[10px]">
                            {isExporting ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Share2 className="h-3 w-3 mr-1.5" />}
                            EXPORT
                        </Button>
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="h-10 border-blue-200 text-blue-700 font-black uppercase text-[10px]">
                            {isImporting ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <FileUp className="h-3 w-3 mr-1.5" />}
                            IMPORT
                        </Button>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".eoms" onChange={handleImportWorkspace} />
                    </div>
                    <div className="p-2 bg-blue-50/50 rounded-lg border border-blue-100 text-[9px] text-blue-800 italic leading-tight">Transfer your mirror to a FIELD LAPTOP or DIFFERENT BROWSER via USB without cloud access.</div>
                </div>
            </div>
          </CardContent>
      )}
    </Card>
    </>
  );
}
