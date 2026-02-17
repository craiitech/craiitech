
'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { EomsPolicyManual } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, BookOpen, Hash, FileText, Calendar, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const sections = Array.from({ length: 10 }, (_, i) => ({
  id: `section-${i + 1}`,
  number: i + 1,
}));

export default function EomsPolicyManualPage() {
  const firestore = useFirestore();
  const [selectedManual, setSelectedManual] = useState<EomsPolicyManual | null>(null);
  const [manuals, setManuals] = useState<Map<string, EomsPolicyManual>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchManuals = async () => {
      if (!firestore) return;
      setIsLoading(true);
      try {
        const manualPromises = sections.map(section =>
          getDoc(doc(firestore, 'eomsPolicyManuals', section.id))
        );
        const manualSnapshots = await Promise.all(manualPromises);
        
        const fetchedManuals = manualSnapshots
          .filter(snap => snap.exists())
          .map(snap => snap.data() as EomsPolicyManual);

        const map = new Map<string, EomsPolicyManual>();
        fetchedManuals.forEach(m => map.set(m.id, m));
        setManuals(map);

        if (fetchedManuals.length > 0) {
            const firstAvailable = sections.map(s => map.get(s.id)).find(Boolean);
            if(firstAvailable) {
                setSelectedManual(firstAvailable);
            }
        }
      } catch (error) {
        console.error("EOMS Policy Manual fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchManuals();
  }, [firestore]);
  
  const previewUrl = selectedManual?.googleDriveLink
    ? selectedManual.googleDriveLink.replace('/view', '/preview').replace('?usp=sharing', '')
    : '';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary shrink-0" />
        <div>
            <h2 className="text-2xl font-bold tracking-tight">RSU EOMS Manual</h2>
            <p className="text-muted-foreground text-sm">
            Official policy documentation aligned with ISO 21001:2018 standards.
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[calc(100vh-12rem)]">
        <Card className="lg:col-span-1 flex flex-col shadow-md h-[350px] lg:h-full">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg">Table of Contents</CardTitle>
            <CardDescription>Select a section to read.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-2">
            <ScrollArea className="h-full">
              <div className="space-y-1 pr-4">
                {sections.map(section => {
                  if (isLoading) {
                    return <Skeleton key={section.id} className="h-12 w-full mb-2" />;
                  }
                  const manual = manuals.get(section.id);
                  return (
                    <Button
                      key={section.id}
                      variant="ghost"
                      onClick={() => manual && setSelectedManual(manual)}
                      disabled={!manual}
                      className={cn(
                        "w-full justify-start text-left h-auto p-3 transition-all",
                        selectedManual?.id === manual?.id 
                            ? "bg-primary/10 text-primary font-bold border-l-4 border-primary" 
                            : "hover:bg-muted font-medium"
                      )}
                    >
                      <span className="opacity-50 mr-3 w-4">{section.number}.</span>
                      <span className="flex-1 truncate text-xs">{manual?.title || `Section ${section.number}`}</span>
                      {!manual && <Badge variant="outline" className="ml-2 text-[10px] opacity-50">TBA</Badge>}
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 h-[500px] lg:h-full">
          <Card className="h-full flex flex-col shadow-md border-primary/10">
            <CardHeader className="border-b">
                <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 min-w-0">
                        <CardTitle className="text-xl truncate">
                            {isLoading ? <Skeleton className="h-6 w-48" /> : (selectedManual?.title || 'Select a Section')}
                        </CardTitle>
                        <CardDescription>
                            Official QA Policy Document
                        </CardDescription>
                    </div>
                    {selectedManual && (
                        <Badge variant="secondary" className="font-mono shrink-0">
                            Rev {selectedManual.revisionNumber}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 bg-muted/50 overflow-hidden relative">
               {isLoading ? (
                 <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20"/>
                 </div>
               ) : previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="absolute inset-0 h-full w-full border-none"
                  allow="autoplay"
                  title={`${selectedManual?.title} Manual Preview`}
                ></iframe>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground p-8">
                  <div className="text-center max-w-xs">
                    <BookOpen className="mx-auto h-16 w-16 opacity-10 mb-4" />
                    <p className="font-medium text-lg">No Section Selected</p>
                    <p className="text-sm">Choose a policy section from the Table of Contents to view the document.</p>
                  </div>
                </div>
              )}
            </CardContent>
            {selectedManual && (
                <CardFooter className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-[10px] border-t bg-card py-3 px-6 uppercase tracking-widest font-bold text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3 text-primary"/>
                        <span>Revision: {selectedManual.revisionNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3 text-primary"/>
                        <span>Pages: {selectedManual.pageCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-primary"/>
                        <span className="truncate">Executed: {selectedManual.executionDate}</span>
                    </div>
                </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
