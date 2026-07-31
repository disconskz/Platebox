
CREATE TABLE public.rigel_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rigel_type text NOT NULL DEFAULT 'metal',
  rigel_material text NOT NULL DEFAULT 'metal',
  rigel_color text NOT NULL DEFAULT 'white',
  calc_mode text NOT NULL DEFAULT 'per_item',
  price_per_item numeric NOT NULL DEFAULT 0,
  price_per_meter numeric NOT NULL DEFAULT 0,
  length_allowance numeric NOT NULL DEFAULT 0,
  has_hanger boolean NOT NULL DEFAULT false,
  hanger_included boolean NOT NULL DEFAULT true,
  hanger_price numeric NOT NULL DEFAULT 0,
  install_price numeric NOT NULL DEFAULT 0,
  install_method text NOT NULL DEFAULT 'manual',
  setup_cost numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,
  coef_standard numeric NOT NULL DEFAULT 1,
  coef_nonstandard_length numeric NOT NULL DEFAULT 1.2,
  coef_manual numeric NOT NULL DEFAULT 1.5,
  coef_nonstandard_color numeric NOT NULL DEFAULT 1.1,
  coef_small_circulation numeric NOT NULL DEFAULT 1.2,
  coef_complex_position numeric NOT NULL DEFAULT 1.3,
  small_circulation_threshold integer NOT NULL DEFAULT 100,
  min_width integer NOT NULL DEFAULT 0,
  max_width integer NOT NULL DEFAULT 1500,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rigel_prices TO authenticated;
GRANT ALL ON public.rigel_prices TO service_role;

ALTER TABLE public.rigel_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read rigel_prices" ON public.rigel_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write rigel_prices" ON public.rigel_prices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER rigel_prices_set_updated_at
  BEFORE UPDATE ON public.rigel_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
