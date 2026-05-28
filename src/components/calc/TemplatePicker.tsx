import { useEffect, useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type TemplateRow = {
  id: string;
  name: string | null;
  product_type: string | null;
  circulation: number | null;
  updated_at: string;
};

export default function TemplatePicker({ onPick, currentId }: { onPick: (id: string) => void; currentId?: string | null }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<TemplateRow[]>([]);

  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("calculations")
        .select("id,name,product_type,circulation,updated_at")
        .eq("is_template", true)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(100);
      if (!cancelled) {
        setItems((data as TemplateRow[]) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, user?.id]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="hidden sm:inline">Применить шаблон</span>
          <span className="sm:hidden">Шаблон</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0 w-[320px]">
        <Command shouldFilter={true}>
          <CommandInput placeholder="Поиск шаблона…" />
          <CommandList>
            {loading && <div className="p-3 text-sm text-muted-foreground">Загрузка…</div>}
            {!loading && items.length === 0 && (
              <CommandEmpty>
                <div className="p-3 text-sm text-muted-foreground text-left">
                  Сохранённых шаблонов нет. Сохраните расчёт как шаблон, чтобы переиспользовать параметры.
                </div>
              </CommandEmpty>
            )}
            {!loading && items.length > 0 && (
              <CommandGroup heading="Ваши шаблоны">
                {items.map((t) => {
                  const subtitle = [t.product_type, t.circulation ? `${t.circulation} шт` : null]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <CommandItem
                      key={t.id}
                      value={`${t.name || ""} ${t.product_type || ""}`}
                      onSelect={() => {
                        onPick(t.id);
                        setOpen(false);
                      }}
                      className="flex items-start gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{t.name || "Без названия"}</div>
                        {subtitle && <div className="text-xs text-muted-foreground truncate">{subtitle}</div>}
                      </div>
                      {currentId === t.id && <Check className="h-4 w-4 text-primary mt-0.5" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}