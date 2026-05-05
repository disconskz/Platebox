import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, BookOpen, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import MobileTabBar from "@/components/MobileTabBar";

type Section = { id: string; q: string; a: React.ReactNode };
type Topic = { key: string; title: string; intro?: string; sections: Section[] };

const TOPICS: Topic[] = [
  {
    key: "start",
    title: "Начало работы",
    intro: "Platebox — кабинет калькуляции для типографии. Здесь вы создаёте расчёты заказов, ведёте справочники и формируете коммерческие предложения.",
    sections: [
      {
        id: "start-flow",
        q: "Типичный сценарий работы",
        a: (
          <ol className="list-decimal pl-5 space-y-1">
            <li>Открываете <b>Калькулятор</b> и проходите шаги: продукция → материал и оборудование → допечатка → постпечать → цена.</li>
            <li>Сохраняете расчёт. Он попадает в список <b>Расчёты</b> на главной.</li>
            <li>Открываете расчёт, при необходимости правите цены отдельных статей (с указанием причины — попадает в историю).</li>
            <li>Жмёте <b>КП</b> — формируется коммерческое предложение, его можно распечатать или сохранить в PDF.</li>
            <li>В <b>Аналитике</b> смотрите выручку, прибыль и срез по видам продукции за период.</li>
          </ol>
        ),
      },
      {
        id: "start-nav",
        q: "Навигация по кабинету",
        a: (
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Расчёты</b> — список ваших сохранённых расчётов и шаблонов.</li>
            <li><b>Новый расчёт</b> — пошаговый калькулятор.</li>
            <li><b>Аналитика</b> — KPI и графики по периоду.</li>
            <li><b>Справочники</b> — материалы, операции, оборудование, ламинация, константы.</li>
            <li><b>База знаний</b> — этот раздел.</li>
          </ul>
        ),
      },
    ],
  },
  {
    key: "calc",
    title: "Калькулятор",
    sections: [
      {
        id: "calc-product",
        q: "Шаг 1. Продукция и параметры",
        a: (
          <>
            <p>Выбираете вид продукции, тираж, формат изделия и красочность лица/оборота (CMYK = 4, моно = 1, Pantone — отдельный канал).</p>
            <p>Вид продукции определяет автопресет постпечати (например, у буклета по умолчанию включена фальцовка) и геометрию плитки на раскладке (иконка-визуализация в превью).</p>
          </>
        ),
      },
      {
        id: "calc-material",
        q: "Шаг 2. Материал и оборудование",
        a: (
          <>
            <p>Материал берётся из справочника <i>Бумага</i>: формат листа, плотность и цена за лист участвуют в стоимости и в раскладке.</p>
            <p>Оборудование задаёт <b>максимальный печатный формат</b> и <b>стоимость одного оттиска</b>. Если изделие не помещается в машину — калькулятор покажет ошибку.</p>
          </>
        ),
      },
      {
        id: "calc-layout",
        q: "Раскладка на листе",
        a: (
          <>
            <p>Движок ищет максимальное число изделий, помещающихся на печатный лист с учётом полей и поворота. Результат:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><b>На листе</b> — сколько изделий помещается на одном печатном листе.</li>
              <li><b>Поворот</b> — повёрнуто ли изделие относительно листа (для лучшей раскладки).</li>
              <li><b>Печатный формат</b> — фактический формат листа, на котором ведём печать.</li>
            </ul>
            <p>На превью каждая ячейка показывает мини-иллюстрацию выбранного продукта (листовка, блокнот, календарь и т.д.) с порядковым номером.</p>
          </>
        ),
      },
      {
        id: "calc-sheets",
        q: "Тиражные и приладочные листы",
        a: (
          <>
            <p><b>Тиражные листы</b> = ceil(тираж / на_листе).</p>
            <p><b>Приладочные листы</b> — листы, уходящие в брак на старте печати (приводка красок). Берутся из настроек оборудования или задаются вручную.</p>
            <p><b>Закупочные листы</b> = тиражные + приладочные + технологический припуск (резка/раскрой).</p>
          </>
        ),
      },
      {
        id: "calc-forms",
        q: "Формы и приладка",
        a: (
          <>
            <p><b>Количество форм</b> зависит от красочности и типа оборота:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><i>Без оборота</i> — формы только на лицо.</li>
              <li><i>Свой оборот</i> — печатаем на одной стороне, но переворачиваем лист (формы те же).</li>
              <li><i>Чужой оборот</i> — комплект форм и на лицо, и на оборот.</li>
            </ul>
            <p>Стоимость форм и подготовки берётся из справочника <i>Операции</i>.</p>
          </>
        ),
      },
      {
        id: "calc-print",
        q: "Печать",
        a: (
          <p><b>Стоимость печати</b> = число оттисков × цена за оттиск (из оборудования). <b>Краска</b> учитывается отдельной строкой по площади заливки.</p>
        ),
      },
      {
        id: "calc-postpress",
        q: "Постпечать",
        a: (
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Ламинация</b> — цена за сторону зависит от типа плёнки (глянец/мат/велюр) и размерного диапазона (см. справочник <i>Ламинация</i>).</li>
            <li><b>Биговка / фальцовка</b> — по числу сгибов, считается на тираж.</li>
            <li><b>Вырубка</b> — фиксированная подготовка штампа + переменная за тираж.</li>
            <li><b>Нумерация, тиснение</b> — отдельные опции с собственными ценами.</li>
          </ul>
        ),
      },
      {
        id: "calc-margin",
        q: "Маржа, НДС и итог",
        a: (
          <>
            <p><b>Цена без НДС</b> = себестоимость × (1 + наценка/100).</p>
            <p><b>НДС</b> берётся из системной константы <code>vat_percent</code> в справочнике <i>Константы</i>.</p>
            <p><b>Итог к оплате</b> = цена без НДС + НДС. <b>Прибыль</b> = цена без НДС − себестоимость.</p>
          </>
        ),
      },
    ],
  },
  {
    key: "refs",
    title: "Справочники",
    intro: "Все цены и нормативы берутся из справочников. Изменение значения здесь сразу отражается во всех новых расчётах.",
    sections: [
      {
        id: "refs-materials",
        q: "Бумага",
        a: <p>Название, тип (мелованная/офсетная/самоклейка/картон), плотность, формат листа в мм, цена за лист. Используется в шаге «Материал».</p>,
      },
      {
        id: "refs-operations",
        q: "Операции",
        a: <p>Допечатные, печатные, постпечатные и логистические операции. <b>Фикс.</b> — единоразовая стоимость на тираж, <b>Перем.</b> — стоимость за единицу.</p>,
      },
      {
        id: "refs-equipment",
        q: "Оборудование",
        a: <p>Печатные машины и финишеры. Главное: максимальный формат и цена за оттиск — попадают прямо в калькулятор.</p>,
      },
      {
        id: "refs-lamination",
        q: "Ламинация",
        a: <p>Цена за сторону по комбинации <i>тип плёнки + размерный диапазон</i> (до A4+, до A3+, до A2+, до A1).</p>,
      },
      {
        id: "refs-settings",
        q: "Системные константы",
        a: <p>Глобальные параметры: ставка НДС, технологические припуски, прочие коэффициенты. Меняются редко.</p>,
      },
    ],
  },
  {
    key: "list",
    title: "Сохранённые расчёты",
    sections: [
      {
        id: "list-templates",
        q: "Шаблоны и копии",
        a: <p>Любой расчёт можно сохранить как <b>шаблон</b>. Из карточки расчёта кнопка <b>Дублировать</b> создаёт копию с теми же параметрами для быстрой правки.</p>,
      },
      {
        id: "list-edit",
        q: "Правка цен и история",
        a: <p>В открытом расчёте можно вручную изменить цену любой статьи. Предыдущее значение и причина правки сохраняются в <b>истории правок</b>.</p>,
      },
    ],
  },
  {
    key: "quote",
    title: "Коммерческое предложение",
    sections: [
      {
        id: "quote-build",
        q: "Как формируется КП",
        a: <p>КП собирается из спецификации расчёта по этапам (допечать → материалы → печать → постпечать → логистика) с итогом, НДС и ценой за единицу.</p>,
      },
      {
        id: "quote-export",
        q: "Экспорт",
        a: <p>Из карточки расчёта: <b>Excel</b> — выгрузка спецификации, <b>PDF</b> — готовая печатная форма КП. На странице КП также доступна системная печать браузера.</p>,
      },
    ],
  },
  {
    key: "analytics",
    title: "Аналитика",
    sections: [
      {
        id: "analytics-kpi",
        q: "Что показывают KPI",
        a: (
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Расчётов</b> — число сохранённых расчётов за период (без шаблонов).</li>
            <li><b>Выручка</b> — сумма цен продажи.</li>
            <li><b>Себестоимость</b> — сумма затрат.</li>
            <li><b>Прибыль</b> — выручка − себестоимость.</li>
            <li><b>Средняя наценка</b> — среднее по полю наценки.</li>
          </ul>
        ),
      },
      {
        id: "analytics-period",
        q: "Период",
        a: <p>Селектор сверху меняет окно: 7 / 30 / 90 / 365 дней. Все графики и таблицы пересчитываются.</p>,
      },
    ],
  },
  {
    key: "account",
    title: "Аккаунт и доступ",
    sections: [
      {
        id: "account-auth",
        q: "Вход и защита",
        a: <p>Все страницы кабинета доступны только после входа на <code>/auth</code>. Гостей перенаправляет на форму входа, а после входа возвращает на исходную страницу.</p>,
      },
      {
        id: "account-roles",
        q: "Роли",
        a: <p>Роль <b>admin</b> позволяет редактировать общие справочники (материалы, оборудование, ламинация, константы). Обычные пользователи видят справочники, но не могут менять.</p>,
      },
    ],
  },
  {
    key: "faq",
    title: "FAQ",
    sections: [
      {
        id: "faq-fit",
        q: "Изделие не помещается на лист — что делать?",
        a: <p>Проверьте формат изделия, выбранный материал и максимальный формат оборудования. Калькулятор подскажет, какой именно лимит превышен.</p>,
      },
      {
        id: "faq-zero",
        q: "Нулевая цена бумаги или печати",
        a: <p>Значит, в справочнике у материала не задана цена за лист, или у оборудования не указана цена за оттиск. Заполните соответствующие поля в Справочниках.</p>,
      },
      {
        id: "faq-add-material",
        q: "Нужного материала нет в списке",
        a: <p>Откройте <b>Справочники → Бумага</b> и добавьте новую строку. Как только сохраните, материал появится в калькуляторе.</p>,
      },
    ],
  },
];

const Knowledge = () => {
  const { hash } = useLocation();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState(TOPICS[0].key);
  const [open, setOpen] = useState<string | undefined>(undefined);

  // Auto-open by hash and switch tab
  useEffect(() => {
    if (!hash) return;
    const id = hash.replace("#", "");
    const topic = TOPICS.find((t) => t.sections.some((s) => s.id === id));
    if (topic) {
      setTab(topic.key);
      setOpen(id);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, [hash]);

  const filtered = useMemo(() => {
    if (!query.trim()) return TOPICS;
    const q = query.toLowerCase();
    return TOPICS.map((t) => ({
      ...t,
      sections: t.sections.filter(
        (s) => s.q.toLowerCase().includes(q) || (typeof s.a === "string" && s.a.toLowerCase().includes(q))
      ),
    })).filter((t) => t.sections.length > 0);
  }, [query]);

  return (
    <div className="min-h-screen bg-gradient-subtle has-tabbar">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30 safe-top">
        <div className="container mx-auto flex items-center gap-3 py-3 px-4">
          <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="inline h-4 w-4 mr-1" /> <span className="hidden sm:inline">На главную</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">База знаний</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-4 sm:py-6 px-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Как пользоваться Platebox</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по разделам…"
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="scroll-x flex w-full overflow-x-auto h-auto justify-start">
            {(query ? filtered : TOPICS).map((t) => (
              <TabsTrigger key={t.key} value={t.key}>{t.title}</TabsTrigger>
            ))}
          </TabsList>

          {(query ? filtered : TOPICS).map((t) => (
            <TabsContent key={t.key} value={t.key} className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t.title}</CardTitle>
                  {t.intro && <p className="text-sm text-muted-foreground pt-1">{t.intro}</p>}
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible value={open} onValueChange={setOpen}>
                    {t.sections.map((s) => (
                      <AccordionItem key={s.id} value={s.id} id={s.id}>
                        <AccordionTrigger className="text-left">{s.q}</AccordionTrigger>
                        <AccordionContent>
                          <div className="prose prose-sm max-w-none text-sm text-foreground/90 space-y-2">
                            {s.a}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </main>

      <MobileTabBar />
    </div>
  );
};

export default Knowledge;