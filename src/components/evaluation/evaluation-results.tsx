
'use client';

import { useMemo } from 'react';
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
  Legend
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { iso25010Categories } from '@/lib/iso-25010-data';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ShieldCheck, Activity } from 'lucide-react';

interface EvaluationResultsProps {
  evaluations: SoftwareEvaluation[];
}

export function EvaluationResults({ evaluations }: EvaluationResultsProps) {
  const aggregatedData = useMemo(() => {
    if (!evaluations || evaluations.length === 0) return null;

    // Calculate average for each sub-characteristic
    const categoryAverages = iso25010Categories.map(cat => {
      let catTotal = 0;
      let catCount = 0;

      cat.subCharacteristics.forEach(sub => {
        const subScores = evaluations.map(e => e.scores[sub.id] || 0);
        const subAvg = subScores.reduce((a, b) => a + b, 0) / evaluations.length;
        catTotal += subAvg;
        catCount++;
      });

      return {
        subject: cat.name,
        A: parseFloat((catTotal / catCount).toFixed(2)),
        fullMark: 5
      };
    });

    const overallAvg = evaluations.reduce((acc, e) => acc + e.overallScore, 0) / evaluations.length;

    return {
      categoryAverages,
      overallAvg
    };
  }, [evaluations]);

  if (!aggregatedData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center border rounded-lg border-dashed">
        <Activity className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
        <h3 className="text-lg font-medium">Insufficient Quality Data</h3>
        <p className="text-sm text-muted-foreground">Conduct a software quality evaluation to see maturity analytics.</p>
      </div>
    );
  }

  const getQualityLabel = (score: number) => {
    if (score >= 4.5) return { label: 'Exceptional', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (score >= 4.0) return { label: 'High Quality', color: 'text-green-600', bg: 'bg-green-50' };
    if (score >= 3.0) return { label: 'Acceptable', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { label: 'Action Required', color: 'text-destructive', bg: 'bg-destructive/10' };
  };

  const quality = getQualityLabel(aggregatedData.overallAvg);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ShieldCheck className="h-24 w-24" />
          </div>
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Aggregate Maturity Index</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-2 pb-10">
            <div className={cn("text-6xl font-black tabular-nums tracking-tighter", quality.color)}>
              {aggregatedData.overallAvg.toFixed(1)}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Out of 5.0 Points</p>
            <Badge className={cn("mt-4 px-6 py-1 text-xs font-black uppercase", quality.bg, quality.color, "border-none")}>
              {quality.label}
            </Badge>
          </CardContent>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {aggregatedData.categoryAverages.map((cat) => (
          <div key={cat.subject} className="p-4 rounded-lg border bg-card shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground truncate max-w-[120px]" title={cat.subject}>
                {cat.subject}
              </span>
              <div className="flex items-center gap-1">
                {cat.A >= 4.0 ? <TrendingUp className="h-3 w-3 text-green-500" /> : cat.A < 3.0 ? <TrendingDown className="h-3 w-3 text-red-500" /> : <Minus className="h-3 w-3 text-amber-500" />}
                <span className="text-sm font-black tabular-nums">{cat.A}</span>
              </div>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all",
                  cat.A >= 4.0 ? "bg-green-500" : cat.A < 3.0 ? "bg-red-500" : "bg-amber-500"
                )}
                style={{ width: `${(cat.A / 5) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
