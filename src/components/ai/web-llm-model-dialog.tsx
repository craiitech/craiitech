'use client';

import { useState } from 'react';
import { useWebLlm } from '@/context/web-llm-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Cpu, HardDrive, ShieldCheck, CheckCircle2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WebLlmModelDialog() {
  const { isAdminOnly, isModelSelectorOpen, closeModelSelector, availableModels, selectedModel, selectAndLoadModel } =
    useWebLlm();

  const [chosenModelId, setChosenModelId] = useState<string>(selectedModel);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isAdminOnly) return null;

  const handleConfirm = async () => {
    setIsDownloading(true);
    await selectAndLoadModel(chosenModelId);
    setIsDownloading(false);
  };

  return (
    <Dialog open={isModelSelectorOpen} onOpenChange={(open) => !open && closeModelSelector()}>
      <DialogContent className="max-w-lg rounded-2xl border-primary/20 bg-background/95 backdrop-blur-xl shadow-2xl p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5 animate-pulse" />
            <DialogTitle className="text-base font-black uppercase tracking-tight text-foreground">
              Select Local WebLLM Engine (Admin)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            No cached model detected. Choose a client-side WebLLM model to run locally inside your browser via WebGPU.
            Once downloaded, it will be cached and run in the background.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3 max-h-[320px] overflow-y-auto pr-1">
          {availableModels.map((model) => {
            const isSelected = chosenModelId === model.id;
            return (
              <div
                key={model.id}
                onClick={() => setChosenModelId(model.id)}
                className={cn(
                  'p-4 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3',
                  isSelected ? 'border-primary bg-primary/10 shadow-sm' : 'border-border hover:bg-muted/50',
                )}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-foreground leading-tight truncate">
                      {model.name}
                    </span>
                    {model.isRecommended && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[8px] font-black uppercase tracking-widest px-1.5 py-0">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">{model.description}</p>
                  <div className="flex items-center gap-3 pt-1 text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3 text-primary" /> {model.size}
                    </span>
                    <span className="flex items-center gap-1">
                      <Cpu className="h-3 w-3 text-indigo-500" /> WebGPU Local
                    </span>
                  </div>
                </div>

                <div className="shrink-0 pt-1">
                  <div
                    className={cn(
                      'h-5 w-5 rounded-full border flex items-center justify-center transition-all',
                      isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/30',
                    )}
                  >
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button
            variant="ghost"
            onClick={closeModelSelector}
            disabled={isDownloading}
            className="text-xs font-bold uppercase tracking-wider rounded-xl h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isDownloading}
            className="text-xs font-black uppercase tracking-wider rounded-xl h-10 shadow-md gap-2"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? 'Downloading & Caching...' : 'Download & Activate WebLLM'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
