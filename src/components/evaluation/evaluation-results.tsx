'use client';

import { useMemo, useState } from 'react';
import type { SoftwareEvaluation } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { iso25010Categories } from '@/lib/iso-25010-data';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, TrendingDown, Minus, ShieldCheck, Activity, 
  Download, Copy, FileText, Table2, MessageSquareText, 
  ChevronDown, ChevronUp, BarChart3, PieChart as PieChartIcon,
  CheckCircle2, AlertTriangle, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  generateEvaluationCSV,
  generateCategorySummaryCSV,
  generateCommentsCSV,
  generateLikertDistributionCSV,
  generateFullMarkdownReport,
  downloadFile,
  copyToClipboard,
} from '@/lib/evaluation-export';

interface EvaluationResultsProps {
  evaluations: SoftwareEvaluation[];
}

const CATEGORY_COLORS = [
  '#2563EB', // blue
  '#7C3AED', // violet
  '#0891B2', // cyan
  '#059669', // emerald
  '#D97706', // amber
  '#DC2626', // red
  '#4F46E5', // indigo
  '#0D9488', // teal
];

const LIKERT_COLORS: Record<number, string> = {
  1: '#EF4444',
  2: '#F97316',
  3: '#EAB308',
  4: '#3B82F6',
  5: '#22C55E',
};

const LIKERT_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Satisfactory',
  4: 'Good',
  5: 'Excellent',
};

export function EvaluationResults({ evaluations }: EvaluationResultsProps) {
  const { toast } = useToast();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const aggregatedData = useMemo(() => {
    if (!evaluations || evaluations.length === 0) return null;

    // Calculate average for each sub-characteristic
    const subCharacteristicDetails: {
      id: string;
      name: string;
      category: string;
      categoryId: string;
      mean: number;
      sd: number;
      min: number;
      max: number;
      n: number;
      rating: string;
      desc: string;
    }[] = [];

    const categoryAverages = iso25010Categories.map((cat, idx) => {
      let catTotal = 0;
      let catCount = 0;
      const catSubMeans: number[] = [];

      cat.subCharacteristics.forEach(sub => {
        const subScores = evaluations.map(e => e.scores[sub.id] || 0).filter(s => s > 0);
        const n = subScores.length;
        const subAvg = n > 0 ? subScores.reduce((a, b) => a + b, 0) / n : 0;
        const sd = n > 1
          ? Math.sqrt(subScores.reduce((s, v) => s + Math.pow(v - subAvg, 2), 0) / (n - 1))
          : 0;

        subCharacteristicDetails.push({
          id: sub.id,
          name: sub.name,
          category: cat.name,
          categoryId: cat.id,
          mean: subAvg,
          sd,
          min: n > 0 ? Math.min(...subScores) : 0,
          max: n > 0 ? Math.max(...subScores) : 0,
          n,
          rating: getQualityLabel(subAvg).label,
          desc: sub.desc,
        });

        catTotal += subAvg;
        catCount++;
        catSubMeans.push(subAvg);
      });

      const catMean = catTotal / catCount;
      const catSD = catSubMeans.length > 1
        ? Math.sqrt(catSubMeans.reduce((s, v) => s + Math.pow(v - catMean, 2), 0) / (catSubMeans.length - 1))
        : 0;

      return {
        subject: cat.name,
        A: parseFloat(catMean.toFixed(2)),
        sd: parseFloat(catSD.toFixed(2)),
        subCount: cat.subCharacteristics.length,
        fullMark: 5,
        color: CATEGORY_COLORS[idx],
        id: cat.id,
      };
    });

    const overallAvg = evaluations.reduce((acc, e) => acc + e.overallScore, 0) / evaluations.length;
    const overallSD = evaluations.length > 1
      ? Math.sqrt(evaluations.reduce((s, e) => s + Math.pow(e.overallScore - overallAvg, 2), 0) / (evaluations.length - 1))
      : 0;

    // Likert distribution
    const likertDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalResponses = 0;
    for (const e of evaluations) {
      for (const score of Object.values(e.scores)) {
        if (typeof score === 'number' && score >= 1 && score <= 5) {
          likertDist[score]++;
          totalResponses++;
        }
      }
    }
    const likertData = [5, 4, 3, 2, 1].map(r => ({
      rating: r,
      label: LIKERT_LABELS[r],
      count: likertDist[r],
      percentage: totalResponses > 0 ? parseFloat(((likertDist[r] / totalResponses) * 100).toFixed(1)) : 0,
      color: LIKERT_COLORS[r],
    }));

    // Comments
    const comments = evaluations
      .filter(e => e.generalComments || e.recommendations)
      .map(e => ({
        userName: e.userName,
        date: e.timestamp?.toDate ? e.timestamp.toDate().toLocaleDateString() : new Date(e.timestamp).toLocaleDateString(),
        overallScore: e.overallScore,
        generalComments: e.generalComments || '',
        recommendations: e.recommendations || '',
      }));

    return {
      categoryAverages,
      subCharacteristicDetails,
      overallAvg,
      overallSD,
      likertData,
      likertTotal: totalResponses,
      comments,
      evaluationCount: evaluations.length,
    };
  }, [evaluations]);

  if (!aggregatedData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center border rounded-lg border-dashed bg-muted/5">
        <Activity className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
        <h3 className="text-xl font-black text-muted-foreground uppercase tracking-[0.2em]">NO DATA YET!</h3>
        <p className="text-sm text-muted-foreground mt-2">Conduct a software quality evaluation to see maturity analytics.</p>
      </div>
    );
  }

  const quality = getQualityLabel(aggregatedData.overallAvg);
  const highestCat = [...aggregatedData.categoryAverages].sort((a, b) => b.A - a.A)[0];
  const lowestCat = [...aggregatedData.categoryAverages].sort((a, b) => a.A - b.A)[0];

  const handleExport = (type: string) => {
    const timestamp = new Date().toISOString().split('T')[0];
    switch (type) {
      case 'csv-detail':
        downloadFile(generateEvaluationCSV(evaluations), `iso25010_sub_characteristics_${timestamp}.csv`, 'text/csv');
        toast({ title: 'Downloaded', description: 'Sub-characteristic detail CSV exported.' });
        break;
      case 'csv-summary':
        downloadFile(generateCategorySummaryCSV(evaluations), `iso25010_category_summary_${timestamp}.csv`, 'text/csv');
        toast({ title: 'Downloaded', description: 'Category summary CSV exported.' });
        break;
      case 'csv-comments':
        downloadFile(generateCommentsCSV(evaluations), `iso25010_user_comments_${timestamp}.csv`, 'text/csv');
        toast({ title: 'Downloaded', description: 'User comments CSV exported.' });
        break;
      case 'csv-likert':
        downloadFile(generateLikertDistributionCSV(evaluations), `iso25010_likert_distribution_${timestamp}.csv`, 'text/csv');
        toast({ title: 'Downloaded', description: 'Likert distribution CSV exported.' });
        break;
      case 'markdown':
        downloadFile(generateFullMarkdownReport(evaluations), `iso25010_full_report_${timestamp}.md`, 'text/markdown');
        toast({ title: 'Downloaded', description: 'Full markdown research report exported.' });
        break;
      case 'copy-markdown':
        copyToClipboard(generateFullMarkdownReport(evaluations)).then(ok => {
          if (ok) toast({ title: 'Copied', description: 'Full report copied to clipboard.' });
          else toast({ title: 'Copy failed', description: 'Please try the download option instead.', variant: 'destructive' });
        });
        break;
      case 'copy-csv':
        copyToClipboard(generateEvaluationCSV(evaluations)).then(ok => {
          if (ok) toast({ title: 'Copied', description: 'CSV data copied to clipboard.' });
          else toast({ title: 'Copy failed', variant: 'destructive' });
        });
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-bold text-xs">
            {aggregatedData.evaluationCount} Evaluation{aggregatedData.evaluationCount !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="font-bold text-xs">
            31 Sub-Characteristics
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs font-bold gap-1.5"
            onClick={() => handleExport('copy-markdown')}
          >
            <Copy className="h-3.5 w-3.5" /> Copy Report
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="h-8 text-xs font-bold gap-1.5 shadow-lg shadow-primary/20">
                <Download className="h-3.5 w-3.5" /> Download
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem onClick={() => handleExport('markdown')} className="gap-2 font-medium">
                <FileText className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-bold">Full Research Report</p>
                  <p className="text-[10px] text-muted-foreground">Markdown with all tables & comments</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('csv-detail')} className="gap-2 font-medium">
                <Table2 className="h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-sm font-bold">Sub-Characteristic Detail (CSV)</p>
                  <p className="text-[10px] text-muted-foreground">31 items with Mean, SD, Min, Max</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv-summary')} className="gap-2 font-medium">
                <BarChart3 className="h-4 w-4 text-violet-600" />
                <div>
                  <p className="text-sm font-bold">Category Summary (CSV)</p>
                  <p className="text-[10px] text-muted-foreground">8 categories with ratings & trends</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv-likert')} className="gap-2 font-medium">
                <PieChartIcon className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-sm font-bold">Likert Distribution (CSV)</p>
                  <p className="text-[10px] text-muted-foreground">Frequency & percentage per rating</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv-comments')} className="gap-2 font-medium">
                <MessageSquareText className="h-4 w-4 text-rose-600" />
                <div>
                  <p className="text-sm font-bold">User Comments (CSV)</p>
                  <p className="text-[10px] text-muted-foreground">All remarks & recommendations</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('copy-csv')} className="gap-2 font-medium">
                <Copy className="h-4 w-4 text-slate-500" />
                <div>
                  <p className="text-sm font-bold">Copy CSV to Clipboard</p>
                  <p className="text-[10px] text-muted-foreground">Paste directly into spreadsheets</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Row 1: Maturity Index + Radar Chart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ShieldCheck className="h-24 w-24" />
          </div>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Aggregate Maturity Index</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-2 pb-6">
            <div className={cn("text-6xl font-black tabular-nums tracking-tighter", quality.color)}>
              {aggregatedData.overallAvg.toFixed(1)}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Out of 5.0 Points</p>
            <Badge className={cn("mt-2 px-6 py-1 text-xs font-black uppercase", quality.bg, quality.color, "border-none")}>
              {quality.label}
            </Badge>
            <div className="text-[10px] text-muted-foreground mt-2 space-y-0.5 text-center">
              <p>SD: ±{aggregatedData.overallSD.toFixed(2)}</p>
              <p>N: {aggregatedData.evaluationCount} evaluations</p>
            </div>
          </CardContent>
          <div className="border-t px-6 py-4 space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground font-bold uppercase tracking-wider">Highest</span>
              <span className="font-black text-green-600">{highestCat.subject} ({highestCat.A})</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground font-bold uppercase tracking-wider">Lowest</span>
              <span className="font-black text-amber-600">{lowestCat.subject} ({lowestCat.A})</span>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Quality Characteristics Profile</CardTitle>
            <CardDescription>Radar visualization of the system maturity across ISO 25010 categories.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[350px] w-full">
              <ResponsiveContainer>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={aggregatedData.categoryAverages}>
                  <PolarGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} hide />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Radar
                    name="Portal Quality"
                    dataKey="A"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.4}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Category Bars + Likert Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Category Score Comparison
            </CardTitle>
            <CardDescription>Bar chart of mean scores per quality characteristic with SD.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <ResponsiveContainer>
                <BarChart data={aggregatedData.categoryAverages} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10 }} />
                  <YAxis 
                    dataKey="subject" 
                    type="category" 
                    tick={{ fontSize: 9, fontWeight: 600 }} 
                    width={130}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border shadow-lg rounded-lg p-3 text-xs space-y-1">
                          <p className="font-black text-sm">{d.subject}</p>
                          <p>Mean: <strong>{d.A}</strong> / 5.0</p>
                          <p>SD: ±{d.sd}</p>
                          <p>Sub-characteristics: {d.subCount}</p>
                          <p>Rating: <strong>{getQualityLabel(d.A).label}</strong></p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="A" radius={[0, 6, 6, 0]} barSize={20}>
                    {aggregatedData.categoryAverages.map((entry, index) => (
                      <Cell key={entry.id} fill={CATEGORY_COLORS[index]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Rating Distribution
            </CardTitle>
            <CardDescription>{aggregatedData.likertTotal.toLocaleString()} total ratings</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[220px] w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={aggregatedData.likertData.filter(d => d.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="label"
                  >
                    {aggregatedData.likertData.filter(d => d.count > 0).map((entry) => (
                      <Cell key={entry.rating} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border shadow-lg rounded-lg p-2 text-xs">
                          <p className="font-black">{d.label} ({d.rating})</p>
                          <p>Count: {d.count}</p>
                          <p>{d.percentage}%</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="space-y-1.5 mt-2">
              {aggregatedData.likertData.map(d => (
                <div key={d.rating} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="font-bold text-muted-foreground">{d.label} ({d.rating})</span>
                  </div>
                  <span className="font-black tabular-nums">{d.count} ({d.percentage}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Category Cards with Expandable Sub-Characteristics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {aggregatedData.categoryAverages.map((cat, idx) => {
          const isExpanded = expandedCategory === cat.id;
          const catSubs = aggregatedData.subCharacteristicDetails.filter(s => s.categoryId === cat.id);
          const catQuality = getQualityLabel(cat.A);

          return (
            <div key={cat.id} className="space-y-2">
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                className="w-full p-4 rounded-lg border bg-card shadow-sm space-y-3 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-black uppercase tracking-wider truncate max-w-[120px]"
                    style={{ color: CATEGORY_COLORS[idx] }}
                    title={cat.subject}
                  >
                    {cat.subject}
                  </span>
                  <div className="flex items-center gap-1">
                    {cat.A >= 4.0 ? <TrendingUp className="h-3 w-3 text-green-500" /> : cat.A < 3.0 ? <TrendingDown className="h-3 w-3 text-red-500" /> : <Minus className="h-3 w-3 text-amber-500" />}
                    <span className="text-sm font-black tabular-nums">{cat.A}</span>
                    {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                  </div>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all rounded-full"
                    style={{ width: `${(cat.A / 5) * 100}%`, backgroundColor: CATEGORY_COLORS[idx] }}
                  />
                </div>
                <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                  <span>SD: ±{cat.sd}</span>
                  <Badge className={cn("h-5 text-[8px] font-bold uppercase border-none px-2", catQuality.bg, catQuality.color)}>
                    {catQuality.label}
                  </Badge>
                </div>
              </button>

              {isExpanded && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                  {catSubs.map(sub => (
                    <div key={sub.id} className="px-3 py-2.5 rounded-md border bg-muted/5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={sub.name}>
                          {sub.name}
                        </span>
                        <span className="text-xs font-black tabular-nums">{sub.mean.toFixed(2)}</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground leading-relaxed line-clamp-2">{sub.desc}</p>
                      <div className="flex items-center justify-between text-[8px] text-muted-foreground">
                        <span>SD: ±{sub.sd.toFixed(2)} | Range: {sub.min}–{sub.max}</span>
                        <span className="font-bold">{sub.rating}</span>
                      </div>
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${(sub.mean / 5) * 100}%`, backgroundColor: CATEGORY_COLORS[idx] }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Row 4: User Comments & Recommendations */}
      {aggregatedData.comments.length > 0 && (
        <Card className="shadow-md overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary" />
              Stakeholder Comments & Recommendations
            </CardTitle>
            <CardDescription>
              {aggregatedData.comments.length} evaluation{aggregatedData.comments.length !== 1 ? 's' : ''} with remarks
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {aggregatedData.comments.map((comment, i) => {
                const commentQuality = getQualityLabel(comment.overallScore);
                return (
                  <div key={i} className="p-6 space-y-3 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-black", 
                          comment.overallScore >= 4 ? "bg-green-500" : comment.overallScore >= 3 ? "bg-amber-500" : "bg-red-500"
                        )}>
                          {comment.overallScore.toFixed(1)}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{comment.userName}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{comment.date}</p>
                        </div>
                      </div>
                      <Badge className={cn("text-[9px] font-bold uppercase border-none px-3", commentQuality.bg, commentQuality.color)}>
                        {commentQuality.label}
                      </Badge>
                    </div>

                    {comment.generalComments && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <Info className="h-3 w-3" /> General Experience Remarks
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700 italic">
                          &ldquo;{comment.generalComments}&rdquo;
                        </p>
                      </div>
                    )}

                    {comment.recommendations && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Technical Suggestions
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-amber-50/50 rounded-lg p-3 border border-amber-100 italic">
                          &ldquo;{comment.recommendations}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row 5: Full Data Table */}
      <Card className="shadow-md overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="h-5 w-5 text-primary" />
                Complete Sub-Characteristic Analysis
              </CardTitle>
              <CardDescription>All 31 ISO 25010 sub-characteristics with statistical measures</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5" onClick={() => handleExport('copy-csv')}>
              <Copy className="h-3.5 w-3.5" /> Copy Table
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="px-4 py-3 text-left font-black uppercase tracking-wider text-[10px] text-muted-foreground">#</th>
                  <th className="px-4 py-3 text-left font-black uppercase tracking-wider text-[10px] text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-left font-black uppercase tracking-wider text-[10px] text-muted-foreground">Sub-Characteristic</th>
                  <th className="px-4 py-3 text-center font-black uppercase tracking-wider text-[10px] text-muted-foreground">Mean</th>
                  <th className="px-4 py-3 text-center font-black uppercase tracking-wider text-[10px] text-muted-foreground">SD</th>
                  <th className="px-4 py-3 text-center font-black uppercase tracking-wider text-[10px] text-muted-foreground">Min</th>
                  <th className="px-4 py-3 text-center font-black uppercase tracking-wider text-[10px] text-muted-foreground">Max</th>
                  <th className="px-4 py-3 text-center font-black uppercase tracking-wider text-[10px] text-muted-foreground">N</th>
                  <th className="px-4 py-3 text-center font-black uppercase tracking-wider text-[10px] text-muted-foreground">Rating</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedData.subCharacteristicDetails.map((sub, i) => {
                  const subQuality = getQualityLabel(sub.mean);
                  return (
                    <tr key={sub.id} className={cn("border-b hover:bg-muted/10 transition-colors", i % 2 === 0 ? "" : "bg-muted/5")}>
                      <td className="px-4 py-2.5 font-bold text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-600 dark:text-slate-400">{sub.category}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200">{sub.name}</td>
                      <td className="px-4 py-2.5 text-center font-black tabular-nums">{sub.mean.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">±{sub.sd.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">{sub.min}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">{sub.max}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-muted-foreground">{sub.n}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge className={cn("text-[8px] font-bold uppercase border-none px-2", subQuality.bg, subQuality.color)}>
                          {subQuality.label}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
                {/* Grand Total Row */}
                <tr className="bg-primary/5 border-t-2 border-primary/20">
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 font-black text-primary uppercase text-[10px] tracking-wider" colSpan={2}>Overall Maturity Index</td>
                  <td className="px-4 py-3 text-center font-black text-primary text-sm tabular-nums">{aggregatedData.overallAvg.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center font-bold text-primary tabular-nums">±{aggregatedData.overallSD.toFixed(2)}</td>
                  <td className="px-4 py-3" colSpan={2} />
                  <td className="px-4 py-3 text-center font-bold text-primary tabular-nums">{aggregatedData.evaluationCount}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={cn("text-[9px] font-black uppercase border-none px-3", quality.bg, quality.color)}>
                      {quality.label}
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getQualityLabel(score: number) {
  if (score >= 4.5) return { label: 'Exceptional', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (score >= 4.0) return { label: 'High Quality', color: 'text-green-600', bg: 'bg-green-50' };
  if (score >= 3.0) return { label: 'Acceptable', color: 'text-amber-600', bg: 'bg-amber-50' };
  return { label: 'Action Required', color: 'text-destructive', bg: 'bg-destructive/10' };
}