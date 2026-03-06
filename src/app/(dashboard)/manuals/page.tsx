
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { ProcedureManual, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, BookOpen, Building, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnitFormsTab } from '@/components/manuals/unit-forms-tab';
import { Badge } from '@/components/ui/badge';

export default function ProcedureManualsPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const manualsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'procedureManuals') : null),
    [firestore]
  );
  const { data: manuals, isLoading: isLoadingManuals } = useCollection<ProcedureManual>(manualsQuery);

  const unitsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'units') : null),
    [firestore]
  );
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const filteredManuals = useMemo(() => {
    if (!manuals || !allUnits) return [];
    
    return manuals
      .filter(manual => manual.unitName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.unitName.localeCompare(b.unitName));
  }, [manuals, allUnits, searchTerm]);

  const selectedManual = useMemo(() => {
    return manuals?.find(m => m.id === selectedUnitId) || null;
  }, [manuals, selectedUnitId]);

  const selectedUnit = useMemo(() => {
    return allUnits?.find(u => u.id === selectedUnitId) || null;
  }, [allUnits, selectedUnitId]);
  
  const previewUrl = selectedManual?.googleDriveLink
    ? selectedManual.googleDriveLink.replace('/view', '/preview').replace('?usp=sharing', '')
    : '';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Procedure Manuals & Unit Forms</h2>
        <p className="text-muted-foreground text-sm">
          Access official operating procedures and manage controlled unit forms.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:h-[calc(100vh-12rem)]">
        <Card className="lg:col-span-1 flex flex-col h-[400px] lg:h-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Unit Directory</CardTitle>
            <CardDescription className="text-[10px]">Select a unit to view its quality dossier.</CardDescription>
            <div className="relative pt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search units..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            {isLoadingManuals || isLoadingUnits ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
              </div>
            ) : (
              <ScrollArea className="h-full">
                {filteredManuals && filteredManuals.length > 0 ? (
                  <div className="flex flex-col">
                    {filteredManuals.map(manual => (
                      <Button
                        key={manual.id}
                        variant="ghost"
                        onClick={() => setSelectedUnitId(manual.id)}
                        className={cn(
                          "w-full justify-start text-left h-auto py-3 px-4 rounded-none border-l-4 transition-all",
                          selectedUnitId === manual.id 
                            ? "bg-primary/5 text-primary border-primary font-bold shadow-inner" 
                            : "border-transparent hover:bg-muted/50"
                        )}
                      >
                        <Building className="mr-3 h-4 w-4 flex-shrink-0 opacity-40" />
                        <span className="truncate text-xs">{manual.unitName}</span>
                        {!manual && <Badge variant="outline" className="ml-2 text-[10px] opacity-50">TBA</Badge>}
                      </Button>
                    ))}
                  </div>
                ) : (
                    <div className="text-center text-xs text-muted-foreground pt-10 px-4">
                        {searchTerm ? 'No matches found.' : 'No manuals registered yet.'}
                    </div>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-3 h-full">
          {selectedUnitId ? (
            <Tabs defaultValue="manual" className="h-full flex flex-col">
                <TabsList className="bg-muted p-1 border shadow-sm w-fit mb-4">
                    <TabsTrigger value="manual" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2">
                        <BookOpen className="h-3.5 w-3.5" /> Procedure Manual
                    </TabsTrigger>
                    <TabsTrigger value="forms" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2">
                        <ListChecks className="h-3.5 w-3.5" /> Forms & Records
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="manual" className="flex-1 min-h-0 m-0">
                    <Card className="h-full flex flex-col shadow-md border-primary/10 overflow-hidden">
                        <CardHeader className="border-b bg-muted/5 py-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg font-black uppercase tracking-tight truncate max-w-[500px]">
                                        {selectedManual?.unitName}
                                    </CardTitle>
                                    <CardDescription className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                        Official Operational Reference Log
                                    </CardDescription>
                                </div>
                                {selectedManual && (
                                    <Badge variant="secondary" className="h-6 font-mono font-bold">
                                        Rev {selectedManual.revisionNumber || '00'}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 bg-slate-100 relative">
                        {previewUrl ? (
                            <iframe
                            src={previewUrl}
                            className="absolute inset-0 h-full w-full border-none shadow-inner"
                            allow="autoplay"
                            title={`${selectedManual?.unitName} Manual Preview`}
                            ></iframe>
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground p-8">
                            <div className="text-center max-w-xs">
                                <BookOpen className="mx-auto h-16 w-16 opacity-10 mb-4" />
                                <p className="font-bold uppercase text-sm tracking-widest">No Preview Available</p>
                                <p className="text-[10px] mt-2 leading-relaxed">The source document could not be rendered. Please check the institutional Google Drive storage.</p>
                            </div>
                            </div>
                        )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="forms" className="flex-1 min-h-0 m-0">
                    <UnitFormsTab unit={selectedUnit!} />
                </TabsContent>
            </Tabs>
          ) : (
            <Card className="h-full flex flex-col items-center justify-center border border-dashed rounded-2xl bg-muted/5 text-muted-foreground">
                <div className="bg-muted h-20 w-20 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="h-10 w-10 opacity-20" />
                </div>
                <h4 className="font-black text-xs uppercase tracking-[0.2em]">Quality Dossier Hub</h4>
                <p className="text-[10px] mt-2 max-w-[250px] text-center leading-relaxed">Select an academic or administrative unit from the directory to access its procedure manual and controlled forms.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
