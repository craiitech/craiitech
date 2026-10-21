'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { OperationalPlanSettingsManagement } from '@/components/admin/operational-plan-settings-management';

interface VpStrategicGoalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forcedVpCode?: string | null;
}

export function VpStrategicGoalsDialog({ open, onOpenChange, forcedVpCode }: VpStrategicGoalsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-black">
            Archipelagic Intelligence (AQ) Strategic Goals Management
          </DialogTitle>
          <DialogDescription className="text-xs">
            Define, update, and align your cluster&apos;s strategic priorities with the Archipelagic Pillars, SUC
            Levelling KRAs, and President&apos;s 10-Point Agenda (AQ).
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <OperationalPlanSettingsManagement
            forcedVpCode={forcedVpCode}
            hideSystemModeToggle={true}
            isDialogMode={true}
            onCloseDialog={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
