import { LayoutGrid, BarChart3, Database, Plus, LogOut, BookOpen, Layers, Sparkles, FileText } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const main = [
  { title: "Расчёты", url: "/app", icon: LayoutGrid, exact: true },
  { title: "Новый расчёт", url: "/calculator", icon: Plus },
  { title: "Шаблон: Листовка", url: "/calculator/leaflet", icon: FileText },
  { title: "Шаблон: Флаер", url: "/calculator/flyer", icon: FileText },
  { title: "Шаблон: Еврофлаер", url: "/calculator/euroflyer", icon: FileText },
  { title: "Шаблон: Визитка", url: "/calculator/businesscard", icon: FileText },
  { title: "Групповой спуск", url: "/calculator/multi-sku", icon: Layers },
  { title: "ИИ-расчёт", url: "/ai-calc", icon: Sparkles },
  { title: "Аналитика", url: "/analytics", icon: BarChart3 },
  { title: "Справочники", url: "/references", icon: Database },
  { title: "База знаний", url: "/knowledge", icon: BookOpen },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <NavLink to="/app" className="flex items-center gap-2.5 px-2 py-2">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm transition-transform duration-200 hover:scale-105">
            <div className="h-3.5 w-3.5 bg-primary-foreground rounded-sm rotate-45" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-base font-bold leading-tight truncate tracking-tight" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Platebox</div>
              <div className="text-[10px] text-muted-foreground truncate">Кабинет типографии</div>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Навигация</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => {
                const active = isActive(item.url, item.exact);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className={cn(
                          "group flex items-center gap-2 rounded-md transition-all duration-200",
                          "hover:bg-muted/60 hover:translate-x-0.5",
                          active && "font-medium bg-muted/70 shadow-[inset_2px_0_0_hsl(var(--accent))]"
                        )}
                      >
                        <item.icon className={cn(
                          "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
                          active && "text-accent"
                        )} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        {!collapsed && user?.email && (
          <div className="px-2 pt-2 pb-1 text-[11px] text-muted-foreground truncate" title={user.email}>
            {user.email}
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} tooltip="Выйти">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Выйти</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
