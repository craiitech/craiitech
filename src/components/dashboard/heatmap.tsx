
'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HeatmapProps {
  data: {
    name: string;
    value: number;
    total: number;
  }[];
}

export function Heatmap({ data }: HeatmapProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        No data to display for the heatmap.
      </div>
    );
  }

  const getColor = (value: number, total: number) => {
    if (total === 0) return 'bg-gray-200 dark:bg-gray-700';
    const percentage = (value / total) * 100;
    if (percentage < 25) return 'bg-red-200 dark:bg-red-800';
    if (percentage < 50) return 'bg-orange-200 dark:bg-orange-800';
    if (percentage < 75) return 'bg-yellow-200 dark:bg-yellow-800';
    return 'bg-green-200 dark:bg-green-800';
  };

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {data.map((item) => (
          <Tooltip key={item.name}>
            <TooltipTrigger>
              <div className="p-3 rounded-md border text-left">
                <div
                  className={cn(
                    'w-full h-8 rounded-md mb-2',
                    getColor(item.value, item.total)
                  )}
                />
                <p className="text-xs font-medium truncate leading-tight" title={item.name}>
                  {item.name}
                </p>
                 <p className="text-xs text-muted-foreground">
                  {item.value} / {item.total} units
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{item.name}</p>
              <p>
                {((item.value / item.total) * 100).toFixed(0)}% completion rate
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
