'use client';

import * as React from "react";
import { Check, Plus, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MultiSelectorProps {
  items: { id: string; name: string }[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  placeholder?: string;
  label?: string;
}

/**
 * A robust multi-selection component optimized for use within high-density Dialogs.
 * Avoiding cmdk focus traps by using a standard list with manual event handling.
 */
export function MultiSelector({ items, selectedIds, onSelect, placeholder = "Add item...", label = "Select Items" }: MultiSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredItems = React.useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const toggleItem = (id: string) => {
    const newIds = selectedIds.includes(id)
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];
    onSelect(newIds);
  };

  const handleUnselect = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(selectedIds.filter((i) => i !== id));
  };

  const selectedItems = items.filter(item => selectedIds.includes(item.id));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 items-center min-h-10 p-2 rounded-md border bg-slate-50/50">
        {selectedItems.map((item) => (
          <Badge 
            key={item.id} 
            variant="secondary" 
            className="gap-1 pr-1 font-bold text-[10px] uppercase h-6 bg-white border-primary/20 text-primary animate-in zoom-in duration-200"
          >
            {item.name}
            <button
              type="button"
              className="ml-1 rounded-full outline-none hover:bg-destructive hover:text-white transition-colors p-0.5"
              onClick={(e) => handleUnselect(e, item.id)}
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
            className="w-72 p-0 border shadow-2xl z-[100] bg-white overflow-hidden rounded-lg" 
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="flex flex-col">
                <div className="flex items-center border-b px-3 py-2 gap-2 bg-slate-50">
                    <Search className="h-4 w-4 text-muted-foreground opacity-50" />
                    <Input 
                        placeholder={placeholder} 
                        className="h-8 text-xs border-none focus:ring-0 p-0 shadow-none bg-transparent" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <ScrollArea className="max-h-64 h-auto">
                    <div className="p-1">
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item) => {
                                const isSelected = selectedIds.includes(item.id);
                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-sm cursor-pointer transition-colors hover:bg-primary/5",
                                            isSelected && "bg-primary/5"
                                        )}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggleItem(item.id);
                                        }}
                                    >
                                        <div className={cn(
                                            "h-4 w-4 border rounded flex items-center justify-center shrink-0 transition-colors",
                                            isSelected ? "bg-primary border-primary text-white" : "border-slate-300 bg-white"
                                        )}>
                                            {isSelected && <Check className="h-3 w-3" />}
                                        </div>
                                        <span className={cn("text-xs truncate", isSelected ? "font-bold text-primary" : "text-slate-600")}>
                                            {item.name}
                                        </span>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-4 text-center text-xs text-muted-foreground font-bold uppercase">No results found</div>
                        )}
                    </div>
                </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>

        {selectedIds.length === 0 && (
            <span className="text-[10px] text-muted-foreground font-medium italic ml-1">No items selected</span>
        )}
      </div>
    </div>
  );
}
