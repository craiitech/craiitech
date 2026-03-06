'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { Unit, UnitForm, UnitFormRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    PlusCircle, 
    Loader2, 
    FileText, 
    History as HistoryIcon, 
    ExternalLink, 
    ListChecks, 
    Clock, 
    CheckCircle2, 
    ShieldCheck, 
    Info, 
    Building, 
    Activity, 
    ChevronRight, 
    Search, 
    PanelLeftClose, 
    PanelLeftOpen, 
    ChevronLeft, 
    Link as LinkIcon,
    FolderKanban
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FormRegistrationDialog } from '@/components/manuals/form-registration-dialog';
import { FormRequestReviewDialog } from '@/components/manuals/form-request-review-dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

const statusColors: Record<string, string> = {
    'Submitted': 'bg-blue-100 text-blue-700',
    'QA Review': 'bg-indigo-100 text-indigo-700',
    'Returned for Correction': 'bg-rose-100 text-rose-700',
    'Awaiting Presidential Approval': 'bg-amber-100 text-amber-700',
    'Approved & Registered': 'bg-emerald-100 text-emerald-700',
};

export default function UnitFormsPage() {
  const { userProfile, isAdmin, userRole, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  
  const [isRegOpen, setIsRegOpen] = useState(false);
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const unitsToShow = useMemo(() => {
    if (!allUnits || !userProfile || isUserLoading) return [];
    
    let filtered = [...allUnits];
    if (!isAdmin && userRole !== 'Auditor') {
        filtered = filtered.filter(u => u.campusIds?.includes(userProfile.campusId));
        if (userRole === 'Unit Coordinator' || userRole === 'Unit ODIMO') {
            filtered = filtered.filter(u => u.id === userProfile.unitId);
        }
    }

    if (searchTerm) {
        filtered = filtered.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [allUnits, userProfile, isAdmin, userRole, isUserLoading, searchTerm]);

  useEffect(() => {
    if (userProfile?.unitId && !selectedUnitId && !isUserLoading) {
        setSelectedUnitId(userProfile.unitId);
    }
  }, [userProfile, selectedUnitId, isUserLoading]);

  const selectedUnit = useMemo(() => unitsToShow.find(u => u.id === selectedUnitId), [unitsToShow, selectedUnitId]);

  const formsQuery = useMemoFirebase(
    () => (firestore && selectedUnitId ? query(collection(firestore, 'unitForms'), where('unitId', '==', selectedUnitId)) : null),
    [firestore, selectedUnitId]
  );
  const { data: forms, isLoading: isLoadingForms } = useCollection<UnitForm>(formsQuery);

  const requestsQuery = useMemoFirebase(
    () => (firestore && selectedUnitId ? query(collection(firestore, 'unitFormRequests'), where('unitId', '==', selectedUnitId), orderBy('createdAt', 'desc')) : null),
    [firestore, selectedUnitId]
  );
  const { data: requests, isLoading: isLoadingRequests } = useCollection<UnitFormRequest>(requestsQuery);

  const canRegister = isAdmin || (userProfile?.unitId === selectedUnitId && (userRole === 'Unit Coordinator' || userRole === 'Unit ODIMO'));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Unit Forms & Records</h2>
          <p className="text-muted-foreground text-sm">
            Registry of official controlled forms and registration request management.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="lg:hidden" 
          onClick={() => setIsSidebarVisible(!isSidebarVisible)}
        >
          {isSidebarVisible ? <PanelLeftClose className="mr-2 h-4 w-4" /> : <PanelLeftOpen className="mr-2 h-4 w-4" />}
          {isSidebarVisible ? 'Hide Units' : 'Show Units'}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-12rem)]">
        <div className={cn(
          "transition-all duration-300 overflow-hidden flex flex-col",
          isSidebarVisible ? "w-full lg:w-1/4 opacity-100" : "w-0 opacity-0 lg:-mr-6"
        )}>
          <Card className="flex flex-col h-[400px] lg:h-full shadow-sm border-primary/10">
            <CardHeader className="pb-4 bg-muted/30 border-b">
              <CardTitle className="text-xs font-black uppercase tracking-widest">Unit Directory</CardTitle>
              <div className="relative pt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search units..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs bg-white"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
              {isLoadingUnits ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="flex flex-col">
                    {unitsToShow.map(unit => (
                      <Button
                        key={unit.id}
                        variant="ghost"
                        onClick={() => setSelectedUnitId(unit.id)}
                        className={cn(
                          "w-full justify-start text-left h-auto py-3 px-4 rounded-none border-l-2 transition-all",
                          selectedUnitId === unit.id 
                            ? "bg-primary/5 text-primary border-primary font-bold shadow-inner" 
                            : "border-transparent hover:bg-muted/50"
                        )}
                      >
                        <Building className="mr-3 h-3 w-3 flex-shrink-0 opacity-40" />
                        <span className="truncate text-xs">{unit.name}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 min-w-0 flex flex-col relative">
          <Button
            variant="secondary"
            size="icon"
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full border shadow-md hidden lg:flex hover:bg-primary hover:text-white transition-colors"
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
          >
            {isSidebarVisible ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          {selectedUnit ? (
            <ScrollArea className="flex-1 rounded-md border p-6 bg-muted/5">
                <div className="space-y-8 pb-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                <ListChecks className="h-6 w-6 text-primary" />
                                {selectedUnit.name} Registry
                            </h3>
                            <p className="text-xs text-muted-foreground font-medium">Quality forms control and registration workspace.</p>
                        </div>
                        {canRegister && (
                            <Button onClick={() => setIsRegOpen(true)} className="shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest h-9">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Register New Form
                            </Button>
                        )}
                    </div>

                    <Card className="border-primary/20 bg-primary/5 shadow-md overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex flex-col md:flex-row items-center justify-between p-6 gap-6">
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg text-white shrink-0">
                                    <FolderKanban className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">Institutional Forms Drive</h4>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed max-w-md">
                                        All approved quality forms for this unit are physically maintained in this designated Google Drive area by the QA Office.
                                    </p>
                                </div>
                            </div>
                            <div className="shrink-0 w-full md:w-auto">
                                {selectedUnit.formsDriveLink ? (
                                    <Button asChild className="w-full h-11 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-indigo-600 text-white hover:bg-indigo-700">
                                        <a href={selectedUnit.formsDriveLink} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Access Official Roster
                                        </a>
                                    </Button>
                                ) : (
                                    <div className="p-3 px-6 rounded-lg bg-muted border border-dashed text-center">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                                            <LinkIcon className="h-3 w-3" />
                                            Drive area not yet set by Admin
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="shadow-sm border-primary/10 overflow-hidden">
                                <CardHeader className="bg-muted/10 border-b py-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xs font-black uppercase tracking-tight flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 text-primary" />
                                            Active Controlled Forms List
                                        </CardTitle>
                                        <Badge variant="outline" className="bg-white font-black text-[10px]">{forms?.length || 0} FORMS</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow>
                                                <TableHead className="text-[10px] font-black uppercase pl-6">Code</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase">Official Title</TableHead>
                                                <TableHead className="text-[10px] font-black uppercase text-center">Rev.</TableHead>
                                                <TableHead className="text-right text-[10px] font-black uppercase pr-6">Source</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoadingForms ? (
                                                <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary opacity-20 mx-auto" /></TableCell></TableRow>
                                            ) : forms?.length ? (
                                                forms.sort((a,b) => a.formCode.localeCompare(b.formCode)).map(form => (
                                                    <TableRow key={form.id} className="hover:bg-muted/20">
                                                        <TableCell className="pl-6 font-mono text-xs font-bold text-primary">{form.formCode}</TableCell>
                                                        <TableCell className="text-[12px] font-bold text-slate-800">{form.formName}</TableCell>
                                                        <TableCell className="text-center"><Badge variant="secondary" className="h-4 text-[8px] font-bold uppercase">{form.revision}</Badge></TableCell>
                                                        <TableCell className="text-right pr-6">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                                <a href={form.googleDriveLink} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow><TableCell colSpan={4} className="h-32 text-center text-[10px] font-bold text-muted-foreground uppercase opacity-20 italic">No individual forms enrolled yet.</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-1">
                            <Card className="shadow-md border-primary/10 overflow-hidden bg-background">
                                <CardHeader className="bg-muted/10 border-b py-4">
                                    <div className="flex items-center gap-2">
                                        <HistoryIcon className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-sm font-black uppercase tracking-tight">Request Track & Trace</CardTitle>
                                    </div>
                                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lifecycle of form registrations.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <ScrollArea className="h-[400px]">
                                        {isLoadingRequests ? (
                                            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary opacity-20" /></div>
                                        ) : (
                                            <div className="divide-y">
                                                {requests?.map(req => (
                                                    <div 
                                                        key={req.id} 
                                                        className="p-4 hover:bg-muted/30 transition-colors group cursor-pointer"
                                                        onClick={() => setReviewRequestId(req.id)}
                                                    >
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <Badge className={cn("text-[8px] font-black uppercase h-4 px-1.5 border-none shadow-none", statusColors[req.status])}>
                                                                    {req.status}
                                                                </Badge>
                                                                <span className="text-[10px] font-mono text-muted-foreground">{format(req.createdAt?.toDate ? req.createdAt.toDate() : new Date(), 'MMM dd, yy')}</span>
                                                            </div>
                                                            <p className="text-[11px] font-black text-slate-800 uppercase leading-tight">Registration Request</p>
                                                            <div className="flex items-center justify-between pt-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Current Holder: QA Office</span>
                                                                </div>
                                                                <ChevronRight className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-all" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {requests?.length === 0 && (
                                                    <div className="py-20 text-center opacity-20 flex flex-col items-center gap-2">
                                                        <Activity className="h-8 w-8" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest">No active requests</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </ScrollArea>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border border-dashed rounded-2xl bg-muted/5 text-muted-foreground p-12">
                <Building className="h-12 w-12 opacity-10 mb-4" />
                <h4 className="font-black text-xs uppercase tracking-[0.2em]">Form Control Hub</h4>
                <p className="text-[10px] mt-2 max-w-[250px] text-center leading-relaxed">Select a unit from the directory to access its quality forms registry and manage registration requests.</p>
            </div>
          )}
        </div>
      </div>

      {selectedUnit && (
          <FormRegistrationDialog 
            isOpen={isRegOpen} 
            onOpenChange={setIsRegOpen} 
            unit={selectedUnit} 
          />
      )}

      {reviewRequestId && (
          <FormRequestReviewDialog
            requestId={reviewRequestId}
            isOpen={!!reviewRequestId}
            onOpenChange={(open) => !open && setReviewRequestId(null)}
          />
      )}
    </div>
  );
}
