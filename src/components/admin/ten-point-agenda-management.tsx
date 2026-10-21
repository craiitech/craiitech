'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { UNIVERSITY_TEN_POINT_AGENDA } from '@/lib/constants';
import type { TenPointAgendaItem, TenPointAgendaSettings } from '@/lib/types';
import {
  Compass,
  Award,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Layers,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from 'lucide-react';

export function TenPointAgendaManagement() {
  const firestore = useFirestore();
  const { userProfile, isAdmin } = useUser();
  const { toast } = useToast();

  const [items, setItems] = useState<TenPointAgendaItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Dialog State (Add / Edit Agenda Item)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Fetch from Firestore: system/tenPointAgenda
  const agendaDocRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'tenPointAgenda') : null),
    [firestore],
  );
  const { data: agendaSettings, isLoading: isLoadingSettings } = useDoc<TenPointAgendaSettings>(agendaDocRef);

  // Initialize from database or fall back to standard defaults
  useEffect(() => {
    if (agendaSettings?.items && Array.isArray(agendaSettings.items) && agendaSettings.items.length > 0) {
      setItems(agendaSettings.items);
    } else if (!isLoadingSettings) {
      // Use defaults from constants if not yet configured in database
      setItems(UNIVERSITY_TEN_POINT_AGENDA.map((item) => ({ ...item })));
    }
  }, [agendaSettings, isLoadingSettings]);

  const handleOpenAddDialog = () => {
    setEditingIndex(null);
    const nextNum = items.length + 1;
    setFormCode(`Point-${nextNum}`);
    setFormTitle(`Point ${nextNum}: `);
    setFormDescription('');
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (index: number) => {
    const item = items[index];
    if (!item) return;
    setEditingIndex(index);
    setFormCode(item.code || `Point-${index + 1}`);
    setFormTitle(item.title || '');
    setFormDescription(item.description || '');
    setIsDialogOpen(true);
  };

  const handleSaveDialogItem = () => {
    if (!formCode.trim() || !formTitle.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Both Point Code and Title are required.',
        variant: 'destructive',
      });
      return;
    }

    const updated = [...items];
    const newItem: TenPointAgendaItem = {
      code: formCode.trim(),
      title: formTitle.trim(),
      description: formDescription.trim(),
    };

    if (editingIndex !== null && editingIndex >= 0) {
      updated[editingIndex] = newItem;
    } else {
      updated.push(newItem);
    }

    setItems(updated);
    setHasChanges(true);
    setIsDialogOpen(false);
  };

  const handleDeleteItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    setHasChanges(true);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...items];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setItems(updated);
    setHasChanges(true);
  };

  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return;
    const updated = [...items];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setItems(updated);
    setHasChanges(true);
  };

  const handleResetToDefaults = async () => {
    setIsResetting(true);
    const defaultList: TenPointAgendaItem[] = UNIVERSITY_TEN_POINT_AGENDA.map((item) => ({ ...item }));
    setItems(defaultList);
    setHasChanges(true);

    if (firestore && userProfile) {
      try {
        await setDoc(
          doc(firestore, 'system', 'tenPointAgenda'),
          {
            items: defaultList,
            updatedAt: serverTimestamp(),
            updatedBy: userProfile.id,
            updatedByName: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Administrator',
          },
          { merge: true },
        );
        setHasChanges(false);
        toast({
          title: 'Reset to Defaults',
          description: 'University 10-Point Agenda (AQ) has been restored to institutional defaults.',
        });
      } catch (err: any) {
        console.error('Failed to reset agenda to defaults:', err);
        toast({
          title: 'Reset Failed',
          description: err.message || 'Could not reset agenda items.',
          variant: 'destructive',
        });
      }
    }
    setIsResetting(false);
  };

  const handleSaveChangesToFirestore = async () => {
    if (!firestore || !userProfile || !isAdmin) return;
    setIsSaving(true);
    try {
      await setDoc(
        doc(firestore, 'system', 'tenPointAgenda'),
        {
          items,
          updatedAt: serverTimestamp(),
          updatedBy: userProfile.id,
          updatedByName: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'Administrator',
        },
        { merge: true },
      );
      setHasChanges(false);
      toast({
        title: 'Settings Saved',
        description:
          'University 10-Point Agenda (AQ) updated successfully. All executive dashboards and unit operational plans will reflect these changes.',
      });
    } catch (err: any) {
      console.error('Failed to save 10-point agenda:', err);
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not save 10-point agenda settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Overview Card */}
      <Card className="border-2 border-primary/20 shadow-sm overflow-hidden bg-gradient-to-br from-card via-card to-primary/5">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold">University 10-Point Agenda (AQ) Settings</CardTitle>
                <Badge
                  variant="outline"
                  className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border-primary/30"
                >
                  Archipelagic Intelligence (AQ)
                </Badge>
              </div>
              <CardDescription className="max-w-3xl text-xs leading-relaxed">
                Configure and maintain the official 10-Point Agenda of Romblon State University. All agenda points
                defined here dynamically integrate into the{' '}
                <strong className="text-foreground">Archipelagic Intelligence (AQ)</strong> monitoring tab, VP Strategic
                Goals, and Unit Operational Plans (Form QAO-01-025).
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                    disabled={isResetting || !isAdmin}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset to Defaults
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset 10-Point Agenda to Defaults?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset all agenda points to the original Romblon State University 10-Point Agenda
                      definitions. Any custom points or edited titles will be replaced with standard defaults.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetToDefaults}>Confirm Reset</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenAddDialog}
                disabled={!isAdmin}
                className="text-xs h-8 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Agenda Point
              </Button>

              <Button
                size="sm"
                onClick={handleSaveChangesToFirestore}
                disabled={isSaving || !isAdmin || !hasChanges}
                className="text-xs h-8 gap-1.5 shadow-sm font-bold bg-primary text-primary-foreground"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Changes
              </Button>
            </div>
          </div>
        </CardHeader>

        {hasChanges && (
          <div className="bg-amber-500/10 border-t border-amber-500/20 px-6 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> You have unsaved agenda modifications. Click &quot;Save
              Changes&quot; to apply to the database.
            </span>
            <Button
              size="sm"
              onClick={handleSaveChangesToFirestore}
              disabled={isSaving}
              className="h-7 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              Save Now
            </Button>
          </div>
        )}
      </Card>

      {/* 2. Interactive Agenda List Table */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold">Configured Agenda Points ({items.length} Active)</CardTitle>
            </div>
            {agendaSettings?.updatedAt && (
              <span className="text-[11px] text-muted-foreground">
                Last updated by <strong className="text-foreground">{agendaSettings.updatedByName || 'Admin'}</strong>
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingSettings ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-xs text-muted-foreground">Loading university agenda settings...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <Compass className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No agenda points found.</p>
              <Button size="sm" onClick={handleResetToDefaults} className="text-xs">
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Load University Defaults
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-12 text-center text-[11px] font-bold">#</TableHead>
                  <TableHead className="w-28 text-[11px] font-bold">Code</TableHead>
                  <TableHead className="min-w-[280px] text-[11px] font-bold">Title</TableHead>
                  <TableHead className="min-w-[340px] text-[11px] font-bold">Strategic Description</TableHead>
                  <TableHead className="w-28 text-center text-[11px] font-bold">Order</TableHead>
                  <TableHead className="w-28 text-right text-[11px] font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={item.code + idx} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="text-center font-bold text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10.5px] font-bold">
                        {item.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground">{item.title}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground leading-relaxed">{item.description || '—'}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          disabled={idx === 0 || !isAdmin}
                          onClick={() => handleMoveUp(idx)}
                          title="Move Up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          disabled={idx === items.length - 1 || !isAdmin}
                          onClick={() => handleMoveDown(idx)}
                          title="Move Down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 text-xs"
                          onClick={() => handleOpenEditDialog(idx)}
                          disabled={!isAdmin}
                          title="Edit Agenda Point"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteItem(idx)}
                          disabled={!isAdmin}
                          title="Delete Agenda Point"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="py-3 px-6 border-t bg-muted/10 flex justify-between items-center text-xs text-muted-foreground">
          <span>
            Integrated with <strong className="text-foreground">Archipelagic Intelligence (AQ)</strong> &amp;
            Operational Plan Form QAO-01-025.
          </span>
          <span className="font-semibold">{items.length} Agenda Points Active</span>
        </CardFooter>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? 'Edit University Agenda Point' : 'Add University Agenda Point'}
            </DialogTitle>
            <DialogDescription>
              Specify the point code, official title, and strategic description. This will be selectable in operational
              plans and tracked in Archipelagic Intelligence (AQ).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="agenda-code">Point Code (e.g. Point-1)</Label>
              <Input
                id="agenda-code"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="Point-1"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agenda-title">Official Title</Label>
              <Input
                id="agenda-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Point 1: Academic Excellence & Quality Curricular Delivery"
                className="text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agenda-desc">Strategic Description & Focus Areas</Label>
              <Textarea
                id="agenda-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Describe key outcomes, target indicators, or institutional commitments..."
                rows={4}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDialogItem} className="font-bold">
              {editingIndex !== null ? 'Apply Changes' : 'Add Point'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
