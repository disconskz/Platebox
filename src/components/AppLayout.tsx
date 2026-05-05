import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-aurora">
        {/* Desktop sidebar only — mobile uses bottom tab bar */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Floating trigger on desktop only */}
          <div className="hidden md:flex h-11 items-center px-3 border-b border-border/60 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50 shadow-[0_1px_0_hsl(var(--border)/0.6)]">
            <SidebarTrigger className="hover:bg-muted/60 transition-colors" />
          </div>
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
}
