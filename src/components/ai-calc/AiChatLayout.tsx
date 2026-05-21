import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AiThreadsSidebar from "./AiThreadsSidebar";

export default function AiChatLayout() {
  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <AiThreadsSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden border-b bg-card/80 backdrop-blur sticky top-0 z-30 safe-top flex items-center gap-2 px-3 py-2">
            <SidebarTrigger />
            <span className="text-sm font-medium">ИИ-расчёт</span>
          </header>
          <main className="flex-1 min-h-0 flex flex-col">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}