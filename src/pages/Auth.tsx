import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Calculator as CalcIcon, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    document.title = "Вход — Platebox";
  }, []);

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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> На главную
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elevated">
              <CalcIcon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">Platebox</CardTitle>
              <CardDescription>Калькулятор полиграфической продукции</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Вход</TabsTrigger>
                <TabsTrigger value="signup">Регистрация</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="si-email">Email</Label>
                    <Input id="si-email" type="email" autoComplete="email" required value={siEmail} onChange={(e) => setSiEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-password">Пароль</Label>
                    <Input id="si-password" type="password" autoComplete="current-password" required value={siPassword} onChange={(e) => setSiPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={busy}>
                    {busy ? "Входим…" : "Войти"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Имя</Label>
                    <Input id="su-name" required value={suName} onChange={(e) => setSuName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-company">Компания (необязательно)</Label>
                    <Input id="su-company" value={suCompany} onChange={(e) => setSuCompany(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input id="su-email" type="email" autoComplete="email" required value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-password">Пароль</Label>
                    <Input id="su-password" type="password" autoComplete="new-password" required minLength={6} value={suPassword} onChange={(e) => setSuPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={busy}>
                    {busy ? "Создаём…" : "Создать аккаунт"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AuthPage;