'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
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
    ShieldAlert,
    Clock,
    Lock,
    Unlock,
    Search,
    ChevronDown,
    ChevronUp,
    Share2,
    FileUp,
    AlertTriangle,
    RotateCw,
    Smartphone,
    Globe,
    School
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Badge } from '../ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Campus } from '@/lib/types';

export function AuditorOfflineManager() {
  const firestore = useFirestore();
  const { user, isAdmin } = useUser();
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
  const [mounted, setMounted] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>('university-wide');

  const MIRROR_EXPIRY_MS = 2 * 60 * 60 * 1000; 

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  useEffect(() => {
    setMounted(true);
    const checkMirrorAge = () => {
        const storedTime = localStorage.getItem('rsu_last_mirror_time');
        const storedSite = localStorage.getItem('rsu_offline_site_lock');
        if (storedSite) setSelectedSite(storedSite);

        if (storedTime) {
            const date = new Date(storedTime);
            if (!isNaN(date.getTime())) {
                setLastDownload(date);
                const diff = Date.now() - date.getTime();
                setMirrorStatus(diff > MIRROR_EXPIRY_MS ? 'expired' : 'found');
            }
        } else {
            setMirrorStatus('none');
        }
    };
    
    checkMirrorAge();
    const interval = setInterval(checkMirrorAge, 60000);

    const storedNetState = localStorage.getItem('rsu_eoms_net_disabled');
    if (storedNetState === 'true' && firestore) {
        disableNetwork(firestore);
        setIsNetworkDisabled(true);
    }

    return () => clearInterval(interval);
  }, [firestore, MIRROR_EXPIRY_MS]);

  const handleDownloadForOffline = async () => {
    if (!firestore || !user || !isOnline) return;

    setIsDownloading(true);
    setDownloadProgress('Initializing institutional handshake...');

    try {
        setDownloadProgress('Mirroring standard clauses & site directory...');
        await getDocs(collection(firestore, 'isoClauses'));
        await getDocs(collection(firestore, 'units'));
        await getDocs(collection(firestore, 'campuses'));
        await getDoc(doc(firestore, 'system', 'signatories'));

        setDownloadProgress('Mirroring institutional audit logs & pools...');
        const schedSnap = await getDocs(collection(firestore, 'auditSchedules'));
        const allScheds = schedSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        
        if (isAdmin) {
            await getDocs(collection(firestore, 'activityLogs'));
        }

        const filteredScheds = selectedSite === 'university-wide' 
            ? allScheds 
            : allScheds.filter((s: any) => s.campusId === selectedSite);

        for (const s of filteredScheds) {
            setDownloadProgress(`Locking Session: ${s.targetName}`);
            await getDoc(doc(firestore, 'auditSchedules', s.id));
            
            if (s.auditPlanId) await getDoc(doc(firestore, 'auditPlans', s.auditPlanId));
            await getDocs(query(collection(firestore, 'auditFindings'), where('auditScheduleId', '==', s.id)));
            if (s.targetId) {
                await getDocs(query(collection(firestore, 'correctiveActionRequests'), where('unitId', '==', s.targetId)));
            }

            const rscUrl = `/audit/${s.id}`;
            try {
                await fetch(rscUrl, { headers: { 'RSC': '1' }, cache: 'force-cache' });
                await fetch(rscUrl, { cache: 'force-cache' });
            } catch (e) {}
        }

        const coreRoutes = ['/dashboard', '/audit', '/activity-log', '/profile', '/audit-log'];
        for (const route of coreRoutes) {
            setDownloadProgress(`Caching Module Logic: ${route}`);
            try {
                await fetch(route, { headers: { 'RSC': '1' }, cache: 'force-cache' });
                await fetch(route, { cache: 'force-cache' });
            } catch (e) {}
        }

        const now = new Date();
        setLastDownload(now);
        setMirrorStatus('found');
        localStorage.setItem('rsu_last_mirror_time', now.toISOString());
        localStorage.setItem('rsu_offline_site_lock', selectedSite);

        toast({ 
            title: 'Deep Mirror Complete', 
            description: selectedSite === 'university-wide' 
                ? 'Full institutional pool and all potential conduct pages are now locked.' 
                : `Registry for ${campuses?.find(c => c.id === selectedSite)?.name} is locked and ready for offline use.`
        });
    } catch (e) {
        console.error("Mirroring error:", e);
        toast({ title: 'Mirror Failed', description: 'Institutional handshake interrupted.', variant: 'destructive' });
    } finally {
        setIsDownloading(false);
        setDownloadProgress('');
    }
  };

  const handleSearchMirror = async () => {
    if (!firestore) return;
    setIsScanning(true);
    try {
        const unitsRef = collection(firestore, 'units');
        await getDocsFromCache(query(unitsRef, limit(1)));
        const storedTime = localStorage.getItem('rsu_last_mirror_time');
        if (storedTime) {
            const date = new Date(storedTime);
            setLastDownload(date);
            const diff = Date.now() - date.getTime();
            setMirrorStatus(diff > MIRROR_EXPIRY_MS ? 'expired' : 'found');
            toast({ title: diff > MIRROR_EXPIRY_MS ? 'Outdated Cache Detected' : 'Mirror Verified' });
        } else {
            setMirrorStatus('none');
            toast({ title: 'No Local Mirror Detected', variant: 'destructive' });
        }
    } catch (e) { setMirrorStatus('none'); } finally { setIsScanning(false); }
  };

  const handleExportWorkspace = async () => {
    if (!firestore || mirrorStatus === 'none') {
        toast({ title: "Export Blocked", description: "Create a local mirror before exporting.", variant: "destructive" });
        return;
    }
    setIsExporting(true);
    try {
        const collections = ['isoClauses', 'units', 'campuses', 'auditPlans', 'auditSchedules', 'auditFindings', 'risks', 'correctiveActionRequests', 'activityLogs'];
        const packageData: Record<string, any[]> = {};
        for (const colName of collections) {
            const snap = await getDocsFromCache(collection(firestore, colName));
            packageData[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        const blob = new Blob([JSON.stringify({ version: '2.5', exportedAt: new Date().toISOString(), data: packageData, siteLock: selectedSite })], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RSU_EOMS_Mirror_${format(new Date(), 'yyyyMMdd_HHmm')}.eoms`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: 'Workspace Exported', description: 'Portable offline mirror is ready.' });
    } catch (e) { toast({ title: 'Export Failed', variant: 'destructive' }); } finally { setIsExporting(false); }
  };

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
            localStorage.setItem('rsu_last_mirror_time', content.exportedAt || new Date().toISOString());
            if (content.siteLock) {
                localStorage.setItem('rsu_offline_site_lock', content.siteLock);
                setSelectedSite(content.siteLock);
            }
            setMirrorStatus('found');
            setLastDownload(new Date(content.exportedAt || Date.now()));
            toast({ title: 'Workspace Imported', description: 'Local database updated from file.' });
            router.refresh();
        } catch (err) { toast({ title: 'Import Error', variant: 'destructive' }); } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };

  const toggleNetworkLock = async (forceOffline: boolean) => {
      if (!firestore) return;
      if (forceOffline && isOnline && mirrorStatus === 'expired') {
          toast({ variant: "destructive", title: "Mandatory Refresh", description: "Your mirror is expired. You must synchronize while online before locking." });
          return;
      }
      if (forceOffline) {
          await disableNetwork(firestore);
          setIsNetworkDisabled(true);
          localStorage.setItem('rsu_eoms_net_disabled', 'true');
          toast({ title: 'System Locked: Offline Mode' });
      } else {
          setIsSyncing(true);
          try {
              await enableNetwork(firestore);
              await waitForPendingWrites(firestore);
              setIsNetworkDisabled(false);
              localStorage.setItem('rsu_eoms_net_disabled', 'false');
              toast({ title: 'Cloud Connectivity Restored' });
          } catch(e) { toast({ title: 'Cloud Sync Delay', variant: 'destructive' }); } finally { setIsSyncing(false); }
      }
  };

  const overlayContent = (isDownloading && mounted) ? (
    <div 
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl p-4 pointer-events-auto cursor-wait select-none"
        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onKeyDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
        <Card className="w-full max-w-xl border-destructive border-4 shadow-[0_0_50px_rgba(255,0,0,0.3)] bg-white scale-110">
            <CardHeader className="text-center space-y-4 pb-2 bg-destructive/10 border-b-2 border-destructive">
                <div className="mx-auto h-24 w-24 rounded-full bg-destructive flex items-center justify-center text-white animate-pulse">
                    <ShieldAlert className="h-12 w-12" />
                </div>
                <CardTitle className="text-3xl font-black uppercase text-destructive animate-emergency-flash">DEEP APPLICATION MIRRORING ACTIVE</CardTitle>
            </CardHeader>
            <CardContent className="pt-8 px-10 pb-10 space-y-8">
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-black text-primary uppercase">
                        <span>{downloadProgress}</span>
                        <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                    <Progress value={undefined} className="h-3" />
                </div>
                <p className="text-[11px] font-bold leading-relaxed text-center text-destructive uppercase">
                    STRICT ISOLATION: ALL INTERACTIONS BLOCKED WHILE LOCKING APPLICATION CODE AND INSTITUTIONAL REGISTRY INTO LOCAL STORAGE.
                </p>
            </CardContent>
        </Card>
    </div>
  ) : null;

  return (
    <>
    {overlayContent && createPortal(overlayContent, document.body)}

    <Card className="border-primary/20 bg-primary/5 shadow-xl overflow-hidden">
      <CardHeader className="bg-primary/10 border-b py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Powerful Workspace Control Hub
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Mirror institutional data and application code for 100% offline stability.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
                <Badge variant={mirrorStatus === 'found' ? 'default' : mirrorStatus === 'expired' ? 'destructive' : 'outline'} className={cn("h-7 px-3 font-black uppercase text-[9px] gap-2 shadow-sm", mirrorStatus === 'found' ? "bg-emerald-600 text-white" : mirrorStatus === 'expired' ? "bg-amber-50 text-white" : "bg-white text-muted-foreground")}>
                    {mirrorStatus === 'found' ? <CheckCircle2 className="h-3.5 w-3.5" /> : mirrorStatus === 'expired' ? <Clock className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5 opacity-40" />}
                    {mirrorStatus === 'found' ? 'Registry Mirror Ready' : mirrorStatus === 'expired' ? 'Mirror Expired' : 'No Local Mirror'}
                </Badge>
                <Badge variant={isNetworkDisabled ? 'destructive' : 'outline'} className={cn("h-7 px-3 font-black uppercase text-[9px] gap-2", isNetworkDisabled ? "bg-rose-600 text-white border-none" : "bg-white text-primary border-primary/20")}>
                    {isNetworkDisabled ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    {isNetworkDisabled ? 'Network Locked' : 'Online Sync active'}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="h-8 px-3 text-[10px] font-black uppercase text-primary hover:bg-primary/10 border border-primary/10">
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 mr-1.5" /> : <ChevronDown className="h-3.5 w-3.5 mr-1.5" />}
                    {isExpanded ? 'Hide Hub' : 'Manage Workspace'}
                </Button>
            </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
          <CardContent className="p-6 animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="p-5 rounded-2xl bg-white border border-primary/20 shadow-sm space-y-4">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <h4 className="text-xs font-black uppercase text-slate-800">1. Selective Site Mirroring</h4>
                            <p className="text-[10px] text-muted-foreground italic">Sync: {lastDownload ? format(lastDownload, 'PP p') : 'Never'}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleSearchMirror} disabled={isScanning || isDownloading} className="h-8 px-3 font-black uppercase text-[9px] bg-white border-primary/20 text-primary gap-1.5">
                            {isScanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                            Scan
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase text-slate-500">Scope Context Selection</Label>
                        <Select value={selectedSite} onValueChange={setSelectedSite} disabled={isDownloading || isNetworkDisabled}>
                            <SelectTrigger className="h-10 font-bold bg-slate-50 border-primary/10">
                                <SelectValue placeholder="Select Scope" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="university-wide" className="font-bold text-primary">
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-3.5 w-3.5" />
                                        University-Wide (Institutional)
                                    </div>
                                </SelectItem>
                                {campuses?.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        <div className="flex items-center gap-2">
                                            <School className="h-3.5 w-3.5" />
                                            {c.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {isOnline && mirrorStatus === 'expired' && !isNetworkDisabled && (
                        <Alert variant="destructive" className="bg-rose-50 border-rose-200 py-3">
                            <AlertTitle className="text-[9px] font-black uppercase flex items-center gap-2">
                                <AlertTriangle className="h-3 w-3" />
                                Outdated Cache Detected
                            </AlertTitle>
                            <AlertDescription className="text-[10px] font-medium mt-1 leading-tight">
                                Workspace mirror is older than 2 hours. Refresh required before locking network.
                            </AlertDescription>
                        </Alert>
                    )}
                    <Button onClick={handleDownloadForOffline} disabled={!isOnline || isDownloading || isNetworkDisabled} className={cn("w-full h-10 font-black uppercase text-[10px] gap-2", isOnline && mirrorStatus === 'expired' && "bg-amber-600 hover:bg-amber-700")}>
                        {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                        {mirrorStatus === 'found' ? 'REFRESH INSTITUTIONAL MIRROR' : 'START DEEP MIRRORING'}
                    </Button>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-indigo-100 shadow-sm space-y-4">
                    <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase text-slate-800">2. Smart Connectivity Lock</h4>
                        <p className="text-[10px] text-muted-foreground italic">Bypass unstable Wi-Fi.</p>
                    </div>
                    {isNetworkDisabled ? (
                        <Button variant="outline" onClick={() => toggleNetworkLock(false)} disabled={!isOnline || isSyncing} className="w-full h-10 border-indigo-200 text-indigo-700 font-black uppercase text-[10px] hover:bg-indigo-50">
                            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />}
                            SYNC & UNLOCK REGISTRY
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={() => toggleNetworkLock(true)} disabled={isOnline && mirrorStatus === 'expired'} className="w-full h-10 border-rose-200 text-rose-600 font-black uppercase text-[10px] hover:bg-rose-50">
                            <CloudOff className="mr-2 h-4 w-4" />
                            {isOnline && mirrorStatus === 'expired' ? 'REFRESH REQUIRED' : 'LOCK TO OFFLINE MODE'}
                        </Button>
                    )}
                    <div className="p-2 bg-muted/20 rounded-lg border border-dashed text-[9px] text-muted-foreground leading-tight font-medium italic">Forces the portal to rely purely on the local disk cache.</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-blue-100 shadow-sm space-y-4">
                    <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase text-slate-800">3. Workspace Portability</h4>
                        <p className="text-[10px] text-muted-foreground italic">Manual database transfer.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={handleExportWorkspace} disabled={isExporting || mirrorStatus === 'none'} className="h-10 border-blue-200 text-blue-700 font-black uppercase text-[10px] shadow-sm"><Share2 className="h-3 w-3 mr-1.5" /> EXPORT</Button>
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="h-10 border-blue-200 text-blue-700 font-black uppercase text-[10px] shadow-sm"><FileUp className="h-3 w-3 mr-1.5" /> IMPORT</Button>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".eoms" onChange={handleImportWorkspace} />
                    </div>
                    <div className="p-2 bg-blue-50/50 rounded-lg border border-blue-100 text-[9px] text-blue-800 italic leading-tight">Transfer your data mirror to a FIELD LAPTOP or DIFFERENT BROWSER via USB.</div>
                </div>
            </div>
          </CardContent>
      )}
    </Card>
    </>
  );
}
