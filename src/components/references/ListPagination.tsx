import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (s: number) => void;
  pageSizeOptions?: number[];
};

export function ListPagination({
  page, pageSize, total, onPageChange, onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (cur - 1) * pageSize + 1;
  const to = Math.min(cur * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 px-1 text-xs text-muted-foreground">
      <div className="tabular-nums">
        {from}–{to} из <span className="font-medium text-foreground">{total}</span>
      </div>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <div className="flex items-center gap-1">
            <span>на стр.</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger className="h-7 w-[68px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" className="h-7 w-7" disabled={cur <= 1} onClick={() => onPageChange(cur - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="tabular-nums px-1"><span className="font-medium text-foreground">{cur}</span> / {totalPages}</span>
          <Button size="icon" variant="outline" className="h-7 w-7" disabled={cur >= totalPages} onClick={() => onPageChange(cur + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}