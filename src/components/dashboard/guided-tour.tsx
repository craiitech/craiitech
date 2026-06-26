'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ArrowRight, ArrowLeft, X, Check, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type TourStep = {
  target: string;
  title: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
};

const tourSteps: TourStep[] = [
  {
    target: '[data-sidebar="sidebar"]',
    title: 'Sidebar Navigation Menu',
    content: 'This sidebar holds links to all EOMS modules. The menus adjust dynamically based on your verified role—whether you are a Coordinator, Director, Auditor, or Administrator.',
    placement: 'right'
  },
  {
    target: '[data-tour="dark-mode-toggle"]',
    title: 'Dark / Light Mode Toggle',
    content: 'Switch between Dark and Light themes using this toggle in the sidebar. Choose the mode that reduces eye strain and suits your working environment.',
    placement: 'right'
  },
  {
    target: 'h1',
    title: 'Dynamic Module Header',
    content: 'Displays the active dashboard page or workflow. Use it as a quick locator tag to know where you are in the compliance hierarchy.',
    placement: 'bottom'
  },
  {
    target: 'button[title="Page Navigation Help"]',
    title: 'Contextual Help Dialogue',
    content: 'Click this "?" icon on any page to open a quick modal control legend. It displays clear procedures, step checklists, and badge details for the active tab.',
    placement: 'bottom'
  },
  {
    target: 'button[title="Hide Guide"], button[title="Show Guide"]',
    title: 'Operational Guide Panel',
    content: 'Toggle this panel to view a step-by-step checklist aligned with the current module, letting you work on audits or submissions with inline instructions.',
    placement: 'left'
  },
  {
    target: '.sidebar-submissions-link, a[href*="/submissions"]',
    title: 'EOMS Submission Hub',
    content: 'The central workflow for ISO 7.5.3 document control. Upload, revise, and track the 6 mandatory EOMS documents through Draft and Final cycles.',
    placement: 'right'
  },
  {
    target: 'a[href*="/risk-register"]',
    title: 'Risk & Opportunity Registry',
    content: 'Log institutional threats and opportunities with likelihood/consequence ratings. Mandatory Action Plans are auto-triggered for medium-to-high magnitude risks.',
    placement: 'right'
  },
  {
    target: '.user-nav-avatar, button[id*="user-nav"]',
    title: 'User Menu & Accessibility Controls',
    content: 'Click here to access your profile settings. You can modify names, customize font sizes, switch to high contrast mode, activate the Dyslexic font (PWD support), or toggle dark mode.',
    placement: 'bottom'
  },
  {
    target: 'button.fixed.bottom-4.right-4',
    title: 'QA Support Chatbot',
    content: 'Have questions about SSL setup, RA 10173 account erasure, or EOMS folder linkages? Launch this chatbot for instant support. Type your question or pick a suggested query.',
    placement: 'left'
  }
];

export function GuidedTour() {
  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const currentStep = tourSteps[stepIndex];
  
  useEffect(() => {
    // Check if user has seen tour before
    const hasSeenTour = localStorage.getItem('rsu_eoms_tour_completed');
    if (!hasSeenTour) {
      // Auto-trigger tour after a small delay on first visit
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for custom trigger events (from page guidance or menus)
  useEffect(() => {
    const startTour = () => {
      setStepIndex(0);
      setIsActive(true);
    };
    window.addEventListener('rsu-start-guided-tour', startTour);
    return () => window.removeEventListener('rsu-start-guided-tour', startTour);
  }, []);

  // Recalculate target element position
  useEffect(() => {
    if (!isActive) {
      setTargetRect(null);
      return;
    }

    const updatePosition = () => {
      const selector = currentStep.target;
      const element = document.querySelector(selector);
      if (element) {
        // Scroll element into view if needed
        element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        setTargetRect(element.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    // Run immediately
    updatePosition();

    // Re-run on window events
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    // Give standard DOM transitions time to settle
    const timer = setTimeout(updatePosition, 100);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      clearTimeout(timer);
    };
  }, [isActive, stepIndex, currentStep]);

  if (!isActive) return null;

  const handleNext = () => {
    if (stepIndex < tourSteps.length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    localStorage.setItem('rsu_eoms_tour_completed', 'true');
  };

  const popupStyle = {
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    position: 'fixed' as const
  };

  return (
    <>
      {/* Dimmed Overlay with circular spotlight */}
      <div className="fixed inset-0 z-[9998] bg-slate-950/45 backdrop-blur-[1.5px] pointer-events-auto" />

      {/* Dynamic spotlight spotlight path */}
      {targetRect && (
        <div 
          className="fixed pointer-events-none z-[9998] rounded-xl border-[3px] border-primary shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] transition-all duration-300 ease-out"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      {/* Tour Step Card dialog */}
      <div 
        className="fixed z-[9999] w-[340px] max-w-[90vw] pointer-events-auto transition-all duration-300 ease-out"
        style={popupStyle}
      >
        <Card className="border-primary/20 shadow-2xl bg-white/95 backdrop-blur-md overflow-hidden transform-gpu">
          <CardHeader className="bg-primary/5 border-b py-3 px-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">Guided System Tour</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-muted-foreground uppercase">{stepIndex + 1} of {tourSteps.length}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 rounded-full hover:bg-slate-200" 
                onClick={handleComplete}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-3 px-4 space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-tight">{currentStep.title}</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed italic">
              "{currentStep.content}"
            </p>
          </CardContent>
          <CardFooter className="bg-slate-50 dark:bg-slate-800/50 border-t py-2.5 px-4 flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-[9px] font-black uppercase" 
              onClick={handleBack}
              disabled={stepIndex === 0}
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-1.5">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-[9px] font-black uppercase hover:bg-destructive/5 hover:text-destructive border-slate-200 dark:border-slate-700"
                onClick={handleComplete}
              >
                Skip
              </Button>
              <Button 
                size="sm" 
                className="h-7 text-[9px] font-black uppercase px-4" 
                onClick={handleNext}
              >
                {stepIndex === tourSteps.length - 1 ? (
                  <>
                    Finish
                    <Check className="h-3 w-3 ml-1" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
