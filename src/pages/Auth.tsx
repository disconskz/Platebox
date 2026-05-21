import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User as UserIcon,
  Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const signInSchema = z.object({
  email: z.string().trim().email("Неверный email").max(255),
  password: z.string().min(6, "Минимум 6 символов").max(72),
});

const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Укажите имя").max(100),
  company: z.string().trim().max(150).optional(),
  email: z.string().trim().email("Неверный email").max(255),
  password: z.string().min(6, "Минимум 6 символов").max(72),
});

const AuthPage = () => {
  const { user, loading, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/app";
  // Only allow internal paths to prevent open-redirect
  const redirectTo = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/app";
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");

  const [suName, setSuName] = useState("");
  const [suCompany, setSuCompany] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");

  const [siErrors, setSiErrors] = useState<Record<string, string>>({});
  const [suErrors, setSuErrors] = useState<Record<string, string>>({});
  const [showSiPwd, setShowSiPwd] = useState(false);
  const [showSuPwd, setShowSuPwd] = useState(false);

  useEffect(() => {
    document.title = tab === "signup" ? "Регистрация — Platebox" : "Вход — Platebox";
  }, [tab]);

  if (!loading && user) return <Navigate to={redirectTo} replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiErrors({});
    const parsed = signInSchema.safeParse({ email: siEmail, password: siPassword });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] = issue.message;
      setSiErrors(errs);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setBusy(false);
    if (error) {
      const msg = error.message === "Invalid login credentials" ? "Неверный email или пароль" : error.message;
      setSiErrors({ form: msg });
      toast.error(msg);
      return;
    }
    await refreshSession();
    toast.success("Добро пожаловать!");
    navigate(redirectTo, { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuErrors({});
    const parsed = signUpSchema.safeParse({
      full_name: suName,
      company: suCompany,
      email: suEmail,
      password: suPassword,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] = issue.message;
      setSuErrors(errs);
      return;
    }
    setBusy(true);
    const redirectUrl = `${window.location.origin}${redirectTo}`;
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: parsed.data.full_name, company: parsed.data.company || "" },
      },
    });
    setBusy(false);
    if (error) {
      const msg = error.message.includes("already") ? "Этот email уже зарегистрирован" : error.message;
      setSuErrors({ form: msg });
      toast.error(msg);
      return;
    }
    // Если включено email-подтверждение, сессии в ответе не будет —
    // в этом случае не редиректим в защищённую зону, а просим подтвердить email.
    if (!data.session) {
      toast.success("Аккаунт создан. Подтвердите email — мы отправили письмо.");
      setTab("signin");
      setSiEmail(parsed.data.email);
      setSuPassword("");
      return;
    }
    await refreshSession();
    toast.success("Аккаунт создан!");
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* Header — same as Landing */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md safe-top">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-3 sm:px-8 sm:py-3.5">
          <Link to="/" className="flex items-center gap-3">
            <span className="font-mono text-[15px] font-semibold leading-none tracking-tight">platebox</span>
            <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/70" />
              v.1.0 · ALM·KZ
            </span>
          </Link>
          <Link to="/">
            <Button
              size="sm"
              variant="outline"
              className="rounded-none font-mono text-[12px] tracking-wide gap-1.5 border-border bg-transparent"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> На главную
            </Button>
          </Link>
        </div>
      </header>

      {/* Editorial split */}
      <main className="flex-1 grid lg:grid-cols-12 border-b border-border">
        {/* Left: masthead */}
        <aside className="hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between border-r border-border p-10 xl:p-14 bg-background relative overflow-hidden">
          <div
            className="absolute inset-0 -z-10 opacity-[0.04]"
            style={{
              backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="tabular-nums">№ 01</span>
            <span className="h-px w-8 bg-border" />
            <span>{tab === "signin" ? "Вход в систему" : "Создание аккаунта"}</span>
          </div>

          <div className="max-w-xl space-y-8 py-12">
            <h1 className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-tight">
              {tab === "signin" ? (
                <>С возвращением<span className="text-primary">.</span></>
              ) : (
                <>Старт за минуту<span className="text-primary">.</span></>
              )}
            </h1>
            <p className="font-mono text-[13px] leading-relaxed text-muted-foreground max-w-md">
              {tab === "signin"
                ? "Войдите, чтобы продолжить расчёты, шаблоны и КП."
                : "Зарегистрируйтесь — справочник, шаблоны и история уже ждут вас."}
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 pt-6 border-t border-border">
              {[
                { k: "01", t: "Спуск полос", d: "Авто-раскладка SRA3 / B2 / SM-52" },
                { k: "02", t: "Себестоимость", d: "Бумага, печать, постпечать — одной таблицей" },
                { k: "03", t: "КП в один клик", d: "PDF и XLSX с маржой и сроком" },
                { k: "04", t: "Плата AI", d: "Пошаговый расчёт с подсказками" },
              ].map((f) => (
                <li key={f.k} className="space-y-1">
                  <div className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    <span className="tabular-nums text-foreground/40">{f.k}</span>
                    <span className="text-foreground">{f.t}</span>
                  </div>
                  <p className="text-[13px] text-muted-foreground leading-snug">{f.d}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>© {new Date().getFullYear()} Platebox · Almaty</span>
            <span className="tabular-nums">v.1.0</span>
          </div>
        </aside>

        {/* Right: form */}
        <section className="lg:col-span-6 xl:col-span-5 flex flex-col">
          <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
            <div className="w-full max-w-md">
              {/* Mobile eyebrow */}
              <div className="lg:hidden mb-8 space-y-3">
                <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span className="tabular-nums">№ 01</span>
                  <span className="h-px w-8 bg-border" />
                  <span>{tab === "signin" ? "Вход" : "Регистрация"}</span>
                </div>
                <h1 className="font-serif text-4xl leading-[0.95] tracking-tight">
                  {tab === "signin" ? (
                    <>С возвращением<span className="text-primary">.</span></>
                  ) : (
                    <>Старт за минуту<span className="text-primary">.</span></>
                  )}
                </h1>
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
                <TabsList className="grid w-full grid-cols-2 rounded-none border border-border bg-transparent p-0 h-auto">
                  <TabsTrigger
                    value="signin"
                    className="rounded-none border-r border-border font-mono text-[12px] uppercase tracking-[0.14em] data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-none py-3"
                  >
                    Вход
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    className="rounded-none font-mono text-[12px] uppercase tracking-[0.14em] data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-none py-3"
                  >
                    Регистрация
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-5 pt-8">
                    <FieldWithIcon icon={Mail} label="Email" htmlFor="si-email">
                      <Input id="si-email" type="email" autoComplete="email" required
                        placeholder="you@company.com"
                        className={`pl-10 h-12 rounded-none border-border bg-transparent font-mono text-[13px] ${siErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        value={siEmail} onChange={(e) => setSiEmail(e.target.value)} />
                      {siErrors.email && <p className="text-xs text-destructive mt-1">{siErrors.email}</p>}
                    </FieldWithIcon>
                    <FieldWithIcon icon={Lock} label="Пароль" htmlFor="si-password">
                      <Input id="si-password" type={showSiPwd ? "text" : "password"} autoComplete="current-password" required
                        placeholder="••••••••"
                        className={`pl-10 pr-10 h-12 rounded-none border-border bg-transparent font-mono text-[13px] ${siErrors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        value={siPassword} onChange={(e) => setSiPassword(e.target.value)} />
                      <PwdToggle shown={showSiPwd} onToggle={() => setShowSiPwd((s) => !s)} />
                      {siErrors.password && <p className="text-xs text-destructive mt-1">{siErrors.password}</p>}
                    </FieldWithIcon>
                    {siErrors.form && <p className="text-xs text-destructive">{siErrors.form}</p>}
                    <Button type="submit" className="w-full h-12 rounded-none font-mono text-[12px] uppercase tracking-[0.14em] gap-2" disabled={busy}>
                      {busy ? "Входим…" : <>Войти <ArrowRight className="h-3.5 w-3.5" /></>}
                    </Button>
                    <p className="text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground pt-1">
                      Нет аккаунта?{" "}
                      <button type="button" onClick={() => setTab("signup")} className="text-foreground underline underline-offset-4 hover:text-primary transition-colors">
                        Создать
                      </button>
                    </p>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-5 pt-8">
                    <FieldWithIcon icon={UserIcon} label="Имя" htmlFor="su-name">
                      <Input id="su-name" required placeholder="Айгерим"
                        className={`pl-10 h-12 rounded-none border-border bg-transparent font-mono text-[13px] ${suErrors.full_name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        value={suName} onChange={(e) => setSuName(e.target.value)} />
                      {suErrors.full_name && <p className="text-xs text-destructive mt-1">{suErrors.full_name}</p>}
                    </FieldWithIcon>
                    <FieldWithIcon icon={Building2} label="Компания" htmlFor="su-company" hint="необязательно">
                      <Input id="su-company" placeholder="Platebox"
                        className={`pl-10 h-12 rounded-none border-border bg-transparent font-mono text-[13px] ${suErrors.company ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        value={suCompany} onChange={(e) => setSuCompany(e.target.value)} />
                      {suErrors.company && <p className="text-xs text-destructive mt-1">{suErrors.company}</p>}
                    </FieldWithIcon>
                    <FieldWithIcon icon={Mail} label="Email" htmlFor="su-email">
                      <Input id="su-email" type="email" autoComplete="email" required
                        placeholder="you@company.com"
                        className={`pl-10 h-12 rounded-none border-border bg-transparent font-mono text-[13px] ${suErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
                      {suErrors.email && <p className="text-xs text-destructive mt-1">{suErrors.email}</p>}
                    </FieldWithIcon>
                    <FieldWithIcon icon={Lock} label="Пароль" htmlFor="su-password" hint="мин. 6 символов">
                      <Input id="su-password" type={showSuPwd ? "text" : "password"} autoComplete="new-password" required minLength={6}
                        placeholder="••••••••"
                        className={`pl-10 pr-10 h-12 rounded-none border-border bg-transparent font-mono text-[13px] ${suErrors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        value={suPassword} onChange={(e) => setSuPassword(e.target.value)} />
                      <PwdToggle shown={showSuPwd} onToggle={() => setShowSuPwd((s) => !s)} />
                      {suErrors.password && <p className="text-xs text-destructive mt-1">{suErrors.password}</p>}
                    </FieldWithIcon>
                    {suErrors.form && <p className="text-xs text-destructive">{suErrors.form}</p>}
                    <Button type="submit" className="w-full h-12 rounded-none font-mono text-[12px] uppercase tracking-[0.14em] gap-2" disabled={busy}>
                      {busy ? "Создаём…" : <>Создать аккаунт <ArrowRight className="h-3.5 w-3.5" /></>}
                    </Button>
                    <p className="text-center font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground pt-1">
                      Уже есть аккаунт?{" "}
                      <button type="button" onClick={() => setTab("signin")} className="text-foreground underline underline-offset-4 hover:text-primary transition-colors">
                        Войти
                      </button>
                    </p>
                    <p className="text-center text-[11px] text-muted-foreground/80 leading-relaxed pt-1">
                      Регистрируясь, вы соглашаетесь с условиями использования сервиса.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const FieldWithIcon = ({
  icon: Icon,
  label,
  htmlFor,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <div className="flex items-baseline justify-between">
      <Label htmlFor={htmlFor} className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</Label>
      {hint && <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">{hint}</span>}
    </div>
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
      {children}
    </div>
  </div>
);

const PwdToggle = ({ shown, onToggle }: { shown: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={shown ? "Скрыть пароль" : "Показать пароль"}
    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
  >
    {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </button>
);

export default AuthPage;