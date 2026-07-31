CREATE TABLE public.tape_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tape_type text NOT NULL DEFAULT 'double_sided',
  tape_width_mm numeric NOT NULL DEFAULT 12,
  application_method text NOT NULL DEFAULT 'manual',
  calc_mode text NOT NULL DEFAULT 'per_length',
  price_per_meter numeric NOT NULL DEFAULT 0,
  price_per_point numeric NOT NULL DEFAULT 0,
  price_per_item_apply numeric NOT NULL DEFAULT 0,
  setup_cost numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,
  coef_standard numeric NOT NULL DEFAULT 1,
  coef_foam numeric NOT NULL DEFAULT 1.2,
  coef_manual numeric NOT NULL DEFAULT 1.5,
  coef_nonstandard_format numeric NOT NULL DEFAULT 1.3,
  coef_complex_position numeric NOT NULL DEFAULT 1.4,
  coef_small_circulation numeric NOT NULL DEFAULT 1.2,
  coef_many_strips numeric NOT NULL DEFAULT 1.2,
  small_circulation_threshold integer NOT NULL DEFAULT 100,
  many_strips_threshold integer NOT NULL DEFAULT 3,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tape_prices TO authenticated;
GRANT ALL ON public.tape_prices TO service_role;

ALTER TABLE public.tape_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read tape_prices" ON public.tape_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write tape_prices" ON public.tape_prices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_updated_at_tape_prices
  BEFORE UPDATE ON public.tape_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.tape_prices (name, tape_type, tape_width_mm, application_method, calc_mode, price_per_meter, price_per_item_apply, setup_cost, min_cost)
VALUES
  ('Двухсторонний скотч 12мм, ручное нанесение', 'double_sided', 12, 'manual', 'per_length', 25, 3, 2000, 2000),
  ('Вспененный скотч 19мм, ручное', 'foam', 19, 'manual', 'per_length', 60, 5, 3000, 3000),
  ('Скотч по точкам, полуавтомат', 'double_sided', 10, 'semi_auto', 'per_point', 0, 0, 1500, 1500);
