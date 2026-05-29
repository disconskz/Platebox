import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, GlossaryCategory, GlossaryItem } from "@/lib/glossary";

interface Props {
  value: string;
  onChange: (v: string) => void;
  query: string;
  onQueryChange: (q: string) => void;
  glossary: GlossaryItem[];
}

export function GlossaryCombobox({ value, onChange, query, onQueryChange, glossary }: Props) {
  const [open, setOpen] = useState(false);
  const current = glossary.find((g) => g.slug === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate text-left">
            {current ? current.name : <span className="text-muted-foreground">Выберите…</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Поиск вида продукции…"
            value={query}
            onValueChange={onQueryChange}
          />
          <CommandList className="max-h-[360px]">
            <CommandEmpty>Ничего не найдено</CommandEmpty>
            {(Object.keys(CATEGORY_LABELS) as GlossaryCategory[]).map((cat) => {
              const q = query.trim().toLowerCase();
              const its = glossary.filter(
                (g) =>
                  g.category === cat &&
                  (!q || g.name.toLowerCase().includes(q) || g.slug.toLowerCase().includes(q)),
              );
              if (!its.length) return null;
              return (
                <CommandGroup key={cat} heading={CATEGORY_LABELS[cat]}>
                  {its.map((g) => (
                    <CommandItem
                      key={g.slug}
                      value={g.slug}
                      onSelect={() => {
                        onChange(g.slug);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", value === g.slug ? "opacity-100" : "opacity-0")} />
                      <span className="flex-1 truncate">{g.name}</span>
                      {!g.is_calculable && (
                        <span className="ml-2 text-[10px] text-muted-foreground">(по запросу)</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}