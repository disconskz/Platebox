import { ReactNode } from "react";
import { AlertCircle, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type DataStateProps = {
  loading: boolean;
  error?: string | null;
  empty?: boolean;
  onRetry?: () => void;
  /** Skeleton variant when loading. */
  variant?: "table" | "rows" | "card";
  rowCount?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  children?: ReactNode;
};

/**
 * Унифицированное состояние загрузки/ошибки/пусто для списков.
 * Если все три флага false и нет ошибки — рендерит children.
 */
export function DataState({
  loading,
  error,
  empty,
  onRetry,
  variant = "rows",
  rowCount = 6,
  emptyTitle = "Нет записей",
  emptyDescription,
  emptyAction,
  children,
}: DataStateProps) {
  if (loading) {
    if (variant === "card") {
      return (
        <Card>
          <CardContent className="py-10 space-y-3">
            {Array.from({ length: rowCount }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </CardContent>
        </Card>
      );
    }
    if (variant === "table") {
      return (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card p-3 space-y-2">
          {Array.from({ length: rowCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-24 hidden sm:block" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-2 p-3 rounded-md border bg-card">
        {Array.from({ length: rowCount }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground max-w-md break-words">{error}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Повторить загрузку
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (empty) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="rounded-2xl p-3 bg-muted/40">
            <Inbox className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">{emptyTitle}</p>
            {emptyDescription && (
              <p className="text-xs text-muted-foreground mt-1 max-w-md">{emptyDescription}</p>
            )}
          </div>
          {emptyAction}
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

export default DataState;