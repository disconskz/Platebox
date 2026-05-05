import { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import MobileTabBar from "@/components/MobileTabBar";

/**
 * Unified mobile-first page shell.
 *
 * Usage:
 *   <PageShell>
 *     <PageHeader>
 *       <PageHeaderRow> ...title / actions... </PageHeaderRow>
 *     </PageHeader>
 *     <PageMain> ...content... </PageMain>
 *   </PageShell>
 *
 * Handles: safe-area (top/bottom/sides), px-4 gutters, container max-width,
 * sticky header styling, and bottom tab-bar offset on mobile.
 * No need to manually repeat `safe-top`, `container mx-auto px-4`, `has-tabbar`.
 */

interface ShellProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Hide bottom MobileTabBar (e.g. for full-screen flows). */
  hideTabBar?: boolean;
}

export function PageShell({ children, className, hideTabBar, ...rest }: ShellProps) {
  return (
    <div className={cn("page-shell", className)} {...rest}>
      {children}
      {!hideTabBar && <MobileTabBar />}
    </div>
  );
}

export function PageHeader({ children, className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <header className={cn("page-header", className)} {...rest}>
      {children}
    </header>
  );
}

export function PageHeaderRow({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("page-header-row", className)} {...rest}>
      {children}
    </div>
  );
}

export function PageMain({ children, className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <main className={cn("page-main", className)} {...rest}>
      {children}
    </main>
  );
}

export function PageContainer({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("page-container", className)} {...rest}>
      {children}
    </div>
  );
}

export default PageShell;