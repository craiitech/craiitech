
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useUser,
  useFirestore,
} from '@/firebase';
import { LayoutDashboard, FileText, CheckSquare, Settings, HelpCircle, LogOut, BarChart, History as HistoryIcon, ShieldCheck, BookOpen, BookMarked, ClipboardList, FolderKanban, ListChecks, HandHeart, UserCheck, WifiOff, Mail, Loader2 } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuBadge } from '../ui/sidebar';
import { cn } from '@/lib/utils';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
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
  
  const [isVisitorDialogOpen, setIsVisitorDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const firestore = useFirestore();

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
          ? format(log.createdAt.toDate(), 'MM/dd/yyyy hh:mm a') 
          : 'N/A';
        tableRows += `
          <tr>
            <td style="border: 1px solid black; padding: 8px; font-family: monospace;">${dateStr}</td>
            <td style="border: 1px solid black; padding: 8px; font-weight: bold;">${log.name}</td>
            <td style="border: 1px solid black; padding: 8px;">
              <div style="font-weight: bold; font-size: 11px;">${log.purpose}</div>
              <div style="margin-top: 4px; font-size: 10px; color: #555;">To Meet: ${log.lookingFor}</div>
            </td>
            <td style="border: 1px solid black; padding: 8px; text-align: center;">${log.sex || 'N/A'}</td>
          </tr>
        `;
      });

      printWindow.document.write(`
        <html>
          <head>
            <title>Visitor Logbook - ${unitName}</title>
            <style>
              @media print {
                body { margin: 0.5in; font-family: sans-serif; color: black; }
                .no-print { display: none !important; }
              }
              body { font-family: sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
              th { background-color: #f2f2f2; border: 1px solid black; padding: 10px; text-align: left; text-transform: uppercase; font-size: 10px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid black; padding-bottom: 10px;">
              <h2 style="margin: 0; text-transform: uppercase; letter-spacing: 1px;">ROMBLON STATE UNIVERSITY</h2>
              <h3 style="margin: 5px 0 0 0; text-transform: uppercase; color: #444;">VISITOR LOGBOOK</h3>
              <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 12px;">OFFICE: ${unitName.toUpperCase()} &bull; DATE EXPORTED: ${formattedDate}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 25%;">Date & Time</th>
                  <th style="width: 30%;">Visitor Name</th>
                  <th style="width: 35%;">Purpose of Visit & Person Visited</th>
                  <th style="width: 10%; text-align: center;">Sex</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            <div style="margin-top: 40px; text-align: right; font-size: 10px; font-weight: bold; text-transform: uppercase;">
              Generated via RSU EOMS Portal
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
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
    '/activity-log'
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
      roles: ['Admin', 'Campus Director', 'Campus ODIMO'],
      icon: <BarChart />,
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
        
        if (route.roles.includes(userRole)) return true;
        if (isVp && route.roles.includes('Vice President')) return true;
        if (isPresident && (route.roles.includes('Vice President') || route.roles.includes('Campus Director') || route.roles.includes('Admin'))) return true;
        if (isQmsHead && (route.roles.includes('Campus Director') || route.roles.includes('Admin'))) return true;
        if (userRole === 'Faculty' && (route.roles.includes('Unit Coordinator') || route.roles.includes('Unit ODIMO'))) return true;
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
                <SidebarMenuButton onClick={handleLogout} tooltip="Logout" className="hover:bg-sidebar-accent">
                    <LogOut />
                    <span>Logout</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </div>

      <AlertDialog open={isVisitorDialogOpen} onOpenChange={setIsVisitorDialogOpen}>
        <AlertDialogContent className="max-w-md bg-white border border-[#D4AF37]/20 rounded-2xl p-6 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black uppercase text-[#1B6535] tracking-tight flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[#D4AF37]" /> Visitor Logbook Hub
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium text-xs mt-1">
              Select an action for the Visitor Logbook of <span className="font-extrabold text-[#1B6535]">{userProfile?.unitName || 'your unit'}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
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

