
'use client';

import { useMemo, useState } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, ProgramFacultyMember, AccreditationRecord } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    FileText, 
    ExternalLink, 
    BarChart3, 
    Users, 
    Award, 
    ShieldCheck, 
    TrendingUp, 
    CheckCircle2, 
    AlertCircle,
    Calculator,
    Layers,
    UserCheck,
    History,
    Calendar,
    ChevronRight,
    MapPin
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
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

    // Enrollment Chart Data
    const levels = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'] as const;
    const levelLabels: Record<string, string> = { firstYear: '1st Yr', secondYear: '2nd Yr', thirdYear: '3rd Yr', fourthYear: '4th Yr' };

    const enrollmentData = levels.map(level => {
        const s1 = record.stats.enrollment?.firstSemester?.[level];
        const s2 = record.stats.enrollment?.secondSemester?.[level];
        const sSummer = record.stats.enrollment?.midYearTerm?.[level];
        return {
            name: levelLabels[level],
            '1st Sem': (s1?.male || 0) + (s1?.female || 0),
            '2nd Sem': (s2?.male || 0) + (s2?.female || 0),
            'Mid-Year': (sSummer?.male || 0) + (sSummer?.female || 0)
        };
    });

    // Graduation Trends
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

    const latestBoard = record.boardPerformance && record.boardPerformance.length > 0 
        ? record.boardPerformance[record.boardPerformance.length - 1] 
        : null;

    // Specialization Statistics
    const specMap = new Map<string, string>();
    program.specializations?.forEach(s => specMap.set(s.id, s.name));

    const facultyPerSpec: Record<string, ProgramFacultyMember[]> = { 'General': [] };
    program.specializations?.forEach(s => facultyPerSpec[s.id] = []);

    record.faculty?.members?.forEach(m => {
        const specId = m.specializationAssignment || 'General';
        if (facultyPerSpec[specId]) facultyPerSpec[specId].push(m);
    });

    // Pick the most advanced accreditation level for the summary
    const milestones = record.accreditationRecords || [];
    const latestAccreditation = milestones.length > 0 ? milestones[milestones.length - 1] : null;

    return { enrollmentData, successTrends, alignmentRate, totalFaculty, latestBoard, facultyPerSpec, specMap, milestones, latestAccreditation };
  }, [record, program]);

  const documents = useMemo(() => {
    if (!record) return [];
    
    const baseDocs: { id: string; title: string; url: string | undefined; status: string | undefined }[] = [
      { id: 'copc', title: 'CHED COPC', url: record.ched?.copcLink, status: record.ched?.copcStatus },
      { id: 'cmo', title: 'Program CMO', url: record.curriculum?.cmoLink, status: record.curriculum?.revisionNumber ? `Rev ${record.curriculum.revisionNumber}` : 'Current' },
    ];

    // Add all accreditation milestone certificates
    (record.accreditationRecords || []).forEach((acc, idx) => {
        if (acc.certificateLink) {
            baseDocs.push({
                id: `acc-${idx}`,
                title: `Certificate: ${acc.level}`,
                url: acc.certificateLink,
                status: acc.lifecycleStatus || 'Verified'
            });
        }
    });

    if (record.ched?.contentNotedLinks) {
        record.ched.contentNotedLinks.forEach((link, index) => {
            if (link.url) {
                const notationDateStr = link.dateNoted ? ` [Noted: ${link.dateNoted}]` : '';
                baseDocs.push({
                    id: `noted-${index}`,
                    title: `Contents Noted Proof ${index + 1}`,
                    url: link.url,
                    status: `${record.ched?.contentNoted ? 'Acknowledged' : 'Pending'}${notationDateStr}`
                });
            }
        });
    }

    if (record.ched?.rqatVisits) {
        record.ched.rqatVisits.forEach((visit, index) => {
            if (visit.reportLink) {
                baseDocs.push({
                    id: `rqat-${index}`,
                    title: `RQAT Report (${visit.date || 'TBA'})`,
                    url: visit.reportLink,
                    status: visit.result || 'Monitoring Result'
                });
            }
        });
    }

    return baseDocs.filter(doc => !!doc.url);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-blue-600">Accreditation Milestone</CardDescription>
                <CardTitle className="text-xl flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-600" />
                    {analyticsData?.latestAccreditation?.level || 'Non Accredited'}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-1">
                    <p className="text-[10px] text-muted-foreground italic">Latest Survey: {analyticsData?.latestAccreditation?.dateOfSurvey || 'TBA'}</p>
                    {analyticsData?.latestAccreditation?.statusValidityDate && (
                        <p className="text-[10px] font-bold text-blue-700/70 uppercase">Valid until: {analyticsData.latestAccreditation.statusValidityDate}</p>
                    )}
                </div>
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
        <div className="lg:col-span-2 space-y-6">
            {/* Accreditation Milestone Timeline */}
            <Card className="border-primary/10 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/10 border-b py-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-base flex items-center gap-2 font-black uppercase tracking-tight">
                                <History className="h-4 w-4 text-primary" />
                                Accreditation Lifecycle Timeline
                            </CardTitle>
                            <CardDescription className="text-xs">Summary of survey visits and institutional milestones.</CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-white font-black text-[9px] uppercase tracking-widest">{analyticsData?.milestones.length} EVENTS</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="max-h-[300px]">
                        <div className="divide-y">
                            {analyticsData?.milestones.map((milestone, idx) => (
                                <div key={idx} className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                                    <div className="flex flex-col items-center shrink-0 pt-1">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-[10px]">
                                            {idx + 1}
                                        </div>
                                        {idx < (analyticsData.milestones.length - 1) && <div className="w-px h-full bg-border mt-2" />}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="font-black text-sm text-slate-900 tracking-tight uppercase">{milestone.level}</p>
                                            <Badge className={cn(
                                                "text-[8px] h-4 font-black uppercase border-none px-1.5",
                                                milestone.lifecycleStatus === 'Current' ? "bg-emerald-600 text-white" :
                                                milestone.lifecycleStatus === 'Undergoing' ? "bg-amber-500 text-amber-950 animate-pulse" :
                                                "bg-slate-500 text-white"
                                            )}>
                                                {milestone.lifecycleStatus}
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Survey: {milestone.dateOfSurvey || 'TBA'}</div>
                                            <div className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> Valid: {milestone.statusValidityDate || 'TBA'}</div>
                                            {milestone.ratingsSummary?.grandMean && (
                                                <div className="flex items-center gap-1.5 text-primary"><TrendingUp className="h-3 w-3" /> Mean: {milestone.ratingsSummary.grandMean.toFixed(2)}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {analyticsData?.milestones.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground italic text-xs">No accreditation milestones logged.</div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Academic Year Enrollment Trends
                        </CardTitle>
                        <CardDescription>Aggregate student counts for Academic Year {selectedYear}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={{ 
                        '1st Sem': { label: '1st Semester', color: 'hsl(var(--chart-1))' },
                        '2nd Sem': { label: '2nd Semester', color: 'hsl(var(--chart-2))' },
                        'Mid-Year': { label: 'Mid-Year Term', color: 'hsl(var(--chart-3))' }
                    }} className="h-[250px] w-full">
                        <ResponsiveContainer>
                            <BarChart data={analyticsData?.enrollmentData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip content={<ChartTooltipContent />} />
                                <Legend verticalAlign="top" align="right" />
                                <Bar dataKey="1st Sem" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="2nd Sem" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Mid-Year" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            {program.hasSpecializations && (
                <Card className="border-blue-200 bg-blue-50/5 shadow-md">
                    <CardHeader className="bg-blue-50 border-b py-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                                    <Layers className="h-5 w-5" />
                                    Specialization (Majors) Coverage
                                </CardTitle>
                                <CardDescription className="text-xs">Faculty distribution per registered major track.</CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-white border-blue-200 text-blue-700 font-black h-5 text-[9px] uppercase tracking-widest">{program.specializations?.length} TRACKS</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-blue-100">
                            {program.specializations?.map(spec => {
                                const specFaculty = analyticsData?.facultyPerSpec[spec.id] || [];
                                const coreCount = specFaculty.filter(f => f.category === 'Core').length;
                                return (
                                    <div key={spec.id} className="p-4 flex items-center justify-between hover:bg-blue-50/50 transition-colors">
                                        <div className="space-y-1 min-w-0 pr-4">
                                            <p className="font-black text-sm text-slate-900 tracking-tight">{spec.name}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {specFaculty.slice(0, 3).map(f => (
                                                    <span key={f.id} className="text-[10px] text-muted-foreground bg-white border px-1.5 rounded flex items-center gap-1">
                                                        <UserCheck className="h-2.5 w-2.5" /> {f.name}
                                                    </span>
                                                ))}
                                                {specFaculty.length > 3 && <span className="text-[10px] text-muted-foreground">+{specFaculty.length - 3} more</span>}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-lg font-black text-blue-700 leading-none">{coreCount}</div>
                                            <p className="text-[8px] font-bold uppercase text-blue-600/60">Core Faculty</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

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
                    <ScrollArea className="h-full">
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
                    </ScrollArea>
                </CardContent>
                <div className="p-4 border-t bg-muted/10">
                    <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                        All files are hosted on the unit's official Google Drive. Ensure 'Anyone with the link can view' is active for correct previewing.
                    </p>
                </div>
            </Card>
        </div>
      </div>

      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
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
