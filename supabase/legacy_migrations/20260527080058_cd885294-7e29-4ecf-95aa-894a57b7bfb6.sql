CREATE TABLE public.embossing_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  embossing_type text NOT NULL DEFAULT 'standard',
  foil_type text NOT NULL DEFAULT 'none',
  uses_foil boolean NOT NULL DEFAULT false,
  cliche_price_per_cm2 numeric NOT NULL DEFAULT 200,
  cliche_min_cost numeric NOT NULL DEFAULT 5000,
  setup_cost numeric NOT NULL DEFAULT 5000,
  price_per_impression numeric NOT NULL DEFAULT 15,
  foil_price_per_cm2 numeric NOT NULL DEFAULT 0.05,
  complexity_coef numeric NOT NULL DEFAULT 1,
  min_cost numeric NOT NULL DEFAULT 0,
  coef_standard numeric NOT NULL DEFAULT 1,
  coef_congrev numeric NOT NULL DEFAULT 1.5,
  coef_double numeric NOT NULL DEFAULT 1.7,
  coef_leather numeric NOT NULL DEFAULT 1.4,
  coef_complex_position numeric NOT NULL DEFAULT 1.5,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.embossing_prices TO authenticated;
GRANT ALL ON public.embossing_prices TO service_role;

ALTER TABLE public.embossing_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read embossing_prices" ON public.embossing_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write embossing_prices" ON public.embossing_prices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_embossing_prices_updated_at
  BEFORE UPDATE ON public.embossing_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.embossing_prices (name, embossing_type, foil_type, uses_foil, cliche_price_per_cm2, cliche_min_cost, setup_cost, price_per_impression, foil_price_per_cm2, complexity_coef)
VALUES
  ('Тиснение фольгой, стандарт', 'standard', 'gold', true, 200, 5000, 5000, 15, 0.05, 1),
  ('Конгревное тиснение (без фольги)', 'congrev', 'none', false, 250, 6000, 6000, 18, 0, 1.5),
  ('Блинтовое тиснение (без фольги)', 'blind', 'none', false, 200, 5000, 5000, 12, 0, 1);
