
'use client';

import { useMemo, useState } from 'react';
import type { ProgramComplianceRecord, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
    PieChart, 
    Pie, 
    Cell, 
    ResponsiveContainer, 
    Tooltip
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Users, LayoutGrid, ChevronDown, ChevronUp, Search, Info, ShieldCheck } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface UnitSddExplorerProps {
  compliances: ProgramComplianceRecord[];
  units: Unit[];
  selectedYear: number;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export function UnitSddExplorer({ compliances, units, selectedYear }: UnitSddExplorerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const unitData = useMemo(() => {
    // Only show Academic units as they possess the disaggregated enrollment data
    const academicUnits = units.filter(u => u.category === 'Academic');

    return academicUnits.map(unit => {
        const unitCompliances = compliances.filter(c => c.unitId === unit.id);
        
        let m = 0, f = 0, o = 0;

        unitCompliances.forEach(record => {
            // Aggregate from enrollment (Baseline: 1st Sem)
            const enrollmentRecords = record.enrollmentRecords || [];
            const levels = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'] as const;
            
            if (enrollmentRecords.length > 0) {
                enrollmentRecords.forEach(rec => {
                    levels.forEach(level => {
                        m += Number(rec.firstSemester?.[level]?.male || 0);
                        f += Number(rec.firstSemester?.[level]?.female || 0);
                    });
                });
            }

            // Aggregate from faculty
            if (record.faculty) {
                const members = record.faculty.members || [];
                members.forEach(faculty => {
                    if (faculty.sex === 'Male') m++;
                    else if (faculty.sex === 'Female') f++;
                    else o++;
                });
            }
        });

        const chartData = [
            { name: 'Male', value: m, fill: COLORS[0] },
            { name: 'Female', value: f, fill: COLORS[1] },
            { name: 'Others', value: o, fill: COLORS[2] }
        ].filter(d => d.value > 0);

        return {
            id: unit.id,
            name: unit.name,
            total: m + f + o,
            chartData
        };
    }).filter(u => u.total > 0 && u.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [compliances, units, searchTerm]);

  return (
    <Card className="shadow-lg border-primary/20 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="bg-primary/5 py-4 px-6 cursor-pointer hover:bg-primary/10 transition-colors">
          <CollapsibleTrigger className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
                <LayoutGrid className="h-5 w-5 text-primary" />
                <div className="text-left">
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Unit-Level SDD Explorer</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                        {isOpen ? 'Click to minimize view' : `Expand to view disaggregation for ${unitData.length} units`}
                    </CardDescription>
                </div>
            </div>
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent className="animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-6 border-t bg-white">
            <div className="relative mb-8 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search units..." 
                    className="pl-9 h-10 shadow-sm text-xs font-bold uppercase"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {unitData.map((unit) => (
                    <Card key={unit.id} className="shadow-sm border-slate-100 hover:border-primary/20 transition-all flex flex-col group">
                        <CardHeader className="p-3 border-b bg-slate-50/50 group-hover:bg-primary/5 transition-colors text-center">
                            <CardTitle className="text-[10px] font-black uppercase truncate" title={unit.name}>{unit.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                            <ChartContainer config={{}} className="h-[120px] w-[120px]">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Tooltip content={<ChartTooltipContent hideLabel />} />
                                        <Pie 
                                            data={unit.chartData} 
                                            cx="50%" 
                                            cy="50%" 
                                            innerRadius={30} 
                                            outerRadius={45} 
                                            paddingAngle={3} 
                                            dataKey="value"
                                        >
                                            {unit.chartData.map((e, j) => <Cell key={j} fill={e.fill} />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                            <div className="mt-2 text-center">
                                <p className="text-xl font-black text-slate-800 tabular-nums">{unit.total}</p>
                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Total Stakeholders</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {unitData.length === 0 && (
                    <div className="col-span-full py-20 text-center opacity-20 border-2 border-dashed rounded-2xl">
                        <Info className="h-12 w-12 mx-auto mb-2" />
                        <p className="text-xs font-black uppercase tracking-widest">No matching unit data found for {selectedYear}</p>
                    </div>
                )}
            </div>
          </div>
          <CardFooter className="bg-muted/5 border-t py-3 px-8">
              <div className="flex items-start gap-3">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-muted-foreground italic leading-tight">
                      <strong>Admin Oversight:</strong> This explorer provides an automated roll-up of all students and faculty mapped to academic units. Use this to verify that unit-level GPB planning is consistent with their actual sex-disaggregated population.
                  </p>
              </div>
          </CardFooter>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
