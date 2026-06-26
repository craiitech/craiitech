'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle, Lightbulb, Map, Info } from 'lucide-react';
import { helpContent, getHelpForPath, type PageHelp } from '@/lib/contextual-help-data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

/**
 * CONTEXTUAL HELP COMPONENT
 * Detects the current route and provides an AlertDialog with navigation and management guidance.
 */
export function ContextualHelp() {
  const pathname = usePathname();

  // Find help content based on current path, or use generic fallback
  const currentHelp = useMemo(() => {
    const help = getHelpForPath(pathname);
    if (help) return help;

    // Fallback consistent with PageHelp interface
    return {
        title: 'Navigation Assistant',
        description: 'Need help navigating this module?',
        steps: [
          { title: 'Sidebar Navigation', desc: 'Use the sidebar on the left to move between different EOMS modules.' },
          { title: 'Role Permissions', desc: 'Your institutional role determines which data and actions are visible to you.' },
          { title: 'Technical Support', desc: 'For technical issues, contact CRAIITech or use the Chatbot.' }
        ],
        buttons: []
    } as PageHelp;
  }, [pathname]);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 rounded-full text-primary hover:bg-primary/5 transition-all hover:scale-110"
            title="Page Navigation Help"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md border-primary/20 shadow-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-primary mb-3">
            <Lightbulb className="h-5 w-5 animate-pulse-slow" />
            <AlertDialogTitle className="text-sm font-black uppercase tracking-[0.2em]">{currentHelp.title}</AlertDialogTitle>
          </div>
          <p className="text-[11px] text-muted-foreground font-bold italic mb-4">"{currentHelp.description}"</p>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground pt-2">
                <ScrollArea className="max-h-[450px] pr-4">
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step-by-Step Procedure</h4>
                            {(currentHelp.steps || []).map((step, i) => (
                            <div key={i} className="flex gap-4 items-start group">
                                <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary group-hover:bg-primary group-hover:text-white transition-colors shrink-0 mt-0.5">
                                    {i + 1}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 tracking-tight">{step.title}</p>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium italic">"{step.desc}"</p>
                                </div>
                            </div>
                            ))}
                        </div>

                        {(currentHelp.buttons?.length ?? 0) > 0 && (
                            <div className="space-y-3 pt-4 border-t">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Control Legend</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {currentHelp.buttons?.map((btn, i) => (
                                        <div key={i} className="p-2.5 rounded-lg border bg-slate-50 dark:bg-slate-800/50 flex items-start gap-3">
                                            <Badge variant="secondary" className="h-5 px-1.5 text-[7px] font-black uppercase shrink-0 mt-0.5">{btn.labelShort || btn.label}</Badge>
                                            <div className="space-y-0.5 min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-tight text-slate-700 dark:text-slate-300 truncate">{btn.label}</p>
                                                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight font-medium">{btn.action}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="border-t pt-4 mt-2">
          <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-1.5 opacity-40">
                  <Map className="h-3 w-3" />
                  <span className="text-[8px] font-black uppercase tracking-tighter">EOMS CONTEXTUAL LAYER</span>
              </div>
              <div className="flex items-center gap-2">
                  <Info className="h-3 w-3 text-muted-foreground" />
                  <AlertDialogAction className="bg-primary font-black uppercase text-[10px] tracking-widest px-10 h-10 shadow-lg shadow-primary/20">
                    Proceed to Task
                  </AlertDialogAction>
              </div>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
