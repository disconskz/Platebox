import { Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/useAuth";

const nav = [
  { href: "#work",     label: "Возможности" },
  { href: "#process",  label: "Процесс" },
  { href: "#numbers",  label: "Цифры" },
  { href: "#faq",      label: "FAQ" },
];

const capabilities = [
  { k: "01", t: "Спуск полос", d: "Автоматическая раскладка изделия на лист с учётом машины, зазоров и обрезки." },
  { k: "02", t: "Себестоимость", d: "Бумага, краска, приладка, постпечать, упаковка — всё в одном расчёте." },
  { k: "03", t: "Коммерческое предложение", d: "Готовый PDF и Excel с разбивкой по статьям, маржой и сроком." },
  { k: "04", t: "Шаблоны заказов", d: "Типовые тиражи и рецепты, чтобы пересчитать в один клик." },
  { k: "05", t: "Аналитика продаж", d: "Выручка, прибыль и популярная продукция в живом дашборде." },
  { k: "06", t: "История правок", d: "Каждая ручная корректировка цены фиксируется с автором и причиной." },
];

const steps = [
  { k: "I",   t: "Параметры",  d: "Формат, тираж, бумага, красочность, постпечать." },
  { k: "II",  t: "Расчёт",     d: "Спуск полос, себестоимость и цена — мгновенно." },
  { k: "III", t: "КП клиенту", d: "Готовое коммерческое предложение в один клик." },
  { k: "IV",  t: "Аналитика",  d: "Маржа и динамика заказов на дашборде." },
];

const stats = [
  { v: "× 12",      l: "быстрее, чем в Excel" },
  { v: "± 0,5 %",   l: "точность спуска" },
  { v: "А1 — А7",   l: "поддерживаемые форматы" },
  { v: "1 клик",    l: "до готового КП в ₸" },
];

const Landing = () => {
  const { user } = useAuth();
  useEffect(() => { document.title = "Platebox — премиальный калькулятор полиграфии"; }, []);
  const ctaTo = user ? "/app" : "/auth";
  const ctaText = user ? "Открыть приложение" : "Начать просчёт";

  return (
    <div className="min-h-screen text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-6 py-4 sm:px-10">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-serif text-2xl leading-none">Platebox</span>
            <span className="eyebrow ml-2 hidden sm:inline">/ Almaty · KZ</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-foreground transition-colors">{n.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/app"><Button size="sm">В приложение</Button></Link>
            ) : (
              <>
                <Link to="/auth" className="hidden sm:inline text-sm hover:text-foreground text-muted-foreground">Войти</Link>
                <Link to="/auth"><Button size="sm" className="rounded-none">Начать <ArrowRight className="h-3.5 w-3.5" /></Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative border-b border-foreground/10">
        <div className="mx-auto max-w-[1320px] px-6 sm:px-10 pt-20 pb-24 sm:pt-32 sm:pb-40">
          <div className="flex items-center gap-3 eyebrow">
            <span className="h-px w-10 bg-foreground/40" />
            Premium print pricing · est. 2026
          </div>
          <h1 className="mt-10 max-w-5xl text-[44px] sm:text-[88px] leading-[0.95] font-medium tracking-[-0.04em]">
            Просчёт тиража —<br />
            <span className="font-serif italic font-normal">с премиальной точностью</span>,<br />
            а не интуицией.
          </h1>

          <div className="mt-12 grid gap-10 sm:grid-cols-12">
            <p className="sm:col-span-6 sm:col-start-7 text-lg text-muted-foreground max-w-xl">
              Platebox — тихий инструмент для типографий и дизайн-студий: спуск полос,
              себестоимость и коммерческое предложение в&nbsp;тенге, готовое за&nbsp;считанные минуты.
            </p>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Link to={ctaTo}>
              <Button size="lg" className="rounded-none gap-2 px-8 h-12 text-[15px]">
                {ctaText} <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#process">
              <Button size="lg" variant="outline" className="rounded-none border-foreground/20 bg-transparent h-12 text-[15px]">
                Как это работает
              </Button>
            </a>
          </div>
        </div>

        {/* Hero quote card — like a price slip */}
        <div className="mx-auto max-w-[1320px] px-6 sm:px-10 pb-20">
          <div className="border border-foreground/15 bg-card">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-foreground/10 border-b border-foreground/10">
              {[
                { l: "Тираж",          v: "5 000",        u: "шт." },
                { l: "Раскладка",      v: "8-up SRA3",    u: "625 листов" },
                { l: "Себестоимость",  v: "412 600",      u: "₸" },
                { l: "Цена клиенту",   v: "536 380",      u: "₸" },
              ].map((m) => (
                <div key={m.l} className="px-6 py-7">
                  <div className="eyebrow">{m.l}</div>
                  <div className="mt-3 font-serif text-4xl tabular-nums">{m.v}</div>
                  <div className="mt-1 text-xs text-muted-foreground tabular-nums">{m.u}</div>
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-12 gap-6 px-6 py-6 text-sm">
              <div className="sm:col-span-4 eyebrow">Спецификация</div>
              <ul className="sm:col-span-8 space-y-1.5 text-foreground/80">
                <li>— Листовка А5, мелованная 130 г/м², 4+4</li>
                <li>— Постпечать: фальцовка пополам, биговка</li>
                <li>— Срок: 3 рабочих дня · машина SM-52</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES — editorial list */}
      <section id="work" className="border-b border-foreground/10">
        <div className="mx-auto max-w-[1320px] px-6 sm:px-10 py-24 sm:py-32">
          <div className="grid sm:grid-cols-12 gap-10 mb-16">
            <div className="sm:col-span-4">
              <div className="eyebrow">Возможности</div>
              <h2 className="mt-6 text-4xl sm:text-5xl font-medium tracking-[-0.03em]">
                Один <span className="font-serif italic">тихий</span> инструмент
                <br />вместо десяти таблиц.
              </h2>
            </div>
            <p className="sm:col-span-7 sm:col-start-6 text-lg text-muted-foreground self-end max-w-xl">
              Каждая функция доведена до состояния, в котором её не&nbsp;замечаешь —
              остаётся только результат и&nbsp;цена в&nbsp;тенге.
            </p>
          </div>

          <ul className="border-t border-foreground/15">
            {capabilities.map((c) => (
              <li key={c.k} className="group grid grid-cols-12 gap-6 border-b border-foreground/15 py-8 hover:bg-foreground/[0.02] transition-colors">
                <div className="col-span-2 sm:col-span-1 font-mono text-xs pt-2 text-muted-foreground">{c.k}</div>
                <div className="col-span-10 sm:col-span-4 font-serif text-2xl sm:text-3xl">{c.t}</div>
                <div className="col-span-12 sm:col-span-6 sm:col-start-7 text-muted-foreground self-center">{c.d}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PROCESS */}
      <section id="process" className="border-b border-foreground/10 bg-foreground text-background">
        <div className="mx-auto max-w-[1320px] px-6 sm:px-10 py-24 sm:py-32">
          <div className="eyebrow text-background/60">Процесс</div>
          <h2 className="mt-6 max-w-3xl text-4xl sm:text-6xl font-medium tracking-[-0.03em]">
            Четыре шага от заявки <span className="font-serif italic">до отправки КП</span>.
          </h2>
          <div className="mt-16 grid gap-px bg-background/15 sm:grid-cols-4 border border-background/15">
            {steps.map((s) => (
              <div key={s.k} className="bg-foreground p-8 sm:p-10 min-h-[260px] flex flex-col">
                <div className="font-serif text-5xl text-background/70">{s.k}</div>
                <div className="mt-auto">
                  <div className="text-xl font-medium">{s.t}</div>
                  <p className="mt-2 text-sm text-background/60">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section id="numbers" className="border-b border-foreground/10">
        <div className="mx-auto max-w-[1320px] px-6 sm:px-10 py-24 sm:py-32">
          <div className="eyebrow">Цифры</div>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-px bg-foreground/15 border border-foreground/15">
            {stats.map((s) => (
              <div key={s.l} className="bg-background p-8 sm:p-12">
                <div className="font-serif text-5xl sm:text-6xl tracking-tight">{s.v}</div>
                <div className="mt-3 eyebrow">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING strip — accent in tenge */}
      <section className="border-b border-foreground/10 bg-secondary">
        <div className="mx-auto max-w-[1320px] px-6 sm:px-10 py-20 grid sm:grid-cols-12 gap-10 items-end">
          <div className="sm:col-span-7">
            <div className="eyebrow">Стоимость</div>
            <h3 className="mt-4 font-serif text-4xl sm:text-5xl">
              На&nbsp;старте — <span className="italic">бесплатно</span>.
            </h3>
            <p className="mt-4 text-muted-foreground max-w-xl">
              Подключение типографии, импорт справочников и&nbsp;первые расчёты — без&nbsp;оплаты.
              Тарифы для команд — от&nbsp;<span className="text-foreground tabular-nums">14&nbsp;900&nbsp;₸</span>&nbsp;/&nbsp;мес.
            </p>
          </div>
          <div className="sm:col-span-5 flex sm:justify-end">
            <Link to={ctaTo}>
              <Button size="lg" className="rounded-none h-12 px-8 text-[15px] gap-2">
                {ctaText} <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-foreground/10">
        <div className="mx-auto max-w-[1320px] px-6 sm:px-10 py-24 sm:py-32 grid sm:grid-cols-12 gap-10">
          <div className="sm:col-span-4">
            <div className="eyebrow">FAQ</div>
            <h2 className="mt-6 font-serif text-4xl sm:text-5xl">Вопросы, которые задают чаще всего.</h2>
          </div>
          <div className="sm:col-span-8">
            <Accordion type="single" collapsible className="w-full border-t border-foreground/15">
              {[
                { q: "Нужно ли что-то устанавливать?", a: "Нет. Сервис работает в браузере на компьютере, планшете и телефоне." },
                { q: "В какой валюте идут расчёты?", a: "Все цены и сметы — только в казахстанских тенге (₸)." },
                { q: "Какие машины поддерживаются?", a: "Офсетные GTO 52, SM-52, SM-74 и любые другие — добавляются в справочнике оборудования с собственной стоимостью прогона." },
                { q: "Можно ли работать с телефона?", a: "Да, интерфейс полностью адаптирован под мобильные устройства — можно делать просчёт прямо у клиента." },
                { q: "Сохраняются ли мои расчёты?", a: "Да, все расчёты привязаны к вашему аккаунту, доступны в истории и могут быть превращены в шаблоны." },
              ].map((f, i) => (
                <AccordionItem key={i} value={`i-${i}`} className="border-b border-foreground/15">
                  <AccordionTrigger className="py-6 text-left text-lg font-medium hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base pb-6">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-b border-foreground/10">
        <div className="mx-auto max-w-[1320px] px-6 sm:px-10 py-32 sm:py-44 text-center">
          <div className="eyebrow">Начать</div>
          <h2 className="mt-8 text-5xl sm:text-8xl font-medium tracking-[-0.04em] leading-[0.95]">
            Сделайте первый <br /><span className="font-serif italic">расчёт сегодня</span>.
          </h2>
          <div className="mt-12 flex justify-center">
            <Link to={ctaTo}>
              <Button size="lg" className="rounded-none h-14 px-10 text-base gap-2">
                {ctaText} <ArrowUpRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="mx-auto max-w-[1320px] px-6 sm:px-10 py-10 grid sm:grid-cols-12 gap-8 text-sm text-muted-foreground">
          <div className="sm:col-span-4">
            <div className="font-serif text-2xl text-foreground">Platebox</div>
            <p className="mt-3 max-w-xs">Премиальный калькулятор полиграфии. Алматы, Казахстан. Цены — в&nbsp;тенге.</p>
          </div>
          <div className="sm:col-span-2">
            <div className="eyebrow mb-3">Продукт</div>
            <ul className="space-y-2">
              <li><a href="#work" className="hover:text-foreground">Возможности</a></li>
              <li><a href="#process" className="hover:text-foreground">Процесс</a></li>
              <li><a href="#numbers" className="hover:text-foreground">Цифры</a></li>
            </ul>
          </div>
          <div className="sm:col-span-2">
            <div className="eyebrow mb-3">Аккаунт</div>
            <ul className="space-y-2">
              <li><Link to="/auth" className="hover:text-foreground">Войти</Link></li>
              <li><Link to="/auth" className="hover:text-foreground">Регистрация</Link></li>
            </ul>
          </div>
          <div className="sm:col-span-4 sm:text-right self-end">
            © {new Date().getFullYear()} Platebox · Все права защищены
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;