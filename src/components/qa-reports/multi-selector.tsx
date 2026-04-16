'use client';

import * as React from "react";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface MultiSelectorProps {
  items: { id: string; name: string }[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  placeholder?: string;
  label?: string;
}

/**
 * A multi-selection component designed to work reliably within nested Dialogs.
 * Uses onPointerDown and event stopping to navigate Radix focus traps.
 */
export function MultiSelector({ items, selectedIds, onSelect, placeholder = "Add item...", label = "Select Items" }: MultiSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (id: string) => {
    onSelect(selectedIds.filter((i) => i !== id));
  };

  const toggleItem = (id: string) => {
    const newIds = selectedIds.includes(id)
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];
    onSelect(newIds);
  };

  const selectedItems = React.useMemo(() => {
    return items.filter(item => selectedIds.includes(item.id));
  }, [items, selectedIds]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 items-center min-h-10 p-2 rounded-md border bg-slate-50/50">
        {selectedItems.map((item) => (
          <Badge key={item.id} variant="secondary" className="gap-1 pr-1 font-bold text-[10px] uppercase h-6 bg-white border-primary/20 text-primary animate-in zoom-in duration-200">
            {item.name}
            <button
              type="button"
              className="ml-1 rounded-full outline-none hover:bg-destructive hover:text-white transition-colors p-0.5"
              onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleUnselect(item.id);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button 
                variant="outline" 
                size="sm" 
                className="h-7 w-7 rounded-full p-0 border-dashed border-primary/40 text-primary hover:bg-primary/5 shadow-sm"
                title={label}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-72 p-0 border-none shadow-2xl" 
            align="start" 
            // Prevent main Dialog from snatching focus back immediately
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command className="bg-white border rounded-lg overflow-hidden">
              <div className="flex items-center border-b px-3">
                <CommandInput placeholder={placeholder} className="h-10 text-xs border-none focus:ring-0" />
              </div>
              <CommandList className="max-h-64">
                <CommandEmpty className="p-4 text-center text-xs text-muted-foreground uppercase font-bold">No results found</CommandEmpty>
                <CommandGroup>
                  {items.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <CommandItem
                        key={item.id}
                        value={item.name}
                        // CRITICAL: Use onPointerDown to handle interactions before focus trap interferes
                        onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        onSelect={() => toggleItem(item.id)}
                        className="cursor-pointer flex items-center justify-between px-4 py-3"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={cn(
                                "h-4 w-4 border rounded flex items-center justify-center shrink-0 transition-colors",
                                isSelected ? "bg-primary border-primary text-white" : "border-slate-300"
                            )}>
                                {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <span className={cn("text-xs truncate", isSelected ? "font-bold text-primary" : "text-slate-600")}>{item.name}</span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selectedIds.length === 0 && (
            <span className="text-[10px] text-muted-foreground font-medium italic ml-1">No items selected</span>
        )}
      </div>
    </div>
  );
}
