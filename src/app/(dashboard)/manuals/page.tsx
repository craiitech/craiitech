
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { ProcedureManual, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, BookOpen, Building, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, Hash, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function ProcedureManualsPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

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

  const previewUrl = selectedManual?.googleDriveLink
    ? selectedManual.googleDriveLink.replace('/view', '/preview').replace('?usp=sharing', '')
    : '';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Procedure Manuals</h2>
          <p className="text-muted-foreground text-sm">
            Access official operating procedures for verified university units.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="lg:hidden" 
          onClick={() => setIsSidebarVisible(!isSidebarVisible)}
        >
          {isSidebarVisible ? <PanelLeftClose className="mr-2 h-4 w-4" /> : <PanelLeftOpen className="mr-2 h-4 w-4" />}
          {isSidebarVisible ? 'Hide Index' : 'Show Index'}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-12rem)]">
        <div className={cn(
          "transition-all duration-300 overflow-hidden flex flex-col",
          isSidebarVisible ? "w-full lg:w-1/4 opacity-100" : "w-0 opacity-0 lg:-mr-6"
        )}>
          <Card className="flex flex-col h-[400px] lg:h-full shadow-sm border-primary/10">
            <CardHeader className="pb-4 bg-muted/30 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Manual Index</CardTitle>
              <CardDescription className="text-[10px]">Select a unit to view its procedure manual.</CardDescription>
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
              {isLoadingManuals || isLoadingUnits ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                </div>
              ) : (
                <ScrollArea className="h-full">
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

          <Card className="h-full flex flex-col shadow-md border-primary/10 overflow-hidden">
            <CardHeader className="border-b bg-muted/5 py-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-black uppercase tracking-tight truncate max-w-[500px]">
                            {selectedManual?.unitName || 'Select a Unit'}
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
                className="absolute inset-0 h-full w-full border-none shadow-inner bg-white"
                allow="autoplay"
                title={`${selectedManual?.unitName} Manual Preview`}
                ></iframe>
            ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground p-8">
                <div className="text-center max-w-xs">
                    <BookOpen className="mx-auto h-16 w-16 opacity-10 mb-4" />
                    <p className="font-bold uppercase text-sm tracking-widest">No Selection</p>
                    <p className="text-[10px] mt-2 leading-relaxed">Select a unit from the directory to view its official procedure manual.</p>
                </div>
                </div>
            )}
            </CardContent>
            {selectedManual && (
                <CardFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] border-t bg-card py-3 px-6 uppercase tracking-widest font-bold text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3 text-primary"/>
                        <span>Revision: {selectedManual.revisionNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-primary"/>
                        <span className="truncate">Implemented: {selectedManual.dateImplemented}</span>
                    </div>
                </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
