
'use client';

import { usePathname } from 'next/navigation';
import { useFirebase, useUser } from '@/firebase';
import { UserNav } from '@/components/dashboard/user-nav';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ContextualHelp } from './contextual-help';
import { Button } from '@/components/ui/button';
import { PanelRightClose, PanelRightOpen, Wifi, WifiOff, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';

interface HeaderProps {
    notificationCount: number;
    totalNotificationsCount?: number;
    notificationsList?: any[];
    isGuidanceVisible: boolean;
    onToggleGuidance: () => void;
}

export function Header({ 
  notificationCount, 
  totalNotificationsCount = 0, 
  notificationsList = [], 
  isGuidanceVisible, 
  onToggleGuidance 
}: HeaderProps) {
  const firebaseState = useFirebase();
  const pathname = usePathname();
  const isOnline = useNetworkStatus();
  const { user, userProfile, userRole } = useUser();
  const [isForcedOffline, setIsForcedOffline] = useState(false);

  const isAuditor = userRole === 'Auditor';

  useEffect(() => {
    const checkState = () => {
        setIsForcedOffline(localStorage.getItem('rsu_eoms_net_disabled') === 'true');
    };
    checkState();
    window.addEventListener('storage', checkState);
    return () => window.removeEventListener('storage', checkState);
  }, []);

  const getPageTitle = (path: string) => {
    if (path === '/dashboard') return 'Home';
    if (path.startsWith('/submissions')) return 'EOMS SUBMISSION HUB';
    
    if (path.startsWith('/audit')) {
        if (path === '/audit') return 'Internal Quality Audit';
        return 'IQA Details';
    }

    const lastSegment = path.split('/').pop();
    if (!lastSegment) return '';
    
    if (lastSegment.match(/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i)) {
      const segments = path.split('/');
      const parentSegment = segments[segments.length - 2];
      return parentSegment ? parentSegment.charAt(0).toUpperCase() + parentSegment.slice(1, -1) + ' Detail' : 'Detail';
    }
    return lastSegment ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1) : '';
  }

  return (
    <header className={cn("flex h-16 items-center justify-between px-4 lg:px-8 bg-card sticky top-0 z-30 institutional-header")}>
        <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="shrink-0" />
            <h1 className="font-black text-lg truncate pr-2 uppercase tracking-tight text-slate-800">{getPageTitle(pathname)}</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
            {/* Global Offline Mode Indicator for Auditors */}
            {isAuditor && (
                <Badge 
                    variant={isOnline && !isForcedOffline ? "outline" : "destructive"} 
                    className={cn(
                        "hidden sm:flex h-9 px-4 font-black uppercase text-[9px] gap-2 border-primary/20 shadow-sm transition-all duration-500",
                        isOnline && !isForcedOffline ? "bg-white text-primary" : "bg-destructive text-white animate-in zoom-in"
                    )}
                >
                    {isForcedOffline ? (
                        <Lock className="h-3 w-3" />
                    ) : isOnline ? (
                        <Wifi className="h-3 w-3 text-emerald-500" />
                    ) : (
                        <WifiOff className="h-3 w-3 animate-pulse" />
                    )}
                    {isForcedOffline ? 'FORCED OFFLINE' : isOnline ? 'Online Registry' : 'Offline Mode Active'}
                </Badge>
            )}

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className={cn(
                                "hidden lg:flex h-9 w-9 rounded-full transition-all",
                                isGuidanceVisible ? "text-primary bg-primary/5" : "text-muted-foreground"
                            )}
                            onClick={onToggleGuidance}
                        >
                            {isGuidanceVisible ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-[10px] font-black uppercase">{isGuidanceVisible ? 'Hide Guide' : 'Show Guide'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <ContextualHelp />
            <UserNav 
                user={user} 
                userProfile={userProfile} 
                notificationCount={notificationCount} 
                totalNotificationsCount={totalNotificationsCount}
                notificationsList={notificationsList}
            />
        </div>
    </header>
  );
}
