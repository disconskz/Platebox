CREATE TABLE public.final_pressing_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  pressing_method text NOT NULL DEFAULT 'hydraulic',
  machine_type text NOT NULL DEFAULT 'hydraulic',
  calc_mode text NOT NULL DEFAULT 'per_item',
  price_per_item numeric NOT NULL DEFAULT 0,
  price_per_hour numeric NOT NULL DEFAULT 0,
  books_per_load integer NOT NULL DEFAULT 50,
  load_time_hours numeric NOT NULL DEFAULT 0.5,
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
  coef_fabric_leatherette numeric NOT NULL DEFAULT 1.2,
  coef_thick_block numeric NOT NULL DEFAULT 1.3,
  coef_large_format numeric NOT NULL DEFAULT 1.3,
  coef_small_circulation numeric NOT NULL DEFAULT 1.2,
  coef_nonstandard_format numeric NOT NULL DEFAULT 1.3,
  small_circulation_threshold integer NOT NULL DEFAULT 100,
  large_format_threshold integer NOT NULL DEFAULT 500,
  min_format_short integer NOT NULL DEFAULT 0,
  max_format_long integer NOT NULL DEFAULT 1200,
  max_book_thickness numeric NOT NULL DEFAULT 80,
  max_book_weight numeric NOT NULL DEFAULT 5000,
  min_circulation integer NOT NULL DEFAULT 0,
  max_circulation integer NOT NULL DEFAULT 1000000,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.final_pressing_prices TO authenticated;
GRANT ALL ON public.final_pressing_prices TO service_role;

ALTER TABLE public.final_pressing_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read final_pressing_prices"
ON public.final_pressing_prices FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Admin write final_pressing_prices"
ON public.final_pressing_prices FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_final_pressing_prices_updated_at
BEFORE UPDATE ON public.final_pressing_prices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();