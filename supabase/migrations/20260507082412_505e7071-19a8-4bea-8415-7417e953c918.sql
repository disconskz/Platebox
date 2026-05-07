
ALTER TABLE public.press_machines
  ADD COLUMN IF NOT EXISTS machine_type text NOT NULL DEFAULT 'offset',
  ADD COLUMN IF NOT EXISTS min_circulation integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_circulation integer,
  ADD COLUMN IF NOT EXISTS min_sheets integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_sheets integer,
  ADD COLUMN IF NOT EXISTS setup_sheets integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS setup_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_types text[],
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.product_circulation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type text NOT NULL,
  min_circulation integer NOT NULL DEFAULT 0,
  max_circulation integer,
  preferred_machine_id uuid REFERENCES public.press_machines(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_circulation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read circulation rules"
  ON public.product_circulation_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write circulation rules"
  ON public.product_circulation_rules FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Сидинг диапазонов тиражей для имеющихся машин
UPDATE public.press_machines SET machine_type='digital', min_circulation=1, max_circulation=500, setup_sheets=5, setup_cost=0, priority=10
  WHERE name='A3+';
UPDATE public.press_machines SET machine_type='offset', min_circulation=300, max_circulation=5000, setup_sheets=150, setup_cost=1500, priority=20
  WHERE name='A2+';
UPDATE public.press_machines SET machine_type='offset', min_circulation=1000, max_circulation=NULL, setup_sheets=300, setup_cost=3000, priority=30
  WHERE name='A1';
