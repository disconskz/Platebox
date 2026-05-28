import { LayoutGrid, BarChart3, Database, Plus, LogOut, BookOpen, Layers, Sparkles, FileText, ChevronDown, FileStack, Search, X } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
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
  { title: "Групповой спуск", url: "/calculator/multi-sku", icon: Layers },
  { title: "ИИ-расчёт", url: "/ai-calc", icon: Sparkles },
  { title: "Аналитика", url: "/analytics", icon: BarChart3 },
  { title: "Справочники", url: "/references", icon: Database },
  { title: "База знаний", url: "/knowledge", icon: BookOpen },
];

type Tpl = { title: string; url: string };
type TplCategory = { title: string; items: Tpl[] };

const templateCategories: TplCategory[] = [
  {
    title: "Листовая продукция",
    items: [
      { title: "Листовка", url: "/calculator/leaflet" },
      { title: "Флаер", url: "/calculator/flyer" },
      { title: "Еврофлаер", url: "/calculator/euroflyer" },
      { title: "Визитка", url: "/calculator/businesscard" },
      { title: "Вкладыш", url: "/calculator/insert" },
      { title: "Купон", url: "/calculator/coupon" },
      { title: "Анкета", url: "/calculator/form" },
      { title: "Фирменный бланк", url: "/calculator/letterhead" },
      { title: "Меню", url: "/calculator/menu" },
      { title: "Плакат / постер", url: "/calculator/poster" },
      { title: "Открытка", url: "/calculator/card" },
    ],
  },
  {
    title: "Буклеты и фальцовка",
    items: [
      { title: "Буклет", url: "/calculator/booklet" },
      { title: "Евробуклет", url: "/calculator/eurobooklet" },
      { title: "Лифлет", url: "/calculator/liflet" },
    ],
  },
  {
    title: "Многостраничные",
    items: [
      { title: "Брошюра", url: "/calculator/brochure" },
      { title: "Каталог", url: "/calculator/catalog" },
      { title: "Журнал", url: "/calculator/magazine" },
      { title: "Книга (мягкий переплёт)", url: "/calculator/softcover-book" },
      { title: "Книга (твёрдый переплёт)", url: "/calculator/hardcover-book" },
    ],
  },
  {
    title: "Канцелярия и блоки",
    items: [
      { title: "Ежедневник", url: "/calculator/planner" },
      { title: "Блокнот", url: "/calculator/notepad" },
      { title: "Кубарик / блок", url: "/calculator/memocube" },
    ],
  },
  {
    title: "Календари",
    items: [
      { title: "Календарь квартальный", url: "/calculator/quarter-calendar" },
      { title: "Календарь-домик", url: "/calculator/desk-calendar" },
      { title: "Календарь карманный", url: "/calculator/pocket-calendar" },
    ],
  },
  {
    title: "Папки и презентация",
    items: [
      { title: "Папка", url: "/calculator/folder" },
      { title: "Грамота / Диплом", url: "/calculator/diploma" },
    ],
  },
  {
    title: "Наклейки и этикетки",
    items: [
      { title: "Наклейка / Стикер", url: "/calculator/sticker" },
      { title: "Этикетка", url: "/calculator/label" },
      { title: "Бирка / Ярлык", url: "/calculator/hangtag" },
    ],
  },
  {
    title: "Упаковка",
    items: [
      { title: "Пакет", url: "/calculator/bag" },
      { title: "Коробка", url: "/calculator/box" },
      { title: "Тубус", url: "/calculator/tube" },
      { title: "Конверт", url: "/calculator/envelope" },
    ],
  },
  {
    title: "POS-материалы",
    items: [
      { title: "POS / Воблер / Шелфтокер", url: "/calculator/pos" },
    ],
  },
  {
    title: "Бейджи и карты",
    items: [
      { title: "Бейдж / Пропуск / Карта", url: "/calculator/badge" },
    ],
  },
];

const allTemplates: Tpl[] = templateCategories.flatMap((c) => c.items);

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

  const anyTemplateActive = allTemplates.some((t) => isActive(t.url));
  const [templatesOpen, setTemplatesOpen] = useState<boolean>(anyTemplateActive);
  const [tplQuery, setTplQuery] = useState("");

  const filteredCategories = useMemo(() => {
    const q = tplQuery.trim().toLowerCase();
    if (!q) return templateCategories;
    return templateCategories
      .map((c) => ({ ...c, items: c.items.filter((t) => t.title.toLowerCase().includes(q)) }))
      .filter((c) => c.items.length > 0);
  }, [tplQuery]);
  const filteredCount = filteredCategories.reduce((s, c) => s + c.items.length, 0);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const c of templateCategories) {
      init[c.title] = c.items.some((t) => isActive(t.url));
    }
    return init;
  });

  // Split main into pre/post (templates inserted after "Новый расчёт").
  const preIndex = main.findIndex((m) => m.url === "/calculator");
  const preItems = main.slice(0, preIndex + 1);
  const postItems = main.slice(preIndex + 1);

  const renderItem = (item: typeof main[number]) => {
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
  };

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
              {preItems.map(renderItem)}

              {/* Сворачиваемая группа «Шаблоны» */}
              <Collapsible open={templatesOpen} onOpenChange={setTemplatesOpen} className="group/coll">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={anyTemplateActive}
                      tooltip="Шаблоны"
                      className={cn(
                        "group flex items-center gap-2 rounded-md transition-all duration-200 w-full",
                        "hover:bg-muted/60",
                        anyTemplateActive && "font-medium bg-muted/70 shadow-[inset_2px_0_0_hsl(var(--accent))]"
                      )}
                    >
                      <FileStack className={cn("h-4 w-4 transition-transform duration-200 group-hover:scale-110", anyTemplateActive && "text-accent")} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">Шаблоны</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">{allTemplates.length}</span>
                          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", templatesOpen && "rotate-180")} />
                        </>
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </SidebarMenuItem>
                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  {!collapsed && (
                    <div className="ml-3 mt-0.5 mb-1 border-l border-border/60 pl-1">
                      {/* Поиск по шаблонам */}
                      <div className="px-1.5 py-1.5 sticky top-0 bg-sidebar z-10">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            value={tplQuery}
                            onChange={(e) => setTplQuery(e.target.value)}
                            placeholder="Поиск шаблона…"
                            className="h-7 pl-7 pr-7 text-xs"
                          />
                          {tplQuery && (
                            <button
                              type="button"
                              onClick={() => setTplQuery("")}
                              aria-label="Очистить"
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        {tplQuery && (
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            Найдено: <span className="tabular-nums">{filteredCount}</span>
                          </div>
                        )}
                      </div>

                      {filteredCategories.length === 0 && (
                        <div className="px-2 py-3 text-[11px] text-muted-foreground">Ничего не найдено</div>
                      )}

                      {filteredCategories.map((cat) => {
                        const forceOpen = !!tplQuery;
                        const isOpen = forceOpen || (openCats[cat.title] ?? false);
                        return (
                          <Collapsible
                            key={cat.title}
                            open={isOpen}
                            onOpenChange={(v) => setOpenCats((s) => ({ ...s, [cat.title]: v }))}
                          >
                            <CollapsibleTrigger asChild>
                              <button
                                type="button"
                                className="group flex w-full items-center gap-1.5 px-2 py-1 rounded-md text-[11px] uppercase tracking-wide text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                              >
                                <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
                                <span className="flex-1 text-left truncate">{cat.title}</span>
                                <span className="tabular-nums">{cat.items.length}</span>
                              </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                              {cat.items.map((t) => {
                                const active = isActive(t.url);
                                return (
                                  <SidebarMenuItem key={t.url}>
                                    <SidebarMenuButton asChild isActive={active} size="sm" tooltip={t.title}>
                                      <NavLink
                                        to={t.url}
                                        className={cn(
                                          "group flex items-center gap-2 rounded-md text-sm transition-all duration-200",
                                          "hover:bg-muted/60 hover:translate-x-0.5",
                                          active && "font-medium bg-muted/70 shadow-[inset_2px_0_0_hsl(var(--accent))]"
                                        )}
                                      >
                                        <FileText className={cn("h-3.5 w-3.5", active && "text-accent")} />
                                        <span className="truncate">{t.title}</span>
                                      </NavLink>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                );
                              })}
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {postItems.map(renderItem)}
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
