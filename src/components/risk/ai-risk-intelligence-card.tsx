'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Risk } from '@/lib/types';
import { useWebLlm } from '@/context/web-llm-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles,
  Bot,
  RotateCcw,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Flame,
  Copy,
  Check,
  Printer,
  ChevronRight,
  Target,
  Clock,
  Building,
  School,
  UserCheck,
  Cpu,
  Layers,
  FileText,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Timestamp } from '@/firebase/firestore-wrapper';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/lib/evaluation-export';

interface AiRiskIntelligenceCardProps {
  risks: Risk[];
  selectedYear: number;
  unitMap?: Map<string, string>;
  campusMap?: Map<string, string>;
  onSelectRisk?: (risk: Risk) => void;
  className?: string;
}

export function AiRiskIntelligenceCard({
  risks,
  selectedYear,
  unitMap = new Map(),
  campusMap = new Map(),
  onSelectRisk,
  className = '',
}: AiRiskIntelligenceCardProps) {
  const { isAiEnabled, status, selectedModel, generateRiskIntelligence } = useWebLlm();
  const { toast } = useToast();

  const [intelligenceText, setIntelligenceText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedAttentionTab, setSelectedAttentionTab] = useState<'all' | 'high' | 'overdue' | 'escalated'>('all');

  // Filter risks strictly for the selected academic year
  const yearRisks = useMemo(() => {
    return risks.filter((r) => r.year === selectedYear);
  }, [risks, selectedYear]);

  // Compute key risk metrics & top management attention items
  const riskAnalytics = useMemo(() => {
    const now = new Date();
    const risksOnly = yearRisks.filter((r) => r.type === 'Risk');
    const opportunitiesOnly = yearRisks.filter((r) => r.type === 'Opportunity');

    const total = risksOnly.length;
    const openCount = risksOnly.filter((r) => r.status === 'Open').length;
    const inProgressCount = risksOnly.filter((r) => r.status === 'In Progress').length;
    const closedCount = risksOnly.filter((r) => r.status === 'Closed').length;

    const highRisks = risksOnly.filter((r) => r.preTreatment.rating === 'High');
    const mediumRisks = risksOnly.filter((r) => r.preTreatment.rating === 'Medium');
    const lowRisks = risksOnly.filter((r) => r.preTreatment.rating === 'Low');

    // Overdue items
    const overdueRisks = risksOnly.filter((r) => {
      if (r.status === 'Closed' || !r.targetDate) return false;
      const target = r.targetDate instanceof Timestamp ? r.targetDate.toDate() : new Date(r.targetDate);
      return target < now;
    });

    // Escalated or watchlist items
    const escalatedRisks = risksOnly.filter(
      (r) => r.isEscalated || !!r.escalationTrigger || (r.preTreatment.rating === 'Low' && r.escalationTrigger),
    );

    // Risks Needing Immediate Attention by Top Management:
    // 1. High rating unclosed risks
    // 2. Magnitude >= 12 unclosed risks
    // 3. Overdue treatment action plans
    // 4. Escalated threats
    const topAttentionItems = risksOnly
      .filter(
        (r) =>
          r.status !== 'Closed' &&
          (r.preTreatment.rating === 'High' ||
            r.preTreatment.magnitude >= 12 ||
            r.isEscalated ||
            overdueRisks.some((o) => o.id === r.id)),
      )
      .sort((a, b) => b.preTreatment.magnitude - a.preTreatment.magnitude);

    // Grouping by Objectives to isolate vulnerability concentrations
    const objectiveMap = new Map<string, number>();
    risksOnly.forEach((r) => {
      const key = r.objective?.trim() || 'General Institutional Operations';
      objectiveMap.set(key, (objectiveMap.get(key) || 0) + 1);
    });

    const topObjectives = Array.from(objectiveMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Grouping by Campus
    const campusCounts = new Map<string, number>();
    risksOnly.forEach((r) => {
      const cname = campusMap.get(r.campusId) || 'Main / Institutional';
      campusCounts.set(cname, (campusCounts.get(cname) || 0) + 1);
    });

    const resolutionRate = total > 0 ? Math.round((closedCount / total) * 100) : 0;

    return {
      totalRisks: total,
      totalOpportunities: opportunitiesOnly.length,
      openCount,
      inProgressCount,
      closedCount,
      highCount: highRisks.length,
      mediumCount: mediumRisks.length,
      lowCount: lowRisks.length,
      overdueCount: overdueRisks.length,
      escalatedCount: escalatedRisks.length,
      topAttentionItems,
      topObjectives,
      resolutionRate,
      campusCounts: Array.from(campusCounts.entries()).map(([campus, count]) => ({ campus, count })),
    };
  }, [yearRisks, campusMap]);

  // Execute AI generation with Local WebLLM
  const handleGenerateIntelligence = useCallback(async () => {
    setIsGenerating(true);
    try {
      const contextData = {
        year: selectedYear,
        totalRisks: riskAnalytics.totalRisks,
        highRisks: riskAnalytics.highCount,
        mediumRisks: riskAnalytics.mediumCount,
        lowRisks: riskAnalytics.lowCount,
        openCount: riskAnalytics.openCount,
        inProgressCount: riskAnalytics.inProgressCount,
        closedCount: riskAnalytics.closedCount,
        opportunitiesCount: riskAnalytics.totalOpportunities,
        overdueCount: riskAnalytics.overdueCount,
        topObjectives: riskAnalytics.topObjectives.slice(0, 5),
        campusDistribution: riskAnalytics.campusCounts,
        attentionRisks: riskAnalytics.topAttentionItems.slice(0, 8).map((r) => {
          const target = r.targetDate
            ? r.targetDate instanceof Timestamp
              ? format(r.targetDate.toDate(), 'MMM dd, yyyy')
              : format(new Date(r.targetDate), 'MMM dd, yyyy')
            : 'No target set';

          return {
            id: r.id.substring(0, 8),
            description: r.description,
            unitName: unitMap.get(r.unitId) || 'Academic/Admin Unit',
            campusName: campusMap.get(r.campusId) || 'Main Campus',
            magnitude: r.preTreatment.magnitude,
            rating: r.preTreatment.rating,
            status: r.status,
            objective: r.objective || 'General Institutional Operations',
            treatment: r.treatmentAction || 'Pending formulation',
            targetDate: target,
            responsible: r.responsiblePersonName || 'Unit Head',
          };
        }),
      };

      const prompt = `Perform an institutional risk intelligence evaluation for Romblon State University for Academic Year ${selectedYear}. Identify the critical risks demanding top management attention and formulate strategic directives for university leadership.`;

      const result = await generateRiskIntelligence(prompt, contextData);
      setIntelligenceText(result);
    } catch (err) {
      console.error('Failed to generate Local AI Risk Intelligence:', err);
      toast({
        title: 'Analysis Generation Warning',
        description: 'Generated standard institutional risk intelligence using local analytics engine.',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [selectedYear, riskAnalytics, unitMap, campusMap, generateRiskIntelligence, toast]);

  // Trigger initial analysis when component mounts or year changes
  useEffect(() => {
    if (yearRisks.length > 0) {
      handleGenerateIntelligence();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, yearRisks.length]);

  const handleCopy = async () => {
    const success = await copyToClipboard(intelligenceText);
    if (success) {
      setCopied(true);
      toast({
        title: 'Copied to Clipboard',
        description: 'Executive Risk Intelligence report copied successfully.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(`
        <html>
          <head>
            <title>RSU_Executive_Risk_Intelligence_AY${selectedYear}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
              h1 { font-size: 18pt; text-transform: uppercase; margin-bottom: 4px; text-align: center; }
              h2 { font-size: 13pt; text-transform: uppercase; margin-top: 0; color: #475569; text-align: center; }
              .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
              .section-title { font-size: 12pt; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 24px; color: #b91c1c; }
              .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 8pt; font-weight: bold; text-transform: uppercase; background: #fee2e2; color: #991b1b; }
              .kri-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
              .kri-card { border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; text-align: center; background: #f8fafc; }
              .kri-value { font-size: 16pt; font-weight: bold; }
              .kri-label { font-size: 8pt; text-transform: uppercase; color: #64748b; font-weight: bold; margin-top: 4px; }
              .content { white-space: pre-wrap; font-size: 10pt; line-height: 1.7; }
              .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 8pt; color: #94a3b8; text-align: center; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Romblon State University</h1>
              <h2>Quality Assurance Office • Institutional Risk Intelligence Briefing</h2>
              <p style="font-size: 10pt; font-weight: bold; margin-top: 8px;">ACADEMIC YEAR ${selectedYear}</p>
            </div>
            
            <div class="kri-grid">
              <div class="kri-card">
                <div class="kri-value">${riskAnalytics.totalRisks}</div>
                <div class="kri-label">Total Risks Logged</div>
              </div>
              <div class="kri-card">
                <div class="kri-value" style="color: #b91c1c;">${riskAnalytics.topAttentionItems.length}</div>
                <div class="kri-label">Top Mgmt Attention</div>
              </div>
              <div class="kri-card">
                <div class="kri-value" style="color: #d97706;">${riskAnalytics.overdueCount}</div>
                <div class="kri-label">Overdue Mitigations</div>
              </div>
              <div class="kri-card">
                <div class="kri-value" style="color: #15803d;">${riskAnalytics.resolutionRate}%</div>
                <div class="kri-label">Mitigation Closure Rate</div>
              </div>
            </div>

            <div class="content">${intelligenceText}</div>

            <div class="footer">
              Generated via Local On-Device AI Engine • Romblon State University EOMS Portal • ISO 21001:2018 Standard
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const isLlmReady = isAiEnabled && status === 'ready';

  // Filter attention items based on sub-tab
  const displayedAttentionRisks = useMemo(() => {
    if (selectedAttentionTab === 'high') {
      return riskAnalytics.topAttentionItems.filter((r) => r.preTreatment.rating === 'High');
    }
    if (selectedAttentionTab === 'overdue') {
      const now = new Date();
      return riskAnalytics.topAttentionItems.filter((r) => {
        if (!r.targetDate) return false;
        const target = r.targetDate instanceof Timestamp ? r.targetDate.toDate() : new Date(r.targetDate);
        return target < now;
      });
    }
    if (selectedAttentionTab === 'escalated') {
      return riskAnalytics.topAttentionItems.filter((r) => r.isEscalated || !!r.escalationTrigger);
    }
    return riskAnalytics.topAttentionItems;
  }, [riskAnalytics.topAttentionItems, selectedAttentionTab]);

  return (
    <Card
      className={cn(
        'shadow-xl border-primary/20 overflow-hidden bg-gradient-to-br from-card via-card to-primary/[0.02]',
        className,
      )}
    >
      {/* ─── CARD HEADER ────────────────────────────────────────────── */}
      <CardHeader className="bg-gradient-to-r from-destructive/10 via-primary/5 to-transparent border-b py-4 px-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0 shadow-sm border border-destructive/20">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                <span>Executive Risk Intelligence & Top Management Directives</span>
                <Badge
                  variant="outline"
                  className="text-[9px] font-black uppercase border-destructive/30 text-destructive bg-destructive/5"
                >
                  AY {selectedYear}
                </Badge>
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Autonomous on-device Local AI risk synthesis isolating critical vulnerabilities for University Top
              Management (ISO 21001:2018 EOMS).
            </CardDescription>
          </div>

          {/* Engine Badges and Action Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isLlmReady ? (
              <Badge className="h-6 text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 shadow-sm">
                <Cpu className="h-3 w-3" /> Local AI Active ({selectedModel.split('-')[0]})
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="h-6 text-[9px] font-bold uppercase tracking-wider bg-background border-primary/20 text-primary gap-1"
              >
                <Bot className="h-3 w-3" /> Local Rule Engine
              </Badge>
            )}

            <Badge
              variant="secondary"
              className="h-6 text-[8px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              100% On-Device • Private
            </Badge>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateIntelligence}
                disabled={isGenerating}
                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest bg-background border-primary/20 hover:bg-primary/5 text-primary gap-1.5 shadow-sm"
              >
                <RotateCcw className={cn('h-3.5 w-3.5', isGenerating && 'animate-spin')} />
                {isGenerating ? 'Analyzing...' : 'Re-Analyze'}
              </Button>

              {intelligenceText && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 px-3 text-[10px] font-black uppercase tracking-widest bg-background border-border hover:bg-muted text-muted-foreground gap-1.5 shadow-sm"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="h-8 px-3 text-[10px] font-black uppercase tracking-widest bg-background border-destructive/20 text-destructive hover:bg-destructive/10 gap-1.5 shadow-sm"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print Briefing
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* ─── 1. TOP KEY RISK INDICATOR (KRI) METRICS ────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="p-3 bg-muted/20 border-border/60 text-center shadow-sm">
            <p className="text-xl font-black text-foreground tabular-nums">{riskAnalytics.totalRisks}</p>
            <p className="text-[9px] font-bold uppercase text-muted-foreground mt-0.5">
              Total Risks (AY {selectedYear})
            </p>
          </Card>

          <Card className="p-3 bg-destructive/10 border-destructive/30 text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-1 right-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
              </span>
            </div>
            <p className="text-xl font-black text-destructive tabular-nums">{riskAnalytics.topAttentionItems.length}</p>
            <p className="text-[9px] font-black uppercase text-destructive tracking-tight mt-0.5">Top Mgmt Attention</p>
          </Card>

          <Card className="p-3 bg-amber-500/10 border-amber-300 dark:border-amber-900/40 text-center shadow-sm">
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
              {riskAnalytics.overdueCount}
            </p>
            <p className="text-[9px] font-bold uppercase text-amber-700 dark:text-amber-400 mt-0.5">
              Overdue Action Plans
            </p>
          </Card>

          <Card className="p-3 bg-emerald-500/10 border-emerald-300 dark:border-emerald-900/40 text-center shadow-sm">
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {riskAnalytics.resolutionRate}%
            </p>
            <p className="text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-400 mt-0.5">
              Closure Resolution
            </p>
          </Card>

          <Card className="p-3 bg-blue-500/10 border-blue-300 dark:border-blue-900/40 text-center shadow-sm col-span-2 sm:col-span-1">
            <p className="text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
              {riskAnalytics.totalOpportunities}
            </p>
            <p className="text-[9px] font-bold uppercase text-blue-700 dark:text-blue-400 mt-0.5">Innovations / Opps</p>
          </Card>
        </div>

        {/* ─── 2. TOP MANAGEMENT ATTENTION REQUIRED MATRIX ──────────── */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-destructive" />
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                Priority Risks Requiring Top Management Action ({riskAnalytics.topAttentionItems.length})
              </h3>
            </div>

            {/* Filter tags for attention items */}
            <div className="flex items-center gap-1">
              <Button
                variant={selectedAttentionTab === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedAttentionTab('all')}
                className="h-6 text-[9px] font-black uppercase px-2"
              >
                All ({riskAnalytics.topAttentionItems.length})
              </Button>
              <Button
                variant={selectedAttentionTab === 'high' ? 'destructive' : 'ghost'}
                size="sm"
                onClick={() => setSelectedAttentionTab('high')}
                className="h-6 text-[9px] font-black uppercase px-2"
              >
                High Rating ({riskAnalytics.topAttentionItems.filter((r) => r.preTreatment.rating === 'High').length})
              </Button>
              <Button
                variant={selectedAttentionTab === 'overdue' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedAttentionTab('overdue')}
                className="h-6 text-[9px] font-black uppercase px-2"
              >
                Overdue ({riskAnalytics.overdueCount})
              </Button>
              <Button
                variant={selectedAttentionTab === 'escalated' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedAttentionTab('escalated')}
                className="h-6 text-[9px] font-black uppercase px-2"
              >
                Escalated ({riskAnalytics.escalatedCount})
              </Button>
            </div>
          </div>

          {displayedAttentionRisks.length > 0 ? (
            <ScrollArea className="h-[220px] pr-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {displayedAttentionRisks.map((risk) => {
                  const now = new Date();
                  const targetDate = risk.targetDate
                    ? risk.targetDate instanceof Timestamp
                      ? risk.targetDate.toDate()
                      : new Date(risk.targetDate)
                    : null;
                  const isOverdue = targetDate && targetDate < now && risk.status !== 'Closed';

                  return (
                    <div
                      key={risk.id}
                      className={cn(
                        'p-3.5 rounded-xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between gap-2.5 bg-background',
                        risk.preTreatment.rating === 'High'
                          ? 'border-destructive/30 bg-destructive/[0.02]'
                          : 'border-amber-300 dark:border-amber-900/50 bg-amber-500/[0.02]',
                      )}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={risk.preTreatment.rating === 'High' ? 'destructive' : 'secondary'}
                              className="h-5 text-[8px] font-black uppercase px-1.5"
                            >
                              Magnitude: {risk.preTreatment.magnitude} ({risk.preTreatment.rating})
                            </Badge>
                            {isOverdue && (
                              <Badge className="h-5 text-[8px] font-black uppercase px-1.5 bg-amber-600 text-white">
                                <Clock className="h-2.5 w-2.5 mr-0.5" /> OVERDUE
                              </Badge>
                            )}
                            {(risk.isEscalated || risk.escalationTrigger) && (
                              <Badge
                                variant="outline"
                                className="h-5 text-[8px] font-black uppercase px-1.5 border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950"
                              >
                                ESCALATED
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="h-4 text-[8px] font-bold uppercase text-muted-foreground">
                            {risk.status}
                          </Badge>
                        </div>

                        <p className="text-xs font-bold text-foreground leading-snug line-clamp-2">
                          "{risk.description}"
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border/50 text-[10px] space-y-1 text-muted-foreground">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1 truncate font-semibold text-slate-700 dark:text-slate-300">
                            <Building className="h-3 w-3 text-primary shrink-0" />
                            {unitMap.get(risk.unitId) || 'Operating Unit'} ({campusMap.get(risk.campusId) || 'Main'})
                          </span>
                          {targetDate && (
                            <span
                              className={cn(
                                'font-mono font-bold shrink-0',
                                isOverdue ? 'text-destructive' : 'text-muted-foreground',
                              )}
                            >
                              Due: {format(targetDate, 'MMM dd, yyyy')}
                            </span>
                          )}
                        </div>

                        {risk.treatmentAction && (
                          <p className="text-[9px] text-slate-600 dark:text-slate-400 italic line-clamp-1">
                            <strong className="text-foreground">Mitigation:</strong> {risk.treatmentAction}
                          </p>
                        )}
                      </div>

                      {onSelectRisk && (
                        <div className="flex justify-end pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectRisk(risk)}
                            className="h-6 text-[9px] font-black uppercase text-primary tracking-widest gap-1 p-0 hover:bg-transparent"
                          >
                            Inspect in Detailed Register <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/20 text-center space-y-1">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                No Critical Unmitigated Risks Flagged for Top Management in AY {selectedYear}
              </p>
              <p className="text-[10px] text-muted-foreground">
                All high-priority risks have defined treatments or have been closed with verification evidence.
              </p>
            </div>
          )}
        </div>

        {/* ─── 3. SYNTHESIZED LOCAL AI EXECUTIVE BRIEFING ─────────────── */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2 border-b pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                University-Wide Risk Synthesis & Strategic Analysis
              </h3>
            </div>
            <span className="text-[9px] font-bold uppercase text-muted-foreground">
              Generated On-Device with Local AI
            </span>
          </div>

          <div className="p-4 rounded-xl border bg-muted/10 space-y-3 relative">
            {isGenerating ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                <Bot className="h-8 w-8 text-primary animate-bounce" />
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-wider text-primary animate-pulse">
                    Synthesizing Institutional Risk Intelligence with Local AI...
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Evaluating risk severity, mitigation deadlines, objective exposures, and top management directives.
                  </p>
                </div>
              </div>
            ) : intelligenceText ? (
              <div className="text-xs text-foreground leading-relaxed font-sans space-y-3 whitespace-pre-wrap">
                {intelligenceText}
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground text-xs italic">
                Click "Re-Analyze" above to generate a comprehensive Local AI risk analysis for Academic Year{' '}
                {selectedYear}.
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-muted/5 border-t py-3 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-muted-foreground italic">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>Compliant with ISO 21001:2018 Clause 6.1 (Actions to address risks and opportunities).</span>
        </div>
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          Executive Quality Assurance & Risk Oversight
        </span>
      </CardFooter>
    </Card>
  );
}
