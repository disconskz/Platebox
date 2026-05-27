
CREATE TABLE public.casing_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  casing_method text NOT NULL DEFAULT 'semi_auto',
  cover_material_type text NOT NULL DEFAULT 'paper',
  base_type text NOT NULL DEFAULT 'chipboard',

  material_calc_mode text NOT NULL DEFAULT 'per_m2',
  material_price_per_m2 numeric NOT NULL DEFAULT 0,
  material_price_per_sheet numeric NOT NULL DEFAULT 0,
  sheet_width integer NOT NULL DEFAULT 700,
  sheet_height integer NOT NULL DEFAULT 1000,

  glue_calc_mode text NOT NULL DEFAULT 'per_m2',
  glue_price_per_m2 numeric NOT NULL DEFAULT 0,
  glue_price_per_item numeric NOT NULL DEFAULT 0,

  work_calc_mode text NOT NULL DEFAULT 'per_m2',
  work_price_per_m2 numeric NOT NULL DEFAULT 0,
  work_price_per_item numeric NOT NULL DEFAULT 0,

  fold_left numeric NOT NULL DEFAULT 15,
  fold_right numeric NOT NULL DEFAULT 15,
  fold_top numeric NOT NULL DEFAULT 15,
  fold_bottom numeric NOT NULL DEFAULT 15,
  spine_gap numeric NOT NULL DEFAULT 7,

  setup_cost numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,

  coef_standard_format numeric NOT NULL DEFAULT 1,
  coef_nonstandard_format numeric NOT NULL DEFAULT 1.2,
  coef_manual numeric NOT NULL DEFAULT 1.5,
  coef_fabric_leatherette numeric NOT NULL DEFAULT 1.4,
  coef_thick_board numeric NOT NULL DEFAULT 1.2,
  coef_large_format numeric NOT NULL DEFAULT 1.3,
  coef_small_circulation numeric NOT NULL DEFAULT 1.2,
  coef_designer_material numeric NOT NULL DEFAULT 1.2,
  coef_printed_cover numeric NOT NULL DEFAULT 1.1,

  thick_board_threshold numeric NOT NULL DEFAULT 2.5,
  large_format_threshold integer NOT NULL DEFAULT 500,
  small_circulation_threshold integer NOT NULL DEFAULT 100,

  min_format_short integer NOT NULL DEFAULT 0,
  max_format_long integer NOT NULL DEFAULT 1200,
  max_board_thickness numeric NOT NULL DEFAULT 5,
  min_circulation integer NOT NULL DEFAULT 0,
  max_circulation integer NOT NULL DEFAULT 1000000,

  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.casing_prices TO authenticated;
GRANT ALL ON public.casing_prices TO service_role;

ALTER TABLE public.casing_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read casing_prices" ON public.casing_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write casing_prices" ON public.casing_prices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_casing_prices_updated_at
  BEFORE UPDATE ON public.casing_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.casing_prices (name, casing_method, cover_material_type, base_type, material_price_per_m2, glue_price_per_m2, work_price_per_m2, setup_cost, min_cost, sort_order)
VALUES
  ('Кашировка бумагой (автомат)', 'auto', 'paper', 'chipboard', 300, 50, 200, 3000, 1500, 10),
  ('Кашировка дизайнерской бумагой', 'semi_auto', 'designer_paper', 'chipboard', 800, 50, 250, 3000, 2000, 20),
  ('Кашировка тканью / кожзамом (ручная)', 'manual', 'fabric', 'chipboard', 1500, 80, 500, 5000, 5000, 30),
  ('Кашировка отпечатанной обложки', 'semi_auto', 'printed', 'chipboard', 400, 50, 200, 3000, 1500, 40);
