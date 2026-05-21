import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Plus, Search, Pin, PinOff, Archive, ArchiveRestore, Pencil, Trash2,
  MoreHorizontal, MessageSquare, Sparkles,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarFooter,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuAction,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { type AiThread, archivedThreads, groupThreads, useAiThreads } from "@/hooks/useAiThreads";
import aiLogo from "@/assets/ai-calc-logo.png";

function relTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const day = 24 * 60 * 60 * 1000;
  if (now.getTime() - d.getTime() < 6 * day) return d.toLocaleDateString("ru-RU", { weekday: "short" });
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

export default function AiThreadsSidebar() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { threads, loading, create, rename, togglePin, toggleArchive, remove } = useAiThreads();
  const [query, setQuery] = useState("");
  const [renaming, setRenaming] = useState<AiThread | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);

  const groups = useMemo(() => groupThreads(threads, query), [threads, query]);
  const archive = useMemo(() => archivedThreads(threads), [threads]);

  const handleCreate = async () => {
    const id = await create();
    if (id) navigate(`/ai-calc/${id}`);
  };

  const openRename = (t: AiThread) => { setRenaming(t); setRenameValue(t.title); };
  const saveRename = async () => {
    if (renaming) await rename(renaming.id, renameValue);
    setRenaming(null);
  };

  const handleDelete = async (t: AiThread) => {
    if (!confirm(`Удалить разговор «${t.title}»?`)) return;
    await remove(t.id);
    if (threadId === t.id) navigate("/ai-calc");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-2">
        <Link to="/ai-calc" className="flex items-center gap-2 px-2 py-1.5">
          <img src={aiLogo} alt="" width={24} height={24} className="h-6 w-6 shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight truncate">ИИ-расчёт</p>
              <p className="text-[10px] text-muted-foreground leading-tight truncate">Platebox</p>
            </div>
          )}
        </Link>
        <Button onClick={handleCreate} size="sm" className="gap-1.5 w-full justify-start">
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate">Новый разговор</span>}
        </Button>
        {!collapsed && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск…"
              className="h-8 pl-7 text-xs"
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {loading && !threads.length ? (
          <div className="px-3 py-6 text-xs text-muted-foreground">Загрузка…</div>
        ) : groups.length === 0 ? (
          !collapsed && (
            <div className="px-3 py-8 text-center">
              <Sparkles className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {query ? "Ничего не найдено" : "Начните первый разговор"}
              </p>
            </div>
          )
        ) : (
          groups.map((g) => (
            <SidebarGroup key={g.key}>
              {!collapsed && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider">{g.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {g.items.map((t) => {
                    const active = t.id === threadId;
                    return (
                      <SidebarMenuItem key={t.id} className="animate-fade-in">
                        <SidebarMenuButton asChild isActive={active} tooltip={collapsed ? t.title : undefined}>
                          <Link to={`/ai-calc/${t.id}`} className="group/row">
                            {t.is_pinned ? (
                              <Pin className="h-3.5 w-3.5 shrink-0 text-primary fill-primary" />
                            ) : (
                              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span className="flex-1 truncate text-xs">{t.title}</span>
                            {!collapsed && (
                              <span className="text-[10px] text-muted-foreground/70 shrink-0 ml-1">{relTime(t.updated_at)}</span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                        {!collapsed && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <SidebarMenuAction showOnHover aria-label="Действия">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </SidebarMenuAction>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="right">
                              <DropdownMenuItem onClick={() => void togglePin(t.id)}>
                                {t.is_pinned ? <PinOff className="h-3.5 w-3.5 mr-2" /> : <Pin className="h-3.5 w-3.5 mr-2" />}
                                {t.is_pinned ? "Открепить" : "Закрепить"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openRename(t)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> Переименовать
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void toggleArchive(t.id)}>
                                <Archive className="h-3.5 w-3.5 mr-2" /> В архив
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => void handleDelete(t)}>
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      {!collapsed && archive.length > 0 && (
        <SidebarFooter>
          <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
                <Archive className="h-3.5 w-3.5" /> Архив ({archive.length})
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Архивные разговоры</DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto space-y-1">
                {archive.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-md border p-2 hover:bg-muted/40">
                    <Link to={`/ai-calc/${t.id}`} onClick={() => setArchiveOpen(false)} className="flex-1 min-w-0">
                      <p className="text-sm truncate">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground">{relTime(t.updated_at)}</p>
                    </Link>
                    <Button size="icon" variant="ghost" onClick={() => void toggleArchive(t.id)} title="Восстановить">
                      <ArchiveRestore className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => void handleDelete(t)} title="Удалить">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </SidebarFooter>
      )}

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Переименовать</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void saveRename(); }}
            autoFocus
            maxLength={80}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(null)}>Отмена</Button>
            <Button onClick={() => void saveRename()}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}