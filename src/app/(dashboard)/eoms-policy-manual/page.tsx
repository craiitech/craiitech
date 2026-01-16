
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, getDoc } from 'firebase/firestore';
import type { EomsPolicyManual } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, BookOpen, Hash, FileText, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const sections = Array.from({ length: 10 }, (_, i) => ({
  id: `section-${i + 1}`,
  number: i + 1,
}));

export default function EomsPolicyManualPage() {
  const firestore = useFirestore();
  const [manuals, setManuals] = useState<EomsPolicyManual[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedManual, setSelectedManual] = useState<EomsPolicyManual | null>(null);

  useEffect(() => {
    if (!firestore) return;

    const fetchManuals = async () => {
      setIsLoading(true);
      try {
        const promises = sections.map(section => getDoc(doc(firestore, 'eomsPolicyManuals', section.id)));
        const docSnapshots = await Promise.all(promises);
        const fetchedManuals = docSnapshots
          .filter(snap => snap.exists())
          .map(snap => snap.data() as EomsPolicyManual);
        setManuals(fetchedManuals);

        // Auto-select the first available manual
        if (fetchedManuals.length > 0) {
            const firstAvailable = sections
                .map(s => fetchedManuals.find(m => m.id === s.id))
                .find(Boolean);
            if (firstAvailable) {
                setSelectedManual(firstAvailable);
            }
        }
      } catch (error) {
        console.error("Error fetching EOMS manuals:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchManuals();
  }, [firestore]);


  const manualMap = useMemo(() => {
    return new Map(manuals.map(m => [m.id, m]));
  }, [manuals]);
  
  const previewUrl = selectedManual?.googleDriveLink
    ? selectedManual.googleDriveLink.replace('/view', '/preview').replace('?usp=sharing', '')
    : '';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">EOMS Policy Manual</h2>
        <p className="text-muted-foreground">
          The official EOMS Policy Manual, organized by section.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>Manual Sections</CardTitle>
            <CardDescription>Select a section to view its content.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {sections.map(section => {
                  if (isLoading) {
                    return <Skeleton key={section.id} className="h-12 w-full" />;
                  }
                  const manual = manualMap.get(section.id);
                  return (
                    <Button
                      key={section.id}
                      variant="ghost"
                      onClick={() => manual && setSelectedManual(manual)}
                      disabled={!manual}
                      className={cn(
                        "w-full justify-start text-left h-auto p-3",
                        selectedManual?.id === manual?.id && "bg-muted font-semibold"
                      )}
                    >
                      <span className="font-bold mr-3">{section.number}.</span>
                      <span className="flex-1 truncate">{manual?.title || `Section ${section.number}`}</span>
                      {!manual && <Badge variant="outline" className="ml-2">Not Set</Badge>}
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>{selectedManual ? selectedManual.title : 'Select a Section'}</CardTitle>
                <CardDescription>
                    {selectedManual ? 'Viewing official EOMS Policy documentation.' : 'Select a section from the list to view its content.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 h-full">
               {isLoading ? (
                 <div className="flex h-full items-center justify-center rounded-md border border-dashed">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                 </div>
               ) : previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="h-full w-full rounded-md border"
                  allow="autoplay"
                  title={`${selectedManual?.title} Manual Preview`}
                ></iframe>
              ) : (
                <div className="flex h-full items-center justify-center rounded-md border border-dashed text-muted-foreground">
                  <div className="text-center">
                    <BookOpen className="mx-auto h-12 w-12" />
                    <p className="mt-2">{selectedManual ? 'No link provided for this section.' : 'No section selected.'}</p>
                  </div>
                </div>
              )}
            </CardContent>
            {selectedManual && (
                <CardFooter className="grid grid-cols-3 gap-4 text-sm border-t pt-4">
                    <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground"/>
                        <div>
                            <p className="font-semibold">Revision No.</p>
                            <p className="text-muted-foreground">{selectedManual.revisionNumber || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground"/>
                         <div>
                            <p className="font-semibold">Pages</p>
                            <p className="text-muted-foreground">{selectedManual.pageCount || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground"/>
                        <div>
                            <p className="font-semibold">Execution Date</p>
                            <p className="text-muted-foreground">
                                {selectedManual.executionDate || 'N/A'}
                            </p>
                        </div>
                    </div>
                </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
