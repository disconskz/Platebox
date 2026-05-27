
CREATE TABLE public.binding_cardboard_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  board_type TEXT NOT NULL DEFAULT 'chipboard',
  board_thickness NUMERIC NOT NULL DEFAULT 2.0,
  calc_mode TEXT NOT NULL DEFAULT 'per_m2',
  price_per_m2 NUMERIC NOT NULL DEFAULT 0,
  price_per_sheet NUMERIC NOT NULL DEFAULT 0,
  price_per_cover NUMERIC NOT NULL DEFAULT 0,
  sheet_width INTEGER NOT NULL DEFAULT 700,
  sheet_height INTEGER NOT NULL DEFAULT 1000,
  width_allowance NUMERIC NOT NULL DEFAULT 4,
  height_allowance NUMERIC NOT NULL DEFAULT 6,
  spine_allowance NUMERIC NOT NULL DEFAULT 2,
  sides_per_item INTEGER NOT NULL DEFAULT 2,
  spines_per_item INTEGER NOT NULL DEFAULT 1,
  gap_between NUMERIC NOT NULL DEFAULT 3,
  edge_margin NUMERIC NOT NULL DEFAULT 10,
  cuts_per_sheet INTEGER NOT NULL DEFAULT 10,
  price_per_cut NUMERIC NOT NULL DEFAULT 2,
  setup_cost NUMERIC NOT NULL DEFAULT 0,
  min_cost NUMERIC NOT NULL DEFAULT 0,
  coef_standard_format NUMERIC NOT NULL DEFAULT 1,
  coef_nonstandard_format NUMERIC NOT NULL DEFAULT 1.2,
  coef_thick_board NUMERIC NOT NULL DEFAULT 1.2,
  coef_manual_cut NUMERIC NOT NULL DEFAULT 1.5,
  coef_complex_layout NUMERIC NOT NULL DEFAULT 1.2,
  coef_designer_board NUMERIC NOT NULL DEFAULT 1.3,
  thick_board_threshold NUMERIC NOT NULL DEFAULT 2.5,
  min_format_short INTEGER NOT NULL DEFAULT 0,
  max_format_long INTEGER NOT NULL DEFAULT 1200,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.binding_cardboard_prices TO authenticated;
GRANT ALL ON public.binding_cardboard_prices TO service_role;

ALTER TABLE public.binding_cardboard_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read binding_cardboard_prices"
  ON public.binding_cardboard_prices FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin write binding_cardboard_prices"
  ON public.binding_cardboard_prices FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_binding_cardboard_prices_updated_at
  BEFORE UPDATE ON public.binding_cardboard_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.binding_cardboard_prices (name, board_type, board_thickness, calc_mode, price_per_m2, price_per_sheet, sheet_width, sheet_height, cuts_per_sheet, price_per_cut, setup_cost, min_cost, sort_order)
VALUES
  ('Картон переплётный 2.0 мм', 'chipboard', 2.0, 'per_m2', 1500, 1200, 700, 1000, 10, 2, 3000, 1500, 10),
  ('Картон переплётный 3.0 мм', 'chipboard', 3.0, 'per_m2', 2000, 1700, 700, 1000, 10, 2.5, 3000, 1500, 20);
