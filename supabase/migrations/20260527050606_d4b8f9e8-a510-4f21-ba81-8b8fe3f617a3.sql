
CREATE TABLE public.stapling_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  staple_type text NOT NULL DEFAULT 'standard',
  machine_type text NOT NULL DEFAULT 'auto',
  price_per_staple numeric NOT NULL DEFAULT 0.5,
  price_per_item numeric NOT NULL DEFAULT 0,
  default_staples_count integer NOT NULL DEFAULT 2,
  setup_cost numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,

  -- thickness tiers (mm)
  thickness_t1_max numeric NOT NULL DEFAULT 2,
  thickness_t2_max numeric NOT NULL DEFAULT 4,
  thickness_t3_max numeric NOT NULL DEFAULT 6,
  thickness_t4_max numeric NOT NULL DEFAULT 8,
  coef_thickness_t1 numeric NOT NULL DEFAULT 1,
  coef_thickness_t2 numeric NOT NULL DEFAULT 1.1,
  coef_thickness_t3 numeric NOT NULL DEFAULT 1.2,
  coef_thickness_t4 numeric NOT NULL DEFAULT 1.4,

  -- format coefs
  coef_format_a6 numeric NOT NULL DEFAULT 1,
  coef_format_a5 numeric NOT NULL DEFAULT 1,
  coef_format_a4 numeric NOT NULL DEFAULT 1.1,
  coef_format_a3 numeric NOT NULL DEFAULT 1.3,
  coef_format_nonstandard numeric NOT NULL DEFAULT 1.3,

  -- complexity
  coef_standard_staple numeric NOT NULL DEFAULT 1,
  coef_loop_staple numeric NOT NULL DEFAULT 1.2,
  coef_reinforced_staple numeric NOT NULL DEFAULT 1.3,
  coef_manual numeric NOT NULL DEFAULT 1.5,
  coef_heavy_paper numeric NOT NULL DEFAULT 1.2,
  coef_small_circulation numeric NOT NULL DEFAULT 1.2,
  heavy_paper_threshold integer NOT NULL DEFAULT 170,
  small_circulation_threshold integer NOT NULL DEFAULT 100,

  -- equipment limits
  max_block_thickness numeric NOT NULL DEFAULT 8,
  min_format_short integer NOT NULL DEFAULT 0,
  max_format_long integer NOT NULL DEFAULT 600,
  min_circulation integer NOT NULL DEFAULT 0,
  max_circulation integer NOT NULL DEFAULT 1000000,

  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stapling_prices TO authenticated;
GRANT ALL ON public.stapling_prices TO service_role;

ALTER TABLE public.stapling_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read stapling_prices" ON public.stapling_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write stapling_prices" ON public.stapling_prices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER stapling_prices_set_updated_at
  BEFORE UPDATE ON public.stapling_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.stapling_prices (name, staple_type, machine_type, price_per_staple, price_per_item, default_staples_count, setup_cost, min_cost)
VALUES
  ('Скрепление на скобу — авто', 'standard', 'auto', 0.5, 5, 2, 2000, 500),
  ('Скрепление на скобу — полуавто', 'standard', 'semi_auto', 0.5, 8, 2, 1500, 500),
  ('Скрепление на скобу — ручное', 'standard', 'manual', 0.5, 15, 2, 500, 300);
