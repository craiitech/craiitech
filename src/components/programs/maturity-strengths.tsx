
'use client';

import { useMemo } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Award, 
    CheckCircle2, 
    ShieldCheck, 
    Star, 
    TrendingUp, 
    Users, 
    Info, 
    Zap,
    GraduationCap,
    Activity,
    Loader2,
    Trophy,
    ShieldAlert,
    AlertTriangle,
    School,
    FileX
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface MaturityStrengthsProps {
  programs: AcademicProgram[];
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  units: Unit[];
  isLoading: boolean;
  selectedYear: number;
}

type StrengthItem = {
    title: string;
    description: string;
    impact: string;
    icon: React.ReactNode;
    programs: string[];
    category: 'Accreditation' | 'Regulatory' | 'Resources' | 'Outcomes';
};

export function MaturityStrengths({ programs, compliances, campuses, units, isLoading, selectedYear }: MaturityStrengthsProps) {
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

  const analysis = useMemo(() => {
    if (!programs.length) return { strengths: [], gaps: [] };

    const strengthsList: StrengthItem[] = [];
    const gapsRegistry: any[] = [];
    const activePrograms = programs.filter(p => p.isActive);

    activePrograms.forEach(p => {
        // Normalized lookup
        const record = compliances.find(c => 
            String(c.programId || '').toLowerCase().trim() === String(p.id || '').toLowerCase().trim()
        );
        const hasCopc = record?.ched?.copcStatus === 'With COPC';

        const gaps = [];
        if (!record?.faculty?.members?.length) gaps.push('FACULTY STAFFING LIST');
        if (!record?.graduationRecords?.length) gaps.push('GRADUATION OUTCOME DATA');
        if (!hasCopc) gaps.push('COPC CERTIFICATE');
        if (!record?.ched?.programCmoLink) gaps.push('OFFICIAL CMO LINK');
        
        if (gaps.length > 0) {
            gapsRegistry.push({ program: p, gaps });
        }
    });

    const eliteAccredited = activePrograms.filter(p => {
        const record = compliances.find(c => String(c.programId || '').toLowerCase().trim() === String(p.id || '').toLowerCase().trim());
        const milestones = record?.accreditationRecords || [];
        const current = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
        return current && (current.level.includes('Level III') || current.level.includes('Level IV'));
    }).map(p => p.abbreviation);

    if (eliteAccredited.length > 0) {
        strengthsList.push({
            title: 'Advanced Quality Maturity',
            description: `A total of ${eliteAccredited.length} programs have achieved high-tier AACCUP accreditation (Level III or IV).`,
            impact: 'Signifies institutional readiness for autonomous status.',
            icon: <Award className="h-6 w-6 text-amber-500" />,
            programs: eliteAccredited,
            category: 'Accreditation'
        });
    }

    const copcComplete = activePrograms.filter(p => {
        const record = compliances.find(c => String(c.programId || '').toLowerCase().trim() === String(p.id || '').toLowerCase().trim());
        return record?.ched?.copcStatus === 'With COPC';
    }).map(p => p.abbreviation);

    if (copcComplete.length === activePrograms.length && activePrograms.length > 0) {
        strengthsList.push({
            title: 'Perfect Regulatory Authority',
            description: '100% of currently offered academic programs possess verified Certificates of Program Compliance (COPC).',
            impact: 'Guarantees the legality and quality of degree offerings under CHED standards.',
            icon: <ShieldCheck className="h-6 w-6 text-emerald-600" />,
            programs: copcComplete,
            category: 'Regulatory'
        });
    }

    return { strengths: strengthsList, gaps: gapsRegistry };
  }, [programs, compliances]);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-3 bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy className="h-20 w-20 text-emerald-600" /></div>
        <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg">
            <Star className="h-6 w-6 fill-current" />
        </div>
        <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-tight text-emerald-900">Institutional Maturity Strengths</h3>
            <p className="text-sm text-emerald-700/80 font-medium">Verified achievements and high-performance metrics for AY {selectedYear}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {analysis.strengths.map((strength, index) => (
            <Card key={index} className="shadow-lg border-emerald-100 hover:border-emerald-300 transition-all group relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 opacity-20 group-hover:opacity-100 transition-all" />
                <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-emerald-600 border-emerald-200 bg-emerald-50/50 h-5">
                                {strength.category}
                            </Badge>
                            <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                                {strength.title}
                            </CardTitle>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-50 group-hover:bg-emerald-50 group-hover:scale-110 transition-all border border-slate-100 group-hover:border-emerald-100">
                            {strength.icon}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                    <p className="text-sm font-bold text-slate-700 leading-snug">{strength.description}</p>
                    <div className="p-3 rounded-xl bg-emerald-50/30 border border-emerald-100/50 italic flex gap-3 items-start">
                        <Zap className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
                            <span className="font-black uppercase text-[10px] mr-1">Impact:</span>
                            {strength.impact}
                        </p>
                    </div>
                    <div className="pt-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Contributing Programs:</p>
                        <div className="flex flex-wrap gap-1.5">
                            {strength.programs.map((p, i) => (
                                <Badge key={i} variant="outline" className="bg-white border-emerald-100 text-emerald-700 font-bold h-5 text-[10px] shadow-sm">
                                    {p}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/5 border-t py-3 px-6">
                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified Institutional Asset
                    </div>
                </CardFooter>
            </Card>
        ))}
      </div>

      <Separator />

      <Card className="border-rose-200 bg-rose-50/10 shadow-xl overflow-hidden animate-in zoom-in duration-500">
          <CardHeader className="bg-rose-50 border-b py-4 flex flex-row items-center justify-between">
              <div className="space-y-1">
                  <div className="flex items-center gap-2 text-rose-700">
                      <ShieldAlert className="h-5 w-5 text-rose-700" />
                      <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Gaps Registry</CardTitle>
                  </div>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-rose-600/70">Critical documentation deficiencies impacting maturity index for AY {selectedYear}.</CardDescription>
              </div>
              <Badge variant="destructive" className="h-6 px-4 font-black uppercase text-[10px] shadow-sm">Action Required</Badge>
          </CardHeader>
          <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {analysis.gaps.map((entry: any, idx: number) => (
                      <div key={idx} className="space-y-2.5 p-4 rounded-2xl bg-white border border-rose-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                  <p className="text-[11px] font-black uppercase text-slate-900 leading-tight truncate" title={entry.program.name}>{entry.program.name}</p>
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">{campusMap.get(entry.program.campusId)}</p>
                              </div>
                              <Badge variant="destructive" className="h-4 px-1.5 text-[8px] font-black shrink-0">{entry.gaps.length} GAPS</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                              {entry.gaps.map((gap: string, gIdx: number) => (
                                  <Badge key={gIdx} variant="secondary" className="text-[7px] h-3.5 px-1 bg-rose-50 text-rose-600 border-rose-100 font-black uppercase">{gap}</Badge>
                              ))}
                          </div>
                      </div>
                  ))}
                  {analysis.gaps.length === 0 && (
                      <div className="col-span-full py-12 flex flex-col items-center justify-center text-center opacity-20">
                          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                          <p className="text-sm font-black uppercase mt-2">All Programs Compliant</p>
                      </div>
                  )}
              </div>
          </CardContent>
          <CardFooter className="bg-rose-50/50 border-t py-2 px-6">
              <p className="text-[9px] text-rose-800/60 italic font-medium">Guidance: Documentation gaps signify institutional risk during external audits.</p>
          </CardFooter>
      </Card>
    </div>
  );
}
