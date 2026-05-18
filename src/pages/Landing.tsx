import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowRight, Menu, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";

const nav = [
  { href: "#work",    label: "Возможности" },
  { href: "#process", label: "Процесс" },
  { href: "#numbers", label: "Цифры" },
  { href: "#faq",     label: "FAQ" },
];

const capabilities = [
  { k: "01", t: "Спуск полос",            d: "Автоматическая раскладка изделия на лист — учёт машины, зазоров, обрезки.", tags: ["SRA3", "B2", "SM-52"] },
  { k: "02", t: "Себестоимость",          d: "Бумага, краска, приладка, постпечать, упаковка — одной таблицей.",          tags: ["BOM", "₸/тираж"] },
  { k: "03", t: "Коммерческое предложение", d: "Готовый PDF и Excel — с разбивкой по статьям, маржой и сроком.",          tags: ["PDF", "XLSX"] },
  { k: "04", t: "Шаблоны заказов",        d: "Типовые тиражи и рецепты — пересчитать в один клик.",                       tags: ["Presets"] },
  { k: "05", t: "Аналитика продаж",       d: "Выручка, прибыль и популярная продукция — живой дашборд.",                  tags: ["Margin", "GMV"] },
  { k: "06", t: "История правок",         d: "Каждая ручная корректировка цены — с автором и причиной.",                  tags: ["Audit"] },
];

const steps = [
  { k: "I",   t: "Параметры",   d: "Формат, тираж, бумага, красочность, постпечать." },
  { k: "II",  t: "Расчёт",      d: "Спуск, себестоимость, цена — мгновенно." },
  { k: "III", t: "КП клиенту",  d: "Готовое коммерческое предложение в один клик." },
  { k: "IV",  t: "Аналитика",   d: "Маржа и динамика заказов на дашборде." },
];

const stats = [
  { v: "×12",       l: "быстрее, чем в Excel" },
  { v: "± 0,5 %",   l: "точность спуска" },
  { v: "A1 → A7",   l: "поддерживаемые форматы" },
  { v: "1 клик",    l: "до готового КП в ₸" },
];

const Landing = () => {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { document.title = "Platebox — калькулятор полиграфии: спуск, себестоимость, КП"; }, []);
  const ctaTo = user ? "/app" : "/auth";
  const ctaText = user ? "Открыть приложение" : "Начать просчёт";

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 md:pb-0 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md safe-top">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-3 sm:px-8 sm:py-3.5">
          <Link to="/" className="flex items-center gap-3">
            <span className="font-mono text-[15px] font-semibold leading-none tracking-tight">platebox</span>
            <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/70" />
              v.1.0 · ALM·KZ
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
            {nav.map((n, i) => (
              <a key={n.href} href={n.href} className="hover:text-foreground transition-colors">
                <span className="text-foreground/40 mr-1.5 tabular-nums">{String(i + 1).padStart(2, "0")}</span>{n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/app"><Button size="sm" className="rounded-none font-mono text-[12px] tracking-wide">В приложение</Button></Link>
            ) : (
              <>
                <Link to="/auth" className="hidden sm:inline font-mono text-[12px] tracking-wide hover:text-foreground text-muted-foreground px-2">Войти</Link>
                <Link to="/auth" className="hidden sm:inline-flex">
                  <Button size="sm" className="rounded-none font-mono text-[12px] tracking-wide gap-1.5">
                    Начать <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}
            <button
              type="button"
              className="md:hidden tap-target -mr-2 inline-flex items-center justify-center text-foreground"
              aria-label="Меню"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-background safe-top safe-bottom flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-mono text-base font-semibold">platebox</span>
              <button className="tap-target" aria-label="Закрыть" onClick={() => setMenuOpen(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-col px-4 py-6 gap-1">
              {nav.map((n, i) => (
                <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)}
                   className="flex items-baseline gap-3 py-3 border-b border-border">
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-mono text-xl tracking-tight">{n.label}</span>
                </a>
              ))}
            </nav>
            <div className="mt-auto p-4 grid gap-2">
              <Link to={ctaTo} onClick={() => setMenuOpen(false)}>
                <Button size="lg" className="w-full rounded-none h-12 font-mono tracking-wide">{ctaText}</Button>
              </Link>
              {!user && (
                <Link to="/auth" onClick={() => setMenuOpen(false)}>
                  <Button size="lg" variant="outline" className="w-full rounded-none h-12 border-border bg-transparent font-mono tracking-wide">Войти</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* HERO — magazine masthead + featured spec sheet */}
      <section className="relative border-b border-border">
        {/* Masthead meta strip */}
        <div className="mx-auto max-w-[1280px] px-4 sm:px-8 pt-6 sm:pt-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground border-b border-border pb-3">
            <span>Issue 01 / 2026</span>
            <span className="hidden sm:inline">·</span>
            <span>Print pricing engine</span>
            <span className="hidden sm:inline">·</span>
            <span>Almaty · Kazakhstan</span>
            <span className="ml-auto inline-flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
              service · online
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-[1280px] px-4 sm:px-8 pt-10 sm:pt-16 pb-12 sm:pb-20 grid gap-10 sm:gap-14 sm:grid-cols-12">
          {/* Featured headline (8 cols) */}
          <div className="sm:col-span-8">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              FEATURED · #01
            </div>
            <h1 className="mt-5 sm:mt-7 text-[32px] sm:text-[60px] leading-[1.05] sm:leading-[1.02] font-medium tracking-[-0.04em]">
              Просчёт тиража<br />
              как инженерная задача,<br />
              <span className="text-muted-foreground">а не как ритуал в Excel.</span>
            </h1>
            <div className="mt-6 sm:mt-8 grid sm:grid-cols-6 gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground border-t border-border pt-4">
              <div className="sm:col-span-2"><span className="text-foreground/40 mr-2">AUTH</span>защищённый кабинет</div>
              <div className="sm:col-span-2"><span className="text-foreground/40 mr-2">FX</span>цены в ₸</div>
              <div className="sm:col-span-2"><span className="text-foreground/40 mr-2">FMT</span>A1—A7, SRA3, B2</div>
            </div>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
              <Link to={ctaTo} className="sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto rounded-none gap-2 px-7 h-12 font-mono text-[13px] tracking-wide">
                  {ctaText} <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#process" className="sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-none border-border bg-transparent h-12 font-mono text-[13px] tracking-wide">
                  Как это работает
                </Button>
              </a>
            </div>
          </div>

          {/* Sidebar dek (4 cols) */}
          <aside className="sm:col-span-4 sm:border-l sm:border-border sm:pl-8 self-end space-y-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Издателю</div>
            <p className="text-[15px] leading-relaxed text-foreground/85">
              Platebox — тихий инструмент для типографий и дизайн-студий: спуск полос,
              себестоимость и КП в&nbsp;тенге, готовое за&nbsp;считанные минуты — без&nbsp;десяти открытых таблиц.
            </p>
            <ul className="space-y-2 text-[14px] text-foreground/80">
              {[
                "Прямой ввод тиража и формата",
                "Учёт реальной машины и зазоров",
                "Аудит каждой ручной правки",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 text-foreground/60" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* Spec sheet — like a printed price slip */}
        <div className="mx-auto max-w-[1280px] px-4 sm:px-8 pb-12 sm:pb-20">
          <div className="border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 sm:px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              <span><span className="text-foreground/40 mr-2">SPEC</span>order #PB-2026-0418</span>
              <span className="tabular-nums">18.05.2026 · 14:02</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border border-b border-border">
              {[
                { l: "Тираж",         v: "5 000",     u: "шт." },
                { l: "Раскладка",     v: "8-up SRA3", u: "625 листов" },
                { l: "Себестоимость", v: "412 600",   u: "₸ / тираж" },
                { l: "Цена клиенту",  v: "536 380",   u: "₸ / тираж" },
              ].map((m) => (
                <div key={m.l} className="px-4 py-5 sm:px-6 sm:py-7">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{m.l}</div>
                  <div className="mt-2 sm:mt-3 font-mono text-2xl sm:text-[34px] font-medium tabular-nums tracking-tight">{m.v}</div>
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground tabular-nums">{m.u}</div>
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-12 gap-3 sm:gap-6 px-4 sm:px-6 py-5 sm:py-6 text-sm">
              <div className="sm:col-span-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Спецификация</div>
              <ul className="sm:col-span-6 space-y-1.5 text-foreground/85">
                <li className="flex gap-3"><span className="font-mono text-muted-foreground tabular-nums w-6">01</span>Листовка А5, мелованная матовая, 130 г/м², 4+4</li>
                <li className="flex gap-3"><span className="font-mono text-muted-foreground tabular-nums w-6">02</span>Постпечать: фальцовка пополам + биговка</li>
                <li className="flex gap-3"><span className="font-mono text-muted-foreground tabular-nums w-6">03</span>Срок: 3 рабочих дня · машина SM-52</li>
              </ul>
              <div className="sm:col-span-3 sm:text-right space-y-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <div>margin <span className="text-foreground tabular-nums">30 %</span></div>
                <div>per sheet <span className="text-foreground tabular-nums">660 ₸</span></div>
                <div>per pcs <span className="text-foreground tabular-nums">107 ₸</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES — magazine grid */}
      <section id="work" className="border-b border-border">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-8 py-16 sm:py-28">
          <div className="grid sm:grid-cols-12 gap-6 sm:gap-10 mb-10 sm:mb-14">
            <div className="sm:col-span-5">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Section · 02 · Capabilities</div>
              <h2 className="mt-4 sm:mt-6 text-[28px] sm:text-[44px] leading-[1.05] font-medium tracking-[-0.035em]">
                Один тихий инструмент<br />вместо десяти таблиц.
              </h2>
            </div>
            <p className="sm:col-span-6 sm:col-start-7 text-[15px] sm:text-[17px] leading-relaxed text-muted-foreground self-end max-w-xl">
              Каждая функция доведена до состояния, в котором её не&nbsp;замечаешь —
              остаётся только результат и&nbsp;цена в&nbsp;тенге. Никаких ассистентов с восклицательными знаками.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-border">
            {capabilities.map((c) => (
              <article key={c.k} className="border-r border-b border-border p-5 sm:p-7 group hover:bg-muted/40 transition-colors">
                <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  <span className="tabular-nums">{c.k}</span>
                  <span>module</span>
                </div>
                <h3 className="mt-5 sm:mt-7 text-[20px] sm:text-[22px] tracking-tight">{c.t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{c.d}</p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {c.tags.map((t) => (
                    <span key={t} className="border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{t}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS — dark slate band */}
      <section id="process" className="border-b border-border bg-foreground text-background">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-8 py-16 sm:py-28">
          <div className="grid sm:grid-cols-12 gap-6 sm:gap-10">
            <div className="sm:col-span-5">
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-background/60">Section · 03 · Process</div>
              <h2 className="mt-4 sm:mt-6 text-[28px] sm:text-[44px] leading-[1.05] font-medium tracking-[-0.035em]">
                Четыре шага<br />от заявки до отправки КП.
              </h2>
            </div>
            <p className="sm:col-span-6 sm:col-start-7 text-[15px] sm:text-[17px] leading-relaxed text-background/65 self-end max-w-xl">
              Никаких мастеров и многошаговых форм. Параметры → расчёт → коммерческое → аналитика.
              На каждом шаге видно, откуда взялась цифра.
            </p>
          </div>

          <div className="mt-10 sm:mt-14 -mx-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:border sm:border-background/15 flex sm:block snap-x-mandatory overflow-x-auto no-scrollbar px-4 sm:px-0 gap-3 sm:gap-0">
            {steps.map((s, i) => (
              <div key={s.k} className={`snap-start shrink-0 w-[78%] sm:w-auto bg-foreground border border-background/15 sm:border-0 ${i > 0 ? "sm:border-l sm:border-background/15" : ""} p-6 sm:p-8 min-h-[220px] sm:min-h-[260px] flex flex-col`}>
                <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-background/55">
                  <span>step</span>
                  <span className="tabular-nums">{String(i + 1).padStart(2, "0")} / 04</span>
                </div>
                <div className="mt-6 font-mono text-[44px] sm:text-[56px] leading-none text-background/85 tracking-tight">{s.k}</div>
                <div className="mt-auto pt-6">
                  <div className="text-[17px] sm:text-[18px] font-medium tracking-tight">{s.t}</div>
                  <p className="mt-2 text-[13px] text-background/65">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS — index page */}
      <section id="numbers" className="border-b border-border">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-8 py-16 sm:py-28">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Section · 04 · Index</div>
              <h2 className="mt-4 text-[28px] sm:text-[40px] leading-[1.05] font-medium tracking-[-0.035em]">Цифры, на которые можно показать клиенту.</h2>
            </div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">данные за Q1 · 2026</div>
          </div>
          <div className="mt-8 sm:mt-12 grid grid-cols-2 sm:grid-cols-4 border-t border-l border-border">
            {stats.map((s, i) => (
              <div key={s.l} className="border-r border-b border-border bg-background p-5 sm:p-10">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">№ {String(i + 1).padStart(2, "0")}</div>
                <div className="mt-3 font-mono text-[34px] sm:text-[56px] font-medium tracking-tight tabular-nums">{s.v}</div>
                <div className="mt-2 text-[13px] text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING strip */}
      <section className="border-b border-border bg-secondary/60">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-8 py-12 sm:py-20 grid sm:grid-cols-12 gap-6 sm:gap-10 items-end">
          <div className="sm:col-span-7">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Section · 05 · Pricing</div>
            <h3 className="mt-3 sm:mt-4 text-[26px] sm:text-[40px] leading-[1.1] font-medium tracking-[-0.035em]">
              На&nbsp;старте — бесплатно. Без карты, без оплаты.
            </h3>
            <p className="mt-3 sm:mt-4 text-[15px] sm:text-[16px] leading-relaxed text-muted-foreground max-w-xl">
              Подключение типографии, импорт справочников и&nbsp;первые расчёты — бесплатно.
              Тарифы для команд — от&nbsp;<span className="text-foreground font-mono tabular-nums">14&nbsp;900&nbsp;₸</span>&nbsp;/&nbsp;мес.
            </p>
          </div>
          <div className="sm:col-span-5 flex sm:justify-end">
            <Link to={ctaTo} className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto rounded-none h-12 px-8 font-mono text-[13px] tracking-wide gap-2">
                {ctaText} <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-border">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-8 py-16 sm:py-28 grid sm:grid-cols-12 gap-6 sm:gap-10">
          <div className="sm:col-span-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Section · 06 · FAQ</div>
            <h2 className="mt-4 sm:mt-6 text-[26px] sm:text-[40px] leading-[1.05] font-medium tracking-[-0.035em]">Вопросы, которые задают чаще всего.</h2>
          </div>
          <div className="sm:col-span-8">
            <Accordion type="single" collapsible className="w-full border-t border-border">
              {[
                { q: "Нужно ли что-то устанавливать?", a: "Нет. Сервис работает в браузере на компьютере, планшете и телефоне." },
                { q: "В какой валюте идут расчёты?", a: "Все цены и сметы — только в казахстанских тенге (₸)." },
                { q: "Какие машины поддерживаются?", a: "Офсетные GTO 52, SM-52, SM-74 и любые другие — добавляются в справочнике оборудования с собственной стоимостью прогона." },
                { q: "Можно ли работать с телефона?", a: "Да, интерфейс полностью адаптирован под мобильные устройства — можно делать просчёт прямо у клиента." },
                { q: "Сохраняются ли мои расчёты?", a: "Да, все расчёты привязаны к вашему аккаунту, доступны в истории и могут быть превращены в шаблоны." },
              ].map((f, i) => (
                <AccordionItem key={i} value={`i-${i}`} className="border-b border-border">
                  <AccordionTrigger className="py-5 sm:py-6 text-left text-[15px] sm:text-[17px] font-medium hover:no-underline">
                    <span className="flex items-baseline gap-4 text-left">
                      <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                      <span>{f.q}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-[14px] sm:text-[15px] pb-6 pl-9">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-8 py-20 sm:py-32 text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Section · 07 · Start</div>
          <h2 className="mt-6 sm:mt-8 text-[34px] sm:text-[72px] font-medium tracking-[-0.045em] leading-[1.02]">
            Сделайте первый<br />расчёт сегодня.
          </h2>
          <div className="mt-8 sm:mt-12 flex justify-center">
            <Link to={ctaTo} className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto rounded-none h-14 px-10 font-mono text-[13px] tracking-wide gap-2">
                {ctaText} <ArrowUpRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-8 py-10 sm:py-14 grid sm:grid-cols-12 gap-6 sm:gap-8 text-[13px] text-background/65">
          <div className="sm:col-span-4">
            <div className="font-mono text-[15px] font-semibold text-background">platebox</div>
            <p className="mt-3 max-w-xs leading-relaxed">Калькулятор полиграфии для типографий и студий. Алматы, Казахстан. Цены — в&nbsp;тенге.</p>
          </div>
          <div className="grid grid-cols-2 gap-6 sm:contents">
            <div className="sm:col-span-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-background/45 mb-3">Продукт</div>
              <ul className="space-y-2">
                <li><a href="#work" className="hover:text-background">Возможности</a></li>
                <li><a href="#process" className="hover:text-background">Процесс</a></li>
                <li><a href="#numbers" className="hover:text-background">Цифры</a></li>
              </ul>
            </div>
            <div className="sm:col-span-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-background/45 mb-3">Аккаунт</div>
              <ul className="space-y-2">
                <li><Link to="/auth" className="hover:text-background">Войти</Link></li>
                <li><Link to="/auth" className="hover:text-background">Регистрация</Link></li>
              </ul>
            </div>
          </div>
          <div className="sm:col-span-4 sm:text-right self-end font-mono text-[11px] uppercase tracking-[0.16em] text-background/45">
            © {new Date().getFullYear()} · platebox · all rights reserved
          </div>
        </div>
      </footer>

      {!menuOpen && (
        <div className="fixed-bottom md:hidden px-4 pt-3">
          <Link to={ctaTo} className="block">
            <Button size="lg" className="w-full rounded-none h-12 gap-2 font-mono text-[13px] tracking-wide">
              {ctaText} <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default Landing;
