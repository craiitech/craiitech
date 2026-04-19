
'use client';

import { usePathname } from 'next/navigation';
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
import { helpContent } from '@/lib/contextual-help-data';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * CONTEXTUAL HELP COMPONENT
 * Detects the current route and provides an AlertDialog with navigation and management guidance.
 */
export function ContextualHelp() {
  const pathname = usePathname();

  // Find exact match or fallback to navigation guide
  const currentHelp = helpContent[pathname] || {
    title: 'Navigation Assistant',
    content: [
      'Use the sidebar on the left to navigate between different EOMS modules.',
      'Your institutional role determines which data and actions are visible to you.',
      'For technical support, contact the CRAIITech team or use the internal Chatbot agent.',
    ],
  };

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
            <Lightbulb className="h-5 w-5 animate-pulse" />
            <AlertDialogTitle className="text-sm font-black uppercase tracking-[0.2em]">{currentHelp.title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground pt-2">
                <ScrollArea className="max-h-[300px] pr-4">
                    <div className="space-y-5">
                        {currentHelp.content.map((item, i) => (
                        <div key={i} className="flex gap-4 items-start group">
                            <div className="h-2 w-2 rounded-full bg-primary/20 mt-1.5 shrink-0 group-hover:bg-primary transition-colors" />
                            <p className="text-xs text-slate-700 leading-relaxed font-bold italic">"{item}"</p>
                        </div>
                        ))}
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
              <AlertDialogAction className="bg-primary font-black uppercase text-[10px] tracking-widest px-10 h-10 shadow-lg shadow-primary/20">
                Proceed to Task
              </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
