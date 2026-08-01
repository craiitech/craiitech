'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWebLlm } from '@/context/web-llm-provider';
import { Sparkles, Bot, RotateCcw, Loader2, Copy, Check, MessageSquareQuote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/lib/evaluation-export';
import { useToast } from '@/hooks/use-toast';

interface AiVisualizationInsightProps {
  title?: string;
  prompt: string;
  contextData?: Record<string, unknown>;
  className?: string;
  autoGenerate?: boolean;
}

export function AiVisualizationInsight({
  title = 'AI Insight',
  prompt,
  contextData,
  className = '',
  autoGenerate = true,
}: AiVisualizationInsightProps) {
  const { isAiEnabled, status, generateResearchDiscussion } = useWebLlm();
  const { toast } = useToast();
  const [discussion, setDiscussion] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = await generateResearchDiscussion(prompt, contextData);
      setDiscussion(result);
    } catch (e) {
      console.warn('AI visualization insight generation failed:', e);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, contextData, generateResearchDiscussion]);

  useEffect(() => {
    if (autoGenerate) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, JSON.stringify(contextData)]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(discussion);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const isReady = isAiEnabled && status === 'ready';

  return (
    <div
      className={cn(
        'rounded-lg border border-primary/20 bg-gradient-to-r from-primary/[0.05] via-primary/[0.02] to-transparent p-3 shadow-sm',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-5 w-5 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MessageSquareQuote className="h-3 w-3" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-primary truncate">{title}</span>
          {isReady ? (
            <Badge className="h-4 text-[8px] font-bold uppercase border-none px-1.5 bg-emerald-500/10 text-emerald-600">
              <Sparkles className="h-2 w-2 mr-0.5" /> AI
            </Badge>
          ) : (
            <Badge variant="outline" className="h-4 text-[8px] font-bold uppercase px-1.5">
              Template
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {discussion && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-primary rounded-full"
              title="Copy insight"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-primary rounded-full"
            title="Discuss result"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            ) : (
              <RotateCcw className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
        {isGenerating ? (
          <span className="inline-flex items-center gap-2 text-primary animate-pulse font-medium">
            <Bot className="h-3.5 w-3.5 animate-bounce" /> Analyzing results...
          </span>
        ) : discussion ? (
          discussion
        ) : (
          'Click the refresh icon to generate an AI discussion of this result.'
        )}
      </p>
    </div>
  );
}
