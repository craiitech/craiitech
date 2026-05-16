'use client';

import { usePathname } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { UserNav } from '@/components/dashboard/user-nav';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ContextualHelp } from './contextual-help';
import { Button } from '@/components/ui/button';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HeaderProps {
    notificationCount: number;
    isGuidanceVisible: boolean;
    onToggleGuidance: () => void;
}


export function Header({ notificationCount, isGuidanceVisible, onToggleGuidance }: HeaderProps) {
  const firebaseState = useFirebase();
  const pathname = usePathname();

  const { user, userProfile } = firebaseState;

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
            <SidebarTrigger className="md:hidden shrink-0" />
            <h1 className="font-black text-lg truncate pr-2 uppercase tracking-tight text-slate-800">{getPageTitle(pathname)}</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
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
            <UserNav user={user} userProfile={userProfile} notificationCount={notificationCount} />
        </div>
    </header>
  );
}
