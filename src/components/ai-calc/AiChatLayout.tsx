import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import AiThreadsSidebar from "./AiThreadsSidebar";

export default function AiChatLayout() {
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/app");
  };
  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background">
        <AiThreadsSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden border-b bg-card/80 backdrop-blur sticky top-0 z-30 safe-top flex items-center gap-2 px-3 py-2">
            <SidebarTrigger />
            <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={goBack} aria-label="Назад">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs">Назад</span>
            </Button>
            <span className="text-sm font-medium ml-auto">Плата</span>
          </header>
          <main className="flex-1 min-h-0 flex flex-col">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}