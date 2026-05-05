import { Link } from "react-router-dom";
import {
  Calculator as CalcIcon,
  Sparkles,
  FileSpreadsheet,
  TrendingUp,
  Layers,
  Bookmark,
  History,
  Smartphone,
  Building2,
  Palette,
  Briefcase,
  ArrowRight,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

const features = [
  { icon: Layers, title: "Спуск полос", text: "Автоматическая раскладка изделия на лист с учётом машины и обрезки." },
  { icon: CalcIcon, title: "Форматы A1–A5", text: "Поддержка всех стандартных и пользовательских форматов." },
  { icon: Bookmark, title: "Шаблоны заказов", text: "Сохраняйте типовые тиражи и пересчитывайте в один клик." },
  { icon: FileSpreadsheet, title: "Экспорт в Excel", text: "Готовая спецификация и КП для клиента." },
  { icon: TrendingUp, title: "Аналитика продаж", text: "Выручка, прибыль, разбивка по продукции и динамика." },
  { icon: History, title: "История правок", text: "Все ручные корректировки цен фиксируются с пояснениями." },
];

const steps = [
  { n: "1", title: "Заполните параметры", text: "Формат, тираж, бумага, красочность, постпечать." },
  { n: "2", title: "Получите расчёт", text: "Спуск полос, себестоимость и цена продажи — мгновенно." },
  { n: "3", title: "Отправьте КП клиенту", text: "Готовое коммерческое предложение в один клик." },
  { n: "4", title: "Анализируйте результат", text: "Маржа, объёмы и популярные позиции на дашборде." },
];

const audience = [
  { icon: Building2, title: "Типографии", text: "Просчёты офсетных и цифровых тиражей за минуты." },
  { icon: Palette, title: "Дизайн-студии", text: "Цена в КП — без звонка в производство." },
  { icon: Briefcase, title: "Менеджеры по печати", text: "История клиентов, шаблоны, аналитика — в одном окне." },
];

const Landing = () => {
  const { user } = useAuth();
  useEffect(() => {
    document.title = "МАТ-Полиграф — калькулятор полиграфической продукции";
  }, []);

  const ctaTo = user ? "/app" : "/auth";
  const ctaText = user ? "Перейти в приложение" : "Начать бесплатно";

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 glass">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elevated">
              <CalcIcon className="h-5 w-5" />
            </div>
            <span className="font-semibold tracking-tight">МАТ-Полиграф</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#how" className="hover:text-foreground">Как работает</a>
            <a href="#features" className="hover:text-foreground">Возможности</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/app"><Button size="sm">В приложение</Button></Link>
            ) : (
              <>
                <Link to="/auth" className="hidden sm:block"><Button size="sm" variant="outline">Войти</Button></Link>
                <Link to="/auth"><Button size="sm">Начать</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Калькулятор полиграфии нового поколения
          </div>
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
            Просчёт тиража —<br />за&nbsp;минуты, а не часы
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Спуск полос, себестоимость, КП и аналитика — в одном инструменте для типографий и дизайн-студий.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to={ctaTo}>
              <Button size="lg" className="gap-2">{ctaText}<ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <a href="#how">
              <Button size="lg" variant="outline">Как это работает</Button>
            </a>
          </div>
          <p className="text-xs text-muted-foreground pt-2">Без установки · работает в браузере и на телефоне</p>
        </div>

        {/* Hero preview card */}
        <div className="mt-14 mx-auto max-w-4xl">
          <Card className="overflow-hidden shadow-elevated">
            <CardContent className="p-0">
              <div className="grid sm:grid-cols-3 gap-px bg-border">
                {[
                  { label: "Тираж", value: "5 000" },
                  { label: "Себестоимость", value: "12 480 ₽" },
                  { label: "Цена продажи", value: "16 224 ₽" },
                ].map((m) => (
                  <div key={m.label} className="bg-card p-6 text-center">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{m.label}</div>
                    <div className="mt-2 text-2xl font-semibold tabular-nums">{m.value}</div>
                  </div>
                ))}
              </div>
              <div className="p-6 space-y-3 bg-card">
                {[
                  "Листовка А5, бумага 130 г/м², 4+4",
                  "Раскладка 8 шт. на SRA3 — 625 листов",
                  "Постпечать: фальцовка, биговка",
                ].map((line) => (
                  <div key={line} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" /> {line}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Как это работает</h2>
          <p className="mt-3 text-muted-foreground">Четыре шага от заявки до отправки КП</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <Card key={s.n}>
              <CardContent className="p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {s.n}
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Всё, что нужно для расчёта</h2>
          <p className="mt-3 text-muted-foreground">Один инструмент вместо Excel, калькулятора и блокнота</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Audience */}
      <section className="container mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Для кого</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 max-w-4xl mx-auto">
          {audience.map((a) => (
            <Card key={a.title}>
              <CardContent className="p-6 space-y-3 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <a.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-sm text-muted-foreground">{a.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto px-4 py-16 sm:py-24 max-w-3xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Частые вопросы</h2>
        </div>
        <Card>
          <CardContent className="p-2 sm:p-4">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="1">
                <AccordionTrigger>Нужно ли что-то устанавливать?</AccordionTrigger>
                <AccordionContent>Нет. Сервис работает в браузере на компьютере, планшете и телефоне.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="2">
                <AccordionTrigger>Какие машины поддерживаются?</AccordionTrigger>
                <AccordionContent>Офсетные GTO 52, SM-52, SM-74 и любые другие — добавляются в справочнике оборудования с собственной стоимостью прогона.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="3">
                <AccordionTrigger>Можно ли работать с телефона?</AccordionTrigger>
                <AccordionContent>Да, интерфейс полностью адаптирован под мобильные устройства — можно делать просчёт прямо у клиента.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="4">
                <AccordionTrigger>Сохраняются ли мои расчёты?</AccordionTrigger>
                <AccordionContent>Да, все расчёты привязаны к вашему аккаунту, доступны в истории и могут быть превращены в шаблоны.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="5">
                <AccordionTrigger>Сколько это стоит?</AccordionTrigger>
                <AccordionContent>На старте — бесплатно. Регистрация занимает меньше минуты.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="overflow-hidden">
          <CardContent className="p-10 sm:p-16 text-center space-y-6">
            <Smartphone className="h-10 w-10 mx-auto text-primary" />
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Начните считать за 2 минуты</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Создайте аккаунт и сделайте первый расчёт прямо сейчас.
            </p>
            <div className="flex justify-center">
              <Link to={ctaTo}>
                <Button size="lg" className="gap-2">{ctaText}<ArrowRight className="h-4 w-4" /></Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t">
        <div className="container mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} МАТ-Полиграф</div>
          <div className="flex gap-4">
            <a href="#how" className="hover:text-foreground">Как работает</a>
            <a href="#features" className="hover:text-foreground">Возможности</a>
            <Link to="/auth" className="hover:text-foreground">Войти</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;