'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { EomsPolicyManual } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, BookOpen, Building, Calendar, Hash, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function EomsPolicyManualPage() {
  const firestore = useFirestore();
  const [selectedManual, setSelectedManual] = useState<EomsPolicyManual | null>(null);

  const manualsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'eomsPolicyManuals'), orderBy('sectionNumber')) : null),
    [firestore]
  );
  const { data: manuals, isLoading } = useCollection<EomsPolicyManual>(manualsQuery);

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
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-full">
                {manuals && manuals.length > 0 ? (
                  <div className="space-y-2">
                    {manuals.map(manual => (
                      <Button
                        key={manual.id}
                        variant="ghost"
                        onClick={() => setSelectedManual(manual)}
                        className={cn(
                          "w-full justify-start text-left h-auto p-3",
                          selectedManual?.id === manual.id && "bg-muted font-semibold"
                        )}
                      >
                        <span className="font-bold mr-3">{manual.sectionNumber}.</span>
                        <span>{manual.title || `Section ${manual.sectionNumber}`}</span>
                      </Button>
                    ))}
                  </div>
                ) : (
                    <div className="text-center text-sm text-muted-foreground pt-10">
                        No manual sections have been uploaded yet.
                    </div>
                )}
              </ScrollArea>
            )}
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
            <CardContent className="flex-1 h-[calc(100%-12rem)]">
              {previewUrl ? (
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
                                {selectedManual.executionDate ? format(selectedManual.executionDate.toDate(), 'PPP') : 'N/A'}
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
