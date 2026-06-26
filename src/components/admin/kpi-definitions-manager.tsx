'use client';

import { useState, useCallback } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp } from '@/firebase/firestore-wrapper';
import { Loader2, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { KPI_CATEGORIES, DEFAULT_KPI_THRESHOLDS } from '@/lib/constants';
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
import type { KpiDefinition } from '@/lib/types';

const DATA_SOURCES = [
  { value: 'submission_completion_rate', label: 'Submission Completion Rate' },
  { value: 'submission_on_time_rate', label: 'Submission On-Time Rate' },
  { value: 'submission_approval_rate', label: 'Submission Approval Rate' },
  { value: 'risk_closure_rate', label: 'Risk Closure Rate' },
  { value: 'high_risk_percentage', label: 'High Risk Percentage' },
  { value: 'risk_overdue_ratio', label: 'Risk Overdue Ratio' },
  { value: 'risk_treatment_effectiveness', label: 'Risk Treatment Effectiveness' },
  { value: 'car_closure_rate', label: 'CAR Closure Rate' },
  { value: 'audit_completion_rate', label: 'Audit Completion Rate' },
  { value: 'csm_satisfaction_score', label: 'CSM Satisfaction Score' },
  { value: 'gad_budget_utilization', label: 'GAD Budget Utilization' },
];

export function KpiDefinitionsManager() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const defsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'kpiDefinitions') : null), [firestore]);
  const { data: definitions, isLoading } = useCollection<KpiDefinition>(defsQuery);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'eoms_compliance' as string,
    dataSource: '',
    unit: '%',
    defaultTarget: 80,
    weight: 1,
    thresholds: { ...DEFAULT_KPI_THRESHOLDS },
    isActive: true,
  });

  const resetForm = useCallback(() => {
    setForm({
      name: '',
      description: '',
      category: 'eoms_compliance',
      dataSource: '',
      unit: '%',
      defaultTarget: 80,
      weight: 1,
      thresholds: { ...DEFAULT_KPI_THRESHOLDS },
      isActive: true,
    });
    setEditingId(null);
    setIsCreating(false);
  }, []);

  const startEdit = useCallback((def: KpiDefinition) => {
    setForm({
      name: def.name,
      description: def.description,
      category: def.category,
      dataSource: def.dataSource,
      unit: def.unit,
      defaultTarget: def.defaultTarget,
      weight: def.weight,
      thresholds: def.thresholds,
      isActive: def.isActive,
    });
    setEditingId(def.id);
    setIsCreating(false);
  }, []);

  const handleSave = async () => {
    if (!firestore) return;
    if (!form.name.trim() || !form.dataSource) {
      toast({ title: 'Validation Error', description: 'Name and data source are required.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        updatedAt: Timestamp.now(),
      };

      if (editingId) {
        await updateDoc(doc(firestore, 'kpiDefinitions', editingId), payload);
        toast({ title: 'KPI Updated', description: 'Definition has been saved.' });
      } else {
        await addDoc(collection(firestore, 'kpiDefinitions'), {
          ...payload,
          createdAt: Timestamp.now(),
        });
        toast({ title: 'KPI Created', description: 'New KPI definition added.' });
      }
      resetForm();
    } catch {
      toast({ title: 'Error', description: 'Failed to save KPI definition.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore || !deleteId) return;
    try {
      await deleteDoc(doc(firestore, 'kpiDefinitions', deleteId));
      toast({ title: 'KPI Deleted', description: 'Definition removed.' });
      setDeleteId(null);
    } catch {
      toast({ title: 'Error', description: 'Failed to delete KPI.', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            Define Key Performance Indicators tracked across the institution.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreating(true); }} size="sm" className="h-8 text-[10px] font-black" disabled={isCreating}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New KPI
        </Button>
      </div>

      {(isCreating || editingId) && (
        <Card className="shadow-md border-primary/10">
          <CardContent className="p-4 pt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-bold">Name *</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Submission Completion Rate" className="text-sm font-medium" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-bold">Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this KPI measure?" className="text-sm min-h-[50px]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(KPI_CATEGORIES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">Data Source *</Label>
                <Select value={form.dataSource} onValueChange={(v) => setForm(f => ({ ...f, dataSource: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {DATA_SOURCES.map(ds => (
                      <SelectItem key={ds.value} value={ds.value}>{ds.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))} className="text-sm font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">Default Target (%)</Label>
                <Input type="number" value={form.defaultTarget} onChange={(e) => setForm(f => ({ ...f, defaultTarget: Number(e.target.value) }))} className="text-sm font-bold" min={0} max={100} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">Threshold Direction</Label>
                <Select value={form.thresholds.direction} onValueChange={(v: 'higher_is_better' | 'lower_is_better') => setForm(f => ({ ...f, thresholds: { ...f.thresholds, direction: v } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="higher_is_better">Higher is Better</SelectItem>
                    <SelectItem value="lower_is_better">Lower is Better</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.isActive} onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))} />
                  <Label className="text-xs font-bold cursor-pointer">Active</Label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={resetForm} className="text-xs font-bold">
                <X className="h-3 w-3 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="text-xs font-bold">
                {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                {editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {definitions && definitions.length > 0 ? (
        <div className="space-y-2">
          {definitions.map(def => (
            <Card key={def.id} className="shadow-sm border-primary/5 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black">{def.name}</span>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border ${
                        def.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                      }`}>
                        {def.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-[8px] font-black text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        {KPI_CATEGORIES[def.category as keyof typeof KPI_CATEGORIES] || def.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{def.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[9px] font-bold text-muted-foreground">
                      <span>Target: {def.defaultTarget}{def.unit}</span>
                      <span>Weight: {def.weight}</span>
                      <span>Good &ge; {def.thresholds.good} | Sat &ge; {def.thresholds.satisfactory} | Poor &lt; {def.thresholds.poor}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(def)} className="h-8 w-8 p-0">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(def.id)} className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-bold text-muted-foreground">No KPI definitions yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Create your first KPI to start tracking performance.</p>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-black">Delete KPI Definition</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone. This will permanently delete this KPI definition.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="text-xs font-bold bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
