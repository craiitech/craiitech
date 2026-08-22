'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { useUser } from '@/firebase';
import { VoiceAnnouncements } from './voice-announcements';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { VolumeX } from 'lucide-react';

type VoiceContextValue = {
  speak: (text: string) => void;
  stop: () => void;
  enabled: boolean;
  setEnabled: (val: boolean) => void;
  queueAnnouncement: (text: string) => void;
};

const VoiceCtx = createContext<VoiceContextValue>({
  speak: () => {},
  stop: () => {},
  enabled: false,
  setEnabled: () => {},
  queueAnnouncement: () => {},
});

interface VoiceProviderProps {
  children: ReactNode;
  suppressPrompt?: boolean;
}

export function VoiceProvider({ children, suppressPrompt = false }: VoiceProviderProps) {
  const [enabled, setEnabledState] = useState(false);
  const [isVoicePromptOpen, setIsVoicePromptOpen] = useState(false);
  const { user, userProfile, isUserLoading } = useUser();
  const welcomed = useRef(false);
  const enabledRef = useRef(false);
  const pendingAnnouncement = useRef<string | null>(null);
  const bestVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadVoices = () => {
      const voices = window.speechSynthesis?.getVoices();
      if (!voices?.length || bestVoiceRef.current) return;

      const preferredPrefixes = ['Google US English', 'Samantha', 'Karen', 'Moira', 'Tessa', 'Fiona', 'Alex'];
      for (const prefix of preferredPrefixes) {
        const found = voices.find((v) => v.name === prefix || v.name.startsWith(prefix));
        if (found) {
          bestVoiceRef.current = found;
          return;
        }
      }

      const englishVoice = voices.find((v) => v.lang?.startsWith('en'));
      bestVoiceRef.current = englishVoice || voices[0];
    };

    loadVoices();
    window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('rsu_eoms_voice_enabled');
    const prefersReduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const initial = stored !== null ? stored === 'true' : !prefersReduced;
    setEnabledState(initial);
    enabledRef.current = initial;
  }, []);

  const setEnabled = useCallback((val: boolean) => {
    setEnabledState(val);
    enabledRef.current = val;
    localStorage.setItem('rsu_eoms_voice_enabled', String(val));
    if (!val && typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!enabledRef.current || typeof window === 'undefined') return;
    window.speechSynthesis?.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 0.85;
    msg.pitch = 1.05;
    if (bestVoiceRef.current) msg.voice = bestVoiceRef.current;
    window.speechSynthesis?.speak(msg);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
  }, []);

  const playWelcome = useCallback(
    (name: string) => {
      if (typeof window === 'undefined') return;
      try {
        window.speechSynthesis?.cancel();
        const msg = new SpeechSynthesisUtterance(`Welcome to RSU EOMS Portal, ${name}`);
        msg.rate = 0.85;
        msg.pitch = 1.05;
        if (bestVoiceRef.current) msg.voice = bestVoiceRef.current;
        msg.onend = () => {
          if (pendingAnnouncement.current) {
            const textToSpeak = pendingAnnouncement.current;
            pendingAnnouncement.current = null;
            setTimeout(() => {
              speak(textToSpeak);
            }, 1500);
          }
        };
        window.speechSynthesis?.speak(msg);
      } catch {
        void 0;
      }
    },
    [speak],
  );

  const queueAnnouncement = useCallback(
    (text: string) => {
      if (!enabledRef.current || typeof window === 'undefined') return;

      if (welcomed.current) {
        if (window.speechSynthesis?.speaking) {
          pendingAnnouncement.current = text;
        } else {
          setTimeout(() => {
            speak(text);
          }, 1000);
        }
      } else {
        pendingAnnouncement.current = text;
      }
    },
    [speak],
  );

  // Keep latest userProfile in a ref so one-time effects can read it
  const userProfileRef = useRef(userProfile);
  const isUserLoadingRef = useRef(isUserLoading);
  userProfileRef.current = userProfile;
  isUserLoadingRef.current = isUserLoading;

  // Prompt user on login session asking if they want to turn off voice announcements
  // Only shows when NOT suppressed by higher-priority gates (e.g. software evaluation gate)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isUserLoading || !user || !userProfile || userProfile.verified === false || suppressPrompt) {
      if (suppressPrompt) {
        setIsVoicePromptOpen(false);
      }
      return;
    }

    const alreadyAnswered = sessionStorage.getItem('rsu_eoms_voice_prompt_answered_session') === 'true';
    if (!alreadyAnswered) {
      const timer = setTimeout(() => {
        setIsVoicePromptOpen(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isUserLoading, user, userProfile, suppressPrompt]);

  const handleTurnOffVoice = useCallback(() => {
    setEnabled(false);
    welcomed.current = true;
    pendingAnnouncement.current = null;
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
      sessionStorage.setItem('rsu_eoms_voice_prompt_answered_session', 'true');
    }
    setIsVoicePromptOpen(false);
  }, [setEnabled]);

  const handleKeepVoiceOn = useCallback(() => {
    setEnabled(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('rsu_eoms_voice_prompt_answered_session', 'true');
    }
    setIsVoicePromptOpen(false);

    if (!welcomed.current && userProfile && userProfile.verified !== false) {
      welcomed.current = true;
      const name =
        [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') ||
        userProfile.email?.split('@')[0] ||
        'User';
      setTimeout(() => {
        playWelcome(name);
      }, 500);
    }
  }, [setEnabled, playWelcome, userProfile]);

  // Speak welcome on first user interaction (satisfies browser autoplay policy) if prompt already answered
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('rsu_eoms_announcement_spoken_session') === 'true') return;

    const onInteraction = () => {
      const promptAnswered = sessionStorage.getItem('rsu_eoms_voice_prompt_answered_session') === 'true';
      if (!promptAnswered || welcomed.current || !enabledRef.current) return;
      const profile = userProfileRef.current;
      if (!profile || isUserLoadingRef.current || profile.verified === false) return;
      welcomed.current = true;
      const name =
        [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email?.split('@')[0] || 'User';
      window.removeEventListener('pointerdown', onInteraction);
      window.removeEventListener('keydown', onInteraction);
      playWelcome(name);
    };
    window.addEventListener('pointerdown', onInteraction);
    window.addEventListener('keydown', onInteraction);
    return () => {
      window.removeEventListener('pointerdown', onInteraction);
      window.removeEventListener('keydown', onInteraction);
    };
  }, [playWelcome]);

  // Fallback: if profile loads and enabled, speak welcome once prompt answered
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('rsu_eoms_announcement_spoken_session') === 'true') return;
    if (welcomed.current) return;

    const promptAnswered = sessionStorage.getItem('rsu_eoms_voice_prompt_answered_session') === 'true';
    if (!promptAnswered) return;

    if (!isUserLoading && userProfile && userProfile.verified !== false && enabledRef.current) {
      welcomed.current = true;
      const name =
        [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') ||
        userProfile.email?.split('@')[0] ||
        'User';
      const timer = setTimeout(() => {
        playWelcome(name);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isUserLoading, userProfile, playWelcome]);

  // Reset welcomed state and cancel speech on logout
  useEffect(() => {
    if (!isUserLoading && !user) {
      welcomed.current = false;
      pendingAnnouncement.current = null;
      setIsVoicePromptOpen(false);
      if (typeof window !== 'undefined') {
        window.speechSynthesis?.cancel();
        try {
          sessionStorage.removeItem('rsu_eoms_announcement_spoken_session');
          sessionStorage.removeItem('rsu_eoms_voice_prompt_answered_session');
        } catch {
          void 0;
        }
      }
    }
  }, [isUserLoading, user]);

  return (
    <VoiceCtx.Provider value={{ speak, stop, enabled, setEnabled, queueAnnouncement }}>
      <VoiceAnnouncements />
      {children}

      {/* ================================================================== */}
      {/* LOGIN VOICE PREFERENCE PROMPT ALERT DIALOG                         */}
      {/* ================================================================== */}
      <AlertDialog
        open={isVoicePromptOpen}
        onOpenChange={(open) => {
          setIsVoicePromptOpen(open);
          if (!open && typeof window !== 'undefined') {
            sessionStorage.setItem('rsu_eoms_voice_prompt_answered_session', 'true');
          }
        }}
      >
        <AlertDialogContent className="max-w-md p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
          <AlertDialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <VolumeX className="h-5 w-5" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                  Turn Off Voice Announcements?
                </AlertDialogTitle>
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Audio Preference
                </p>
              </div>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium pt-1">
              Would you like to turn off automatic voice announcements and speech audio for this session? You can also
              toggle this at any time using the speaker button in the top navigation bar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <AlertDialogCancel
              onClick={handleKeepVoiceOn}
              className="h-9 text-xs font-bold uppercase tracking-wider border-slate-200 dark:border-slate-700"
            >
              No, Keep Voice On
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTurnOffVoice}
              className="h-9 text-xs font-black uppercase tracking-wider bg-destructive hover:bg-destructive/90 text-white shadow-md border-none"
            >
              <VolumeX className="h-4 w-4 mr-1.5" />
              Yes, Turn Off Voice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </VoiceCtx.Provider>
  );
}

export const useVoice = () => useContext(VoiceCtx);
