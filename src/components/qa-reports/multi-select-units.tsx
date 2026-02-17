
'use client';

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import type { Unit } from "@/lib/types"

interface MultiSelectUnitsProps {
  units: Unit[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
}

export function MultiSelectUnits({ units, selectedIds, onSelect }: MultiSelectUnitsProps) {
  const [open, setOpen] = React.useState(false)

  const handleUnselect = (id: string) => {
    onSelect(selectedIds.filter((i) => i !== id))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-10 text-left"
        >
          <div className="flex gap-1 flex-wrap py-1">
            {selectedIds.length > 0 ? (
              selectedIds.map((id) => {
                const unit = units.find((u) => u.id === id)
                return (
                  <Badge key={id} variant="secondary" className="mr-1 mb-1 text-[10px]">
                    {unit?.name || id}
                    <button
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUnselect(id)
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={() => handleUnselect(id)}
                    >
                      <X className="h-2 w-2 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                )
              })
            ) : (
              <span className="text-muted-foreground">Select units...</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search units..." />
          <CommandEmpty>No unit found.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-auto">
            {units.map((unit) => (
              <CommandItem
                key={unit.id}
                onSelect={() => {
                  const newIds = selectedIds.includes(unit.id)
                    ? selectedIds.filter((id) => id !== unit.id)
                    : [...selectedIds, unit.id]
                  onSelect(newIds)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedIds.includes(unit.id) ? "opacity-100" : "opacity-0"
                  )}
                />
                {unit.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
