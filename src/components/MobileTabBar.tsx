import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, Calculator, BarChart3, Database, LogOut, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { to: "/app",        label: "Расчёты",    icon: LayoutGrid },
  { to: "/calculator", label: "Калькулятор", icon: Calculator },
  { to: "/analytics",  label: "Аналитика",  icon: BarChart3 },
  { to: "/references", label: "Справочники", icon: Database },
  { to: "/knowledge",  label: "База знаний", icon: BookOpen },
];

export const MobileTabBar = () => {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  return (
    <nav className="fixed-bottom md:hidden" aria-label="Основная навигация">
      <ul className="grid grid-cols-6 px-1 pt-1">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== "/app" && pathname.startsWith(to));
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 tap-target rounded-md",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-accent")} />
                <span className="text-[10px] leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => signOut()}
            className="flex w-full flex-col items-center justify-center gap-0.5 py-2 tap-target rounded-md text-muted-foreground"
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