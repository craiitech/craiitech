
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { ProcedureManual } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, BookOpen, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProcedureManualsPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManual, setSelectedManual] = useState<ProcedureManual | null>(null);

  const manualsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'procedureManuals') : null),
    [firestore]
  );
  const { data: manuals, isLoading } = useCollection<ProcedureManual>(manualsQuery);

  const filteredManuals = useMemo(() => {
    if (!manuals) return [];
    return manuals
      .filter(manual => manual.unitName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.unitName.localeCompare(b.unitName));
  }, [manuals, searchTerm]);
  
  const previewUrl = selectedManual?.googleDriveLink
    ? selectedManual.googleDriveLink.replace('/view', '/preview').replace('?usp=sharing', '')
    : '';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Procedure Manuals</h2>
        <p className="text-muted-foreground">
          A central library of all official procedure manuals for university units.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>All Units</CardTitle>
            <CardDescription>Select a unit to view its manual.</CardDescription>
            <div className="relative pt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search units..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {filteredManuals.map(manual => (
                    <Button
                      key={manual.id}
                      variant="ghost"
                      onClick={() => setSelectedManual(manual)}
                      className={cn(
                        "w-full justify-start text-left h-auto p-3",
                        selectedManual?.id === manual.id && "bg-muted font-semibold"
                      )}
                    >
                      <Building className="mr-3 h-4 w-4 flex-shrink-0" />
                      <span>{manual.unitName}</span>
                    </Button>
                  ))}
                </div>
                {!isLoading && filteredManuals.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground pt-10">
                        No manuals found matching your search.
                    </div>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
                <CardTitle>{selectedManual ? selectedManual.unitName : 'Select a Manual'}</CardTitle>
                <CardDescription>
                    {selectedManual ? 'Viewing the official procedure manual.' : 'Select a unit from the list to view their manual.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[calc(100%-8rem)]">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="h-full w-full rounded-md border"
                  allow="autoplay"
                  title={`${selectedManual?.unitName} Manual Preview`}
                ></iframe>
              ) : (
                <div className="flex h-full items-center justify-center rounded-md border border-dashed text-muted-foreground">
                  <div className="text-center">
                    <BookOpen className="mx-auto h-12 w-12" />
                    <p className="mt-2">No manual selected</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
