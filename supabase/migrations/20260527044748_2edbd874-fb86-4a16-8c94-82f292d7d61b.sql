CREATE TABLE public.cover_assembly_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  assembly_method text NOT NULL DEFAULT 'semi_auto',
  cover_material_type text NOT NULL DEFAULT 'paper',
  calc_mode text NOT NULL DEFAULT 'per_m2',
  price_per_m2 numeric NOT NULL DEFAULT 0,
  price_per_item numeric NOT NULL DEFAULT 0,
  setup_cost numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,
  gap_left numeric NOT NULL DEFAULT 7,
  gap_right numeric NOT NULL DEFAULT 7,
  fold_left numeric NOT NULL DEFAULT 15,
  fold_right numeric NOT NULL DEFAULT 15,
  fold_top numeric NOT NULL DEFAULT 15,
  fold_bottom numeric NOT NULL DEFAULT 15,
  coef_standard_format numeric NOT NULL DEFAULT 1,
  coef_nonstandard_format numeric NOT NULL DEFAULT 1.2,
  coef_manual numeric NOT NULL DEFAULT 1.5,
  coef_fabric_leatherette numeric NOT NULL DEFAULT 1.4,
  coef_large_format numeric NOT NULL DEFAULT 1.3,
  coef_thick_board numeric NOT NULL DEFAULT 1.2,
  coef_complex_material numeric NOT NULL DEFAULT 1.3,
  coef_small_circulation numeric NOT NULL DEFAULT 1.2,
  large_format_threshold integer NOT NULL DEFAULT 500,
  thick_board_threshold numeric NOT NULL DEFAULT 2.5,
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cover_assembly_prices TO authenticated;
GRANT ALL ON public.cover_assembly_prices TO service_role;

ALTER TABLE public.cover_assembly_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read cover_assembly_prices"
ON public.cover_assembly_prices FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin write cover_assembly_prices"
ON public.cover_assembly_prices FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_cover_assembly_prices_updated
BEFORE UPDATE ON public.cover_assembly_prices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.cover_assembly_prices (name, assembly_method, cover_material_type, calc_mode, price_per_m2, price_per_item, setup_cost, min_cost, sort_order)
VALUES
  ('Полуавтомат — бумага', 'semi_auto', 'paper', 'per_m2', 250, 0, 3000, 1500, 10),
  ('Автомат — бумага', 'auto', 'paper', 'per_item', 0, 50, 5000, 2000, 20),
  ('Ручная — ткань/кожзам', 'manual', 'fabric', 'combined', 350, 80, 2000, 1000, 30);