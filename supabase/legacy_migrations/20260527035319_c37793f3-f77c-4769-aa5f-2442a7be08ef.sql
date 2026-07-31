CREATE TABLE public.gauze_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  gauze_type text NOT NULL DEFAULT 'standard',
  density integer NOT NULL DEFAULT 60,
  calc_mode text NOT NULL DEFAULT 'per_m2',
  price_per_m2 numeric NOT NULL DEFAULT 0,
  price_per_meter numeric NOT NULL DEFAULT 0,
  price_per_item numeric NOT NULL DEFAULT 0,
  glue_price_per_item numeric NOT NULL DEFAULT 0,
  setup_cost numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,
  height_allowance integer NOT NULL DEFAULT 20,
  side_overlap integer NOT NULL DEFAULT 25,
  min_format_short integer NOT NULL DEFAULT 0,
  max_format_long integer NOT NULL DEFAULT 1200,
  min_block_thickness numeric NOT NULL DEFAULT 0,
  max_block_thickness numeric NOT NULL DEFAULT 80,
  min_circulation integer NOT NULL DEFAULT 0,
  max_circulation integer NOT NULL DEFAULT 1000000,
  thick_block_threshold numeric NOT NULL DEFAULT 25,
  coef_standard_format numeric NOT NULL DEFAULT 1,
  coef_nonstandard_format numeric NOT NULL DEFAULT 1.3,
  coef_thick_block numeric NOT NULL DEFAULT 1.2,
  coef_heavy_block numeric NOT NULL DEFAULT 1.3,
  coef_manual_glue numeric NOT NULL DEFAULT 1.5,
  coef_designer numeric NOT NULL DEFAULT 1.2,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gauze_prices TO authenticated;
GRANT ALL ON public.gauze_prices TO service_role;

ALTER TABLE public.gauze_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read gauze_prices" ON public.gauze_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write gauze_prices" ON public.gauze_prices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_gauze_prices_updated_at
  BEFORE UPDATE ON public.gauze_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.gauze_prices (name, gauze_type, density, calc_mode, price_per_m2, glue_price_per_item, setup_cost, min_cost)
VALUES
  ('Марля стандартная (по площади)', 'standard', 60, 'per_m2', 400, 8, 2000, 1500),
  ('Марля усиленная (по длине)', 'reinforced', 80, 'per_meter', 0, 10, 2500, 2000),
  ('Марля дизайнерская (за изделие)', 'designer', 100, 'per_item', 0, 12, 3000, 2500);