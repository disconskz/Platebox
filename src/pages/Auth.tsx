import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  Calculator as CalcIcon,
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User as UserIcon,
  Building2,
  Sparkles,
  Layers,
  Gauge,
  ShieldCheck,
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
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");

  const [suName, setSuName] = useState("");
  const [suCompany, setSuCompany] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");

  useEffect(() => {
    document.title = tab === "signup" ? "Регистрация — Platebox" : "Вход — Platebox";
  }, [tab]);

  if (!loading && user) return <Navigate to="/app" replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse({ email: siEmail, password: siPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Неверный email или пароль" : error.message);
      return;
    }
    toast.success("Добро пожаловать!");
    navigate("/app", { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse({
      full_name: suName,
      company: suCompany,
      email: suEmail,
      password: suPassword,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const redirectUrl = `${window.location.origin}/app`;
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: parsed.data.full_name, company: parsed.data.company || "" },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.message.includes("already") ? "Этот email уже зарегистрирован" : error.message
      );
      return;
    }
    toast.success("Аккаунт создан!");
    navigate("/app", { replace: true });
  };

  const [showSiPwd, setShowSiPwd] = useState(false);
  const [showSuPwd, setShowSuPwd] = useState(false);

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left: brand panel (desktop only) */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-10 text-primary-foreground">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-primary)" }} />
        <div className="absolute inset-0 -z-10 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          className="absolute -top-40 -right-40 h-[480px] w-[480px] rounded-full blur-3xl opacity-30"
          style={{ background: "hsl(var(--accent))" }}
        />

        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> На главную
          </Link>
        </div>

        <div className="relative max-w-md space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-foreground/10 backdrop-blur ring-1 ring-primary-foreground/20">
              <CalcIcon className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Platebox</span>
          </div>

          <div className="space-y-3">
            <span className="eyebrow text-primary-foreground/60">Профессиональная типография</span>
            <h1 className="font-serif text-5xl leading-[1.05]">
              Точные расчёты <br />за&nbsp;секунды.
            </h1>
            <p className="text-primary-foreground/70 text-base leading-relaxed max-w-sm">
              Себестоимость, наценка и НДС — на одном экране. От листовки до календаря.
            </p>
          </div>

          <ul className="space-y-3 pt-2">
            {[
              { icon: Layers, text: "22 вида продукции и 100+ материалов" },
              { icon: Gauge, text: "Авто-раскладка и подбор приладки" },
              { icon: ShieldCheck, text: "Шаблоны, история и КП в один клик" },
            ].map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-primary-foreground/85">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
                  <f.icon className="h-4 w-4" />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-primary-foreground/50">
          © {new Date().getFullYear()} Platebox · Almaty
        </div>
      </aside>

      {/* Right: form */}
      <main className="relative flex flex-col">
        <header className="lg:hidden px-4 pt-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> На главную
          </Link>
        </header>

        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="flex flex-col items-center text-center mb-6 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elevated mb-3">
                <CalcIcon className="h-6 w-6" />
              </div>
              <h1 className="font-serif text-2xl">Platebox</h1>
              <p className="text-sm text-muted-foreground mt-1">Калькулятор полиграфии</p>
            </div>

            <div className="rounded-2xl border bg-card shadow-elevated p-6 sm:p-8">
              <div className="mb-6 hidden lg:block">
                <span className="eyebrow">Личный кабинет</span>
                <h2 className="mt-1 font-serif text-3xl">
                  {tab === "signin" ? "С возвращением" : "Создать аккаунт"}
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {tab === "signin"
                    ? "Войдите, чтобы продолжить расчёты."
                    : "Зарегистрируйтесь — это займёт меньше минуты."}
                </p>
              </div>

              <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Вход</TabsTrigger>
                  <TabsTrigger value="signup">Регистрация</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4 pt-5">
                    <FieldWithIcon icon={Mail} label="Email" htmlFor="si-email">
                      <Input id="si-email" type="email" autoComplete="email" required
                        placeholder="you@company.com"
                        className="pl-10 h-11"
                        value={siEmail} onChange={(e) => setSiEmail(e.target.value)} />
                    </FieldWithIcon>
                    <FieldWithIcon icon={Lock} label="Пароль" htmlFor="si-password">
                      <Input id="si-password" type={showSiPwd ? "text" : "password"} autoComplete="current-password" required
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-11"
                        value={siPassword} onChange={(e) => setSiPassword(e.target.value)} />
                      <PwdToggle shown={showSiPwd} onToggle={() => setShowSiPwd((s) => !s)} />
                    </FieldWithIcon>
                    <Button type="submit" className="w-full h-11 text-base" disabled={busy}>
                      {busy ? "Входим…" : "Войти"}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground pt-1">
                      Нет аккаунта?{" "}
                      <button type="button" onClick={() => setTab("signup")} className="text-foreground font-medium hover:text-accent transition-colors">
                        Создать
                      </button>
                    </p>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4 pt-5">
                    <FieldWithIcon icon={UserIcon} label="Имя" htmlFor="su-name">
                      <Input id="su-name" required placeholder="Айгерим"
                        className="pl-10 h-11"
                        value={suName} onChange={(e) => setSuName(e.target.value)} />
                    </FieldWithIcon>
                    <FieldWithIcon icon={Building2} label="Компания" htmlFor="su-company" hint="необязательно">
                      <Input id="su-company" placeholder="Platebox"
                        className="pl-10 h-11"
                        value={suCompany} onChange={(e) => setSuCompany(e.target.value)} />
                    </FieldWithIcon>
                    <FieldWithIcon icon={Mail} label="Email" htmlFor="su-email">
                      <Input id="su-email" type="email" autoComplete="email" required
                        placeholder="you@company.com"
                        className="pl-10 h-11"
                        value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
                    </FieldWithIcon>
                    <FieldWithIcon icon={Lock} label="Пароль" htmlFor="su-password" hint="мин. 6 символов">
                      <Input id="su-password" type={showSuPwd ? "text" : "password"} autoComplete="new-password" required minLength={6}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-11"
                        value={suPassword} onChange={(e) => setSuPassword(e.target.value)} />
                      <PwdToggle shown={showSuPwd} onToggle={() => setShowSuPwd((s) => !s)} />
                    </FieldWithIcon>
                    <Button type="submit" className="w-full h-11 text-base" disabled={busy}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {busy ? "Создаём…" : "Создать аккаунт"}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground pt-1">
                      Уже есть аккаунт?{" "}
                      <button type="button" onClick={() => setTab("signin")} className="text-foreground font-medium hover:text-accent transition-colors">
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
        </div>
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
  <div className="space-y-1.5">
    <div className="flex items-baseline justify-between">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-foreground">{label}</Label>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      {children}
    </div>
  </div>
);

const PwdToggle = ({ shown, onToggle }: { shown: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={shown ? "Скрыть пароль" : "Показать пароль"}
    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
  >
    {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </button>
);
};

export default AuthPage;