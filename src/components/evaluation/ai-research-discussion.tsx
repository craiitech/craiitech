'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useWebLlm } from '@/context/web-llm-provider';
import { iso25010Categories } from '@/lib/iso-25010-data';
import { copyToClipboard } from '@/lib/evaluation-export';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Bot,
  Sparkles,
  RotateCcw,
  Loader2,
  Copy,
  CheckCircle2,
  BookOpenText,
  ChevronDown,
  ChevronUp,
  Wand2,
} from 'lucide-react';

interface SubStat {
  id: string;
  name: string;
  mean: number;
  desc: string;
}

interface CatStat {
  id: string;
  name: string;
  mean: number;
  sd: number;
  subs: SubStat[];
}

interface AiResearchDiscussionProps {
  evaluationCount: number;
  overallMean: number;
  overallSD: number;
  categories: CatStat[];
  onDiscussionsChange: (discussions: { section: string; content: string }[]) => void;
}

interface DiscussionSection {
  key: string;
  section: string;
  prompt: string;
  contextData: Record<string, unknown>;
}

export function AiResearchDiscussion({
  evaluationCount,
  overallMean,
  overallSD,
  categories,
  onDiscussionsChange,
}: AiResearchDiscussionProps) {
  const { isAiEnabled, status, generateResearchDiscussion } = useWebLlm();
  const { toast } = useToast();
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [generatingAll, setGeneratingAll] = useState(false);
  const [expanded, setExpanded] = useState<string | null>('overall');
  const resultsRef = useRef(results);
  resultsRef.current = results;

  const sections: DiscussionSection[] = useMemo(() => {
    const catSections: DiscussionSection[] = categories.map((cat) => {
      const isoCat = iso25010Categories.find((c) => c.id === cat.id);
      return {
        key: cat.id,
        section: cat.name,
        prompt: `Provide the academic "Discussion of Findings" for the ${cat.name} quality characteristic of the RSU EOMS Submission Portal.`,
        contextData: {
          categoryName: cat.name,
          categoryDescription: isoCat?.description,
          categoryMean: cat.mean,
          categorySD: cat.sd,
          subCharacteristics: cat.subs.map((s) => ({ name: s.name, mean: s.mean, desc: s.desc })),
          overallMean,
        },
      };
    });

    const overallSection: DiscussionSection = {
      key: 'overall',
      section: 'Overall Maturity Index',
      prompt:
        'Provide the academic "Discussion of Findings" for the overall ISO/IEC 25010 software quality evaluation of the RSU EOMS Submission Portal.',
      contextData: {
        overallMean,
        overallSD,
        evaluationCount,
        categories: categories.map((c) => ({ name: c.name, mean: c.mean, sd: c.sd })),
      },
    };

    return [overallSection, ...catSections];
  }, [categories, evaluationCount, overallMean, overallSD]);

  const notifyParent = useCallback(
    (next: Record<string, string>) => {
      const list = sections.filter((s) => next[s.key]).map((s) => ({ section: s.section, content: next[s.key] }));
      onDiscussionsChange(list);
    },
    [sections, onDiscussionsChange],
  );

  const generateSection = useCallback(
    async (section: DiscussionSection) => {
      setLoading((prev) => ({ ...prev, [section.key]: true }));
      try {
        const content = await generateResearchDiscussion(section.prompt, section.contextData);
        setResults((prev) => {
          const next = { ...prev, [section.key]: content };
          notifyParent(next);
          return next;
        });
      } catch (e) {
        console.warn('AI research discussion generation failed:', e);
        toast({
          title: 'AI Generation Failed',
          description: 'Could not generate the discussion. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading((prev) => ({ ...prev, [section.key]: false }));
      }
    },
    [generateResearchDiscussion, notifyParent, toast],
  );

  const generateAll = useCallback(async () => {
    setGeneratingAll(true);
    for (const section of sections) {
      if (!resultsRef.current[section.key]) {
        await generateSection(section);
      }
    }
    setGeneratingAll(false);
    toast({ title: 'Discussion Complete', description: 'All AI research discussions were generated.' });
  }, [sections, generateSection, toast]);

  const handleCopyAll = async () => {
    const list = sections
      .filter((s) => resultsRef.current[s.key])
      .map((s) => `### ${s.section}\n\n${resultsRef.current[s.key].trim()}`)
      .join('\n\n');
    if (!list) {
      toast({ title: 'Nothing to Copy', description: 'Generate the discussions first.', variant: 'destructive' });
      return;
    }
    const ok = await copyToClipboard(list);
    if (ok) toast({ title: 'Copied', description: 'All AI discussions copied to clipboard.' });
    else toast({ title: 'Copy failed', variant: 'destructive' });
  };

  const generatedCount = sections.filter((s) => results[s.key]).length;
  const isReady = isAiEnabled && status === 'ready';

  return (
    <Card className="shadow-md overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/[0.06] via-primary/[0.03] to-transparent border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpenText className="h-5 w-5 text-primary" />
              AI Research Discussion of Findings
            </CardTitle>
            <CardDescription>
              On-device local AI (WebLLM) interpretations of the evaluation results for use in the research paper.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isReady && (
              <Badge className="text-[9px] font-black uppercase border-none bg-emerald-500/10 text-emerald-600">
                <Sparkles className="h-3 w-3 mr-1" /> WebLLM Active
              </Badge>
            )}
            {!isReady && (
              <Badge variant="outline" className="text-[9px] font-black uppercase">
                Template Mode
              </Badge>
            )}
            <Badge variant="outline" className="text-[9px] font-black uppercase">
              {generatedCount}/{sections.length} Generated
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-3">
          <Button size="sm" className="h-8 text-xs font-bold gap-1.5" onClick={generateAll} disabled={generatingAll}>
            {generatingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            Generate All Discussions
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1.5" onClick={handleCopyAll}>
            <Copy className="h-3.5 w-3.5" /> Copy All
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {sections.map((section) => {
            const isOpen = expanded === section.key;
            const isLoading = loading[section.key];
            const content = results[section.key];

            return (
              <div
                key={section.key}
                className={cn(
                  'rounded-lg border bg-card shadow-sm overflow-hidden',
                  section.key === 'overall' && 'lg:col-span-2',
                )}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpanded(isOpen ? null : section.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpanded(isOpen ? null : section.key);
                    }
                  }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wider truncate">{section.section}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {content ? 'Discussion generated' : 'Click to generate'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {content && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-primary rounded-full"
                        title="Regenerate discussion"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateSection(section);
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isOpen ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t bg-muted/5 px-4 py-4">
                    {isLoading ? (
                      <div className="flex items-center gap-2 text-primary animate-pulse font-medium">
                        <Bot className="h-4 w-4 animate-bounce" />
                        Drafting academic discussion...
                      </div>
                    ) : content ? (
                      <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {content.split('\n').map((line, i) => (
                          <p key={i} className={cn('whitespace-pre-line', i > 0 && 'mt-2')}>
                            {line}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Bot className="h-4 w-4" />
                        No discussion yet. Click the sparkle button or &quot;Generate All Discussions&quot;.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
