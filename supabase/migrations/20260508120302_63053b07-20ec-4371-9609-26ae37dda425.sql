
-- 1. Разделы справочников
CREATE TABLE public.reference_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_key text NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (table_key, name)
);
ALTER TABLE public.reference_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read reference_sections" ON public.reference_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write reference_sections" ON public.reference_sections FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 2. Подгруппы в таблицах (где их ещё нет)
ALTER TABLE public.materials         ADD COLUMN IF NOT EXISTS subgroup text;
ALTER TABLE public.equipment         ADD COLUMN IF NOT EXISTS subgroup text;
ALTER TABLE public.lamination_prices ADD COLUMN IF NOT EXISTS subgroup text;
ALTER TABLE public.print_formats     ADD COLUMN IF NOT EXISTS subgroup text;
ALTER TABLE public.purchase_formats  ADD COLUMN IF NOT EXISTS subgroup text;
ALTER TABLE public.envelope_formats  ADD COLUMN IF NOT EXISTS subgroup text;
ALTER TABLE public.press_machines    ADD COLUMN IF NOT EXISTS subgroup text;
ALTER TABLE public.product_circulation_rules ADD COLUMN IF NOT EXISTS subgroup text;

-- 3. Кастомные справочники
CREATE TABLE public.custom_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read custom_references" ON public.custom_references FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write custom_references" ON public.custom_references FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TABLE public.custom_reference_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id uuid NOT NULL REFERENCES public.custom_references(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  subgroup text,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_reference_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read custom_reference_rows" ON public.custom_reference_rows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write custom_reference_rows" ON public.custom_reference_rows FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 4. Сидируем правила расчёта в system_settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('rule.layout.marginLR',          '3',    'Боковые поля печатного листа, мм'),
  ('rule.layout.marginTop',         '5',    'Верхнее поле (захват), мм'),
  ('rule.layout.marginBottom',      '12',   'Нижнее поле, мм'),
  ('rule.layout.bleed',             '3',    'Вылеты под обрез, мм'),
  ('rule.layout.stickerGap',        '4',    'Просечка между наклейками, мм'),
  ('rule.layout.stickerEdge',       '8',    'Краевой отступ для наклеек, мм'),
  ('rule.setup.setupOwn',           '150',  'Приладка «свой оборот», листов'),
  ('rule.setup.setupForeign',       '300',  'Приладка «чужой оборот», листов'),
  ('rule.setup.setupPercent',       '0.01', 'Доп. приладка от тиража, доля'),
  ('rule.setup.bagMinSetup',        '200',  'Мин. приладка для пакетов, листов'),
  ('rule.price.formCost',           '1000', 'Цена пластины (формы), ₸'),
  ('rule.price.formPrepCost',       '500',  'Подготовка к печати (форма), ₸'),
  ('rule.price.cutCostPerSheet',    '1',    'Резка закупочного формата, ₸/рез'),
  ('rule.price.finishCutCost',      '1',    'Резка готовых, ₸/рез'),
  ('rule.price.numberingCost',      '2',    'Нумерация, ₸/номер'),
  ('rule.price.designCost',         '500',  'Дизайн / подготовка, ₸/шт'),
  ('rule.price.stampingSetup',      '5000', 'Тиснение: приладка, ₸'),
  ('rule.price.stampingClicheMin',  '5000', 'Тиснение: мин. цена клише, ₸'),
  ('rule.price.stampingClichePerCm2','200', 'Тиснение: ₸ за см² клише'),
  ('rule.price.stampingImpr',       '20',   'Тиснение: ₸/оттиск'),
  ('rule.price.stampingImprNotebook','50',  'Тиснение: ₸/оттиск (блокноты)'),
  ('rule.formats.maxPrintW',        '520',  'Лимит печатного формата, ширина, мм'),
  ('rule.formats.maxPrintH',        '360',  'Лимит печатного формата, высота, мм'),
  ('rule.formats.altPrintW',        '460',  'Альт. печатный формат, ширина, мм'),
  ('rule.formats.altPrintH',        '320',  'Альт. печатный формат, высота, мм')
ON CONFLICT (key) DO NOTHING;
