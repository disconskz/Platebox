CREATE TABLE public.block_insertion_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  insertion_method text NOT NULL DEFAULT 'semi_auto',
  cover_material_type text NOT NULL DEFAULT 'paper',
  endpaper_type text NOT NULL DEFAULT 'standard',

  price_per_item numeric NOT NULL DEFAULT 0,

  glue_calc_mode text NOT NULL DEFAULT 'per_item',
  glue_price_per_item numeric NOT NULL DEFAULT 0,
  glue_price_per_m2 numeric NOT NULL DEFAULT 0,
  endpapers_per_item integer NOT NULL DEFAULT 2,

  setup_cost numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,

  coef_format_a5 numeric NOT NULL DEFAULT 1,
  coef_format_a4 numeric NOT NULL DEFAULT 1.2,
  coef_format_a3 numeric NOT NULL DEFAULT 1.5,
  coef_format_nonstandard numeric NOT NULL DEFAULT 1.4,

  thickness_thin_max numeric NOT NULL DEFAULT 10,
  thickness_med_max numeric NOT NULL DEFAULT 20,
  thickness_thick_max numeric NOT NULL DEFAULT 40,
  coef_thickness_thin numeric NOT NULL DEFAULT 1,
  coef_thickness_med numeric NOT NULL DEFAULT 1.1,
  coef_thickness_thick numeric NOT NULL DEFAULT 1.3,
  coef_thickness_extra numeric NOT NULL DEFAULT 1.5,

  weight_light_max numeric NOT NULL DEFAULT 300,
  weight_med_max numeric NOT NULL DEFAULT 700,
  weight_heavy_max numeric NOT NULL DEFAULT 1200,
  coef_weight_light numeric NOT NULL DEFAULT 1,
  coef_weight_med numeric NOT NULL DEFAULT 1.1,
  coef_weight_heavy numeric NOT NULL DEFAULT 1.3,
  coef_weight_extra numeric NOT NULL DEFAULT 1.5,

  coef_standard numeric NOT NULL DEFAULT 1,
  coef_manual numeric NOT NULL DEFAULT 1.5,
  coef_fabric_leatherette numeric NOT NULL DEFAULT 1.3,
  coef_nonstandard_format numeric NOT NULL DEFAULT 1.3,
  coef_thick_block numeric NOT NULL DEFAULT 1.2,
  coef_complex_align numeric NOT NULL DEFAULT 1.4,
  coef_small_circulation numeric NOT NULL DEFAULT 1.2,

  thick_block_threshold numeric NOT NULL DEFAULT 25,
  small_circulation_threshold integer NOT NULL DEFAULT 100,

  min_format_short integer NOT NULL DEFAULT 0,
  max_format_long integer NOT NULL DEFAULT 1200,
  max_block_thickness numeric NOT NULL DEFAULT 80,
  max_block_weight numeric NOT NULL DEFAULT 5000,
  min_circulation integer NOT NULL DEFAULT 0,
  max_circulation integer NOT NULL DEFAULT 1000000,

  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.block_insertion_prices TO authenticated;
GRANT ALL ON public.block_insertion_prices TO service_role;

ALTER TABLE public.block_insertion_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read block_insertion_prices"
ON public.block_insertion_prices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write block_insertion_prices"
ON public.block_insertion_prices FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_block_insertion_prices_updated_at
BEFORE UPDATE ON public.block_insertion_prices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.block_insertion_prices (name, insertion_method, price_per_item, glue_price_per_item, setup_cost, min_cost, sort_order)
VALUES
  ('Ручная вставка', 'manual', 50, 5, 2000, 1000, 10),
  ('Полуавтоматическая вставка', 'semi_auto', 25, 5, 3000, 1500, 20),
  ('Автоматическая вставка', 'auto', 15, 4, 5000, 2000, 30);
