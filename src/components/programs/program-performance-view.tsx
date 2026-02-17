
'use client';

import { useMemo, useState } from 'react';
import type { AcademicProgram, ProgramComplianceRecord } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    FileText, 
    ExternalLink, 
    Eye, 
    BarChart3, 
    Users, 
    GraduationCap, 
    Award, 
    ShieldCheck, 
    TrendingUp, 
    CheckCircle2, 
    AlertCircle,
    Download
} from 'lucide-react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Cell,
    LineChart,
    Line,
    Legend
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ProgramPerformanceViewProps {
  program: AcademicProgram;
  record: ProgramComplianceRecord | null;
  selectedYear: number;
}

export function ProgramPerformanceView({ program, record, selectedYear }: ProgramPerformanceViewProps) {
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  const analyticsData = useMemo(() => {
    if (!record) return null;

    // Enrollment Chart Data (Sex-Disaggregated)
    const enrollmentData = [
      { name: '1st Yr', Male: record.stats.enrollment.firstYear?.male || 0, Female: record.stats.enrollment.firstYear?.female || 0 },
      { name: '2nd Yr', Male: record.stats.enrollment.secondYear?.male || 0, Female: record.stats.enrollment.secondYear?.female || 0 },
      { name: '3rd Yr', Male: record.stats.enrollment.thirdYear?.male || 0, Female: record.stats.enrollment.thirdYear?.female || 0 },
      { name: '4th Yr', Male: record.stats.enrollment.fourthYear?.male || 0, Female: record.stats.enrollment.fourthYear?.female || 0 },
    ];

    // Graduation Trends (from dynamic records)
    const successTrends = (record.graduationRecords || []).map(g => ({
        period: `${g.semester} ${g.year}`,
        graduates: g.count,
        employment: record.tracerRecords?.find(t => t.year === g.year && t.semester === g.semester)?.employmentRate || 0
    })).sort((a, b) => a.period.localeCompare(b.period));

    // Faculty Alignment
    let totalFaculty = 0;
    let alignedFaculty = 0;
    if (record.faculty?.members) {
        record.faculty.members.forEach(m => {
            totalFaculty++;
            if (m.isAlignedWithCMO === 'Aligned') alignedFaculty++;
        });
    }
    if (record.faculty?.dean) { totalFaculty++; if (record.faculty.dean.isAlignedWithCMO === 'Aligned') alignedFaculty++; }
    if (record.faculty?.programChair) { totalFaculty++; if (record.faculty.programChair.isAlignedWithCMO === 'Aligned') alignedFaculty++; }

    const alignmentRate = totalFaculty > 0 ? Math.round((alignedFaculty / totalFaculty) * 100) : 0;

    // Board Performance Aggregation (Latest or Average)
    const latestBoard = record.boardPerformance && record.boardPerformance.length > 0 
        ? record.boardPerformance[record.boardPerformance.length - 1] 
        : null;

    return { enrollmentData, successTrends, alignmentRate, totalFaculty, latestBoard };
  }, [record]);

  const documents = useMemo(() => {
    if (!record) return [];
    return [
      { id: 'copc', title: 'CHED COPC', url: record.ched?.copcLink, status: record.ched?.copcStatus },
      { id: 'accreditation', title: 'Accreditation Certificate', url: record.accreditation?.certificateLink, status: record.accreditation?.level },
      { id: 'cmo', title: 'Program CMO', url: record.curriculum?.cmoLink, status: record.curriculum?.revisionNumber ? `Rev ${record.curriculum.revisionNumber}` : 'Current' },
      { id: 'noted', title: 'Contents Noted Proof', url: record.ched?.contentNotedLink, status: record.ched?.contentNoted ? 'Acknowledged' : 'Pending' },
    ].filter(doc => !!doc.url);
  }, [record]);

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center py-20 border rounded-lg border-dashed bg-muted/20">
        <AlertCircle className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
        <h3 className="text-lg font-bold">Data Synchronization Required</h3>
        <p className="text-sm text-muted-foreground max-w-xs text-center mt-1">
          No compliance data has been encoded for {program.name} in Academic Year {selectedYear}. 
          Please use the encoder tabs to populate the program's record.
        </p>
      </div>
    );
  }

  const getEmbedUrl = (url: string) => url.replace('/view', '/preview').replace('?usp=sharing', '');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 1. High-Level Performance Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-blue-600">Accreditation Standing</CardDescription>
                <CardTitle className="text-xl flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-600" />
                    {record.accreditation.level}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-[10px] text-muted-foreground italic">Valid as of {record.accreditation.dateOfAward || 'TBA'}</p>
            </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-green-600">CHED COPC Compliance</CardDescription>
                <CardTitle className="text-xl flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    {record.ched.copcStatus}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Badge variant={record.ched.contentNoted ? 'default' : 'secondary'} className="text-[9px] h-4">
                    {record.ched.contentNoted ? 'CONTENT NOTED' : 'PENDING NOTATION'}
                </Badge>
            </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-purple-600">Faculty Alignment</CardDescription>
                <CardTitle className="text-3xl font-black text-purple-700">
                    {analyticsData?.alignmentRate}%
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-[10px] text-muted-foreground">Of {analyticsData?.totalFaculty} members aligned with CMO</p>
            </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-amber-600">Graduate Output</CardDescription>
                <CardTitle className="text-3xl font-black text-amber-700">
                    {record.stats.graduationCount}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-[10px] text-muted-foreground">Total graduates for AY {selectedYear}</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Enrollment & Success Trends */}
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Sex-Disaggregated Enrollment
                            </CardTitle>
                            <CardDescription>Breakdown by year level and sex for AY {selectedYear}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={{ 
                        Male: { label: 'Male', color: 'hsl(var(--chart-1))' },
                        Female: { label: 'Female', color: 'hsl(var(--chart-2))' }
                    }} className="h-[250px] w-full">
                        <ResponsiveContainer>
                            <BarChart data={analyticsData?.enrollmentData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Legend verticalAlign="top" align="right" />
                                <Bar dataKey="Male" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="Female" stackId="a" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Outcomes & Success Trends
                    </CardTitle>
                    <CardDescription>Graduation counts vs. Employment (Tracer) rates.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={{}} className="h-[250px] w-full">
                        <ResponsiveContainer>
                            <LineChart data={analyticsData?.successTrends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                                <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" />
                                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" unit="%" />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Legend verticalAlign="top" height={36} />
                                <Line yAxisId="left" type="monotone" dataKey="graduates" name="Graduates" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 6 }} />
                                <Line yAxisId="right" type="monotone" dataKey="employment" name="Employment Rate (%)" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>

        {/* 3. Document Vault */}
        <div className="lg:col-span-1 space-y-6">
            <Card className="h-full flex flex-col shadow-lg border-primary/10">
                <CardHeader className="bg-primary/5 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Program Document Vault
                    </CardTitle>
                    <CardDescription>Official compliance proofs & certifications.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-4">
                    <div className="space-y-3">
                        {documents.map(doc => (
                            <div key={doc.id} className="group p-4 rounded-xl border bg-background hover:border-primary/50 hover:shadow-md transition-all">
                                <div className="flex flex-col gap-4">
                                    <div className="space-y-1 min-w-0">
                                        <p className="font-bold text-sm truncate">{doc.title}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">{doc.status}</p>
                                    </div>
                                    <div className="flex gap-2 w-full">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-8 text-[10px] font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 text-primary flex-1"
                                            onClick={() => setPreviewDoc({ title: doc.title, url: getEmbedUrl(doc.url!) })}
                                        >
                                            VIEW DOCUMENT
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                            asChild
                                        >
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {documents.length === 0 && (
                            <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                                <FileText className="h-10 w-10 mx-auto opacity-10 mb-2" />
                                <p className="text-xs">No documents linked yet.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
                <div className="p-4 border-t bg-muted/10">
                    <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                        All files are hosted on the unit's official Google Drive. Ensure 'Anyone with the link can view' is active for correct previewing.
                    </p>
                </div>
            </Card>
        </div>
      </div>

      {/* 4. Board Performance (If applicable) */}
      {program.isBoardProgram && analyticsData?.latestBoard && (
        <Card className="border-green-100 shadow-inner">
            <CardHeader className="bg-green-50/50">
                <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    Latest Board Performance: {analyticsData.latestBoard.examDate}
                </CardTitle>
                <CardDescription>Performance breakdown for the most recent licensure examination.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-background border shadow-sm">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">First Takers Rate</p>
                                <p className="text-2xl font-black text-primary">{analyticsData.latestBoard.firstTakersPassRate}%</p>
                                <p className="text-[10px] text-muted-foreground mt-1">({analyticsData.latestBoard.firstTakersPassed} of {analyticsData.latestBoard.firstTakersCount})</p>
                            </div>
                            <div className="p-4 rounded-lg bg-background border shadow-sm">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Retakers Rate</p>
                                <p className="text-2xl font-black text-muted-foreground">{analyticsData.latestBoard.retakersPassRate}%</p>
                                <p className="text-[10px] text-muted-foreground mt-1">({analyticsData.latestBoard.retakersPassed} of {analyticsData.latestBoard.retakersCount})</p>
                            </div>
                        </div>
                        <div className="p-6 rounded-xl bg-primary text-primary-foreground shadow-lg flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Overall RSU Passing Rate</p>
                                <p className="text-4xl font-black">{analyticsData.latestBoard.overallPassRate}%</p>
                            </div>
                            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                                <趨勢Up className="h-8 w-8" />
                            </div>
                        </div>
                    </div>
                    <ChartContainer config={{}} className="h-[200px] w-full">
                        <ResponsiveContainer>
                            <BarChart data={[
                                { name: 'RSU Rate', rate: analyticsData.latestBoard.overallPassRate, fill: 'hsl(var(--primary))' },
                                { name: 'National Avg', rate: analyticsData.latestBoard.nationalPassingRate, fill: 'hsl(var(--muted-foreground))' }
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="rate" radius={[4, 4, 0, 0]} barSize={60}>
                                    <Cell fill="hsl(var(--primary))" />
                                    <Cell fill="#cbd5e1" />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>
            </CardContent>
        </Card>
      )}

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-4 border-b shrink-0">
                <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Preview: {previewDoc?.title}
                </DialogTitle>
            </DialogHeader>
            <div className="flex-1 bg-muted relative">
                {previewDoc && (
                    <iframe
                        src={previewDoc.url}
                        className="absolute inset-0 w-full h-full border-none"
                        allow="autoplay"
                    />
                )}
            </div>
            <div className="p-4 border-t flex justify-between items-center bg-card shrink-0">
                <p className="text-xs text-muted-foreground italic">Official record from unit Google Drive.</p>
                <Button variant="outline" size="sm" onClick={() => setPreviewDoc(null)}>Close Preview</Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
