'use client';

import { WebLlmProvider } from '@/context/web-llm-provider';

export default function ExecutiveDisplayLayout({ children }: { children: React.ReactNode }) {
  return <WebLlmProvider>{children}</WebLlmProvider>;
}
