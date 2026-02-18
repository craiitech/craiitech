
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
          <Badge key={item.id} variant="secondary" className="gap-1 pr-1 font-bold text-[10px] uppercase h-6 bg-white border-primary/20 text-primary">
            {item.name}
            <button
              type="button"
              className="ml-1 rounded-full outline-none hover:bg-destructive hover:text-white transition-colors"
              onClick={() => handleUnselect(item.id)}
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
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder={placeholder} />
              <CommandEmpty>No matches found.</CommandEmpty>
              <CommandGroup className="max-h-60 overflow-auto">
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => toggleItem(item.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-primary",
                        selectedIds.includes(item.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="text-xs font-medium">{item.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
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
