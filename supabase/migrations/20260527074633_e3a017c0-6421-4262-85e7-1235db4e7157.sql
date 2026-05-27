CREATE TABLE public.flash_removal_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  product_type text NOT NULL DEFAULT 'box',
  removal_method text NOT NULL DEFAULT 'auto',
  calc_mode text NOT NULL DEFAULT 'per_item',

  price_per_item numeric NOT NULL DEFAULT 0.8,
  price_per_sheet numeric NOT NULL DEFAULT 0,
  price_per_hour numeric NOT NULL DEFAULT 0,
  default_seconds_per_sheet numeric NOT NULL DEFAULT 0,

  setup_cost numeric NOT NULL DEFAULT 3000,
  min_cost numeric NOT NULL DEFAULT 3000,

  coef_contour_simple numeric NOT NULL DEFAULT 1,
  coef_contour_std_box numeric NOT NULL DEFAULT 1.2,
  coef_contour_complex_box numeric NOT NULL DEFAULT 1.3,
  coef_contour_small_parts numeric NOT NULL DEFAULT 1.5,
  coef_contour_label numeric NOT NULL DEFAULT 2,
  coef_contour_microflute numeric NOT NULL DEFAULT 1.4,

  coef_mat_paper numeric NOT NULL DEFAULT 1,
  coef_mat_cardboard numeric NOT NULL DEFAULT 1.2,
  coef_mat_thick_cardboard numeric NOT NULL DEFAULT 1.4,
  coef_mat_microflute numeric NOT NULL DEFAULT 1.5,
  coef_mat_plastic numeric NOT NULL DEFAULT 1.8,

  coef_bridges_low numeric NOT NULL DEFAULT 1,
  coef_bridges_med numeric NOT NULL DEFAULT 1.2,
  coef_bridges_high numeric NOT NULL DEFAULT 1.4,
  coef_bridges_extra numeric NOT NULL DEFAULT 1.6,
  bridges_low_max integer NOT NULL DEFAULT 2,
  bridges_med_max integer NOT NULL DEFAULT 5,
  bridges_high_max integer NOT NULL DEFAULT 10,

  coef_manual numeric NOT NULL DEFAULT 1.5,

  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flash_removal_prices TO authenticated;
GRANT ALL ON public.flash_removal_prices TO service_role;

ALTER TABLE public.flash_removal_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read flash_removal_prices"
ON public.flash_removal_prices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write flash_removal_prices"
ON public.flash_removal_prices FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_flash_removal_prices_updated_at
BEFORE UPDATE ON public.flash_removal_prices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.flash_removal_prices (name, product_type, removal_method, calc_mode, price_per_item, price_per_sheet, price_per_hour, default_seconds_per_sheet)
VALUES
  ('Коробка, автомат, за изделие', 'box', 'auto', 'per_item', 0.8, 0, 0, 0),
  ('Наклейка, ручное, за изделие', 'label', 'manual', 'per_item', 1.5, 0, 0, 0),
  ('Коробка, полуавтомат, за лист', 'box', 'semi_auto', 'per_sheet', 0, 15, 5000, 6);