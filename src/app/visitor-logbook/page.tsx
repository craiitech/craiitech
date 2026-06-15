'use client';

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { collection, addDoc, Timestamp, doc, query, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Campus, Unit, SystemSettings } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  Calendar, 
  User, 
  ArrowLeft, 
  CheckCircle2, 
  Building2, 
  HelpCircle,
  Users2,
  Sparkles,
  ClipboardList,
  Maximize2,
  Minimize2,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { getDirectDriveLink } from '@/lib/utils';

export default function VisitorLogbookPage() {
  const { userProfile, isUserLoading, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isOnline = useNetworkStatus();

  const unitRef = useMemoFirebase(() => {
    if (!firestore || !userProfile?.unitId) return null;
    return doc(firestore, 'units', userProfile.unitId);
  }, [firestore, userProfile?.unitId]);

  const campusRef = useMemoFirebase(() => {
    if (!firestore || !userProfile?.campusId) return null;
    return doc(firestore, 'campuses', userProfile.campusId);
  }, [firestore, userProfile?.campusId]);

  const { data: unitDoc } = useDoc<Unit>(unitRef);
  const { data: campusDoc } = useDoc<Campus>(campusRef);

  const systemSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'system', 'settings');
  }, [firestore]);

  const { data: systemSettingsDoc } = useDoc<SystemSettings>(systemSettingsRef);

  const unitCsmSettingsRef = useMemoFirebase(() => {
    if (!firestore || !userProfile?.unitId) return null;
    return doc(firestore, 'unitCsmSettings', userProfile.unitId);
  }, [firestore, userProfile?.unitId]);

  const { data: unitCsmSettingsDoc } = useDoc<any>(unitCsmSettingsRef);

  const getCampusSitePrefix = (campusName: string): string => {
    const nameUpper = campusName.toUpperCase();
    if (/^SITE\s+\d+\s+-/.test(nameUpper)) {
      return nameUpper;
    }
    const match = nameUpper.match(/\bSITE\s+(\d+)\b/);
    if (match) {
      const siteNum = match[1];
      const cleanName = nameUpper.replace(/\bSITE\s+\d+\b/g, '').replace(/^[\s-:]+/, '').trim();
      return `SITE ${siteNum} - ${cleanName}`;
    }
    if (nameUpper.includes('MAIN')) return 'SITE 1 - MAIN CAMPUS';
    if (nameUpper.includes('ROMBLON')) return 'SITE 2 - ROMBLON CAMPUS';
    if (nameUpper.includes('SAN FERNANDO')) return 'SITE 3 - SAN FERNANDO CAMPUS';
    if (nameUpper.includes('CAJIDIOCAN')) return 'SITE 4 - CAJIDIOCAN CAMPUS';
    if (nameUpper.includes('SAN AGUSTIN')) return 'SITE 5 - SAN AGUSTIN CAMPUS';
    if (nameUpper.includes('CALATRAVA')) return 'SITE 6 - CALATRAVA CAMPUS';
    if (nameUpper.includes('SAN JOSE')) return 'SITE 7 - SAN JOSE CAMPUS';
    if (nameUpper.includes('SANTA FE')) return 'SITE 8 - SANTA FE CAMPUS';
    if (nameUpper.includes('SANTA MARIA')) return 'SITE 9 - SANTA MARIA CAMPUS';
    return campusName.toUpperCase();
  };

  const roleLower = userRole?.toLowerCase() || '';
  const isCampusOdimoOrDirector = roleLower.includes('campus director') || roleLower.includes('campus odimo');

  const campusNameStr = campusDoc?.name ? getCampusSitePrefix(campusDoc.name) : '';
  const unitNameStr = isCampusOdimoOrDirector ? "OFFICE OF THE CAMPUS DIRECTOR" : (unitDoc?.name ? unitDoc.name.toUpperCase() : '');

  const officeName = campusNameStr && unitNameStr 
    ? `${campusNameStr} | ${unitNameStr}`
    : (isCampusOdimoOrDirector ? "OFFICE OF THE CAMPUS DIRECTOR" : (userProfile?.unitName || 'our Office'));

  const logoSrc = systemSettingsDoc?.logoUrl 
    ? getDirectDriveLink(systemSettingsDoc.logoUrl) 
    : '/rsulogo.png';

  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [visitorName, setVisitorName] = useState('');
  const [sex, setSex] = useState('');
  const [purpose, setPurpose] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeVisitors, setActiveVisitors] = useState<any[]>([]);
  const [activeVisitorsLoading, setActiveVisitorsLoading] = useState(true);
  const [logoutSuccessVisitorName, setLogoutSuccessVisitorName] = useState<string | null>(null);
  const [localUpdateTrigger, setLocalUpdateTrigger] = useState<number>(0);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [qrUrl, setQrUrl] = useState<string>('');

  // ARTA CSM survey kiosk states
  const [csmLanguage, setCsmLanguage] = useState<'EN' | 'FIL'>('EN');
  const [csmSubmitted, setCsmSubmitted] = useState<boolean>(false);
  const [activeSurveyVisitor, setActiveSurveyVisitor] = useState<any | null>(null);
  const [csmAgeGroup, setCsmAgeGroup] = useState<string>('');
  const [csmClientType, setCsmClientType] = useState<string>('');
  const [csmCC1, setCsmCC1] = useState<number | null>(null);
  const [csmCC2, setCsmCC2] = useState<number | null>(null);
  const [csmCC3, setCsmCC3] = useState<number | null>(null);
  const [csmSQD1, setCsmSQD1] = useState<number>(5);
  const [csmSQD2, setCsmSQD2] = useState<number>(5);
  const [csmSQD3, setCsmSQD3] = useState<number>(5);
  const [csmSQD4, setCsmSQD4] = useState<number>(5);
  const [csmSQD5, setCsmSQD5] = useState<number>(5);
  const [csmSQD6, setCsmSQD6] = useState<number>(5);
  const [csmSQD7, setCsmSQD7] = useState<number>(5);
  const [csmSQD8, setCsmSQD8] = useState<number>(5);
  const [csmComments, setCsmComments] = useState<string>('');
  const [isSubmittingCsm, setIsSubmittingCsm] = useState<boolean>(false);
  const [isKioskMode, setIsKioskMode] = useState<boolean>(false);

  const t: Record<'EN' | 'FIL', any> = {
    EN: {
      profile: "1. Client Profile",
      ageGroup: "Age Group",
      ageUnder: "Below 20",
      ageOver: "65 and above",
      clientType: "Client Type",
      charter: "2. Citizen's Charter (CC)",
      cc1Q: "CC1. Which of the following best describes your awareness of a Citizen's Charter?",
      cc1Opts: [
        "I know what a Citizen's Charter is and I saw this office's charter.",
        "I know what a Citizen's Charter is but I did NOT see this office's charter.",
        "I learned of the Citizen's Charter only when I saw this office's charter.",
        "I do not know what a Citizen's Charter is and I did not see one."
      ],
      cc2Q: "CC2. How visible was the Citizen's Charter in this office?",
      cc2Opts: [
        "Easy to see",
        "Somewhat easy to see",
        "Difficult to see",
        "Not visible at all"
      ],
      cc3Q: "CC3. How much did the Citizen's Charter help you?",
      cc3Opts: [
        "Helped very much",
        "Somewhat helped",
        "Did not help"
      ],
      sqdTitle: "3. Service Quality Dimensions (SQD)",
      sqd1: "SQD1. Responsiveness",
      sqd1D: "I spent a reasonable amount of time for my transaction.",
      sqd2: "SQD2. Reliability",
      sqd2D: "The office followed the transaction's requirements and steps.",
      sqd3: "SQD3. Access & Facilities",
      sqd3D: "The office location was convenient, clean, and comfortable.",
      sqd4: "SQD4. Communication",
      sqd4D: "The staff explained the requirements and steps clearly.",
      sqd5: "SQD5. Costs",
      sqd5D: "The fees paid were just and reasonable (select N/A if transaction was free).",
      sqd6: "SQD6. Integrity",
      sqd6D: "The transaction was clean (no extra payment/corruption experienced).",
      sqd7: "SQD7. Assurance",
      sqd7D: "I felt safe and secure, and the staff was professional/courteous.",
      sqd8: "SQD8. Outcome",
      sqd8D: "I got what I needed from the office (or got a clear explanation).",
      na: "Not Applicable",
      comments: "4. Comments / Suggestions (Optional)",
      commentsPlaceholder: "Share details of your experience or suggestions to improve our service...",
      skip: "Skip Feedback & Logout",
      submit: "Submit Feedback & Logout",
      submitting: "Submitting...",
      incompleteTitle: "Incomplete Survey",
      incompleteDesc: "Please answer the profile and Citizen's Charter questions, or click Skip.",
      thankYouTitle: "Thank You, {name}!",
      thankYouDesc: "We appreciate your feedback!",
      thankYouMessage: "Your satisfaction rating helps us continuously improve our services. Have a safe journey back!",
      helpUs: "Help us improve our service, {name}!"
    },
    FIL: {
      profile: "1. Profile ng Kliyente",
      ageGroup: "Grupo ng Edad",
      ageUnder: "Mababa sa 20",
      ageOver: "65 at pataas",
      clientType: "Uri ng Kliyente",
      charter: "2. Karta ng Mamamayan (Citizen's Charter)",
      cc1Q: "CC1. Alin sa mga sumusunod ang pinakamahusay na naglalarawan sa iyong kaalaman sa Citizen's Charter?",
      cc1Opts: [
        "Alam ko kung ano ang Citizen's Charter at nakita ko ang karta ng tanggapang ito.",
        "Alam ko kung ano ang Citizen's Charter ngunit HINDI ko nakita ang karta ng tanggapang ito.",
        "Nalaman ko ang tungkol sa Citizen's Charter nang makita ko ang karta ng tanggapang ito.",
        "Hindi ko alam kung ano ang Citizen's Charter at wala akong nakitang ganoon."
      ],
      cc2Q: "CC2. Gaano kadaling makita ang Citizen's Charter sa tanggapang ito?",
      cc2Opts: [
        "Madaling makita",
        "Medyo madaling makita",
        "Mahirap makita",
        "Hindi makita kahit kailan"
      ],
      cc3Q: "CC3. Gaano kalaki ang naitulong sa iyo ng Citizen's Charter?",
      cc3Opts: [
        "Napakalaki ng naitulong",
        "Medyo nakatulong",
        "Hindi nakatulong"
      ],
      sqdTitle: "3. Mga Dimensyon ng Kalidad ng Serbisyo (SQD)",
      sqd1: "SQD1. Pagtugon (Responsiveness)",
      sqd1D: "Naglaan ako ng makatwirang oras para sa aking transaksyon.",
      sqd2: "SQD2. Maaasahan (Reliability)",
      sqd2D: "Sinunod ng tanggapan ang mga kinakailangan at hakbang ng transaksyon.",
      sqd3: "SQD3. Pag-access at Pasilidad (Access & Facilities)",
      sqd3D: "Ang lokasyon ng tanggapan ay maginhawa, malinis, at komportable.",
      sqd4: "SQD4. Komunikasyon (Communication)",
      sqd4D: "Malinaw na ipinaliwanag ng mga kawani ang mga kinakailangan at hakbang.",
      sqd5: "SQD5. Gastos (Costs)",
      sqd5D: "Ang mga binayarang bayarin ay makatarungan at makatwiran (piliin ang N/A kung libre).",
      sqd6: "SQD6. Integridad (Integrity)",
      sqd6D: "Malinis ang transaksyon (walang labis na bayad/korapsyon na naranasan).",
      sqd7: "SQD7. Pagtitiyak (Assurance)",
      sqd7D: "Naramdaman kong ligtas ako, at ang mga kawani ay propesyonal at magalang.",
      sqd8: "SQD8. Kinalabasan (Outcome)",
      sqd8D: "Nakuha ko ang kailangan ko mula sa tanggapan (o binigyan ng malinaw na paliwanag).",
      na: "Hindi Angkop (N/A)",
      comments: "4. Mga Komento / Mungkahi (Opsyonal)",
      commentsPlaceholder: "Ibahagi ang mga detalye ng iyong karanasan o mga mungkahi upang mapabuti ang aming serbisyo...",
      skip: "Laktawan at Mag-logout",
      submit: "Isumite ang Feedback at Mag-logout",
      submitting: "Ipinapadala...",
      incompleteTitle: "Hindi Kumpletong Survey",
      incompleteDesc: "Mangyaring sagutin ang profile at mga tanong sa Citizen's Charter, o i-click ang Laktawan.",
      thankYouTitle: "Maraming Salamat, {name}!",
      thankYouDesc: "Pinahahalagahan namin ang iyong feedback!",
      thankYouMessage: "Ang iyong rating sa kasiyahan ay nagtutulong sa amin na patuloy na mapabuti ang aming mga serbisyo. Mag-ingat sa iyong pag-uwi!",
      helpUs: "Tulungan kaming mapabuti ang aming serbisyo, {name}!"
    }
  };

  const getBlinkingField = () => {
    if (!csmAgeGroup) return 'ageGroup';
    if (!csmClientType) return 'clientType';
    if (csmCC1 === null) return 'cc1';
    if ((csmCC1 === 1 || csmCC1 === 3) && csmCC2 === null) return 'cc2';
    if ((csmCC1 === 1 || csmCC1 === 3) && csmCC3 === null) return 'cc3';
    return null;
  };


  // Monitor fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Intercept and prevent Escape key from exiting fullscreen (e.g. in Electron/supported wrappers)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  // Enter fullscreen automatically on first user gesture if requested via query param
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const shouldAutoFullscreen = searchParams.get('fullscreen') === 'true';
      setIsKioskMode(shouldAutoFullscreen);

      if (shouldAutoFullscreen) {
        const enterFS = () => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
              console.warn('Auto-fullscreen failed:', err);
            });
          }
          events.forEach(event => window.removeEventListener(event, enterFS));
        };
        const events = ['click', 'touchstart', 'focusin', 'keydown'];
        events.forEach(event => window.addEventListener(event, enterFS, { passive: true }));
        return () => {
          events.forEach(event => window.removeEventListener(event, enterFS));
        };
      }
    }
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Error toggling fullscreen:', err);
    }
  };

  // Update clock every second
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Generate QR code URL on client side to avoid SSR window mismatch and image optimization issues
  useEffect(() => {
    if (typeof window !== 'undefined' && userProfile) {
      const officeNameStr = isCampusOdimoOrDirector 
        ? "OFFICE OF THE CAMPUS DIRECTOR" 
        : (unitDoc?.name || userProfile.unitName || 'Office');
        
      const fullUrl = `${window.location.origin}/visitor-logbook/mobile?unitId=${userProfile.unitId || 'N/A'}&campusId=${userProfile.campusId || 'N/A'}&unitName=${encodeURIComponent(officeNameStr)}`;
      
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(fullUrl)}`);
    }
  }, [userProfile, unitDoc, isCampusOdimoOrDirector]);

  // Form Reset timer on success
  useEffect(() => {
    if (submitSuccess) {
      const resetTimer = setTimeout(() => {
        setSubmitSuccess(false);
        setVisitorName('');
        setSex('');
        setPurpose('');
        setLookingFor('');
        setSelectedService('');
      }, 4000);
      return () => clearTimeout(resetTimer);
    }
  }, [submitSuccess]);

  // Real-time active visitors subscriber
  useEffect(() => {
    if (!firestore || !userProfile?.unitId) {
      setActiveVisitors([]);
      setActiveVisitorsLoading(false);
      return;
    }

    setActiveVisitorsLoading(true);
    const q = query(
      collection(firestore, 'visitorLogs'),
      where('unitId', '==', userProfile.unitId),
      where('isLoggedOut', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort in-memory by arrival time (createdAt) ascending
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeA - timeB;
      });
      setActiveVisitors(list);
      setActiveVisitorsLoading(false);
    }, (error) => {
      console.error("Error fetching active visitors:", error);
      setActiveVisitorsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, userProfile?.unitId]);

  // Merge Firestore active visitors with local offline pending ones
  const displayedActiveVisitors = useMemo(() => {
    const localLogs = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('rsu_offline_visitor_logs') || '[]')
      : [];
    
    const localLogouts = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('rsu_offline_visitor_logouts') || '[]')
      : [];

    const loggedOutIds = new Set(localLogouts.map((l: any) => l.visitorId));
    
    const filteredOnlineActive = activeVisitors.filter(v => !loggedOutIds.has(v.id));
    const localActive = localLogs.filter((log: any) => !log.isLoggedOut);

    const merged = [...filteredOnlineActive];
    localActive.forEach((localLog: any) => {
      if (!merged.some(v => v.id === localLog.id) && !loggedOutIds.has(localLog.id)) {
        merged.push(localLog);
      }
    });

    return merged.sort((a, b) => {
      const timeA = a.createdAt?.seconds || (typeof a.createdAt === 'number' ? a.createdAt / 1000 : 0);
      const timeB = b.createdAt?.seconds || (typeof b.createdAt === 'number' ? b.createdAt / 1000 : 0);
      return timeA - timeB;
    });
  }, [activeVisitors, localUpdateTrigger]);

  const offlineLogoutsList = useMemo(() => {
    if (typeof window === 'undefined') return [];
    
    const localLogouts = JSON.parse(localStorage.getItem('rsu_offline_visitor_logouts') || '[]');
    const localLogs = JSON.parse(localStorage.getItem('rsu_offline_visitor_logs') || '[]');
    const localCheckedOut = localLogs.filter((l: any) => l.isLoggedOut && !l.synced);
    
    const combined = [
      ...localLogouts.map((l: any) => ({
        visitorId: l.visitorId,
        visitorName: l.visitorName,
        loggedOutAt: l.loggedOutAt
      })),
      ...localCheckedOut.map((l: any) => ({
        visitorId: l.id,
        visitorName: l.name,
        loggedOutAt: l.loggedOutAt
      }))
    ];
    
    return combined.sort((a, b) => b.loggedOutAt - a.loggedOutAt);
  }, [localUpdateTrigger]);

  // Recalculate pending sync count
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const logs = JSON.parse(localStorage.getItem('rsu_offline_visitor_logs') || '[]').filter((l: any) => !l.synced).length;
      const csms = JSON.parse(localStorage.getItem('rsu_offline_csm_responses') || '[]').filter((c: any) => !c.synced).length;
      const logouts = JSON.parse(localStorage.getItem('rsu_offline_visitor_logouts') || '[]').length;
      setPendingSyncCount(logs + csms + logouts);
    }
  }, [localUpdateTrigger, isOnline]);

  // Sync offline data to Firestore when online
  const syncOfflineData = async () => {
    if (!firestore || !isOnline) return;

    const localLogs = JSON.parse(localStorage.getItem('rsu_offline_visitor_logs') || '[]');
    const localCsms = JSON.parse(localStorage.getItem('rsu_offline_csm_responses') || '[]');
    const localLogouts = JSON.parse(localStorage.getItem('rsu_offline_visitor_logouts') || '[]');

    if (localLogs.length === 0 && localCsms.length === 0 && localLogouts.length === 0) return;

    console.log(`Syncing offline data: ${localLogs.length} logs, ${localCsms.length} CSMs, ${localLogouts.length} logouts`);

    const idMap: Record<string, string> = {};
    const updatedLogs = [...localLogs];

    // 1. Sync Visitor Logs
    for (let i = 0; i < localLogs.length; i++) {
      const log = localLogs[i];
      if (log.synced) continue;

      try {
        const { id, synced, firestoreId, ...payload } = log;
        
        // Convert Milliseconds back to Timestamp
        if (payload.createdAt) {
          payload.createdAt = Timestamp.fromMillis(Number(payload.createdAt));
        }
        if (payload.loggedOutAt) {
          payload.loggedOutAt = Timestamp.fromMillis(Number(payload.loggedOutAt));
        }

        const docRef = await addDoc(collection(firestore, 'visitorLogs'), payload);
        idMap[id] = docRef.id;
        log.synced = true;
        log.firestoreId = docRef.id;
      } catch (err) {
        console.error("Failed to sync log:", log, err);
      }
    }

    // 2. Sync CSM Responses
    const updatedCsms = [...localCsms];
    for (let i = 0; i < localCsms.length; i++) {
      const csm = localCsms[i];
      if (csm.synced) continue;

      try {
        const { id, synced, ...payload } = csm;
        
        if (payload.visitorLogId && payload.visitorLogId.startsWith('local_')) {
          const mappedId = idMap[payload.visitorLogId];
          if (mappedId) {
            payload.visitorLogId = mappedId;
          } else {
            const matchingLog = localLogs.find((l: any) => l.id === payload.visitorLogId);
            if (matchingLog && matchingLog.firestoreId) {
              payload.visitorLogId = matchingLog.firestoreId;
            }
          }
        }

        if (payload.createdAt) {
          payload.createdAt = Timestamp.fromMillis(Number(payload.createdAt));
        }

        await addDoc(collection(firestore, 'csmResponses'), payload);
        csm.synced = true;
      } catch (err) {
        console.error("Failed to sync CSM response:", csm, err);
      }
    }

    // 3. Sync Logouts for existing online logs
    const remainingLogouts = [];
    for (const logout of localLogouts) {
      try {
        const timeVal = Timestamp.fromMillis(Number(logout.loggedOutAt));
        await updateDoc(doc(firestore, 'visitorLogs', logout.visitorId), {
          isLoggedOut: true,
          loggedOutAt: timeVal
        });
      } catch (err) {
        console.error("Failed to sync logout for visitor:", logout, err);
        remainingLogouts.push(logout);
      }
    }

    // Filter out synced items
    const cleanLogs = updatedLogs.filter((log: any) => !log.synced);
    const cleanCsms = updatedCsms.filter((csm: any) => !csm.synced);

    localStorage.setItem('rsu_offline_visitor_logs', JSON.stringify(cleanLogs));
    localStorage.setItem('rsu_offline_csm_responses', JSON.stringify(cleanCsms));
    localStorage.setItem('rsu_offline_visitor_logouts', JSON.stringify(remainingLogouts));

    toast({
      title: "Data Synchronized",
      description: "Offline logs and surveys have been uploaded and synced with the database.",
    });

    setLocalUpdateTrigger(prev => prev + 1);
  };

  // Sync effect when status changes to online
  useEffect(() => {
    if (isOnline && firestore) {
      syncOfflineData();
    }
  }, [isOnline, firestore]);

  // Periodic sync check when online
  useEffect(() => {
    if (!firestore) return;
    const interval = setInterval(() => {
      if (isOnline) {
        syncOfflineData();
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [isOnline, firestore]);

  // Logout Success auto-reset effect
  useEffect(() => {
    if (logoutSuccessVisitorName) {
      const timer = setTimeout(() => {
        setLogoutSuccessVisitorName(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [logoutSuccessVisitorName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !userProfile) return;

    if (!visitorName.trim() || !sex || !purpose.trim() || !lookingFor.trim()) {
      toast({
        title: 'Missing Details',
        description: 'Please complete all required fields (including selecting your sex).',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const logPayload = {
        name: visitorName.trim(),
        sex: sex,
        purpose: purpose.trim(),
        lookingFor: lookingFor.trim(),
        unitId: userProfile.unitId || 'N/A',
        campusId: userProfile.campusId || 'N/A',
        unitName: isCampusOdimoOrDirector ? "OFFICE OF THE CAMPUS DIRECTOR" : (unitDoc?.name || userProfile.unitName || 'Office'),
        createdAt: Date.now(),
        isLoggedOut: false,
        loggedOutAt: null,
      };

      if (isOnline) {
        // Write to Firestore with a 3-second timeout protection
        const writePromise = addDoc(collection(firestore, 'visitorLogs'), {
          ...logPayload,
          createdAt: Timestamp.now()
        });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));

        await Promise.race([writePromise, timeoutPromise]);
        
        toast({
          title: 'Entry Recorded',
          description: `Welcome to our office, ${visitorName}!`,
        });
      } else {
        // Offline Mode: store locally in LocalStorage
        const localLogs = JSON.parse(localStorage.getItem('rsu_offline_visitor_logs') || '[]');
        const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localLogs.push({ id: localId, ...logPayload, synced: false });
        localStorage.setItem('rsu_offline_visitor_logs', JSON.stringify(localLogs));

        toast({
          title: 'Entry Recorded (Offline Mode)',
          description: `Welcome, ${visitorName}! Saved to local storage.`,
        });
        setLocalUpdateTrigger(prev => prev + 1);
      }

      setSubmitSuccess(true);
    } catch (error) {
      console.warn('Online write failed or timed out, saving locally instead:', error);
      
      // Fallback: store locally in LocalStorage
      const logPayload = {
        name: visitorName.trim(),
        sex: sex,
        purpose: purpose.trim(),
        lookingFor: lookingFor.trim(),
        unitId: userProfile.unitId || 'N/A',
        campusId: userProfile.campusId || 'N/A',
        unitName: isCampusOdimoOrDirector ? "OFFICE OF THE CAMPUS DIRECTOR" : (unitDoc?.name || userProfile.unitName || 'Office'),
        createdAt: Date.now(),
        isLoggedOut: false,
        loggedOutAt: null,
      };

      const localLogs = JSON.parse(localStorage.getItem('rsu_offline_visitor_logs') || '[]');
      const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localLogs.push({ id: localId, ...logPayload, synced: false });
      localStorage.setItem('rsu_offline_visitor_logs', JSON.stringify(localLogs));

      toast({
        title: 'Entry Recorded (Local Storage)',
        description: `Welcome, ${visitorName}! Saved to local storage.`,
      });
      setLocalUpdateTrigger(prev => prev + 1);
      setSubmitSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoutVisitor = (visitor: any) => {
    setActiveSurveyVisitor(visitor);
    setCsmLanguage('EN');
    setCsmSubmitted(false);
    setCsmAgeGroup('');
    setCsmClientType('');
    setCsmCC1(null);
    setCsmCC2(null);
    setCsmCC3(null);
    setCsmSQD1(5);
    setCsmSQD2(5);
    setCsmSQD3(5);
    setCsmSQD4(5);
    setCsmSQD5(5);
    setCsmSQD6(5);
    setCsmSQD7(5);
    setCsmSQD8(5);
    setCsmComments('');
  };

  const submitCsmCheckout = async (skip = false) => {
    if (!firestore || !activeSurveyVisitor) return;
    setIsSubmittingCsm(true);
    try {
      const visitorId = activeSurveyVisitor.id;
      const visitorName = activeSurveyVisitor.name;
      const isLocalVisitor = visitorId.startsWith('local_');

      let csmPayload: any = null;

      if (!skip) {
        if (!csmAgeGroup || !csmClientType || csmCC1 === null) {
          toast({
            title: t[csmLanguage].incompleteTitle,
            description: t[csmLanguage].incompleteDesc,
            variant: 'destructive',
          });
          setIsSubmittingCsm(false);
          return;
        }

        csmPayload = {
          visitorLogId: visitorId,
          visitorName: visitorName,
          sex: activeSurveyVisitor.sex || 'N/A',
          ageGroup: csmAgeGroup,
          clientType: csmClientType,
          campusId: activeSurveyVisitor.campusId || userProfile?.campusId || 'N/A',
          unitId: activeSurveyVisitor.unitId || 'N/A',
          unitName: activeSurveyVisitor.unitName || 'Office',
          purpose: activeSurveyVisitor.purpose || 'N/A',
          
          cc1: Number(csmCC1),
          cc2: csmCC2 !== null ? Number(csmCC2) : 5,
          cc3: csmCC3 !== null ? Number(csmCC3) : 4,
          
          sqd1: Number(csmSQD1),
          sqd2: Number(csmSQD2),
          sqd3: Number(csmSQD3),
          sqd4: Number(csmSQD4),
          sqd5: Number(csmSQD5),
          sqd6: Number(csmSQD6),
          sqd7: Number(csmSQD7),
          sqd8: Number(csmSQD8),
          
          comments: csmComments.trim(),
          createdAt: Date.now(),
        };
      }

      if (isOnline && !isLocalVisitor) {
        // Online write with 3-second timeout protection
        const checkoutPromises = [];
        
        if (!skip && csmPayload) {
          checkoutPromises.push(addDoc(collection(firestore, 'csmResponses'), {
            ...csmPayload,
            createdAt: Timestamp.now()
          }));
        }

        checkoutPromises.push(updateDoc(doc(firestore, 'visitorLogs', visitorId), {
          isLoggedOut: true,
          loggedOutAt: Timestamp.now(),
        }));

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));

        await Promise.race([Promise.all(checkoutPromises), timeoutPromise]);

        toast({
          title: skip ? 'Visitor Logged Out' : 'Feedback Submitted & Checked Out',
          description: skip 
            ? `${visitorName} has logged out successfully.` 
            : `Thank you for completing the survey, ${visitorName}!`,
        });
      } else {
        // Offline Mode or Local Visitor
        if (!skip && csmPayload) {
          const localCsms = JSON.parse(localStorage.getItem('rsu_offline_csm_responses') || '[]');
          localCsms.push({ id: `csm_${Date.now()}`, ...csmPayload, synced: false });
          localStorage.setItem('rsu_offline_csm_responses', JSON.stringify(localCsms));
        }

        if (isLocalVisitor) {
          const localLogs = JSON.parse(localStorage.getItem('rsu_offline_visitor_logs') || '[]');
          const idx = localLogs.findIndex((l: any) => l.id === visitorId);
          if (idx !== -1) {
            localLogs[idx].isLoggedOut = true;
            localLogs[idx].loggedOutAt = Date.now();
            localStorage.setItem('rsu_offline_visitor_logs', JSON.stringify(localLogs));
          }
        } else {
          const localLogouts = JSON.parse(localStorage.getItem('rsu_offline_visitor_logouts') || '[]');
          localLogouts.push({ visitorId, visitorName, loggedOutAt: Date.now() });
          localStorage.setItem('rsu_offline_visitor_logouts', JSON.stringify(localLogouts));
        }

        toast({
          title: skip ? 'Visitor Logged Out (Offline Mode)' : 'Feedback Saved (Offline Mode)',
          description: skip 
            ? `${visitorName} logged out locally (will sync when online).` 
            : `Thank you, ${visitorName}! Feedback saved locally.`,
        });
        setLocalUpdateTrigger(prev => prev + 1);
      }

      setCsmSubmitted(!skip);
      setLogoutSuccessVisitorName(visitorName);
      setActiveSurveyVisitor(null);
    } catch (error) {
      console.warn('Online checkout failed or timed out, saving locally:', error);
      
      // Fallback
      const visitorId = activeSurveyVisitor.id;
      const visitorName = activeSurveyVisitor.name;
      const isLocalVisitor = visitorId.startsWith('local_');

      if (!skip) {
        const csmPayload = {
          visitorLogId: visitorId,
          visitorName: visitorName,
          sex: activeSurveyVisitor.sex || 'N/A',
          ageGroup: csmAgeGroup,
          clientType: csmClientType,
          campusId: activeSurveyVisitor.campusId || userProfile?.campusId || 'N/A',
          unitId: activeSurveyVisitor.unitId || 'N/A',
          unitName: activeSurveyVisitor.unitName || 'Office',
          purpose: activeSurveyVisitor.purpose || 'N/A',
          cc1: Number(csmCC1),
          cc2: csmCC2 !== null ? Number(csmCC2) : 5,
          cc3: csmCC3 !== null ? Number(csmCC3) : 4,
          sqd1: Number(csmSQD1),
          sqd2: Number(csmSQD2),
          sqd3: Number(csmSQD3),
          sqd4: Number(csmSQD4),
          sqd5: Number(csmSQD5),
          sqd6: Number(csmSQD6),
          sqd7: Number(csmSQD7),
          sqd8: Number(csmSQD8),
          comments: csmComments.trim(),
          createdAt: Date.now(),
        };

        const localCsms = JSON.parse(localStorage.getItem('rsu_offline_csm_responses') || '[]');
        localCsms.push({ id: `csm_${Date.now()}`, ...csmPayload, synced: false });
        localStorage.setItem('rsu_offline_csm_responses', JSON.stringify(localCsms));
      }

      if (isLocalVisitor) {
        const localLogs = JSON.parse(localStorage.getItem('rsu_offline_visitor_logs') || '[]');
        const idx = localLogs.findIndex((l: any) => l.id === visitorId);
        if (idx !== -1) {
          localLogs[idx].isLoggedOut = true;
          localLogs[idx].loggedOutAt = Date.now();
          localStorage.setItem('rsu_offline_visitor_logs', JSON.stringify(localLogs));
        }
      } else {
        const localLogouts = JSON.parse(localStorage.getItem('rsu_offline_visitor_logouts') || '[]');
        localLogouts.push({ visitorId, visitorName, loggedOutAt: Date.now() });
        localStorage.setItem('rsu_offline_visitor_logouts', JSON.stringify(localLogouts));
      }

      toast({
        title: skip ? 'Visitor Logged Out (Offline Mode)' : 'Feedback Saved (Offline Mode)',
        description: skip 
          ? `${visitorName} logged out. Sync pending.` 
          : `Thank you, ${visitorName}! Saved to local storage.`,
      });
      setLocalUpdateTrigger(prev => prev + 1);

      setCsmSubmitted(!skip);
      setLogoutSuccessVisitorName(visitorName);
      setActiveSurveyVisitor(null);
    } finally {
      setIsSubmittingCsm(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0d2a18]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative h-16 w-16 rounded-full border-4 border-[#D4AF37] border-t-transparent animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Loading Terminal...</p>
        </div>
      </div>
    );
  }

  // officeName is dynamically defined above

  return (
    <div className="relative min-h-screen w-full bg-[#0d2a18] bg-radial-gradient flex flex-col justify-between overflow-y-auto xl:overflow-hidden p-4 md:p-6 lg:p-8">
      {/* Decorative shimmers */}
      <div className="absolute top-0 -left-1/4 w-[600px] h-[600px] bg-[#1B6535]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-1/4 w-[600px] h-[600px] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top action bar: Return to dashboard */}
      <div className="w-full flex justify-between items-center z-10">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#D4AF37]/70 hover:text-[#D4AF37] transition-all bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-[#D4AF37]/20"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </Link>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#D4AF37]/70 hover:text-[#D4AF37] transition-all bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-[#D4AF37]/20 shadow-lg active:scale-95"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </button>

          {pendingSyncCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-500 text-slate-950 px-4 py-1.5 rounded-full shadow-lg border border-amber-400 animate-pulse">
              <div className="h-2 w-2 rounded-full bg-slate-950 animate-ping" />
              <span className="text-[9px] font-black uppercase tracking-widest">
                {pendingSyncCount} Sync Pending
              </span>
            </div>
          )}

          <div className={`flex items-center gap-2 border px-4 py-1.5 rounded-full shadow-lg transition-all duration-300 ${
            isOnline 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-bounce'}`} />
            <span className="text-[9px] font-black uppercase tracking-widest">
              {isOnline ? 'Online' : 'Offline (Saves Locally)'}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[#1B6535]/30 border border-[#D4AF37]/20 px-4 py-1.5 rounded-full shadow-lg">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-white/85 uppercase tracking-widest">Kiosk Active</span>
          </div>
        </div>
      </div>

      {/* Main layout wrapper */}
      <div className="flex-1 flex flex-col xl:flex-row items-stretch justify-center gap-6 xl:gap-8 max-w-7xl w-full mx-auto my-4 xl:my-6 z-10 xl:h-[calc(100vh-160px)] xl:min-h-[580px] xl:max-h-[750px]">
        
        {/* Left column: Welcome, date/time info */}
        <div className="w-full xl:w-[28%] flex flex-col justify-between text-center xl:text-left space-y-6 xl:space-y-0 py-2">
          
          {/* Logo and Titles */}
          <div className="space-y-4">
            <div className="flex justify-center xl:justify-start">
              <div className="relative h-20 w-20 md:h-24 md:w-24 transition-all hover:scale-105 duration-300">
                <Image 
                  src={logoSrc} 
                  alt="University Logo" 
                  fill 
                  className="object-contain" 
                  priority
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-[10px] font-black uppercase tracking-widest">
                <Sparkles className="h-3 w-3" /> Romblon State University
              </span>
              <h1 className="text-3xl md:text-4xl font-black uppercase text-white tracking-tight leading-none">
                Visitor <span className="text-[#D4AF37]">Logbook</span>
              </h1>
              <p className="text-sm md:text-base font-bold text-slate-300 leading-snug">
                Welcome to <span className="text-emerald-400 font-extrabold">{officeName}</span>
              </p>
            </div>
          </div>

          {/* Time & Date Widget (unified landscape layout) */}
          {currentTime && (
            <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4 max-w-md mx-auto xl:mx-0">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-[#D4AF37] shrink-0" />
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-[#D4AF37]/80 leading-none">Current Time</p>
                  <p className="text-sm md:text-base font-black text-white tabular-nums mt-1 leading-none">
                    {format(currentTime, 'hh:mm:ss a')}
                  </p>
                </div>
              </div>
              <div className="h-8 w-px bg-white/10 shrink-0" />
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-[#D4AF37] shrink-0" />
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-[#D4AF37]/80 leading-none">Today's Date</p>
                  <p className="text-xs font-black text-white mt-1 leading-none">
                    {format(currentTime, 'EEEE, MMM dd')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* QR Code Mobile Sign In (Compact design) */}
          {userProfile && (
            <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-3xl p-4 shadow-xl space-y-3.5 max-w-md mx-auto xl:mx-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center text-[#D4AF37]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#D4AF37] leading-none">Scan to Sign In</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Use your mobile phone</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="bg-white p-2 rounded-2xl border border-white/15 shadow-inner shrink-0 w-[96px] h-[96px] flex items-center justify-center">
                  {qrUrl ? (
                    <img
                      src={qrUrl}
                      alt="Mobile Sign In QR Code"
                      className="w-[80px] h-[80px] object-contain"
                    />
                  ) : (
                    <div className="w-[80px] h-[80px] flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-[#1B6535]" />
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-left">
                  <p className="text-[11px] font-black uppercase tracking-wide text-white">Sign In on your device</p>
                  <p className="text-[9px] text-slate-300 font-medium leading-relaxed">
                    Scan the QR code to sign in, check out, and submit the survey on your own phone.
                  </p>
                </div>
              </div>
              
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 flex items-start gap-2 text-left">
                <span className="text-amber-400 text-xs leading-none">⚠️</span>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-amber-400 leading-none">Internet Required</p>
                  <p className="text-[8px] text-slate-300 font-medium leading-tight mt-1">
                    Mobile data or office Wi-Fi is required to load the logbook page on your device.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
 
        {/* Middle column: Form Card */}
        <div className="w-full xl:w-[36%] max-w-md flex flex-col h-full justify-stretch">
          <Card className="bg-white border border-[#D4AF37]/20 shadow-2xl rounded-3xl overflow-hidden h-full flex flex-col">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 md:p-5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <ClipboardList className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base font-black uppercase tracking-wider text-slate-800">Sign In</CardTitle>
                  <CardDescription className="text-slate-500 text-[10px] font-bold uppercase mt-0.5">Please log your credentials below</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-5 md:p-6 flex-1 overflow-y-auto min-h-0 flex flex-col justify-center">
              {!submitSuccess ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Visitor Name */}
                  <div className="space-y-2">
                    <Label htmlFor="visitorName" className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Your Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="visitorName"
                        type="text"
                        placeholder="e.g. Juan D. Dela Cruz"
                        value={visitorName}
                        onChange={(e) => setVisitorName(e.target.value)}
                        required
                        className="pl-11 h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Sex Selection */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Sex
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setSex('Male')}
                        className={`h-11 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all active:scale-[0.98] ${
                          sex === 'Male'
                            ? 'bg-[#1B6535] text-white border-[#1B6535] shadow-lg shadow-[#1B6535]/20'
                            : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Male
                      </button>
                      <button
                        type="button"
                        onClick={() => setSex('Female')}
                        className={`h-11 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all active:scale-[0.98] ${
                          sex === 'Female'
                            ? 'bg-[#1B6535] text-white border-[#1B6535] shadow-lg shadow-[#1B6535]/20'
                            : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Female
                      </button>
                    </div>
                  </div>

                  {/* Purpose */}
                  <div className="space-y-4">
                    {unitCsmSettingsDoc?.services && unitCsmSettingsDoc.services.length > 0 ? (
                      <div className="space-y-2 animate-in fade-in duration-300">
                        <Label htmlFor="purposeSelect" className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                          Purpose of Visit
                        </Label>
                        <div className="relative">
                          <HelpCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <select
                            id="purposeSelect"
                            value={selectedService}
                            onChange={(e) => {
                              setSelectedService(e.target.value);
                              if (e.target.value !== 'Others') {
                                setPurpose(e.target.value);
                              } else {
                                setPurpose('');
                              }
                            }}
                            required
                            className="w-full h-12 px-3 pl-11 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all font-bold text-xs uppercase"
                          >
                            <option value="">-- SELECT PURPOSE OF VISIT --</option>
                            {unitCsmSettingsDoc.services.map((svc: string) => (
                              <option key={svc} value={svc}>{svc.toUpperCase()}</option>
                            ))}
                            <option value="Others">OTHERS (PLEASE SPECIFY)</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="purpose" className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                          Purpose of Visit
                        </Label>
                        <div className="relative">
                          <HelpCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="purpose"
                            type="text"
                            placeholder="e.g. Document submission, Meeting, Inquiry"
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            required
                            className="pl-11 h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:border-transparent transition-all"
                          />
                        </div>
                      </div>
                    )}

                    {selectedService === 'Others' && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                        <Label htmlFor="customPurpose" className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                          Please specify your purpose
                        </Label>
                        <div className="relative">
                          <HelpCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="customPurpose"
                            type="text"
                            placeholder="e.g. Document submission, Meeting, Inquiry"
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            required
                            className="pl-11 h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:border-transparent transition-all"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Looking For */}
                  <div className="space-y-2">
                    <Label htmlFor="lookingFor" className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Who are you looking for?
                    </Label>
                    <div className="relative">
                      <Users2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="lookingFor"
                        type="text"
                        placeholder="e.g. Sarah Jane Fallaria, Office Head"
                        value={lookingFor}
                        onChange={(e) => setLookingFor(e.target.value)}
                        required
                        className="pl-11 h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full h-12 bg-gradient-to-r from-[#1B6535] to-[#247e43] hover:from-[#1B6535] hover:to-[#1a5d31] text-white border border-[#D4AF37]/30 hover:border-[#D4AF37]/50 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-[#1B6535]/20 focus-visible:ring-0 active:scale-[0.98] transition-all duration-150"
                  >
                    {isSubmitting ? 'Recording...' : 'Submit Entry'}
                  </Button>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-6 space-y-4 animate-in zoom-in duration-300">
                  <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 border border-emerald-100">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase text-slate-800">Thank You!</h3>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Your visit has been logged.</p>
                  </div>
                  <p className="text-sm font-medium text-slate-600 max-w-xs pt-2">
                    Please take a seat. Staff from <span className="font-bold text-emerald-600">{officeName}</span> will assist you shortly.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right column: Active Visitors Card */}
        <div className="w-full xl:w-[36%] max-w-md flex flex-col h-full justify-stretch gap-4">
          <Card className="bg-white border border-[#D4AF37]/20 shadow-2xl rounded-3xl overflow-hidden flex-1 min-h-0 flex flex-col">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Users2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle className="text-base font-black uppercase tracking-wider text-slate-800">Active Visitors</CardTitle>
                  <CardDescription className="text-slate-500 text-[10px] font-bold uppercase mt-0.5">Currently in the Office</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-4 flex-1 overflow-y-auto min-h-0">
              {activeVisitorsLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="h-6 w-6 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Loading list...</span>
                </div>
              ) : displayedActiveVisitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    <User className="h-6 w-6 opacity-40" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-slate-700">No visitors logged in</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">The visitor queue is currently empty.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedActiveVisitors.map((visitor) => {
                    const timeInStr = visitor.createdAt?.toDate 
                      ? format(visitor.createdAt.toDate(), 'hh:mm a') 
                      : (typeof visitor.createdAt === 'number'
                          ? format(new Date(visitor.createdAt), 'hh:mm a')
                          : 'N/A');
                    return (
                      <div 
                        key={visitor.id} 
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all text-left"
                      >
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{visitor.name}</h4>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            <span>Time-in: <span className="font-mono text-slate-700">{timeInStr}</span></span>
                            <span>&bull;</span>
                            <span className="truncate max-w-[130px]">To Meet: <span className="text-slate-700">{visitor.lookingFor}</span></span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLogoutVisitor(visitor)}
                          className="h-7 px-2.5 text-[9px] font-black uppercase tracking-widest text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 rounded-lg shadow-sm shrink-0"
                        >
                          Logout
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Offline Checked Out Card (Sync Pending) */}
          {offlineLogoutsList.length > 0 && (
            <Card className="bg-[#fffdf5] border border-amber-200/60 shadow-xl rounded-3xl overflow-hidden h-[180px] shrink-0 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
              <CardHeader className="bg-amber-500/5 border-b border-amber-100 p-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                      <Clock className="h-4.5 w-4.5 animate-pulse" />
                    </div>
                    <div>
                      <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-800">Checked Out</CardTitle>
                      <CardDescription className="text-amber-600 text-[9px] font-bold uppercase leading-none mt-0.5">Sync Pending (Offline)</CardDescription>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700">
                    {offlineLogoutsList.length} Pending
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-3 flex-1 overflow-y-auto min-h-0 space-y-2.5">
                {offlineLogoutsList.map((logout: any, index: number) => {
                  const timeOutStr = logout.loggedOutAt 
                    ? format(new Date(logout.loggedOutAt), 'hh:mm a')
                    : 'N/A';
                  return (
                    <div 
                      key={logout.visitorId || index} 
                      className="flex items-center justify-between p-3 rounded-2xl bg-white border border-amber-100/70"
                    >
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-tight">
                          {logout.visitorName || 'Registered Visitor'}
                        </h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Checked out at: <span className="font-mono text-slate-600">{timeOutStr}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-widest">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" /> Syncing
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ARTA CSM Survey Kiosk Overlay */}
      {activeSurveyVisitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-white border border-[#D4AF37]/30 shadow-2xl rounded-3xl p-6 md:p-8 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto text-left space-y-6 animate-in zoom-in-95 duration-300">
            
            {/* Header with Language Toggle */}
            <div className="border-b pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#1B6535]">
                  {csmLanguage === 'EN' ? 'Client Satisfaction Measurement (CSM)' : 'Pagsukat ng Kasiyahan ng Kliyente (CSM)'}
                </h2>
                <p className="text-slate-500 text-sm sm:text-base font-bold uppercase tracking-widest leading-tight">
                  {t[csmLanguage].helpUs.replace('{name}', activeSurveyVisitor.name)}
                </p>
              </div>
              <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setCsmLanguage('EN')}
                  className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all ${
                    csmLanguage === 'EN'
                      ? 'bg-white text-[#1B6535] shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setCsmLanguage('FIL')}
                  className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all ${
                    csmLanguage === 'FIL'
                      ? 'bg-white text-[#1B6535] shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tagalog
                </button>
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-black uppercase text-[#D4AF37] tracking-wider border-b pb-1">
                {t[csmLanguage].profile}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Age Group */}
                <div className={`space-y-2 p-3 rounded-2xl border transition-all ${
                  getBlinkingField() === 'ageGroup' ? 'animate-blink-border' : 'border-transparent'
                }`}>
                  <label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    {t[csmLanguage].ageGroup} <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Below 20', '20-34', '35-49', '50-64', '65 and above'].map(age => (
                      <button
                        key={age}
                        type="button"
                        onClick={() => setCsmAgeGroup(age)}
                        className={`px-4 py-2 rounded-xl border text-sm sm:text-base font-bold uppercase tracking-wide transition-all ${
                          csmAgeGroup === age
                            ? 'bg-[#1B6535] text-white border-[#1B6535] shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {age === 'Below 20' ? t[csmLanguage].ageUnder : age === '65 and above' ? t[csmLanguage].ageOver : age}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Client Type */}
                <div className={`space-y-2 p-3 rounded-2xl border transition-all ${
                  getBlinkingField() === 'clientType' ? 'animate-blink-border' : 'border-transparent'
                }`}>
                  <label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    {t[csmLanguage].clientType} <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Student', 'Parents', 'Government Employees', 'Internal Employees', 'Citizens', 'Others'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCsmClientType(type)}
                        className={`px-4 py-2 rounded-xl border text-sm sm:text-base font-bold uppercase tracking-wide transition-all ${
                          csmClientType === type
                            ? 'bg-[#1B6535] text-white border-[#1B6535] shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Citizen's Charter */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-black uppercase text-[#D4AF37] tracking-wider border-b pb-1">
                {t[csmLanguage].charter}
              </h3>
              
              {/* CC1 */}
              <div className={`space-y-2 p-4 rounded-2xl border transition-all ${
                getBlinkingField() === 'cc1' ? 'animate-blink-border' : 'border-transparent'
              }`}>
                <p className="text-sm sm:text-base font-black text-slate-800">
                  {t[csmLanguage].cc1Q} <span className="text-rose-500">*</span>
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { val: 1, label: t[csmLanguage].cc1Opts[0] },
                    { val: 2, label: t[csmLanguage].cc1Opts[1] },
                    { val: 3, label: t[csmLanguage].cc1Opts[2] },
                    { val: 4, label: t[csmLanguage].cc1Opts[3] }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => {
                        setCsmCC1(opt.val);
                        if (opt.val === 2 || opt.val === 4) {
                          setCsmCC2(5);
                          setCsmCC3(4);
                        } else {
                          setCsmCC2(null);
                          setCsmCC3(null);
                        }
                      }}
                      className={`text-left p-3.5 rounded-xl border text-sm sm:text-base font-bold transition-all ${
                        csmCC1 === opt.val
                          ? 'bg-[#1B6535]/10 text-[#1B6535] border-[#1B6535] font-black'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CC2 & CC3 - only show if CC1 is 1 or 3 */}
              {(csmCC1 === 1 || csmCC1 === 3) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* CC2 */}
                  <div className={`space-y-2 p-3 rounded-2xl border transition-all ${
                    getBlinkingField() === 'cc2' ? 'animate-blink-border' : 'border-transparent'
                  }`}>
                    <p className="text-sm sm:text-base font-black text-slate-800">
                      {t[csmLanguage].cc2Q} <span className="text-rose-500">*</span>
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        { val: 1, label: t[csmLanguage].cc2Opts[0] },
                        { val: 2, label: t[csmLanguage].cc2Opts[1] },
                        { val: 3, label: t[csmLanguage].cc2Opts[2] },
                        { val: 4, label: t[csmLanguage].cc2Opts[3] }
                      ].map(opt => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setCsmCC2(opt.val)}
                          className={`text-left px-4 py-2.5 rounded-xl border text-sm sm:text-base font-bold transition-all ${
                            csmCC2 === opt.val
                              ? 'bg-[#1B6535]/15 text-[#1B6535] border-[#1B6535]'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CC3 */}
                  <div className={`space-y-2 p-3 rounded-2xl border transition-all ${
                    getBlinkingField() === 'cc3' ? 'animate-blink-border' : 'border-transparent'
                  }`}>
                    <p className="text-sm sm:text-base font-black text-slate-800">
                      {t[csmLanguage].cc3Q} <span className="text-rose-500">*</span>
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        { val: 1, label: t[csmLanguage].cc3Opts[0] },
                        { val: 2, label: t[csmLanguage].cc3Opts[1] },
                        { val: 3, label: t[csmLanguage].cc3Opts[2] }
                      ].map(opt => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setCsmCC3(opt.val)}
                          className={`text-left px-4 py-2.5 rounded-xl border text-sm sm:text-base font-bold transition-all ${
                            csmCC3 === opt.val
                              ? 'bg-[#1B6535]/15 text-[#1B6535] border-[#1B6535]'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SQD Section */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-black uppercase text-[#D4AF37] tracking-wider border-b pb-1">
                {t[csmLanguage].sqdTitle}
              </h3>
              
              <div className="space-y-4">
                {[
                  { id: 1, label: t[csmLanguage].sqd1, desc: t[csmLanguage].sqd1D, val: csmSQD1, setVal: setCsmSQD1 },
                  { id: 2, label: t[csmLanguage].sqd2, desc: t[csmLanguage].sqd2D, val: csmSQD2, setVal: setCsmSQD2 },
                  { id: 3, label: t[csmLanguage].sqd3, desc: t[csmLanguage].sqd3D, val: csmSQD3, setVal: setCsmSQD3 },
                  { id: 4, label: t[csmLanguage].sqd4, desc: t[csmLanguage].sqd4D, val: csmSQD4, setVal: setCsmSQD4 },
                  { id: 5, label: t[csmLanguage].sqd5, desc: t[csmLanguage].sqd5D, val: csmSQD5, setVal: setCsmSQD5, showNa: true },
                  { id: 6, label: t[csmLanguage].sqd6, desc: t[csmLanguage].sqd6D, val: csmSQD6, setVal: setCsmSQD6 },
                  { id: 7, label: t[csmLanguage].sqd7, desc: t[csmLanguage].sqd7D, val: csmSQD7, setVal: setCsmSQD7 },
                  { id: 8, label: t[csmLanguage].sqd8, desc: t[csmLanguage].sqd8D, val: csmSQD8, setVal: setCsmSQD8 }
                ].map(sqd => {
                  const ratingOptions = [
                    { rating: 1, emoji: "😠", label: csmLanguage === 'EN' ? "Strongly Disagree" : "Lubos na Sumasalungat" },
                    { rating: 2, emoji: "🙁", label: csmLanguage === 'EN' ? "Disagree" : "Sumasalungat" },
                    { rating: 3, emoji: "😐", label: csmLanguage === 'EN' ? "Neutral" : "Walang Pinapanigan" },
                    { rating: 4, emoji: "🙂", label: csmLanguage === 'EN' ? "Agree" : "Sumasang-ayon" },
                    { rating: 5, emoji: "😍", label: csmLanguage === 'EN' ? "Strongly Agree" : "Lubos na Sumasang-ayon" }
                  ];

                  return (
                    <div key={sqd.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                      <div>
                        <p className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-tight">{sqd.label}</p>
                        <p className="text-xs sm:text-sm font-bold text-slate-500 mt-0.5">{sqd.desc}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 sm:gap-2.5">
                          {ratingOptions.map(opt => (
                            <button
                              key={opt.rating}
                              type="button"
                              disabled={sqd.val === 0}
                              onClick={() => sqd.setVal(opt.rating)}
                              className={`flex flex-col items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border transition-all active:scale-95 ${
                                sqd.val === opt.rating
                                  ? 'bg-[#1B6535] text-white border-[#1B6535] shadow-md scale-105'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-30'
                              }`}
                              title={opt.label}
                            >
                              <span className="text-3xl sm:text-4xl leading-none">{opt.emoji}</span>
                              <span className="text-[8px] sm:text-[10px] font-black uppercase mt-1.5 leading-none">{opt.rating}</span>
                            </button>
                          ))}
                        </div>

                        {sqd.showNa && (
                          <button
                            type="button"
                            onClick={() => sqd.setVal(sqd.val === 0 ? 5 : 0)}
                            className={`px-4 h-16 sm:h-20 rounded-2xl border text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                              sqd.val === 0
                                ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                                : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {t[csmLanguage].na}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <label htmlFor="csmComments" className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700">
                {t[csmLanguage].comments}
              </label>
              <textarea
                id="csmComments"
                rows={3}
                placeholder={t[csmLanguage].commentsPlaceholder}
                value={csmComments}
                onChange={(e) => setCsmComments(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm sm:text-base rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmittingCsm}
                onClick={() => submitCsmCheckout(true)}
                className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-500 hover:text-slate-750 hover:bg-slate-100 rounded-xl px-4 py-2"
              >
                {t[csmLanguage].skip}
              </Button>
              <Button
                type="button"
                disabled={isSubmittingCsm || !csmAgeGroup || !csmClientType || csmCC1 === null}
                onClick={() => submitCsmCheckout(false)}
                className="w-full sm:w-auto h-14 bg-gradient-to-r from-[#1B6535] to-[#247e43] hover:from-[#1B6535] hover:to-[#1a5d31] text-white font-black uppercase tracking-widest text-sm sm:text-base px-8 rounded-xl shadow-lg transition-all"
              >
                {isSubmittingCsm ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> {t[csmLanguage].submitting}
                  </>
                ) : (
                  t[csmLanguage].submit
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Success Thank You Overlay */}
      {logoutSuccessVisitorName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white border border-[#D4AF37]/30 shadow-2xl rounded-3xl p-8 max-w-lg w-full text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="mx-auto relative flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 animate-bounce" />
            </div>
            
            {csmSubmitted ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black uppercase tracking-tight text-[#1B6535]">
                    {t[csmLanguage].thankYouTitle.replace('{name}', logoutSuccessVisitorName)}
                  </h3>
                  <p className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.2em]">
                    {t[csmLanguage].thankYouDesc}
                  </p>
                </div>
                <p className="text-base font-semibold text-slate-755 leading-relaxed">
                  {t[csmLanguage].thankYouMessage}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black uppercase tracking-tight text-[#1B6535]">
                    Thank You, {logoutSuccessVisitorName}!
                  </h3>
                  <p className="text-xs font-black text-emerald-650 uppercase tracking-[0.2em]">
                    Logout Successful
                  </p>
                </div>
                <p className="text-base font-semibold text-slate-755 leading-relaxed">
                  We hope your visit was productive. Thank you for logging your checkout. Have a safe journey back, and we hope to welcome you again soon!
                </p>
              </div>
            )}
            
            <div className="pt-2">
              <Button
                onClick={() => setLogoutSuccessVisitorName(null)}
                className="w-full h-12 bg-gradient-to-r from-[#1B6535] to-[#247e43] hover:from-[#1B6535] hover:to-[#1a5d31] text-white border border-[#D4AF37]/30 hover:border-[#D4AF37]/50 rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all duration-150"
              >
                {csmLanguage === 'FIL' ? 'MABUHAY / OK' : 'OK / CLOSE'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Kiosk Mode Paused Overlay */}
      {isKioskMode && !isFullscreen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6 text-center space-y-6 animate-in fade-in duration-300">
          <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 animate-pulse">
            <Maximize2 className="h-10 w-10" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-2xl font-black uppercase tracking-tight text-white">
              Kiosk Terminal Paused
            </h3>
            <p className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.2em]">
              Fullscreen Mode Inactive
            </p>
            <p className="text-sm font-medium text-slate-300 pt-2 leading-relaxed">
              For security and to prevent unauthorized access to the device, the visitor logbook must run in fullscreen mode.
            </p>
          </div>
          <div className="pt-2 w-full max-w-xs">
            <Button
              onClick={async () => {
                try {
                  await document.documentElement.requestFullscreen();
                } catch (err) {
                  console.warn('Failed to resume fullscreen:', err);
                }
              }}
              className="w-full h-12 bg-gradient-to-r from-[#D4AF37] to-[#bfa032] hover:from-[#e5bd3c] hover:to-[#d4af37] text-slate-950 font-black uppercase tracking-widest shadow-lg shadow-[#D4AF37]/20 active:scale-95 transition-all duration-150 border-none rounded-xl"
            >
              Resume Kiosk Mode
            </Button>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <div className="w-full text-center z-10 border-t border-[#D4AF37]/10 pt-4">
        <p className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/50">
          Romblon State University &bull; Educational Organization Management System
        </p>
      </div>

      <style jsx global>{`
        .bg-radial-gradient {
          background-image: radial-gradient(circle at center, #0e301b 0%, #08170e 100%);
        }
        @keyframes border-blink {
          0%, 100% {
            border-color: #D4AF37;
            box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.4);
          }
          50% {
            border-color: #e2e8f0;
            box-shadow: 0 0 0 4px transparent;
          }
        }
        .animate-blink-border {
          animation: border-blink 1.2s infinite;
          border-width: 2px !important;
          border-style: solid !important;
        }
      `}</style>
    </div>
  );
}
