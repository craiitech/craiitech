'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Unit, GADMainstreamingChecklist } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    ShieldCheck, 
    ChevronRight, 
    CheckCircle2, 
    Target, 
    Info, 
    History,
    Loader2
} from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface GADMainstreamingProps {
  units: Unit[];
  selectedYear: number;
}

const PCW_MAINSTREAMING_CRITERIA = [
    { id: 'policy-1', category: 'Policy', label: 'Gender-responsive institutional policies are adopted and communicated.' },
    { id: 'policy-2', category: 'Policy', label: 'Presence of an active GAD focal point system or committee.' },
    { id: 'program-1', category: 'Program', label: 'Curriculum or procedures have undergone gender-sensitivity review.' },
    { id: 'program-2', category: 'Program', label: 'Specific programs target identified gender issues in the SDD Hub.' },
    { id: 'facility-1', category: 'Facility', label: 'Presence of functional lactation rooms or gender-neutral restrooms.' },
    { id: 'facility-2', category: 'Facility', label: 'Campus environment meets safety standards for all genders.' },
    { id: 'data-1', category: 'Data', label: 'Unit maintains an active and updated SDD database.' },
    { id: 'data-2', category: 'Data', label: 'Data is used to drive the annual GAD Plan and Budget (GPB).' }
];

export function GADMainstreaming({ units, selectedYear }: GADMainstreamingProps) {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isGadCoordinator = userRole?.toLowerCase().includes('coordinator') && !isAdmin;

  // Scoped to current unit for coordinators, or allowed selection for admins
  const [activeUnitId, setActiveUnitId] = useState<string>(userProfile?.unitId || units[0]?.id || '');

  // Role-based locking: Force coordinator to their specific unit
  useEffect(() => {
    if (isGadCoordinator && userProfile?.unitId) {
        setActiveUnitId(userProfile.unitId);
    }
  }, [isGadCoordinator, userProfile?.unitId]);

  const checklistId = `${activeUnitId}-${selectedYear}`;
  const checklistRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'gadMainstreaming', checklistId) : null),
    [firestore, checklistId]
  );
  const { data: checklist, isLoading } = useDoc<GADMainstreamingChecklist>(checklistRef);

  const currentScores = checklist?.scores || {};
  const completedCount = Object.values(currentScores).filter(Boolean).length;
  const maturityScore = Math.round((completedCount / PCW_MAINSTREAMING_CRITERIA.length) * 100);

  const handleToggle = async (itemId: string) => {
    if (!firestore || !userProfile || isSubmitting) return;
    
    // Safety check: coordinators can only toggle their own unit
    if (!isAdmin && isGadCoordinator && userProfile.unitId !== activeUnitId) {
        toast({ title: 'Access Denied', description: 'You can only update mainstreaming status for your assigned unit.', variant: 'destructive' });
        return;
    }

    const newScores = { ...currentScores, [itemId]: !currentScores[itemId] };
    setIsSubmitting(true);
    
    try {
        await setDoc(checklistRef!, {
            id: checklistId,
            unitId: activeUnitId,
            year: selectedYear,
            scores: newScores,
            updatedAt: serverTimestamp()
        }, { merge: true });
        toast({ title: 'Status Updated', description: 'Mainstreaming index has been recalculated.' });
    } catch (e) {
        toast({ title: 'Update Failed', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-20rem)] overflow-hidden">
      {/* Unit Directory Sidebar - Hidden for GAD Coordinators */}
      <Card className={cn("lg:col-span-1 flex flex-col overflow-hidden shadow-sm border-primary/10", isGadCoordinator && "hidden lg:hidden")}>
        <CardHeader className="bg-muted/30 border-b pb-4 shrink-0">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Unit Selection</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col">
              {units.sort((a, b) => a.name.localeCompare(b.name)).map(unit => (
                <button
                  key={unit.id}
                  onClick={() => setActiveUnitId(unit.id)}
                  className={cn(
                    "w-full text-left py-3 px-6 text-xs transition-all border-l-2",
                    activeUnitId === unit.id 
                      ? "bg-primary/5 text-primary border-primary font-bold shadow-inner" 
                      : "border-transparent text-muted-foreground hover:bg-muted/30"
                  )}
                >
                  {unit.name}
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Main Checklist Workspace - Full width if sidebar hidden */}
      <Card className={cn("flex flex-col overflow-hidden shadow-lg border-primary/10", isGadCoordinator ? "lg:col-span-3" : "lg:col-span-2")}>
        <CardHeader className="bg-primary/5 border-b py-6 shrink-0">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Mainstreaming Maturity Assessment
                    </CardTitle>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Evaluating: {units.find(u => u.id === activeUnitId)?.name || 'Select Unit'} &bull; AY {selectedYear}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-black text-primary tabular-nums">{maturityScore}%</span>
                    <p className="text-[9px] font-black uppercase text-emerald-600 tracking-tighter">Compliance Index</p>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden bg-white">
            <ScrollArea className="h-full">
                <div className="p-8 space-y-10">
                    <div className="p-4 bg-muted/20 rounded-xl border border-dashed flex gap-4">
                        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                            This checklist follows the <strong>Harmonized Gender and Development Guidelines (HGDG)</strong> framework. Use this to track the qualitative progress of your unit's mainstreaming efforts beyond documentation logs.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {['Policy', 'Program', 'Facility', 'Data'].map(category => (
                            <div key={category} className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary border-b pb-1 flex items-center gap-2">
                                    <Target className="h-3 w-3" />
                                    {category} Mainstreaming Elements
                                </h4>
                                <div className="space-y-2">
                                    {PCW_MAINSTREAMING_CRITERIA.filter(c => c.category === category).map((item) => (
                                        <div 
                                            key={item.id} 
                                            className={cn(
                                                "flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer group",
                                                currentScores[item.id] ? "bg-emerald-50/50 border-emerald-100 shadow-sm" : "bg-background border-slate-100 hover:border-primary/20"
                                            )}
                                            onClick={() => handleToggle(item.id)}
                                        >
                                            <div className="shrink-0 mt-0.5">
                                                {isLoading || isSubmitting ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                ) : (
                                                    <div className={cn("h-5 w-5 rounded border flex items-center justify-center transition-colors", currentScores[item.id] ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white")}>
                                                        {currentScores[item.id] && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <p className={cn("text-sm font-bold leading-snug", currentScores[item.id] ? "text-emerald-900" : "text-slate-700")}>{item.label}</p>
                                                {currentScores[item.id] && (
                                                    <p className="text-[9px] font-black uppercase text-emerald-600/70 tracking-tighter flex items-center gap-1">
                                                        <ShieldCheck className="h-2.5 w-2.5" /> Verified Operational
                                                    </p>
                                                )}
                                            </div>
                                            <ChevronRight className={cn("h-4 w-4 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity", currentScores[item.id] ? "text-emerald-400" : "text-slate-300")} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </ScrollArea>
        </CardContent>
        <CardFooter className="p-4 bg-slate-50 border-t flex justify-between items-center px-8">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                <History className="h-3.5 w-3.5" />
                Last Update: {checklist?.updatedAt ? format(checklist.updatedAt.toDate(), 'PPP p') : 'Pending Initial Assessment'}
            </div>
            <p className="text-[9px] text-primary/60 font-black uppercase tracking-widest">RSU-QAO-GAD-MTRX v1.0</p>
        </CardFooter>
      </Card>
    </div>
  );
}
