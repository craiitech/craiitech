'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { useUser } from '@/firebase';
import { VoiceAnnouncements } from './voice-announcements';

type VoiceContextValue = {
  speak: (text: string) => void;
  stop: () => void;
  enabled: boolean;
  setEnabled: (val: boolean) => void;
};

const VoiceCtx = createContext<VoiceContextValue>({
  speak: () => {},
  stop: () => {},
  enabled: false,
  setEnabled: () => {},
});

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const { userProfile, isUserLoading } = useUser();
  const welcomed = useRef(false);
  const enabledRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem('rsu_eoms_voice_enabled');
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    window.speechSynthesis?.speak(msg);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
  }, []);

  // Speak welcome immediately on first user click (satisfies browser autoplay policy)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onInteraction = () => {
      if (welcomed.current || !enabledRef.current) return;
      if (!userProfile || isUserLoading || userProfile.verified === false) return;
      welcomed.current = true;
      const name = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || userProfile.email?.split('@')[0] || 'User';
      try {
        window.speechSynthesis?.cancel();
        const msg = new SpeechSynthesisUtterance(`Welcome to RSU EOMS Portal, ${name}`);
        msg.rate = 0.85;
        window.speechSynthesis?.speak(msg);
      } catch {}
    };
    window.addEventListener('pointerdown', onInteraction, { once: true });
    window.addEventListener('keydown', onInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onInteraction);
      window.removeEventListener('keydown', onInteraction);
    };
  }, [userProfile, isUserLoading]);

  // Fallback: if profile loads after the click, speak welcome once ready
  useEffect(() => {
    if (!isUserLoading && userProfile && userProfile.verified !== false && !welcomed.current && enabledRef.current) {
      welcomed.current = true;
      const name = [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || userProfile.email?.split('@')[0] || 'User';
      const timer = setTimeout(() => {
        speak(`Welcome to RSU EOMS Portal, ${name}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isUserLoading, userProfile, speak]);

  return (
    <VoiceCtx.Provider value={{ speak, stop, enabled, setEnabled }}>
      <VoiceAnnouncements />
      {children}
    </VoiceCtx.Provider>
  );
}

export const useVoice = () => useContext(VoiceCtx);
