'use client';

import { useState, useEffect } from 'react';
import { useWebLlm } from '@/context/web-llm-provider';
import { Sparkles, Bot, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AiDiscussionBoxProps {
  topicPrompt: string;
  contextData?: Record<string, unknown>;
  title?: string;
  className?: string;
  autoGenerate?: boolean;
}

export function AiDiscussionBox({
  topicPrompt,
  contextData,
  title = 'Executive AI Discussion',
  className = '',
  autoGenerate = true,
}: AiDiscussionBoxProps) {
  const { isAiEnabled, status, generateDiscussion } = useWebLlm();
  const [discussion, setDiscussion] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateDiscussion(topicPrompt, contextData);
      setDiscussion(result);
    } catch (e) {
      console.warn('AI Discussion generation failed:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (autoGenerate) {
      handleGenerate();
    }
  }, [topicPrompt, JSON.stringify(contextData)]);

  return (
    <div
      className={cn(
        'rounded-xl border border-primary/20 bg-gradient-to-r from-primary/[0.04] via-primary/[0.02] to-transparent p-4 shadow-sm relative overflow-hidden',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-primary">{title}</span>
          {isAiEnabled && status === 'ready' && (
            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              WebLLM Active
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="h-6 w-6 text-muted-foreground hover:text-primary rounded-full"
          title="Regenerate AI discussion"
        >
          <RotateCcw className={cn('h-3.5 w-3.5', isGenerating && 'animate-spin')} />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed font-normal">
        {isGenerating ? (
          <span className="inline-flex items-center gap-2 text-primary animate-pulse font-medium">
            <Bot className="h-3.5 w-3.5 animate-bounce" /> Synthesizing executive discussion...
          </span>
        ) : (
          discussion || 'No discussion generated.'
        )}
      </p>
    </div>
  );
}
