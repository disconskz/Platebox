CREATE TABLE public.thermal_binding_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  glue_type text NOT NULL DEFAULT 'eva',
  price_per_mm numeric NOT NULL DEFAULT 0,
  work_price_per_item numeric NOT NULL DEFAULT 0,
  setup_cost numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,
  min_block_thickness numeric NOT NULL DEFAULT 2,
  max_block_thickness numeric NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.thermal_binding_prices TO authenticated;
GRANT ALL ON public.thermal_binding_prices TO service_role;

ALTER TABLE public.thermal_binding_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read thermal_binding_prices" ON public.thermal_binding_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write thermal_binding_prices" ON public.thermal_binding_prices FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_thermal_binding_prices_updated_at BEFORE UPDATE ON public.thermal_binding_prices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.thermal_binding_prices (name, glue_type, price_per_mm, work_price_per_item, setup_cost, min_cost, min_block_thickness, max_block_thickness, sort_order) VALUES
  ('EVA — стандарт', 'eva', 1.5, 35, 3000, 0, 2, 40, 10),
  ('PUR — премиум',  'pur', 2.5, 50, 5000, 0, 2, 50, 20);