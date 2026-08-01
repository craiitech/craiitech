'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser } from '@/firebase';
import {
  AVAILABLE_WEBLLM_MODELS,
  WebLlmModelInfo,
  checkCachedWebLlmModel,
  initWebLlmEngine,
  generateWebLlmDiscussion,
  generateWebLlmResearchDiscussion,
  generateWebLlmExecutiveBriefing,
  fallbackDiscussionGenerator,
  fallbackSoftwareQualityDiscussionGenerator,
  fallbackExecutiveBriefingGenerator,
} from '@/lib/web-llm-service';

export type WebLlmStatus = 'disabled' | 'uninitialized' | 'checking_cache' | 'downloading' | 'ready' | 'error';

interface WebLlmContextType {
  isAdminOnly: boolean;
  isAiEnabled: boolean;
  status: WebLlmStatus;
  downloadProgress: number;
  downloadText: string;
  selectedModel: string;
  availableModels: WebLlmModelInfo[];
  isModelSelectorOpen: boolean;
  toggleAi: () => void;
  selectAndLoadModel: (modelId: string) => Promise<void>;
  closeModelSelector: () => void;
  generateDiscussion: (prompt: string, contextData?: Record<string, unknown>) => Promise<string>;
  generateResearchDiscussion: (prompt: string, contextData?: Record<string, unknown>) => Promise<string>;
  generateExecutiveBriefing: (prompt: string, contextData?: Record<string, unknown>) => Promise<string>;
}

const WebLlmContext = createContext<WebLlmContextType>({
  isAdminOnly: false,
  isAiEnabled: false,
  status: 'disabled',
  downloadProgress: 0,
  downloadText: '',
  selectedModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  availableModels: AVAILABLE_WEBLLM_MODELS,
  isModelSelectorOpen: false,
  toggleAi: () => {},
  selectAndLoadModel: async () => {},
  closeModelSelector: () => {},
  generateDiscussion: async () => '',
  generateResearchDiscussion: async () => '',
  generateExecutiveBriefing: async () => '',
});

export function WebLlmProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin, userRole } = useUser();
  const isAdminUser = isAdmin || userRole === 'Admin';

  const [isAiEnabled, setIsAiEnabled] = useState<boolean>(false);
  const [status, setStatus] = useState<WebLlmStatus>('disabled');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadText, setDownloadText] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('Llama-3.2-1B-Instruct-q4f16_1-MLC');
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState<boolean>(false);

  // Load saved preference on mount
  useEffect(() => {
    if (!isAdminUser) {
      setIsAiEnabled(false);
      setStatus('disabled');
      return;
    }

    const savedState = localStorage.getItem('rsu_admin_ai_enabled');
    const enabled = savedState === 'true';
    setIsAiEnabled(enabled);

    if (enabled) {
      autoCheckAndLoadCache();
    } else {
      setStatus('disabled');
    }
  }, [isAdminUser]);

  /**
   * Automatically check browser cache for cached WebLLM models and load automatically
   */
  const autoCheckAndLoadCache = useCallback(async () => {
    if (!isAdminUser) return;

    setStatus('checking_cache');
    try {
      const cachedModelId = await checkCachedWebLlmModel();

      if (cachedModelId) {
        setSelectedModel(cachedModelId);
        await startEngineLoading(cachedModelId);
      } else {
        // No cached model found -> prompt Admin to select model
        setStatus('uninitialized');
        setIsModelSelectorOpen(true);
      }
    } catch (e) {
      console.warn('Error during WebLLM cache auto-check:', e);
      setStatus('uninitialized');
      setIsModelSelectorOpen(true);
    }
  }, [isAdminUser]);

  /**
   * Loads selected WebLLM model into background engine with progress monitoring
   */
  const startEngineLoading = async (modelId: string) => {
    setStatus('downloading');
    setDownloadProgress(5);
    setDownloadText('Connecting to WebLLM model engine...');

    try {
      await initWebLlmEngine(modelId, (report) => {
        setDownloadText(report.text);
        if (report.progress) {
          setDownloadProgress(Math.round(report.progress * 100));
        }
      });

      setStatus('ready');
      setDownloadProgress(100);
      setDownloadText('WebLLM Engine Ready');
    } catch (err) {
      console.error('Failed to load WebLLM model:', err);
      setStatus('error');
      setDownloadText('Error loading WebLLM engine');
    }
  };

  const toggleAi = useCallback(() => {
    if (!isAdminUser) return;

    setIsAiEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('rsu_admin_ai_enabled', String(next));

      if (next) {
        autoCheckAndLoadCache();
      } else {
        setStatus('disabled');
      }
      return next;
    });
  }, [isAdminUser, autoCheckAndLoadCache]);

  const selectAndLoadModel = useCallback(
    async (modelId: string) => {
      if (!isAdminUser) return;

      setSelectedModel(modelId);
      setIsModelSelectorOpen(false);
      localStorage.setItem('rsu_webllm_selected_model', modelId);
      await startEngineLoading(modelId);
    },
    [isAdminUser],
  );

  const closeModelSelector = useCallback(() => {
    setIsModelSelectorOpen(false);
  }, []);

  const generateDiscussion = useCallback(
    async (prompt: string, contextData?: Record<string, unknown>): Promise<string> => {
      if (!isAdminUser || !isAiEnabled) {
        return fallbackDiscussionGenerator(prompt, contextData);
      }
      return generateWebLlmDiscussion(prompt, contextData);
    },
    [isAdminUser, isAiEnabled],
  );

  const generateResearchDiscussion = useCallback(
    async (prompt: string, contextData?: Record<string, unknown>): Promise<string> => {
      if (!isAdminUser || !isAiEnabled) {
        return fallbackSoftwareQualityDiscussionGenerator(prompt, contextData);
      }
      return generateWebLlmResearchDiscussion(prompt, contextData);
    },
    [isAdminUser, isAiEnabled],
  );

  const generateExecutiveBriefing = useCallback(
    async (prompt: string, contextData?: Record<string, unknown>): Promise<string> => {
      if (!isAdminUser || !isAiEnabled) {
        return fallbackExecutiveBriefingGenerator(prompt, contextData);
      }
      return generateWebLlmExecutiveBriefing(prompt, contextData);
    },
    [isAdminUser, isAiEnabled],
  );

  return (
    <WebLlmContext.Provider
      value={{
        isAdminOnly: isAdminUser,
        isAiEnabled,
        status,
        downloadProgress,
        downloadText,
        selectedModel,
        availableModels: AVAILABLE_WEBLLM_MODELS,
        isModelSelectorOpen,
        toggleAi,
        selectAndLoadModel,
        closeModelSelector,
        generateDiscussion,
        generateResearchDiscussion,
        generateExecutiveBriefing,
      }}
    >
      {children}
    </WebLlmContext.Provider>
  );
}

export function useWebLlm() {
  return useContext(WebLlmContext);
}
