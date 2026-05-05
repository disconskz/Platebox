import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-aurora flex items-center justify-center px-4 py-10 safe-top safe-bottom">
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="mx-auto mb-6 ring-glow flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elevated animate-float-soft">
          <Compass className="h-7 w-7" />
        </div>
        <div className="font-serif text-6xl sm:text-7xl tracking-tight">404</div>
        <h1 className="mt-2 text-lg sm:text-xl font-semibold">Страница не найдена</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Адрес <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{location.pathname}</code> не существует или был перемещён.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
          <Link to="/app" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto"><ArrowLeft className="mr-2 h-4 w-4" /> В кабинет</Button>
          </Link>
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">На главную</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
