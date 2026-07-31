
CREATE TABLE public.block_trimming_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trim_type TEXT NOT NULL DEFAULT 'three_sided',
  machine_type TEXT NOT NULL DEFAULT 'three_knife',
  calc_mode TEXT NOT NULL DEFAULT 'per_cut',
  cuts_count INTEGER NOT NULL DEFAULT 3,
  price_per_cut NUMERIC NOT NULL DEFAULT 0,
  price_per_item NUMERIC NOT NULL DEFAULT 0,
  price_per_hour NUMERIC NOT NULL DEFAULT 0,
  time_per_item_sec NUMERIC NOT NULL DEFAULT 0,
  setup_cost NUMERIC NOT NULL DEFAULT 0,
  min_cost NUMERIC NOT NULL DEFAULT 0,
  coef_thickness_thin NUMERIC NOT NULL DEFAULT 1,
  coef_thickness_med NUMERIC NOT NULL DEFAULT 1.1,
  coef_thickness_thick NUMERIC NOT NULL DEFAULT 1.3,
  coef_thickness_extra NUMERIC NOT NULL DEFAULT 1.5,
  thickness_thin_max NUMERIC NOT NULL DEFAULT 10,
  thickness_med_max NUMERIC NOT NULL DEFAULT 20,
  thickness_thick_max NUMERIC NOT NULL DEFAULT 40,
  coef_format_a5 NUMERIC NOT NULL DEFAULT 1,
  coef_format_a4 NUMERIC NOT NULL DEFAULT 1.2,
  coef_format_a3 NUMERIC NOT NULL DEFAULT 1.5,
  coef_format_nonstandard NUMERIC NOT NULL DEFAULT 1.4,
  coef_figured NUMERIC NOT NULL DEFAULT 1.5,
  coef_manual NUMERIC NOT NULL DEFAULT 1.5,
  coef_heavy_paper NUMERIC NOT NULL DEFAULT 1.2,
  coef_thick_block NUMERIC NOT NULL DEFAULT 1.3,
  coef_designer_paper NUMERIC NOT NULL DEFAULT 1.2,
  coef_nonstandard_format NUMERIC NOT NULL DEFAULT 1.3,
  thick_block_threshold NUMERIC NOT NULL DEFAULT 25,
  heavy_paper_threshold INTEGER NOT NULL DEFAULT 170,
  min_format_short INTEGER NOT NULL DEFAULT 0,
  max_format_long INTEGER NOT NULL DEFAULT 1200,
  min_block_thickness NUMERIC NOT NULL DEFAULT 0,
  max_block_thickness NUMERIC NOT NULL DEFAULT 80,
  max_paper_density INTEGER NOT NULL DEFAULT 350,
  min_circulation INTEGER NOT NULL DEFAULT 0,
  max_circulation INTEGER NOT NULL DEFAULT 1000000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.block_trimming_prices TO authenticated;
GRANT ALL ON public.block_trimming_prices TO service_role;

ALTER TABLE public.block_trimming_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read block_trimming_prices"
  ON public.block_trimming_prices FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin write block_trimming_prices"
  ON public.block_trimming_prices FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_block_trimming_prices_updated_at
  BEFORE UPDATE ON public.block_trimming_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.block_trimming_prices (name, trim_type, machine_type, calc_mode, cuts_count, price_per_cut, setup_cost, min_cost, sort_order)
VALUES
  ('Трёхножевой резак — стандарт', 'three_sided', 'three_knife', 'per_cut', 3, 4, 2000, 1000, 10),
  ('Гильотина — стандарт', 'three_sided', 'guillotine', 'per_cut', 3, 5, 1500, 800, 20),
  ('Ручная обрезка', 'three_sided', 'manual', 'per_cut', 3, 12, 500, 500, 90);
