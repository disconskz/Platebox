import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop sidebar only — mobile uses bottom tab bar */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Floating trigger on desktop only */}
          <div className="hidden md:flex h-10 items-center px-2 border-b bg-card/60 backdrop-blur">
            <SidebarTrigger />
          </div>
          <Outlet />
        </div>
      </div>
    </SidebarProvider>
  );
}
