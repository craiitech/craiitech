
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import type { QaAdvisory } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Megaphone, Search, Calendar, FileText, Eye, Globe, Building2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function QaAdvisoriesPage() {
  const { userProfile, isAdmin, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [previewAdvisory, setPreviewAdvisory] = useState<QaAdvisory | null>(null);

  const advisoriesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return query(collection(firestore, 'qaAdvisories'), orderBy('releaseDate', 'desc'));
  }, [firestore, userProfile]);

  const { data: rawAdvisories, isLoading } = useCollection<QaAdvisory>(advisoriesQuery);

  const filteredAdvisories = useMemo(() => {
    if (!rawAdvisories || !userProfile) return [];

    return rawAdvisories.filter(advisory => {
      // 1. Accessibility Logic
      const isUniversityWide = advisory.scope === 'University-Wide';
      const isForMyUnit = advisory.targetUnitId === userProfile.unitId;
      const isVisible = isUniversityWide || isForMyUnit || isAdmin;

      if (!isVisible) return false;

      // 2. Search Logic
      const lowerSearch = searchTerm.toLowerCase();
      return (
        advisory.subject.toLowerCase().includes(lowerSearch) ||
        advisory.controlNumber.toLowerCase().includes(lowerSearch)
      );
    });
  }, [rawAdvisories, userProfile, isAdmin, searchTerm]);

  const getEmbedUrl = (url: string) => url.replace('/view', '/preview').replace('?usp=sharing', '');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-8 w-8 text-primary" />
            QA Advisories
          </h2>
          <p className="text-muted-foreground">
            Official communications, directives, and guidelines from the Quality Assurance Office.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAdvisories.map((advisory) => (
            <Card key={advisory.id} className="hover:shadow-md transition-all group border-primary/10">
              <CardHeader className="pb-3 border-b bg-muted/10">
                <div className="flex justify-between items-start gap-2">
                  <Badge variant="outline" className="font-mono text-[10px] font-black border-primary/20 text-primary bg-white">
                    {advisory.controlNumber}
                  </Badge>
                  {advisory.scope === 'University-Wide' ? (
                    <Badge className="bg-emerald-600 text-white border-none text-[8px] font-black h-4 uppercase">
                      <Globe className="h-2 w-2 mr-1" /> ALL UNITS
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-600 text-white border-none text-[8px] font-black h-4 uppercase">
                      <Building2 className="h-2 w-2 mr-1" /> SPECIFIC
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-sm font-black uppercase leading-tight mt-3 line-clamp-2 min-h-[2.5rem]">
                  {advisory.subject}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  Released: {advisory.releaseDate?.toDate ? format(advisory.releaseDate.toDate(), 'PPP') : 'N/A'}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1 h-8 text-[10px] font-black uppercase tracking-widest bg-primary shadow-lg shadow-primary/10"
                    onClick={() => setPreviewAdvisory(advisory)}
                  >
                    <Eye className="h-3 w-3 mr-1.5" /> Preview Advisory
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
                    <a href={advisory.googleDriveLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && filteredAdvisories.length === 0 && (
            <div className="col-span-full py-20 text-center border border-dashed rounded-2xl bg-muted/5">
              <Megaphone className="h-12 w-12 mx-auto text-muted-foreground opacity-10 mb-4" />
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No Advisories Found</p>
              <p className="text-xs text-muted-foreground mt-1">There are no active communications relevant to your unit at this time.</p>
            </div>
          )}
        </div>
      )}

      {/* --- PREVIEW MODAL --- */}
      <Dialog open={!!previewAdvisory} onOpenChange={() => setPreviewAdvisory(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-5 border-b bg-slate-50 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-sm font-black uppercase tracking-tight line-clamp-1">{previewAdvisory?.subject}</DialogTitle>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Official QA Advisory &bull; {previewAdvisory?.controlNumber}</p>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 bg-muted relative">
            {previewAdvisory && (
              <iframe 
                src={getEmbedUrl(previewAdvisory.googleDriveLink)} 
                className="absolute inset-0 w-full h-full border-none bg-white" 
                allow="autoplay" 
                title="QA Advisory Preview"
              />
            )}
          </div>
          <div className="p-4 border-t bg-card shrink-0 flex justify-between items-center px-8">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase italic">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Institutional Digital Directives
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 font-black text-[10px] uppercase tracking-widest" onClick={() => setPreviewAdvisory(null)}>Close</Button>
              <Button variant="default" size="sm" className="h-8 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20" asChild>
                <a href={previewAdvisory?.googleDriveLink} target="_blank" rel="noopener noreferrer">Open in Drive</a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
