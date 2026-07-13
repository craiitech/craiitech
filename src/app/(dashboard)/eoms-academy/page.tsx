'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from '@/firebase/firestore-wrapper';
import type { EomsAcademyTopic } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Loader2,
  BookOpen,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  FileText,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EomsAcademyPage() {
  const { isAdmin, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<EomsAcademyTopic | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTopic, setEditingTopic] = useState<EomsAcademyTopic | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formOrder, setFormOrder] = useState('1');

  // Query EOMS Academy Topics
  const academyQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'eomsAcademyTopics'), orderBy('order', 'asc'));
  }, [firestore]);

  const { data: topics, isLoading: isTopicsLoading } = useCollection<EomsAcademyTopic>(academyQuery);

  // Automatically select the first topic if none is selected
  useEffect(() => {
    if (topics && topics.length > 0 && !selectedTopic) {
      setSelectedTopic(topics[0]);
    }
  }, [topics, selectedTopic]);

  // Filter topics based on search query
  const filteredTopics = useMemo(() => {
    if (!topics) return [];
    const lowerSearch = searchTerm.toLowerCase();
    return topics.filter(
      (topic) =>
        topic.title.toLowerCase().includes(lowerSearch) || topic.description.toLowerCase().includes(lowerSearch),
    );
  }, [topics, searchTerm]);

  // Parse Google Drive Link for safe iframe previewing
  const getEmbedUrl = (url: string): string => {
    if (!url) return '';
    try {
      // 1. Google Slides (Docs presentation)
      if (url.includes('docs.google.com/presentation')) {
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=3000`;
        }
      }
      // 2. Google Drive generic file link
      if (url.includes('drive.google.com')) {
        const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          return `https://drive.google.com/file/d/${match[1]}/preview`;
        }
      }
    } catch (e) {
      console.error('Error parsing drive embed URL:', e);
    }
    return url;
  };

  // Open dialog for adding
  const handleOpenAddDialog = () => {
    setEditingTopic(null);
    setFormTitle('');
    setFormDescription('');
    setFormLink('');
    const nextOrder = topics && topics.length > 0 ? Math.max(...topics.map((t) => t.order || 0)) + 1 : 1;
    setFormOrder(String(nextOrder));
    setIsDialogOpen(true);
  };

  // Open dialog for editing
  const handleOpenEditDialog = (topic: EomsAcademyTopic, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTopic(topic);
    setFormTitle(topic.title);
    setFormDescription(topic.description);
    setFormLink(topic.googleDriveLink);
    setFormOrder(String(topic.order));
    setIsDialogOpen(true);
  };

  // Delete Topic Action
  const handleDeleteTopic = async (topicId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!firestore) return;
    if (!window.confirm('Are you sure you want to delete this topic permanently?')) return;

    try {
      await deleteDoc(doc(firestore, 'eomsAcademyTopics', topicId));
      toast({
        title: 'Topic Deleted',
        description: 'The learning topic has been removed successfully.',
      });
      if (selectedTopic?.id === topicId) {
        setSelectedTopic(null);
      }
    } catch (err) {
      console.error('Delete topic error:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete the topic.',
        variant: 'destructive',
      });
    }
  };

  // Submit Add/Edit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !formTitle || !formLink) return;

    setIsSubmitting(true);
    try {
      const payload = {
        title: formTitle,
        description: formDescription,
        googleDriveLink: formLink,
        order: Number(formOrder) || 1,
        updatedAt: serverTimestamp(),
      };

      if (editingTopic) {
        await updateDoc(doc(firestore, 'eomsAcademyTopics', editingTopic.id), payload);
        toast({
          title: 'Topic Updated',
          description: `"${formTitle}" has been updated.`,
        });
        // Update local selected topic state if active
        if (selectedTopic?.id === editingTopic.id) {
          setSelectedTopic({ ...editingTopic, ...payload });
        }
      } else {
        await addDoc(collection(firestore, 'eomsAcademyTopics'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast({
          title: 'Topic Added',
          description: `"${formTitle}" is now live in the academy.`,
        });
      }

      setIsDialogOpen(false);
    } catch (err) {
      console.error('Submit topic error:', err);
      toast({
        title: 'Submission Failed',
        description: 'Could not save topic details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Seed default items
  const handleSeedDefaultTopics = async () => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const defaults = [
        {
          title: '1. Introduction to ISO 21001:2018 (EOMS)',
          description:
            'A foundational overview explaining what Educational Organizations Management Systems (EOMS) standard is, its significance, core principles, and the key benefits of compliance.',
          googleDriveLink:
            'https://docs.google.com/presentation/d/1487n_rG6z01lBvEoxwJc7jC866XpPZfL7XnNf4b2a8E/edit?usp=sharing',
          order: 1,
        },
        {
          title: '2. Understanding RSU EOMS Implementation',
          description:
            'Deep dive into how Romblon State University configures its QMS policies, standard forms, roles of academic/administrative heads, and regular operational reviews.',
          googleDriveLink:
            'https://docs.google.com/presentation/d/1487n_rG6z01lBvEoxwJc7jC866XpPZfL7XnNf4b2a8E/edit?usp=sharing',
          order: 2,
        },
        {
          title: '3. Internal Quality Audits & Corrective Actions',
          description:
            'Step-by-step guidance on facing internal quality audits, identifying non-conformities, writing corrective actions, and establishing long-term improvement processes.',
          googleDriveLink:
            'https://docs.google.com/presentation/d/1487n_rG6z01lBvEoxwJc7jC866XpPZfL7XnNf4b2a8E/edit?usp=sharing',
          order: 3,
        },
      ];

      for (const item of defaults) {
        await addDoc(collection(firestore, 'eomsAcademyTopics'), {
          ...item,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      toast({
        title: 'Academy Seeded',
        description: 'Default EOMS topics successfully loaded.',
      });
    } catch (err) {
      console.error('Seeding topics failed:', err);
      toast({
        title: 'Seeding Failed',
        description: 'Could not load default topics.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewUrl = selectedTopic ? getEmbedUrl(selectedTopic.googleDriveLink) : '';

  return (
    <div className="space-y-4">
      {/* Title Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl border border-primary/20 shrink-0">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">RSU EOMS Academy</h2>
            <p className="text-muted-foreground text-sm">
              Interactive slides and training resources on ISO 21001:2018 and RSU implementation.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile TOC toggle button */}
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
          >
            {isSidebarVisible ? (
              <PanelLeftClose className="mr-2 h-4 w-4" />
            ) : (
              <PanelLeftOpen className="mr-2 h-4 w-4" />
            )}
            {isSidebarVisible ? 'Hide Index' : 'Show Index'}
          </Button>

          {/* Admin Tools: Seed Default Topics when list empty */}
          {isAdmin && topics && topics.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedDefaultTopics}
              disabled={isSubmitting}
              className="bg-primary/5 border-dashed border-primary/40 hover:bg-primary/10 text-primary font-black uppercase text-xs tracking-wider"
            >
              <Sparkles className="mr-2 h-4 w-4" /> Seed Sample Topics
            </Button>
          )}

          {/* Admin Add New Topic Button */}
          {isAdmin && (
            <Button
              onClick={handleOpenAddDialog}
              size="sm"
              className="font-bold text-xs uppercase tracking-wider shadow-md bg-primary hover:bg-primary/95 text-white"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add Topic
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100dvh-12rem)]">
        {/* Left column: Topic Index */}
        <div
          className={cn(
            'transition-all duration-300 overflow-hidden flex flex-col shrink-0',
            isSidebarVisible ? 'w-full lg:w-[320px] xl:w-[360px] opacity-100' : 'w-0 opacity-0 lg:-mr-6',
          )}
        >
          <Card className="flex flex-col h-[400px] lg:h-full shadow-md border-primary/10 bg-card/65 backdrop-blur-md">
            <CardHeader className="bg-muted/30 border-b pb-3.5">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Learning Modules</span>
                <Badge variant="secondary" className="font-bold text-[10px] bg-primary/10 text-primary">
                  {filteredTopics.length} {filteredTopics.length === 1 ? 'Topic' : 'Topics'}
                </Badge>
              </CardTitle>
              <CardDescription className="text-[10px]">Select a presentation module below.</CardDescription>
              {/* Search Bar */}
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search training modules..."
                  className="pl-8 text-xs h-9 bg-background/50 border-primary/10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-2">
              {isTopicsLoading ? (
                <div className="flex flex-col gap-2 p-2">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-16 w-full animate-pulse bg-muted/40 rounded-lg" />
                  ))}
                </div>
              ) : filteredTopics.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                  <BookOpen className="h-10 w-10 opacity-20 mb-3" />
                  <p className="font-bold text-xs uppercase tracking-widest text-slate-500">No Modules Found</p>
                  <p className="text-[10px] mt-1 text-slate-400">
                    Try a different search term or add new topics if admin.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="space-y-1.5 pr-3 pl-1 py-1">
                    {filteredTopics.map((topic) => (
                      <div
                        key={topic.id}
                        onClick={() => setSelectedTopic(topic)}
                        className={cn(
                          'w-full text-left rounded-lg p-3 cursor-pointer border transition-all flex flex-col justify-between group',
                          selectedTopic?.id === topic.id
                            ? 'bg-primary/10 border-primary/30 text-primary font-bold shadow-sm'
                            : 'hover:bg-muted/50 border-transparent bg-transparent text-foreground',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-black text-sm line-clamp-1 group-hover:text-primary transition-colors">
                            {topic.title}
                          </span>
                          {/* Admin Controls */}
                          {isAdmin && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md"
                                onClick={(e) => handleOpenEditDialog(topic, e)}
                                title="Edit Topic"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-destructive hover:bg-destructive/10 rounded-md"
                                onClick={(e) => handleDeleteTopic(topic.id, e)}
                                title="Delete Topic"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <p
                          className={cn(
                            'text-[11px] mt-1 line-clamp-2',
                            selectedTopic?.id === topic.id ? 'text-primary/80' : 'text-muted-foreground',
                          )}
                        >
                          {topic.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Slide Viewer */}
        <div className="flex-1 min-w-0 flex flex-col relative">
          {/* Arrow button for toggling TOC */}
          <Button
            variant="secondary"
            size="icon"
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full border shadow-md hidden lg:flex hover:bg-primary hover:text-white transition-all duration-300"
            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
            title={isSidebarVisible ? 'Hide Index' : 'Show Index'}
          >
            {isSidebarVisible ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          <Card className="h-full flex flex-col shadow-md border-primary/10 overflow-hidden bg-card/40 backdrop-blur-md">
            <CardHeader className="border-b bg-muted/5 py-4 px-6">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1.5 min-w-0">
                  <CardTitle className="text-lg font-black uppercase tracking-tight truncate text-slate-800 dark:text-slate-200">
                    {selectedTopic?.title || 'Select a Learning Module'}
                  </CardTitle>
                  <CardDescription className="text-xs font-medium text-muted-foreground line-clamp-2">
                    {selectedTopic?.description ||
                      'Pick a training topic from the index menu on the left to start learning.'}
                  </CardDescription>
                </div>
                {selectedTopic && (
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Open Link in Drive button */}
                    <a
                      href={selectedTopic.googleDriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 font-bold text-[10px] uppercase tracking-wider border-primary/20 shadow-sm hover:bg-primary/5"
                        title="Open presentation directly in Google Drive"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Open Slides</span>
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            </CardHeader>

            {/* Embedded Presentation Frame */}
            <CardContent className="flex-1 p-0 bg-slate-900 overflow-hidden relative min-h-[300px]">
              {isTopicsLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary opacity-30" />
                </div>
              ) : selectedTopic ? (
                previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="absolute inset-0 h-full w-full border-none bg-slate-950 shadow-inner"
                    allowFullScreen
                    allow="autoplay; encrypted-media"
                    title={`${selectedTopic.title} Slides Preview`}
                  ></iframe>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400 p-8">
                    <div className="text-center max-w-xs">
                      <Play className="mx-auto h-12 w-12 opacity-30 mb-4" />
                      <p className="font-bold text-xs uppercase tracking-widest">No Link Configured</p>
                      <p className="text-[10px] mt-2">
                        The Google Drive presentation link for this topic is invalid or missing.
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400 p-8 bg-slate-950/20">
                  <div className="text-center max-w-sm">
                    <GraduationCap className="mx-auto h-16 w-16 opacity-10 mb-4 text-primary" />
                    <p className="font-black text-xs uppercase tracking-widest text-slate-300">
                      Welcome to EOMS Academy
                    </p>
                    <p className="text-[11px] mt-2 text-slate-400">
                      Explore presentation files, training resources, and instructional slides regarding Romblon State
                      University's EOMS implementation framework.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>

            {/* Footer containing help text */}
            {selectedTopic && (
              <CardFooter className="py-2.5 px-6 border-t bg-muted/10 flex items-center justify-between text-[9px] uppercase tracking-wider font-bold text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3 w-3 text-primary/70" />
                  <span>Interactive Slide Document</span>
                </div>
                <div>
                  <span>Romblon State University • QMS Division</span>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      {/* Admin Add/Edit Topic Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-primary/20">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-black uppercase tracking-tight text-lg">
                <GraduationCap className="h-5 w-5 text-primary" />
                {editingTopic ? 'Update' : 'Add'} Academy Topic
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure learning presentation link and details.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Topic Title */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">
                  Topic Title
                </label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Clause 4: Context of the Organisation"
                  required
                  className="text-sm bg-background border-primary/10 focus-visible:ring-primary"
                />
              </div>

              {/* Topic Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Summarize the core learnings of this module..."
                  rows={3}
                  required
                  className="text-sm bg-background border-primary/10 focus-visible:ring-primary resize-none"
                />
              </div>

              {/* Google Drive Link */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">
                  Google Drive Link
                </label>
                <Input
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  placeholder="Paste Google Drive presentation sharing link..."
                  type="url"
                  required
                  className="text-sm bg-background border-primary/10 focus-visible:ring-primary"
                />
                <p className="text-[9px] text-muted-foreground leading-normal">
                  Make sure link sharing is set to "Anyone with the link can view". Supports Google Slides edit/view
                  links and generic file view links.
                </p>
              </div>

              {/* Display Order */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">
                  Display Order
                </label>
                <Input
                  value={formOrder}
                  onChange={(e) => setFormOrder(e.target.value)}
                  type="number"
                  min="1"
                  required
                  className="text-sm bg-background border-primary/10 focus-visible:ring-primary w-24"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="text-xs font-bold uppercase tracking-wider h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="text-xs font-bold uppercase tracking-wider h-9 bg-primary hover:bg-primary/95 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Topic'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
