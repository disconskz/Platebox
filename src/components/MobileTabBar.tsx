import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, Calculator as CalcIcon, BarChart3, Database, LogOut, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { to: "/app",        label: "Расчёты",    icon: LayoutGrid },
  { to: "/calculator", label: "Расчёт",     icon: CalcIcon },
  { to: "/analytics",  label: "Аналитика",  icon: BarChart3 },
  { to: "/references", label: "НСИ",        icon: Database },
  { to: "/knowledge",  label: "Помощь",     icon: BookOpen },
];

export const MobileTabBar = () => {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  return (
    <nav className="fixed-bottom md:hidden" aria-label="Основная навигация">
      <ul className="grid grid-cols-6 px-0.5 pt-1">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== "/app" && pathname.startsWith(to));
          return (
            <li key={to}>
              <Link
                to={to}
                aria-label={label}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 px-0.5 tap-target rounded-md transition-all duration-200 active:scale-[0.92]",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  active && "text-accent scale-110 drop-shadow-[0_2px_6px_hsl(var(--accent)/0.45)]"
                )} />
                <span className="text-[10px] leading-none truncate max-w-full">{label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => signOut()}
            aria-label="Выйти"
            className="flex w-full flex-col items-center justify-center gap-0.5 py-2 px-0.5 tap-target rounded-md text-muted-foreground"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[10px] leading-none">Выход</span>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default MobileTabBar;