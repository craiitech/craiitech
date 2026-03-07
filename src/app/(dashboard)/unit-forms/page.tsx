
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { Unit, UnitForm } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
    Loader2, 
    Download, 
    ShieldCheck, 
    Building, 
    Search, 
    PanelLeftClose, 
    PanelLeftOpen, 
    ChevronLeft, 
    ChevronRight,
    Link as LinkIcon,
    FolderKanban,
    Save,
    Layers,
    FileText,
    Eye,
    Send,
    History as HistoryIcon,
    Info
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FormRegistrationDialog } from '@/components/manuals/form-registration-dialog';
import { FormDownloadDialog } from '@/components/manuals/form-download-dialog';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const SHARED_ACADEMIC_ID = 'academic-shared';

export default function UnitFormsPage() {
  const { userProfile, isAdmin, userRole, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  
  const [isRegOpen, setIsRegOpen] = useState(false);
  const [isSavingLinks, setIsSavingLinks] = useState(false);
  
  const [editRosterLink, setEditRosterLink] = useState('');
  const [editMasterlistLink, setEditMasterlistLink] = useState('');
  
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);
  const [downloadingForm, setDownloadingForm] = useState<UnitForm | null>(null);
  const [isRosterLogOpen, setIsRosterLogOpen] = useState(false);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const sidebarUnits = useMemo(() => {
    if (!allUnits || !userProfile || isUserLoading) return [];
    
    let filtered = allUnits.filter(u => u.category !== 'Academic');
    
    if (!isAdmin && userRole !== 'Auditor') {
        filtered = filtered.filter(u => u.campusIds?.includes(userProfile.campusId));
        if (userRole === 'Unit Coordinator' || userRole === 'Unit ODIMO') {
            filtered = filtered.filter(u => u.id === userProfile.unitId);
        }
    }

    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        filtered = filtered.filter(u => u.name.toLowerCase().includes(lower));
    }

    const items = filtered.map(u => ({ id: u.id, name: u.name, category: u.category, isShared: false }));

    const hasAcademic = allUnits.some(u => u.category === 'Academic');
    if (hasAcademic) {
        const myUnit = allUnits.find(u => u.id === userProfile.unitId);
        const canSeeAcademic = isAdmin || userRole === 'Auditor' || myUnit?.category === 'Academic';
        
        if (canSeeAcademic) {
            items.unshift({ id: SHARED_ACADEMIC_ID, name: 'Academic Units (Shared Registry)', category: 'Academic', isShared: true });
        }
    }

    return items.sort((a, b) => a.isShared ? -1 : b.isShared ? 1 : a.name.localeCompare(b.name));
  }, [allUnits, userProfile, isAdmin, userRole, isUserLoading, searchTerm]);

  useEffect(() => {
    if (userProfile && !selectedUnitId && !isUserLoading) {
        const myUnit = allUnits?.find(u => u.id === userProfile.unitId);
        if (myUnit?.category === 'Academic') {
            setSelectedUnitId(SHARED_ACADEMIC_ID);
        } else {
            setSelectedUnitId(userProfile.unitId || null);
        }
    }
  }, [userProfile, allUnits, selectedUnitId, isUserLoading]);

  const selectedUnit = useMemo(() => {
      if (selectedUnitId === SHARED_ACADEMIC_ID) {
          return { id: SHARED_ACADEMIC_ID, name: 'Academic Units (Shared Registry)', category: 'Academic' as const, isShared: true };
      }
      return allUnits?.find(u => u.id === selectedUnitId);
  }, [allUnits, selectedUnitId]);

  const academicSharedRef = useMemoFirebase(() => (firestore ? doc(firestore, 'campusSettings', 'academic-shared') : null), [firestore]);
  const { data: sharedSettings } = useDoc<any>(academicSharedRef);

  const currentRosterLink = useMemo(() => {
      if (selectedUnitId === SHARED_ACADEMIC_ID) return sharedSettings?.formsDriveLink || '';
      return (selectedUnit as Unit)?.formsDriveLink || '';
  }, [selectedUnitId, sharedSettings, selectedUnit]);

  const currentMasterlistLink = useMemo(() => {
      if (selectedUnitId === SHARED_ACADEMIC_ID) return sharedSettings?.masterlistPdfLink || '';
      return (selectedUnit as Unit)?.masterlistPdfLink || '';
  }, [selectedUnitId, sharedSettings, selectedUnit]);

  useEffect(() => {
      setEditRosterLink(currentRosterLink);
      setEditMasterlistLink(currentMasterlistLink);
  }, [currentRosterLink, currentMasterlistLink]);

  const formsQuery = useMemoFirebase(
    () => (firestore && selectedUnitId ? query(collection(firestore, 'unitForms'), where('unitId', '==', selectedUnitId)) : null),
    [firestore, selectedUnitId]
  );
  const { data: forms, isLoading: isLoadingForms } = useCollection<UnitForm>(formsQuery);

  const handleSaveAdminLinks = async () => {
      if (!firestore) return;
      setIsSavingLinks(true);
      try {
          const links = { 
              formsDriveLink: editRosterLink, 
              masterlistPdfLink: editMasterlistLink 
          };

          if (selectedUnitId === SHARED_ACADEMIC_ID) {
              await setDoc(doc(firestore, 'campusSettings', 'academic-shared'), links, { merge: true });
          } else if (selectedUnitId) {
              await setDoc(doc(firestore, 'units', selectedUnitId!), links, { merge: true });
          }
          toast({ title: 'Links Updated', description: 'Institutional repository parameters have been saved.' });
      } catch (e) {
          console.error("Save Link Error:", e);
          toast({ title: 'Error', description: 'Failed to update links.', variant: 'destructive' });
      } finally {
          setIsSavingLinks(false);
      }
  };

  const getEmbedUrl = (url: string) => url.replace('/view', '/preview').replace('?usp=sharing', '');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Unit Forms & Records</h2>
          <p className="text-muted-foreground text-sm">Registry of official controlled forms and registration request management.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="md:hidden" 
          onClick={() => setIsSidebarVisible(!isSidebarVisible)}
        >
          {isSidebarVisible ? <PanelLeftClose className="mr-2 h-4 w-4" /> : <PanelLeftOpen className="mr-2 h-4 w-4" />}
          {isSidebarVisible ? 'Hide Units' : 'Show Units'}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-12rem)]">
        {/* Unit Directory Sidebar */}
        <div className={cn(
          "transition-all duration-300 overflow-hidden flex flex-col gap-2",
          isSidebarVisible ? "w-full md:w-1/4 opacity-100" : "w-0 opacity-0 md:-ml-6"
        )}>
          <Card className="flex flex-col h-[400px] md:h-full shadow-sm border-primary/10">
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
                    {sidebarUnits.map(unit => (
                      <Button
                        key={unit.id}
                        variant="ghost"
                        onClick={() => setSelectedUnitId(unit.id)}
                        className={cn(
                          "w-full justify-start text-left h-auto py-2.5 px-4 text-xs rounded-none border-l-2 transition-all",
                          selectedUnitId === unit.id 
                            ? "bg-primary/5 text-primary border-primary font-bold shadow-inner" 
                            : "border-transparent text-muted-foreground"
                        )}
                      >
                        {unit.isShared ? <Layers className="mr-3 h-3 w-3 flex-shrink-0 text-primary" /> : <Building className="mr-3 h-3 w-3 flex-shrink-0 opacity-40" />}
                        <span className={cn("truncate text-xs", unit.isShared && "font-black")}>{unit.name}</span>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Workspace Area */}
        <div className="flex-1 min-0 flex flex-col relative">
          <Button
            variant="secondary"
            size="icon"
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full border shadow-md hidden md:flex hover:bg-primary hover:text-white transition-colors"
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            title={isSidebarVisible ? "Hide Unit Directory" : "Show Unit Directory"}
          >
            {isSidebarVisible ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          {selectedUnit ? (
            <Tabs defaultValue="roster" className="flex-1 flex flex-col min-h-0">
                <div className="bg-background flex items-center justify-between border-b pb-2 shrink-0">
                    <TabsList className="bg-muted p-1 h-10">
                        <TabsTrigger value="roster" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                            <ListChecks className="h-3.5 w-3.5" /> Unit Forms
                        </TabsTrigger>
                        <TabsTrigger value="register" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                            <FileText className="h-3.5 w-3.5" /> Apply for New Form
                        </TabsTrigger>
                    </TabsList>
                    <Badge variant="outline" className="h-6 font-black text-[10px] uppercase border-primary/20 bg-primary/5 text-primary">{selectedUnit.name}</Badge>
                </div>

                <div className="flex-1 overflow-hidden pt-4">
                    <TabsContent value="roster" className="h-full m-0 animate-in fade-in slide-in-from-left-2 duration-300">
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-8 pb-10">
                                {/* 1. Official Roster Access Card */}
                                <Card className="border-primary/20 bg-primary/5 shadow-md overflow-hidden">
                                    <CardHeader className="bg-primary/10 border-b py-4">
                                        <div className="flex items-center gap-2">
                                            <FolderKanban className="h-5 w-5 text-primary" />
                                            <CardTitle className="text-sm font-black uppercase tracking-tight">#1 Official Roster of Forms Access</CardTitle>
                                        </div>
                                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Secure repository for approved EOMS documentation.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-6">
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="space-y-2 flex-1">
                                                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                                    Click the button below to request access to the unit's official folder. All download attempts are logged for institutional quality auditing.
                                                </p>
                                                {currentRosterLink ? (
                                                    <Button 
                                                        onClick={() => setIsRosterLogOpen(true)}
                                                        className="w-full md:w-auto h-11 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20"
                                                    >
                                                        <ExternalLink className="h-4 w-4 mr-2" /> Access Official Roster
                                                    </Button>
                                                ) : (
                                                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-100 flex items-start gap-3">
                                                        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                                        <p className="text-[10px] text-amber-700 font-bold uppercase">Pending Repository Setup by Administrator</p>
                                                    </div>
                                                )}
                                            </div>

                                            {isAdmin && (
                                                <div className="w-full md:w-[400px] p-4 bg-white rounded-xl border border-primary/20 shadow-inner space-y-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                                                            <LinkIcon className="h-3 w-3" /> #1 Official Roster folder Link
                                                        </Label>
                                                        <Input 
                                                            value={editRosterLink} 
                                                            onChange={(e) => setEditRosterLink(e.target.value)} 
                                                            placeholder="Folder URL for downloading..."
                                                            className="h-8 text-[10px] bg-slate-50"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                                                            <FileText className="h-3 w-3" /> #2 Masterlist PDF Link (Preview)
                                                        </Label>
                                                        <Input 
                                                            value={editMasterlistLink} 
                                                            onChange={(e) => setEditMasterlistLink(e.target.value)} 
                                                            placeholder="PDF URL for the preview board..."
                                                            className="h-8 text-[10px] bg-slate-50"
                                                        />
                                                    </div>
                                                    <Button 
                                                        size="sm" 
                                                        onClick={handleSaveAdminLinks} 
                                                        disabled={isSavingLinks} 
                                                        className="w-full h-8 font-black uppercase text-[10px] tracking-widest"
                                                    >
                                                        {isSavingLinks ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}
                                                        Save Administrative Links
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* 2. Master List Preview Card */}
                                <Card className="shadow-lg border-primary/10 overflow-hidden">
                                    <CardHeader className="bg-muted/10 border-b py-4">
                                        <div className="flex items-center gap-2">
                                            <Eye className="h-5 w-5 text-primary" />
                                            <CardTitle className="text-sm font-black uppercase tracking-tight">#2 Unit Masterlist of Forms/Records Preview</CardTitle>
                                        </div>
                                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Identify the specific forms required for your processes before requesting a download from the Roster (#1).</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0 bg-slate-100 min-h-[500px] relative shadow-inner">
                                        {currentMasterlistLink ? (
                                            <iframe 
                                                src={getEmbedUrl(currentMasterlistLink)} 
                                                className="absolute inset-0 w-full h-full border-none bg-white"
                                                allow="autoplay"
                                                title="Unit Masterlist Preview"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground opacity-20 p-8 text-center gap-3">
                                                <FileText className="h-16 w-16" />
                                                <div className="space-y-1">
                                                    <p className="text-sm font-black uppercase tracking-widest">Masterlist Unavailable</p>
                                                    <p className="text-[10px] max-w-xs font-medium">The unit head or administrator has not yet uploaded the official PDF masterlist for this unit.</p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="bg-white border-t py-3 px-6">
                                        <div className="flex items-start gap-3">
                                            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-muted-foreground italic leading-tight">
                                                <strong>Standard Guidance:</strong> This preview allows users to cross-reference their operational requirements with the controlled forms roster. Refer to your unit's **Procedure Manual** to verify which codes are applicable to your specific tasks.
                                            </p>
                                        </div>
                                    </CardFooter>
                                </Card>

                                {/* 3. Individual Forms Roster Table */}
                                <Card className="shadow-sm border-primary/10 overflow-hidden">
                                    <CardHeader className="bg-muted/10 border-b py-4">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4 text-primary" />
                                            <CardTitle className="text-xs font-black uppercase tracking-tight">Enrolled Controlled Forms Log</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader className="bg-muted/30">
                                                <TableRow>
                                                    <TableHead className="text-[10px] font-black uppercase pl-6">Code</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase">Official Title</TableHead>
                                                    <TableHead className="text-[10px] font-black uppercase text-center">Rev.</TableHead>
                                                    <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {isLoadingForms ? (
                                                    <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary opacity-20 mx-auto" /></TableCell></TableRow>
                                                ) : forms?.length ? (
                                                    forms.sort((a,b) => a.formCode.localeCompare(b.formCode)).map(form => (
                                                        <TableRow key={form.id} className="hover:bg-muted/20 transition-colors">
                                                            <TableCell className="pl-6 font-mono text-xs font-bold text-primary">{form.formCode}</TableCell>
                                                            <TableCell className="text-[12px] font-bold text-slate-800">{form.formName}</TableCell>
                                                            <TableCell className="text-center"><Badge variant="secondary" className="h-4 text-[8px] font-bold uppercase">{form.revision}</Badge></TableCell>
                                                            <TableCell className="text-right pr-6">
                                                                <Button 
                                                                    variant="default" 
                                                                    size="sm" 
                                                                    className="h-8 text-[9px] font-black uppercase tracking-widest gap-1.5"
                                                                    onClick={() => setDownloadingForm(form)}
                                                                >
                                                                    <Download className="h-3 w-3" /> Request Download
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow><TableCell colSpan={4} className="h-32 text-center text-[10px] font-bold text-muted-foreground uppercase opacity-20 italic">No individual forms enrolled in the system yet.</TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="register" className="h-full m-0 animate-in fade-in slide-in-from-right-2 duration-300">
                        <ScrollArea className="flex-1 rounded-xl border bg-background shadow-sm">
                            <div className="p-6 space-y-8">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Application for Form Registration</h3>
                                    <p className="text-xs text-muted-foreground font-medium">Submit evidence for new or revised controlled forms. Institutional review follows submission.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card className="bg-primary/5 border-primary/10">
                                        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                                            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white shadow-lg"><Download className="h-6 w-6" /></div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-black uppercase text-slate-800">1. Download Template</p>
                                                <p className="text-[10px] text-muted-foreground font-medium italic">Obtain the official DRF from the institutional vault.</p>
                                            </div>
                                            <Button type="button" size="sm" className="w-full font-black text-[10px] uppercase shadow-sm" asChild>
                                                <a href="https://drive.google.com/file/d/1yPdJGXQT1yhyXkENhtDHLaIMlxTnHYx3/view?usp=sharing" target="_blank" rel="noopener noreferrer">Access DRF Template</a>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-indigo-50 border-indigo-100">
                                        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                                            <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg"><Send className="h-6 w-6" /></div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-black uppercase text-slate-800">2. Submit Application</p>
                                                <p className="text-[10px] text-muted-foreground font-medium italic">Upload signed evidence and form links for QA review.</p>
                                            </div>
                                            <Button size="sm" variant="outline" className="w-full bg-white font-black text-[10px] uppercase shadow-sm border-indigo-200 text-indigo-700" onClick={() => setIsRegOpen(true)}>Launch Registration Wizard</Button>
                                        </CardContent>
                                    </Card>
                                </div>
                                <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                                    <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-black uppercase text-amber-800 tracking-tight">Compliance Reminder</p>
                                        <p className="text-[10px] text-amber-700 leading-relaxed font-medium italic">
                                            All registered forms must be explicitly derived from the current **Procedure Manual**. If a form is not documented, apply for a manual revision first.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </div>
            </Tabs>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border border-dashed rounded-2xl bg-muted/5 text-muted-foreground p-12">
                <Building className="h-12 w-12 opacity-10 mb-4" />
                <h4 className="font-black text-xs uppercase tracking-[0.2em]">Form Control Hub</h4>
                <p className="text-[10px] mt-2 max-w-[250px] text-center leading-relaxed">
                    Select a unit from the directory to access its quality forms registry and manage official Drive repository links.
                </p>
            </div>
          )}
        </div>
      </div>

      {selectedUnit && (
          <FormRegistrationDialog 
            isOpen={isRegOpen} 
            onOpenChange={setIsRegOpen} 
            unit={selectedUnit as any} 
          />
      )}

      {downloadingForm && (
          <FormDownloadDialog
            form={downloadingForm}
            unitId={selectedUnitId!}
            isOpen={!!downloadingForm}
            onOpenChange={(open) => !open && setDownloadingForm(null)}
          />
      )}

      {isRosterLogOpen && selectedUnitId && currentRosterLink && (
          <FormDownloadDialog
            form={{ 
                id: 'roster-folder', 
                formName: 'Official Roster & Forms Folder', 
                formCode: 'MASTER-ROSTER', 
                googleDriveLink: currentRosterLink,
                unitId: selectedUnitId,
                campusId: userProfile?.campusId || '',
                revision: 'Latest',
                requestId: 'system',
                createdAt: new Date()
            }}
            unitId={selectedUnitId}
            isOpen={isRosterLogOpen}
            onOpenChange={setIsRosterLogOpen}
          />
      )}

      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-4 border-b bg-slate-50 shrink-0">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <DialogTitle className="text-sm font-black uppercase tracking-tight">{previewDoc?.title}</DialogTitle>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Official Record Preview</p>
                </div>
                <Badge variant="secondary" className="h-5 text-[9px] font-bold bg-primary/10 text-primary border-primary/20">CONTROLLED FORM</Badge>
            </div>
          </DialogHeader>
          <div className="flex-1 bg-muted relative">
            {previewDoc && (
              <iframe 
                src={previewDoc.url} 
                className="absolute inset-0 w-full h-full border-none bg-white" 
                allow="autoplay" 
                title="QA Form Preview"
              />
            )}
          </div>
          <div className="p-3 border-t bg-card shrink-0 flex justify-between items-center px-6">
              <p className="text-[9px] text-muted-foreground italic">Digital evidence integrity verified institutional repository.</p>
              <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-primary" onClick={() => setPreviewDoc(null)}>
                  Close Viewer
              </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
