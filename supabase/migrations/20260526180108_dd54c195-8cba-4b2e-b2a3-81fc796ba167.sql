CREATE TABLE public.block_sewing_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  sewing_type text NOT NULL DEFAULT 'thread',
  machine_type text NOT NULL DEFAULT 'auto',
  price_per_signature numeric NOT NULL DEFAULT 0,
  setup_cost numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,
  thread_calc_mode text NOT NULL DEFAULT 'per_item',
  thread_price numeric NOT NULL DEFAULT 0,
  gauze_price numeric NOT NULL DEFAULT 0,
  headband_price numeric NOT NULL DEFAULT 0,
  endpaper_price numeric NOT NULL DEFAULT 0,
  coef_standard_format numeric NOT NULL DEFAULT 1,
  coef_nonstandard_format numeric NOT NULL DEFAULT 1.2,
  coef_thick_block numeric NOT NULL DEFAULT 1.3,
  coef_manual numeric NOT NULL DEFAULT 2,
  coef_thin_paper numeric NOT NULL DEFAULT 1.1,
  coef_heavy_paper numeric NOT NULL DEFAULT 1.2,
  coef_many_signatures numeric NOT NULL DEFAULT 1.2,
  thick_block_threshold numeric NOT NULL DEFAULT 25,
  min_format_short integer NOT NULL DEFAULT 0,
  max_format_long integer NOT NULL DEFAULT 1200,
  min_block_thickness numeric NOT NULL DEFAULT 0,
  max_block_thickness numeric NOT NULL DEFAULT 60,
  min_density integer NOT NULL DEFAULT 0,
  max_density integer NOT NULL DEFAULT 350,
  min_circulation integer NOT NULL DEFAULT 0,
  max_circulation integer NOT NULL DEFAULT 1000000,
  max_signatures integer NOT NULL DEFAULT 64,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.block_sewing_prices TO authenticated;
GRANT ALL ON public.block_sewing_prices TO service_role;

ALTER TABLE public.block_sewing_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read block_sewing_prices"
  ON public.block_sewing_prices FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin write block_sewing_prices"
  ON public.block_sewing_prices FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_block_sewing_prices_updated_at
  BEFORE UPDATE ON public.block_sewing_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.block_sewing_prices
  (name, sewing_type, machine_type, price_per_signature, setup_cost, min_cost, thread_calc_mode, thread_price, gauze_price, headband_price, endpaper_price, sort_order)
VALUES
  ('Автоматическая ниткошвейка', 'thread', 'auto', 2, 5000, 8000, 'per_item', 5, 3, 4, 6, 10),
  ('Полуавтоматическая ниткошвейка', 'thread', 'semi_auto', 2.5, 3000, 6000, 'per_signature', 0.5, 3, 4, 6, 20),
  ('Ручное шитьё', 'manual', 'manual', 8, 1000, 5000, 'per_signature', 0.8, 3, 4, 6, 30);