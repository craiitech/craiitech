
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import { LayoutDashboard, FileText, CheckSquare, Settings, HelpCircle, LogOut, BarChart, History as HistoryIcon, ShieldCheck, BookOpen, BookMarked, ClipboardList, FolderKanban, ListChecks, HandHeart, UserCheck, WifiOff, Mail, Loader2, Calendar, Sun, Moon, QrCode, ExternalLink, Download } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuBadge } from '../ui/sidebar';
import { cn } from '@/lib/utils';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, doc } from '@/firebase/firestore-wrapper';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/theme-provider';

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  notificationCount: number;
  commNotificationCount?: number;
}

export function SidebarNav({
  className,
  notificationCount,
  commNotificationCount = 0,
  ...props
}: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const { toast } = useToast();
  const { isAdmin, userRole, isSupervisor, userProfile } = useUser();
  const [isForcedOffline, setIsForcedOffline] = useState(false);
  const { theme, toggleTheme } = useTheme();
  
  const [isVisitorDialogOpen, setIsVisitorDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [csmQrUrl, setCsmQrUrl] = useState('');
  const firestore = useFirestore();

  const unitDocRef = useMemoFirebase(() => {
    if (!firestore || !userProfile?.unitId) return null;
    return doc(firestore, 'units', userProfile.unitId);
  }, [firestore, userProfile?.unitId]);

  const { data: unitDoc } = useDoc<any>(unitDocRef);

  useEffect(() => {
    if (typeof window !== 'undefined' && userProfile) {
      const officeNameStr = unitDoc?.name || userProfile.unitName || 'Office';
      const csmPath = `/csm-evaluate?unitId=${userProfile.unitId || 'N/A'}&campusId=${userProfile.campusId || 'N/A'}&unitName=${encodeURIComponent(officeNameStr)}`;
      const fullCsmUrl = `${window.location.origin}${csmPath}`;
      setCsmQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fullCsmUrl)}`);
    }
  }, [userProfile, unitDoc]);

  useEffect(() => {
    const checkState = () => {
        setIsForcedOffline(localStorage.getItem('rsu_eoms_net_disabled') === 'true');
    };
    checkState();
    window.addEventListener('storage', checkState);
    return () => window.removeEventListener('storage', checkState);
  }, []);

  const handleLogout = () => {
    router.push('/logout');
  };

  const handlePrintVisitorLogs = async () => {
    if (!firestore || !userProfile) return;
    setIsPrinting(true);
    try {
      const q = query(
        collection(firestore, 'visitorLogs'),
        where('unitId', '==', userProfile.unitId || 'N/A')
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast({
          title: 'No Logs Found',
          description: 'There are no visitor entries recorded for your unit.',
          variant: 'destructive',
        });
        setIsPrinting(false);
        return;
      }

      const logs: any[] = [];
      querySnapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() });
      });

      // Sort logs in memory by createdAt ascending to avoid composite index requirement in Firestore
      logs.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeA - timeB;
      });

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: 'Pop-up Blocked',
          description: 'Please allow pop-ups to print the logbook.',
          variant: 'destructive',
        });
        setIsPrinting(false);
        return;
      }

      const unitName = userProfile.unitName || 'Office/Unit';
      const formattedDate = format(new Date(), 'MMMM dd, yyyy');

      let tableRows = '';
      logs.forEach((log) => {
        const dateStr = log.createdAt?.toDate 
          ? format(log.createdAt.toDate(), 'MM/dd/yyyy') 
          : 'N/A';
        const timeInStr = log.createdAt?.toDate 
          ? format(log.createdAt.toDate(), 'hh:mm a') 
          : 'N/A';
        const timeOutStr = log.loggedOutAt?.toDate 
          ? format(log.loggedOutAt.toDate(), 'hh:mm a') 
          : '—';

        tableRows += `
          <tr>
            <td style="border: 1px solid black; padding: 8px; text-align: center; font-family: monospace; font-size: 11px;">${dateStr}</td>
            <td style="border: 1px solid black; padding: 8px; font-weight: bold; font-size: 11px; text-transform: uppercase;">${log.name}</td>
            <td style="border: 1px solid black; padding: 8px; font-size: 11px;">
              <div style="font-weight: bold;">${log.purpose}</div>
              <div style="margin-top: 3px; font-size: 10px; color: #555; font-weight: bold;">To Meet: ${log.lookingFor}</div>
            </td>
            <td style="border: 1px solid black; padding: 8px; text-align: center; font-family: monospace; font-size: 11px;">${timeInStr}</td>
            <td style="border: 1px solid black; padding: 8px; text-align: center; font-family: monospace; font-size: 11px;">${timeOutStr}</td>
            <td style="border: 1px solid black; padding: 6px; text-align: center;">
              <div style="font-family: 'Georgia', serif; font-style: italic; font-size: 9.5px; word-break: break-word; line-height: 1; font-weight: normal; color: #111; text-transform: uppercase;">
                ${log.name}
              </div>
            </td>
          </tr>
        `;
      });

      printWindow.document.write(`
        <html>
          <head>
            <title>Visitor Logbook - ${unitName}</title>
            <style>
              @media print {
                body { margin: 0.4in; font-family: Arial, sans-serif; color: black; }
                .no-print { display: none !important; }
              }
              body { font-family: Arial, sans-serif; padding: 20px; color: black; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
              th { background-color: #F9D05A; border: 1px solid black; padding: 8px; text-align: center; text-transform: uppercase; font-size: 10px; font-weight: bold; }
              td { vertical-align: middle; }
              
              .print-btn {
                background-color: #1B6535;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 8px;
                font-weight: bold;
                font-size: 14px;
                cursor: pointer;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                font-family: Arial, sans-serif;
                transition: background-color 0.2s, transform 0.1s;
              }
              .print-btn:hover {
                background-color: #154e29;
              }
              .print-btn:active {
                transform: scale(0.98);
              }
            </style>
          </head>
          <body>
            <!-- Print Action Button -->
            <div class="no-print" style="display: flex; justify-content: center; margin-bottom: 25px;">
              <button onclick="window.print()" class="print-btn">
                Click to Print Visitor Logbook
              </button>
            </div>

            <!-- Official Header matching RSU Document Template -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid black; padding-bottom: 12px; margin-bottom: 20px;">
              <div style="width: 70px; text-align: left;">
                <img src="/rsulogo.png" style="height: 60px; object-fit: contain;" />
              </div>
              <div style="text-align: center; flex: 1; margin: 0 10px;">
                <p style="margin: 0; font-size: 11px; text-transform: uppercase; font-weight: normal; letter-spacing: 0.5px;">Republic of the Philippines</p>
                <h2 style="margin: 3px 0; font-size: 15px; font-weight: bold; letter-spacing: 0.5px;">ROMBLON STATE UNIVERSITY</h2>
                <p style="margin: 0; font-size: 11px; font-weight: normal;">Romblon, Philippines</p>
              </div>
              <div style="width: 75px; text-align: right;">
                <img src="/ISOlogo.jpg" style="height: 60px; object-fit: contain;" />
              </div>
            </div>

            <div style="text-align: center; margin-bottom: 15px;">
              <h3 style="margin: 0; font-size: 15px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">CLIENT'S AND VISITOR'S LOGBOOK</h3>
            </div>

            <div style="margin-bottom: 15px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
              <span>CAMPUS / UNIT: </span>
              <span style="border-bottom: 1px solid black; padding-bottom: 1px; padding-right: 180px; font-weight: normal; margin-left: 5px;">
                ${unitName.toUpperCase()}
              </span>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 12%;">Date</th>
                  <th style="width: 28%;">Visitor / Client name</th>
                  <th style="width: 28%;">Reason for Visit</th>
                  <th style="width: 10%;">Time-in</th>
                  <th style="width: 10%;">Time-out</th>
                  <th style="width: 12%;">Signature</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            <div style="margin-top: 35px; text-align: right; font-size: 9px; font-weight: bold; text-transform: uppercase; color: #555;">
              Generated via RSU EOMS Portal
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setIsVisitorDialogOpen(false);
    } catch (e) {
      console.error('Error fetching logs for print:', e);
      toast({
        title: 'Error Printing',
        description: 'Failed to retrieve visitor logs.',
        variant: 'destructive',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  /**
   * OFFLINE CONDUCT PROTOCOL
   * When offline (actual or forced), we allow navigation to the core conduct routes.
   */
  const ALLOWED_OFFLINE_ROUTES = [
    '/dashboard',
    '/audit',
    '/activity-log',
    '/visitor-logbook'
  ];

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (!isOnline || isForcedOffline) {
        const isAllowed = ALLOWED_OFFLINE_ROUTES.some(r => href.startsWith(r));
        if (!isAllowed) {
            e.preventDefault();
            toast({
                title: "Focused Conduct Mode Active",
                description: "While offline or locked, only the Home, IQA Conduct, and Activity Log modules are enabled.",
                variant: "destructive"
            });
        }
    }
  };

  const allRoutes = [
    {
      href: '/dashboard',
      label: 'Home',
      active: pathname === '/dashboard',
      icon: <LayoutDashboard />,
    },
    {
      href: '/activity-log',
      label: 'Activity Log (Daily)',
      active: pathname.startsWith('/activity-log'),
      roles: ['Admin', 'Campus Director', 'Campus ODIMO', 'Vice President', 'Unit Coordinator', 'Unit ODIMO'],
      icon: <UserCheck />,
    },


    {
      href: '/audit',
      label: userRole === 'Auditor' ? 'IQA Conduct' : 'Internal Quality Audit',
      active: pathname.startsWith('/audit'),
      roles: ['Admin', 'Auditor'],
      icon: <ClipboardList />,
    },
    {
      href: '/monitoring',
      label: 'Unit Monitoring',
      active: pathname.startsWith('/monitoring'),
      roles: ['Admin', 'Campus Director', 'Campus ODIMO', 'Vice President', 'Unit Coordinator', 'Unit ODIMO'],
      icon: <ClipboardList />,
    },
    {
      href: '/academic-programs',
      label: 'CHED Programs Monitoring',
      active: pathname.startsWith('/academic-programs'),
      roles: ['Admin', 'Campus Director', 'Campus ODIMO', 'Auditor', 'Unit Coordinator', 'Unit ODIMO'],
      icon: <BookOpen />,
    },
    {
      href: '/gad-corner',
      label: 'GAD Corner',
      active: pathname.startsWith('/gad-corner'),
      roles: ['Admin', 'Campus Director', 'Campus ODIMO', 'Vice President', 'Unit Coordinator', 'Unit ODIMO'],
      icon: <HandHeart />,
    },
    {
      href: '/submissions',
      label: 'EOMS SUBMISSION HUB',
      active: pathname.startsWith('/submissions'),
      roles: ['Admin', 'Campus Director', 'Campus ODIMO', 'Vice President', 'Unit Coordinator', 'Unit ODIMO', 'Auditor'],
      icon: <FileText />,
      showBadge: true,
    },
    {
      href: '/approvals',
      label: 'Submission Approval',
      active: pathname.startsWith('/approvals'),
      roles: ['Campus Director', 'Campus ODIMO', 'Admin', 'Vice President'],
      icon: <CheckSquare />,
      showBadge: true,
    },
     {
      href: '/manuals',
      label: 'Unit Procedure Manuals',
      active: pathname.startsWith('/manuals'),
      icon: <BookOpen />,
    },
    {
      href: '/eoms-policy-manual',
      label: 'RSU EOMS Manual',
      active: pathname.startsWith('/eoms-policy-manual'),
      icon: <BookMarked />,
    },
    {
      href: '/unit-forms',
      label: 'Unit Forms & Records',
      active: pathname.startsWith('/unit-forms'),
      icon: <ListChecks />,
    },
    {
      href: '/risk-register',
      label: 'Risk & Opportunity Registry',
      active: pathname.startsWith('/risk-register'),
      icon: <ShieldCheck />,
    },
    {
      href: '/qa-reports',
      label: 'QA Reports & CARs',
      active: pathname.startsWith('/qa-reports'),
      icon: <FolderKanban />,
    },
    {
      href: '/visitor-logbook',
      label: 'Visitor Logbook',
      active: pathname === '/visitor-logbook',
      roles: ['Admin', 'Campus Director', 'Campus ODIMO', 'Unit Coordinator', 'Unit ODIMO'],
      icon: <BookOpen />,
    },
     {
      href: '/reports',
      label: 'Reports',
      active: pathname.startsWith('/reports'),
      roles: ['Admin', 'Campus Director', 'Campus ODIMO', 'Unit Coordinator', 'Unit ODIMO'],
      icon: <BarChart />,
    },
    {
      href: '/unit-activity',
      label: 'Unit Activity',
      active: pathname.startsWith('/unit-activity'),
      roles: ['Admin', 'Campus Director', 'Campus ODIMO', 'Unit Coordinator', 'Unit ODIMO'],
      icon: <Calendar />,
    },
    {
        href: '/settings',
        label: 'Settings',
        active: pathname.startsWith('/settings'),
        roles: ['Admin', 'Campus Director'],
        icon: <Settings />,
    },
    {
      href: '/audit-log',
      label: 'System Audit Log',
      active: pathname.startsWith('/audit-log'),
      roles: ['Admin'],
      icon: <HistoryIcon />,
    },
    {
      href: '/software-quality',
      label: 'Software Quality',
      active: pathname.startsWith('/software-quality'),
      roles: ['Admin'],
      icon: <HistoryIcon />,
    },
  ];

  const visibleRoutes = allRoutes.filter((route) => {
    if (!route.roles) return true;
    if (isAdmin && route.roles.includes('Admin')) return true;
    if (userRole) {
        const roleLower = userRole.toLowerCase();
        const isVp = roleLower.includes('vice president');
        const isPresident = roleLower.includes('president');
        const isQmsHead = roleLower.includes('quality management system head') || roleLower.includes('qms head');
        
        if (route.roles.some(r => r.toLowerCase() === roleLower)) return true;
        if (isVp && route.roles.some(r => r.toLowerCase() === 'vice president')) return true;
        if (isPresident && route.roles.some(r => {
          const rLower = r.toLowerCase();
          return rLower === 'vice president' || rLower === 'campus director' || rLower === 'admin';
        })) return true;
        if (isQmsHead && route.roles.some(r => {
          const rLower = r.toLowerCase();
          return rLower === 'campus director' || rLower === 'admin';
        })) return true;
        if (roleLower === 'faculty' && route.roles.some(r => {
          const rLower = r.toLowerCase();
          return rLower === 'unit coordinator' || rLower === 'unit odimo';
        })) return true;
    }
    return false;
  });

  return (
    <div className={cn("flex flex-col h-full", className)} {...props}>
      <SidebarMenu className="flex-1">
        {visibleRoutes.map((route) => {
          const isAllowedOffline = ALLOWED_OFFLINE_ROUTES.some(r => route.href.startsWith(r));
          const isDisabled = (!isOnline || isForcedOffline) && !isAllowedOffline;

          return (
            <SidebarMenuItem key={route.href}>
              {route.href === '/visitor-logbook' ? (
                <SidebarMenuButton 
                  isActive={route.active} 
                  tooltip={route.label}
                  onClick={() => setIsVisitorDialogOpen(true)}
                  className="[&[data-active=true]]:bg-sidebar-primary [&[data-active=true]]:text-sidebar-primary-foreground rounded-md hover:bg-sidebar-accent"
                >
                  {route.icon}
                  <span>{route.label}</span>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton 
                  asChild 
                  isActive={route.active} 
                  tooltip={route.label}
                  onClick={(e) => handleNavClick(e, route.href)}
                  className={cn(
                      "[&[data-active=true]]:bg-sidebar-primary [&[data-active=true]]:text-sidebar-primary-foreground rounded-md hover:bg-sidebar-accent",
                      isDisabled && "opacity-20 cursor-not-allowed grayscale pointer-events-auto"
                  )}
                >
                  <Link href={route.href}>
                      {isDisabled ? <WifiOff className="h-4 w-4" /> : route.icon}
                      <span>{route.label}</span>
                      {route.showBadge && !isDisabled && (
                        route.href === '/communications' ? (
                          commNotificationCount > 0 && (
                            <SidebarMenuBadge className="bg-destructive text-destructive-foreground font-black text-[10px] animate-in zoom-in duration-300">
                              {commNotificationCount}
                            </SidebarMenuBadge>
                          )
                        ) : (
                          notificationCount > 0 && (
                            <SidebarMenuBadge className="bg-destructive text-destructive-foreground font-black text-[10px] animate-in zoom-in duration-300">
                              {notificationCount}
                            </SidebarMenuBadge>
                          )
                        )
                      )}
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
      <div className="mt-auto">
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname.startsWith('/communications')}
                  tooltip="Communication"
                  onClick={(e) => handleNavClick(e, '/communications')}
                  className={cn(
                    "rounded-md hover:bg-sky-950/40 hover:text-sky-200 text-sky-300 [&_svg]:text-sky-300",
                    "[&[data-active=true]]:bg-sky-500 [&[data-active=true]]:text-slate-950 [&[data-active=true]_svg]:text-slate-950 [&[data-active=true]]:hover:bg-sky-400 [&[data-active=true]]:hover:text-slate-950",
                    (!isOnline || isForcedOffline) && "opacity-20 cursor-not-allowed"
                  )}
                >
                  <Link href="/communications">
                    <Mail />
                    <span>Communication</span>
                    {commNotificationCount > 0 && !(!isOnline || isForcedOffline) && (
                      <SidebarMenuBadge className="bg-destructive text-destructive-foreground font-black text-[10px] animate-in zoom-in duration-300">
                        {commNotificationCount}
                      </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname.startsWith('/help')}
                  tooltip="Help"
                  onClick={(e) => handleNavClick(e, '/help')}
                  className={cn(
                    "[&[data-active=true]]:bg-sidebar-primary [&[data-active=true]]:text-sidebar-primary-foreground rounded-md hover:bg-sidebar-accent",
                    (!isOnline || isForcedOffline) && "opacity-20 cursor-not-allowed"
                  )}
                >
                  <Link href="/help">
                    <HelpCircle />
                    <span>Help</span>
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
                 <SidebarMenuButton onClick={toggleTheme} tooltip={theme === 'dark' ? 'Light Mode' : 'Dark Mode'} data-tour="dark-mode-toggle" className="hover:bg-sidebar-accent">
                     {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                     <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                 </SidebarMenuButton>
             </SidebarMenuItem>
             <SidebarMenuItem>
                 <SidebarMenuButton onClick={handleLogout} tooltip="Logout" className="hover:bg-sidebar-accent">
                     <LogOut />
                     <span>Logout</span>
                 </SidebarMenuButton>
             </SidebarMenuItem>
        </SidebarMenu>
      </div>

      <AlertDialog open={isVisitorDialogOpen} onOpenChange={setIsVisitorDialogOpen}>
        <AlertDialogContent className="max-w-3xl bg-white border border-[#D4AF37]/20 rounded-2xl p-6 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black uppercase text-[#1B6535] tracking-tight flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[#D4AF37]" /> Visitor Logbook Hub
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium text-xs mt-1">
              <span className="font-extrabold text-[#1B6535]">{userProfile?.unitName || 'Your Unit'}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Two-column layout */}
          <div className="flex flex-col md:flex-row gap-6 py-4">
            {/* Left column: Action buttons */}
            <div className="flex-1 flex flex-col gap-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Actions</p>
              <Button 
                onClick={() => {
                  window.open('/visitor-logbook?fullscreen=true', '_blank');
                  setIsVisitorDialogOpen(false);
                }}
                className="w-full h-12 bg-[#1B6535] hover:bg-[#1a5d31] text-white font-black uppercase tracking-wider rounded-xl border border-[#D4AF37]/30 flex items-center justify-center gap-2 transition-all"
              >
                Open Kiosk Sign-In Page
              </Button>
              <Button 
                onClick={handlePrintVisitorLogs}
                disabled={isPrinting}
                className="w-full h-12 bg-white hover:bg-slate-50 text-[#1B6535] border border-[#1B6535]/20 font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                {isPrinting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Fetching Logs...
                  </>
                ) : (
                  <>
                    Print Logbook Records
                  </>
                )}
              </Button>
              <Button 
                onClick={() => {
                  router.push('/visitor-logbook/settings');
                  setIsVisitorDialogOpen(false);
                }}
                className="w-full h-12 bg-white hover:bg-slate-50 text-[#1B6535] border border-[#1B6535]/20 font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                CSM Settings Page
              </Button>
            </div>

            {/* Right column: QR Code + Link */}
            <div className="flex-1 flex flex-col items-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Online CSM Link</p>

              <p className="text-[9px] text-slate-500 font-medium text-center leading-relaxed">
                Download the QR code or copy the link below and send it to your online clients so they can evaluate your unit&apos;s service through the CSM survey.
              </p>

              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner w-[180px] h-[180px] flex items-center justify-center">
                {csmQrUrl ? (
                  <img
                    src={csmQrUrl}
                    alt="CSM Online Evaluation QR Code"
                    className="w-[164px] h-[164px] object-contain"
                  />
                ) : (
                  <div className="w-[164px] h-[164px] flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#1B6535]" />
                  </div>
                )}
              </div>

              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 truncate">
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">CSM Link</p>
                <p className="text-[10px] font-mono text-slate-700 truncate">
                  {typeof window !== 'undefined' && userProfile
                    ? `${window.location.origin}/csm-evaluate?unitId=${userProfile.unitId || 'N/A'}...`
                    : 'Loading...'}
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch(csmQrUrl);
                      const blob = await response.blob();
                      const blobUrl = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download = 'csm-qr-code.png';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(blobUrl);
                      toast({
                        title: 'Download Started',
                        description: 'CSM QR code is being downloaded.',
                      });
                    } catch (err) {
                      toast({
                        title: 'Download Failed',
                        description: 'Unable to download QR code. Please try again.',
                        variant: 'destructive',
                      });
                    }
                  }}
                  className="w-full h-10 bg-gradient-to-r from-[#1B6535] to-[#247e43] hover:from-[#1B6535] hover:to-[#1a5d31] text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg"
                >
                  <Download className="h-4 w-4 mr-1" /> Download QR Code
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const officeNameStr = unitDoc?.name || userProfile?.unitName || 'Office';
                      const csmPath = `/csm-evaluate?unitId=${userProfile?.unitId || 'N/A'}&campusId=${userProfile?.campusId || 'N/A'}&unitName=${encodeURIComponent(officeNameStr)}`;
                      const fullCsmUrl = `${window.location.origin}${csmPath}`;
                      const message = `CLIENT SATISFACTION MEASUREMENT (CSM) - ONLINE EVALUATION\n\nOffice: ${officeNameStr}\nLink: ${fullCsmUrl}\n\nDear Client,\n\nWe value your feedback! Please take a few minutes to complete our online Client Satisfaction Measurement (CSM) survey. Your responses will help us improve the quality of our services.\n\nYou may click the link above or scan the QR code to access the survey. The survey is anonymous and will only take a few minutes to complete.\n\nThank you for your continued support!\n\n${officeNameStr}\nRomblon State University`;
                      await navigator.clipboard.writeText(message);
                      toast({
                        title: 'Message Copied!',
                        description: 'Complete message with CSM link has been copied to your clipboard.',
                      });
                    } catch (err) {
                      toast({
                        title: 'Copy Failed',
                        description: 'Unable to copy message. Please try again.',
                        variant: 'destructive',
                      });
                    }
                  }}
                  className="w-full h-10 font-black uppercase tracking-widest text-[10px] rounded-xl border-slate-200"
                >
                  <ExternalLink className="h-4 w-4 mr-1" /> Copy Message for Clients
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    try {
                      const officeNameStr = unitDoc?.name || userProfile?.unitName || 'Office';
                      const csmPath = `/csm-evaluate?unitId=${userProfile?.unitId || 'N/A'}&campusId=${userProfile?.campusId || 'N/A'}&unitName=${encodeURIComponent(officeNameStr)}`;
                      const fullCsmUrl = `${window.location.origin}${csmPath}`;
                      await navigator.clipboard.writeText(fullCsmUrl);
                      toast({
                        title: 'Link Copied!',
                        description: 'CSM online link has been copied to your clipboard.',
                      });
                    } catch (err) {
                      toast({
                        title: 'Copy Failed',
                        description: 'Unable to copy link. Please try again.',
                        variant: 'destructive',
                      });
                    }
                  }}
                  className="w-full h-9 text-[9px] font-black uppercase tracking-widest rounded-xl text-slate-400 hover:text-slate-600"
                >
                  Copy Link Only
                </Button>
              </div>
            </div>
          </div>

          <AlertDialogFooter className="border-t pt-3">
            <AlertDialogCancel className="w-full sm:w-auto rounded-xl font-bold text-xs uppercase border-slate-200">
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

