CREATE TABLE public.headband_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  headband_type text NOT NULL DEFAULT 'standard',
  color text NOT NULL DEFAULT 'white',
  price_per_meter numeric NOT NULL DEFAULT 0,
  install_price_per_piece numeric NOT NULL DEFAULT 0,
  tech_allowance_mm numeric NOT NULL DEFAULT 10,
  headbands_per_item integer NOT NULL DEFAULT 2,
  setup_cost numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,
  coef_standard numeric NOT NULL DEFAULT 1,
  coef_nonstandard_color numeric NOT NULL DEFAULT 1.1,
  coef_thick_block numeric NOT NULL DEFAULT 1.2,
  coef_manual_install numeric NOT NULL DEFAULT 1.5,
  coef_nonstandard_format numeric NOT NULL DEFAULT 1.2,
  coef_small_circulation numeric NOT NULL DEFAULT 1.2,
  thick_block_threshold numeric NOT NULL DEFAULT 25,
  small_circulation_threshold integer NOT NULL DEFAULT 100,
  max_format_long integer NOT NULL DEFAULT 1200,
  min_format_short integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.headband_prices TO authenticated;
GRANT ALL ON public.headband_prices TO service_role;

ALTER TABLE public.headband_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read headband_prices" ON public.headband_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write headband_prices" ON public.headband_prices FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_headband_prices_updated_at BEFORE UPDATE ON public.headband_prices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.headband_prices (name, headband_type, color, price_per_meter, install_price_per_piece, tech_allowance_mm, setup_cost, min_cost)
VALUES
  ('Стандартный белый каптал', 'standard', 'white', 80, 5, 10, 1000, 500),
  ('Цветной каптал', 'colored', 'red', 100, 6, 10, 1200, 600),
  ('Премиум каптал', 'premium', 'gold', 200, 8, 10, 1500, 800);