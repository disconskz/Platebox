
CREATE TABLE public.board_cutting_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cutting_type TEXT NOT NULL DEFAULT 'guillotine',
  machine_type TEXT NOT NULL DEFAULT 'electric_guillotine',
  price_per_cut NUMERIC NOT NULL DEFAULT 2,
  default_cuts INTEGER NOT NULL DEFAULT 12,
  setup_cost NUMERIC NOT NULL DEFAULT 0,
  min_cost NUMERIC NOT NULL DEFAULT 0,
  coef_thickness_thin NUMERIC NOT NULL DEFAULT 1,
  coef_thickness_med NUMERIC NOT NULL DEFAULT 1.1,
  coef_thickness_thick NUMERIC NOT NULL DEFAULT 1.3,
  coef_thickness_extra NUMERIC NOT NULL DEFAULT 1.5,
  thickness_thin_max NUMERIC NOT NULL DEFAULT 1.5,
  thickness_med_max NUMERIC NOT NULL DEFAULT 2.0,
  thickness_thick_max NUMERIC NOT NULL DEFAULT 3.0,
  coef_figured NUMERIC NOT NULL DEFAULT 1.5,
  coef_manual NUMERIC NOT NULL DEFAULT 1.5,
  coef_thick_board NUMERIC NOT NULL DEFAULT 1.2,
  coef_complex_layout NUMERIC NOT NULL DEFAULT 1.2,
  coef_nonstandard_format NUMERIC NOT NULL DEFAULT 1.3,
  coef_standard_format NUMERIC NOT NULL DEFAULT 1,
  min_format_short INTEGER NOT NULL DEFAULT 0,
  max_format_long INTEGER NOT NULL DEFAULT 1200,
  min_board_thickness NUMERIC NOT NULL DEFAULT 0,
  max_board_thickness NUMERIC NOT NULL DEFAULT 5,
  max_stack_height NUMERIC NOT NULL DEFAULT 100,
  min_circulation INTEGER NOT NULL DEFAULT 0,
  max_circulation INTEGER NOT NULL DEFAULT 1000000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_cutting_prices TO authenticated;
GRANT ALL ON public.board_cutting_prices TO service_role;

ALTER TABLE public.board_cutting_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read board_cutting_prices"
  ON public.board_cutting_prices FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin write board_cutting_prices"
  ON public.board_cutting_prices FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER board_cutting_prices_set_updated_at
  BEFORE UPDATE ON public.board_cutting_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.board_cutting_prices (name, cutting_type, machine_type, price_per_cut, default_cuts, setup_cost, min_cost, sort_order) VALUES
  ('Гильотина электрическая — стандарт', 'guillotine', 'electric_guillotine', 2, 12, 3000, 1500, 100),
  ('Промышленная гильотина — большие тиражи', 'auto', 'industrial', 1.5, 12, 4000, 2000, 110),
  ('Ручная гильотина — малые тиражи', 'manual', 'manual_guillotine', 4, 12, 1000, 500, 120);
