'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, FileCheck2, Camera } from 'lucide-react';
import type { FiamoEvidenceType, RepairCompletionEvidence } from '@/lib/types';

interface EvidenceSelectorProps {
  evidenceTypes: FiamoEvidenceType[]; // ONLY the worker type's required types passed in
  value: RepairCompletionEvidence[];
  onChange: (evidence: RepairCompletionEvidence[]) => void;
  disabled?: boolean;
}

export function EvidenceSelector({ evidenceTypes, value, onChange, disabled }: EvidenceSelectorProps) {
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [fileName, setFileName] = useState('');

  const addEvidence = () => {
    if (!selectedTypeId) return;
    const et = evidenceTypes.find((t) => t.id === selectedTypeId);
    if (!et) return;
    const entry: RepairCompletionEvidence = {
      evidenceTypeId: et.id,
      evidenceTypeLabel: et.label,
      evidenceCategory: et.category,
      fileUrl: fileName || undefined,
      remarks: remarks || undefined,
      submittedAt: new Date(),
      submittedBy: '', // filled by parent
      submittedByName: '', // filled by parent
    };
    onChange([...(value || []), entry]);
    setSelectedTypeId('');
    setRemarks('');
    setFileName('');
  };

  const removeEvidence = (index: number) => {
    const next = [...(value || [])];
    next.splice(index, 1);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {evidenceTypes.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No evidence types configured for your worker type. Please contact the Unit Coordinator.
        </p>
      )}

      {evidenceTypes.length > 0 && !disabled && (
        <div className="p-3 rounded-lg border bg-muted/10 space-y-2">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1">
              <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue placeholder="Select evidence type from system list..." />
                </SelectTrigger>
                <SelectContent>
                  {evidenceTypes.map((et) => (
                    <SelectItem key={et.id} value={et.id}>
                      {et.label} {et.isRequired ? '(Required)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Attachment URL (optional)"
                className="h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Remarks / details for this evidence (optional)"
              rows={2}
            />
            <Button
              type="button"
              size="sm"
              onClick={addEvidence}
              disabled={!selectedTypeId}
              className="font-bold text-[10px] uppercase tracking-widest shrink-0"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </div>
      )}

      {value?.map((ev, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-slate-900 shadow-sm"
        >
          <div className="flex items-center gap-2">
            {ev.evidenceCategory === 'photo' ? (
              <Camera className="h-4 w-4 text-blue-600" />
            ) : (
              <FileCheck2 className="h-4 w-4 text-green-600" />
            )}
            <div>
              <p className="text-sm font-bold">{ev.evidenceTypeLabel}</p>
              {ev.remarks && <p className="text-[10px] text-muted-foreground">{ev.remarks}</p>}
              {ev.fileUrl && (
                <a href={ev.fileUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 underline">
                  {ev.fileUrl}
                </a>
              )}
            </div>
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeEvidence(i)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}

      {(!value || value.length === 0) && <p className="text-xs text-muted-foreground italic">No evidence added yet.</p>}
    </div>
  );
}
