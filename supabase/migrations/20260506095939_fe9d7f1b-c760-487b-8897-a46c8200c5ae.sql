-- 1. Печатные форматы
CREATE TABLE public.print_formats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.print_formats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read print_formats" ON public.print_formats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write print_formats" ON public.print_formats FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Закупочные форматы (с категорией материала)
CREATE TABLE public.purchase_formats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  material_category TEXT NOT NULL, -- 'cardboard' | 'coated' | 'offset' | 'self_adhesive' | 'other'
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_formats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read purchase_formats" ON public.purchase_formats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write purchase_formats" ON public.purchase_formats FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Печатные машины
CREATE TABLE public.press_machines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  max_format_width INTEGER NOT NULL,
  max_format_height INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.press_machines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read press_machines" ON public.press_machines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write press_machines" ON public.press_machines FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Сидинг: печатные форматы из ТЗ
INSERT INTO public.print_formats (width, height, sort_order) VALUES
  (1040, 720, 10),
  (920, 640, 20),
  (1040, 360, 30),
  (920, 320, 40),
  (720, 520, 50),
  (640, 460, 60),
  (720, 346, 70),
  (640, 303, 80),
  (520, 360, 90),
  (460, 320, 100),
  (520, 240, 110),
  (460, 213, 120),
  (360, 346, 130),
  (320, 303, 140),
  (320, 230, 150);

-- Сидинг: закупочные форматы
-- Картон и мелованная
INSERT INTO public.purchase_formats (width, height, material_category, sort_order) VALUES
  (720, 1040, 'cardboard', 10),
  (640, 920, 'cardboard', 20),
  (720, 1040, 'coated', 10),
  (640, 920, 'coated', 20);
-- Офсетная
INSERT INTO public.purchase_formats (width, height, material_category, sort_order) VALUES
  (600, 840, 'offset', 10),
  (620, 860, 'offset', 20),
  (640, 900, 'offset', 30),
  (720, 1040, 'offset', 40);

-- Сидинг: печатные машины
INSERT INTO public.press_machines (name, max_format_width, max_format_height, sort_order) VALUES
  ('A3+', 520, 360, 10),
  ('A2+', 720, 520, 20),
  ('A1',  1040, 720, 30);