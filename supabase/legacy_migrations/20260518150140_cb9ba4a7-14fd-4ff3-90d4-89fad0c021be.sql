-- Variants
CREATE TABLE public.calc_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  base_product_type text NOT NULL DEFAULT 'leaflet',
  category text NOT NULL DEFAULT 'other',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calc_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read calc_variants" ON public.calc_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write calc_variants" ON public.calc_variants FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER calc_variants_updated BEFORE UPDATE ON public.calc_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Stages of a variant
CREATE TABLE public.calc_variant_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.calc_variants(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'шт',
  formula jsonb NOT NULL DEFAULT '{"num":0}'::jsonb,
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  material_formula jsonb,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calc_variant_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read calc_variant_stages" ON public.calc_variant_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write calc_variant_stages" ON public.calc_variant_stages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE INDEX idx_calc_variant_stages_variant ON public.calc_variant_stages(variant_id, sort_order);

-- Constants
CREATE TABLE public.calc_constants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT '₸',
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calc_constants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read calc_constants" ON public.calc_constants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write calc_constants" ON public.calc_constants FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER calc_constants_updated BEFORE UPDATE ON public.calc_constants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.calc_constants (slug, name, value, unit, description, sort_order) VALUES
  ('form_cost', 'Цена формы', 500, '₸', 'за шт.', 10),
  ('impression_cost', 'Цена оттиска', 3, '₸', 'за оттиск', 20),
  ('cut_cost', 'Цена резки', 1, '₸', 'за рез', 30),
  ('ink_per_m2', 'Расход краски', 2, 'гр/0.7м²', 'на 1 сторону', 40),
  ('ink_cost_per_gram', 'Цена краски за гр', 1, '₸', '', 50),
  ('setup_per_form', 'Приладка на форму', 500, '₸', '', 60),
  ('overhead_percent', 'Накладные расходы', 1, '%', 'от суммы заказа', 70),
  ('design_cost', 'Подготовка дизайна', 500, '₸', 'за форму', 80),
  ('delivery_cost', 'Цена доставки', 0, '₸', 'вручную', 90);

-- Stage library
CREATE TABLE public.calc_stage_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'шт',
  formula jsonb NOT NULL,
  category text NOT NULL DEFAULT 'other',
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.calc_stage_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read calc_stage_library" ON public.calc_stage_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write calc_stage_library" ON public.calc_stage_library FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

INSERT INTO public.calc_stage_library (name, unit, formula, category, sort_order) VALUES
  ('Подготовка дизайна', 'шт', '{"op":"*","args":[{"var":"кол_форм"},{"const":"design_cost"}]}', 'prepress', 10),
  ('Вывод CTP форм',     'шт', '{"op":"*","args":[{"var":"кол_форм"},{"const":"form_cost"}]}', 'prepress', 20),
  ('Резка бумаги',       'рез', '{"op":"*","args":[{"var":"кол_резов"},{"const":"cut_cost"}]}', 'prepress', 30),
  ('Печать офсетная',    'оттиск', '{"op":"+","args":[{"op":"*","args":[{"var":"кол_красок"},{"var":"сторон"},{"var":"печ_листов"},{"const":"impression_cost"}]},{"op":"*","args":[{"var":"кол_форм"},{"const":"setup_per_form"}]}]}', 'print', 40),
  ('Краска',             'гр', '{"op":"*","args":[{"var":"площадь_печати"},{"var":"сторон"},{"const":"ink_per_m2"},{"const":"ink_cost_per_gram"}]}', 'print', 50),
  ('Перфорация',         'шт', '{"op":"*","args":[{"var":"тираж"},{"num":1}]}', 'postpress', 60),
  ('Укладка с перекладкой','шт', '{"op":"*","args":[{"var":"тираж"},{"num":1}]}', 'postpress', 70),
  ('Резка на готовый формат','рез','{"op":"*","args":[{"var":"кол_резов"},{"const":"cut_cost"}]}', 'postpress', 80),
  ('Склейка блоков',     'шт', '{"op":"*","args":[{"var":"тираж"},{"num":1}]}', 'postpress', 90),
  ('Разборка блоков',    'шт', '{"op":"*","args":[{"var":"кол_блоков"},{"num":1}]}', 'postpress', 100),
  ('Подсчёт блоков',     'шт', '{"op":"*","args":[{"var":"кол_блоков"},{"num":1}]}', 'postpress', 110),
  ('Упаковка',           'шт', '{"op":"*","args":[{"var":"кол_блоков"},{"num":1}]}', 'postpress', 120);