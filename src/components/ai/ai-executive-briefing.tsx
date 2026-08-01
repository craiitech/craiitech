'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWebLlm } from '@/context/web-llm-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/lib/evaluation-export';
import { useToast } from '@/hooks/use-toast';
import { Bot, Sparkles, Loader2, Copy, Check, RotateCcw, BrainCircuit } from 'lucide-react';

interface AiExecutiveBriefingProps {
  contextData?: Record<string, unknown>;
  className?: string;
}

/**
 * ADMIN-ONLY Executive AI Briefing card.
 * Renders only for admins; non-admins see nothing. Uses the locally loaded WebLLM
 * model (or a rule-based fallback when WebGPU/engine is unavailable).
 */
export function AiExecutiveBriefing({ contextData, className = '' }: AiExecutiveBriefingProps) {
  const { isAdminOnly, isAiEnabled, status, generateExecutiveBriefing } = useWebLlm();
  const { toast } = useToast();
  const [briefing, setBriefing] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!isAdminOnly) return;
    setIsGenerating(true);
    try {
      const result = await generateExecutiveBriefing(
        'Provide an executive briefing on the current institutional EOMS quality posture, its most critical gaps, and the prioritized actions required.',
        contextData,
      );
      setBriefing(result);
    } catch (e) {
      console.warn('Executive AI briefing generation failed:', e);
    } finally {
      setIsGenerating(false);
    }
  }, [isAdminOnly, contextData, generateExecutiveBriefing]);

  useEffect(() => {
    if (isAdminOnly) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOnly, JSON.stringify(contextData)]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(briefing);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  // Admin-only: render nothing for non-admins.
  if (!isAdminOnly) return null;

  const isReady = isAiEnabled && status === 'ready';

  return (
    <Card className={cn('border-primary/20 shadow-lg overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              Executive AI Briefing
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
              Local on-device AI synthesis of institutional compliance posture
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isReady ? (
              <Badge className="text-[8px] font-black uppercase border-none px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-2.5 w-2.5 mr-1" /> WebLLM Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-1">
                Template Mode
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {status === 'ready' ? 'On-device model loaded' : 'Admin-only · Local AI · No cloud'}
          </p>
          <div className="flex items-center gap-1">
            {briefing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary rounded-full"
                title="Copy briefing"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary rounded-full"
              title="Regenerate briefing"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 p-4 min-h-[110px]">
          {isGenerating ? (
            <span className="inline-flex items-center gap-2 text-primary animate-pulse font-medium">
              <Bot className="h-4 w-4 animate-bounce" /> Synthesizing executive briefing from live metrics...
            </span>
          ) : briefing ? (
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{briefing}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click the refresh icon to generate an AI executive briefing based on the current compliance metrics.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
