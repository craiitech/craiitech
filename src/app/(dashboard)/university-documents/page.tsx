'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from '@/firebase/firestore-wrapper';
import type { UniversityDocument } from '@/lib/types';
import { getGoogleDriveEmbedUrl } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FolderArchive,
  Search,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Calendar,
  FileText,
  Copy,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Maximize2,
  Building2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

const DOCUMENT_CATEGORIES = [
  'Memorandum Order',
  'Office Order',
  'Policy & Guidelines',
  'Board Resolution',
  'Executive Order',
  'Transmittal Document',
  'Academic Guidelines',
  'Administrative Directive',
  'General Document',
] as const;

export default function UniversityDocumentsPage() {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'az'>('newest');
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // Admin Modal States
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<UniversityDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<UniversityDocument | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formReleaseDate, setFormReleaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formDriveLink, setFormDriveLink] = useState('');
  const [formCategory, setFormCategory] = useState<string>('Memorandum Order');
  const [formDescription, setFormDescription] = useState('');

  const canManage = useMemo(() => {
    if (isAdmin) return true;
    const roleLower = userRole?.toLowerCase() || '';
    return (
      roleLower.includes('admin') ||
      roleLower.includes('director') ||
      roleLower.includes('president') ||
      roleLower.includes('qms head')
    );
  }, [isAdmin, userRole]);

  // Firestore Query
  const docsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'universityDocuments'), orderBy('releaseDate', 'desc'));
  }, [firestore]);

  const { data: rawDocuments, isLoading } = useCollection<UniversityDocument>(docsQuery);

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    if (!rawDocuments) return [];

    const list = rawDocuments.filter((d) => {
      const matchesSearch =
        d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.sourceCommunicationRefNum?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || d.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    if (sortOrder === 'newest') {
      list.sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''));
    } else if (sortOrder === 'oldest') {
      list.sort((a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || ''));
    } else if (sortOrder === 'az') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }, [rawDocuments, searchTerm, selectedCategory, sortOrder]);

  // Active selected document
  const activeDocument = useMemo(() => {
    if (!rawDocuments || rawDocuments.length === 0) return null;
    if (selectedDocId) {
      const found = rawDocuments.find((d) => d.id === selectedDocId);
      if (found) return found;
    }
    return filteredDocuments[0] || rawDocuments[0] || null;
  }, [rawDocuments, selectedDocId, filteredDocuments]);

  const previewEmbedUrl = useMemo(() => {
    return activeDocument ? getGoogleDriveEmbedUrl(activeDocument.googleDriveLink) : '';
  }, [activeDocument]);

  const handleOpenAdd = () => {
    setEditingDoc(null);
    setFormTitle('');
    setFormReleaseDate(format(new Date(), 'yyyy-MM-dd'));
    setFormDriveLink('');
    setFormCategory('Memorandum Order');
    setFormDescription('');
    setIsAddEditDialogOpen(true);
  };

  const handleOpenEdit = (docItem: UniversityDocument, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingDoc(docItem);
    setFormTitle(docItem.title);
    setFormReleaseDate(docItem.releaseDate || format(new Date(), 'yyyy-MM-dd'));
    setFormDriveLink(docItem.googleDriveLink);
    setFormCategory(docItem.category || 'Memorandum Order');
    setFormDescription(docItem.description || '');
    setIsAddEditDialogOpen(true);
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;

    if (!formTitle.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Document title is required.',
        variant: 'destructive',
      });
      return;
    }

    if (!formReleaseDate) {
      toast({
        title: 'Validation Error',
        description: 'Release date is required.',
        variant: 'destructive',
      });
      return;
    }

    if (!formDriveLink.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Google Drive link is required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const uploaderName = userProfile
        ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Administrator'
        : 'Administrator';

      const payload: Partial<UniversityDocument> = {
        title: formTitle.trim(),
        releaseDate: formReleaseDate,
        googleDriveLink: formDriveLink.trim(),
        category: formCategory,
        description: formDescription.trim() || '',
        updatedAt: serverTimestamp(),
      };

      if (editingDoc) {
        await updateDoc(doc(firestore, 'universityDocuments', editingDoc.id), payload);
        toast({
          title: 'Document Updated',
          description: `"${formTitle.trim()}" has been updated successfully.`,
        });
      } else {
        payload.uploadedBy = uploaderName;
        payload.uploadedByRole = userRole || 'Admin';
        payload.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(firestore, 'universityDocuments'), payload);
        setSelectedDocId(docRef.id);
        toast({
          title: 'Document Registered',
          description: `"${formTitle.trim()}" has been added to University Documents.`,
        });
      }

      setIsAddEditDialogOpen(false);
    } catch (err: any) {
      console.error('Error saving university document:', err);
      toast({
        title: 'Error Saving',
        description: err.message || 'Failed to save university document.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!firestore || !docToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(firestore, 'universityDocuments', docToDelete.id));

      // If document was linked to a communication, update communication flag optionally
      if (docToDelete.sourceCommunicationId) {
        try {
          await updateDoc(doc(firestore, 'communications', docToDelete.sourceCommunicationId), {
            isUniversityDocument: false,
            universityDocumentId: null,
          });
        } catch {
          // Non-critical if source communication update fails
        }
      }

      toast({
        title: 'Document Deleted',
        description: `"${docToDelete.title}" has been removed from University Documents.`,
      });
      if (selectedDocId === docToDelete.id) {
        setSelectedDocId(null);
      }
      setDocToDelete(null);
    } catch (err: any) {
      console.error('Error deleting document:', err);
      toast({
        title: 'Error Deleting',
        description: err.message || 'Failed to delete document.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!activeDocument?.googleDriveLink) return;
    navigator.clipboard.writeText(activeDocument.googleDriveLink);
    setCopiedLink(true);
    toast({
      title: 'Link Copied',
      description: 'Google Drive URL copied to clipboard.',
    });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return format(parseISO(dateStr), 'MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-900/10 via-emerald-800/5 to-transparent p-4 rounded-2xl border border-emerald-800/20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 shrink-0">
            <FolderArchive className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground">
                University Documents
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] font-bold border-emerald-600/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
              >
                Institutional Repository
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Official university-wide policies, memorandums, executive orders, and directives accessible to all
              stakeholders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {canManage && (
            <Button
              onClick={handleOpenAdd}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider h-9 px-4 rounded-xl shadow-md shadow-emerald-700/20 gap-1.5 transition-transform active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Add Document
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="lg:hidden h-9 rounded-xl border-emerald-800/20 text-xs font-bold"
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
          >
            {isSidebarVisible ? (
              <PanelLeftClose className="mr-1.5 h-4 w-4" />
            ) : (
              <PanelLeftOpen className="mr-1.5 h-4 w-4" />
            )}
            {isSidebarVisible ? 'Hide Index' : 'Show Index'}
          </Button>
        </div>
      </div>

      {/* Main Master-Detail Auto-Preview Section */}
      <div className="flex flex-col lg:flex-row gap-5 lg:h-[calc(100dvh-13.5rem)]">
        {/* Left Column: Document Index & Filters */}
        <div
          className={cn(
            'transition-all duration-300 overflow-hidden flex flex-col',
            isSidebarVisible ? 'w-full lg:w-[380px] xl:w-[420px] opacity-100' : 'w-0 opacity-0 lg:-mr-5',
          )}
        >
          <Card className="flex flex-col h-[400px] lg:h-full shadow-md border-emerald-800/15 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b p-3.5 space-y-2.5 shrink-0">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by title, number, or topic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-9 text-xs bg-background rounded-xl border-border/80 focus-visible:ring-emerald-600"
                />
              </div>

              {/* Filters & Sorting */}
              <div className="grid grid-cols-2 gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-8 text-[11px] rounded-lg bg-background">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortOrder} onValueChange={(val: any) => setSortOrder(val)}>
                  <SelectTrigger className="h-8 text-[11px] rounded-lg bg-background">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest" className="text-xs">
                      Newest Release
                    </SelectItem>
                    <SelectItem value="oldest" className="text-xs">
                      Oldest Release
                    </SelectItem>
                    <SelectItem value="az" className="text-xs">
                      Alphabetical (A-Z)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 pt-1">
                <span>Repository Directory</span>
                <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4">
                  {filteredDocuments.length} {filteredDocuments.length === 1 ? 'doc' : 'docs'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-2">
              <ScrollArea className="h-full">
                {isLoading ? (
                  <div className="space-y-2 p-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                    <FolderArchive className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-xs font-bold text-muted-foreground">No documents found</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      {searchTerm
                        ? 'Try adjusting your search criteria.'
                        : 'No university documents have been registered yet.'}
                    </p>
                    {canManage && !searchTerm && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleOpenAdd}
                        className="mt-3 text-xs h-8 rounded-lg text-emerald-700 border-emerald-700/30"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add First Document
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5 pr-2">
                    {filteredDocuments.map((docItem) => {
                      const isSelected = activeDocument?.id === docItem.id;
                      return (
                        <div
                          key={docItem.id}
                          onClick={() => setSelectedDocId(docItem.id)}
                          className={cn(
                            'group relative p-3 rounded-xl border transition-all cursor-pointer text-left',
                            isSelected
                              ? 'bg-emerald-500/10 border-emerald-600/40 dark:bg-emerald-950/30 shadow-xs'
                              : 'bg-card hover:bg-muted/50 border-border/70 hover:border-emerald-600/20',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {docItem.category && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-0"
                                  >
                                    {docItem.category}
                                  </Badge>
                                )}
                                {docItem.sourceCommunicationId && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] font-semibold text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-800 px-1 py-0"
                                  >
                                    From Comms
                                  </Badge>
                                )}
                              </div>
                              <h4
                                className={cn(
                                  'text-xs font-bold leading-snug line-clamp-2',
                                  isSelected ? 'text-emerald-900 dark:text-emerald-300 font-black' : 'text-foreground',
                                )}
                              >
                                {docItem.title}
                              </h4>
                            </div>

                            {/* Admin Action Buttons */}
                            {canManage && (
                              <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => handleOpenEdit(docItem, e)}
                                  title="Edit Document"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive/70 hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDocToDelete(docItem);
                                  }}
                                  title="Delete Document"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/40 font-medium">
                            <span className="flex items-center gap-1 text-slate-500">
                              <Calendar className="h-2.5 w-2.5 text-emerald-600" />
                              {formatDisplayDate(docItem.releaseDate)}
                            </span>
                            <span className="text-[9px] text-muted-foreground/80 flex items-center gap-1">
                              <FileText className="h-2.5 w-2.5" />
                              View Preview
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Auto Preview Display */}
        <div className="flex-1 min-w-0 flex flex-col relative">
          {/* Toggle sidebar button on medium-to-large displays */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute -left-3.5 top-1/2 -translate-y-1/2 z-30 h-7 w-7 rounded-full border shadow-md hidden lg:flex hover:bg-emerald-700 hover:text-white transition-colors"
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            title={isSidebarVisible ? 'Hide Index' : 'Show Index'}
          >
            {isSidebarVisible ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          <Card className="h-full flex flex-col shadow-md border-emerald-800/15 overflow-hidden">
            {/* Preview Toolbar */}
            <CardHeader className="border-b bg-muted/10 p-3 sm:p-4 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeDocument?.category && (
                      <Badge
                        variant="outline"
                        className="font-bold text-[10px] border-emerald-700/30 text-emerald-800 dark:text-emerald-300"
                      >
                        {activeDocument.category}
                      </Badge>
                    )}
                    {activeDocument?.releaseDate && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                        <Calendar className="h-3 w-3 text-emerald-600" />
                        Released:{' '}
                        <strong className="text-foreground">{formatDisplayDate(activeDocument.releaseDate)}</strong>
                      </span>
                    )}
                    {activeDocument?.sourceCommunicationRefNum && (
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        Ref: {activeDocument.sourceCommunicationRefNum}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base sm:text-lg font-black tracking-tight line-clamp-1">
                    {isLoading ? <Skeleton className="h-6 w-64" /> : activeDocument?.title || 'No Document Selected'}
                  </CardTitle>
                </div>

                {/* Quick Action Buttons */}
                {activeDocument && (
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                      className="h-8 text-xs font-bold gap-1 rounded-lg"
                      title="Copy Google Drive Link"
                    >
                      {copiedLink ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Copy Link'}</span>
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => window.open(activeDocument.googleDriveLink, '_blank')}
                      className="h-8 text-xs font-bold gap-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs"
                      title="Open full file in Google Drive"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open in Drive
                    </Button>
                  </div>
                )}
              </div>

              {activeDocument?.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{activeDocument.description}</p>
              )}
            </CardHeader>

            {/* Document Auto-Preview Iframe */}
            <CardContent className="flex-1 p-0 bg-slate-100 dark:bg-slate-900/60 overflow-hidden relative">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                      Loading Repository...
                    </p>
                  </div>
                </div>
              ) : activeDocument && previewEmbedUrl ? (
                <iframe
                  src={previewEmbedUrl}
                  className="absolute inset-0 h-full w-full border-none bg-white shadow-inner"
                  allow="autoplay"
                  title={`${activeDocument.title} Auto Preview`}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground p-8">
                  <div className="text-center max-w-sm">
                    <div className="h-16 w-16 rounded-2xl bg-emerald-700/10 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                      <FolderArchive className="h-8 w-8" />
                    </div>
                    <h3 className="font-black text-sm uppercase tracking-wider text-foreground">
                      No Document Selected
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Select a university document from the index on the left to view its auto preview display, or click
                      &quot;Open in Drive&quot; to inspect the official file.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>

            {/* Footer Metadata */}
            {activeDocument && (
              <CardFooter className="py-2.5 px-4 text-[10px] border-t bg-card flex flex-wrap items-center justify-between gap-2 uppercase tracking-widest font-bold text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-emerald-600" />
                    Romblon State University
                  </span>
                  {activeDocument.uploadedBy && (
                    <span className="hidden md:inline text-muted-foreground/70">
                      Logged by: {activeDocument.uploadedBy}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                  <span>Official University Issuance</span>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      {/* Admin Add / Edit Document Dialog */}
      <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <form onSubmit={handleSaveDocument}>
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase tracking-tight text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <FolderArchive className="h-5 w-5 text-emerald-700" />
                {editingDoc ? 'Edit University Document' : 'Add University Document'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Register a university-wide document into the repository so it can be accessed and auto-previewed by all
                campus personnel.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              {/* Document Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Document Title <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g., Memorandum Order No. 42 s. 2026..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                  required
                />
              </div>

              {/* Release Date & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Date Released <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formReleaseDate}
                    onChange={(e) => setFormReleaseDate(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Category <span className="text-destructive">*</span>
                  </label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger className="h-10 text-xs rounded-xl">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-xs">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Google Drive Link */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Google Drive Link <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="https://drive.google.com/file/d/..."
                  value={formDriveLink}
                  onChange={(e) => setFormDriveLink(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  Provide a shareable Google Drive link with &quot;Anyone with the link can view&quot; permissions for
                  the auto preview.
                </p>
              </div>

              {/* Description / Summary */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  Summary / Remarks (Optional)
                </label>
                <Textarea
                  placeholder="Brief description or context regarding this issuance..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="text-xs rounded-xl min-h-[70px] resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddEditDialogOpen(false)}
                disabled={isSubmitting}
                className="h-9 font-bold text-xs rounded-xl uppercase"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 font-bold text-xs rounded-xl uppercase bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : editingDoc ? (
                  'Save Changes'
                ) : (
                  'Register Document'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={Boolean(docToDelete)} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-black uppercase text-destructive tracking-tight">
              Delete University Document
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to remove &quot;{docToDelete?.title}&quot; from the repository? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting} className="rounded-xl text-xs font-bold uppercase">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              disabled={isSubmitting}
              className="rounded-xl text-xs font-bold uppercase bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
