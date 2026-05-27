CREATE TABLE public.window_attachment_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  window_material text NOT NULL DEFAULT 'pet',
  window_shape text NOT NULL DEFAULT 'rect',
  application_method text NOT NULL DEFAULT 'semi_auto',
  equipment_type text NOT NULL DEFAULT 'semi_auto',
  calc_mode text NOT NULL DEFAULT 'combined',
  material_thickness_mkm numeric NOT NULL DEFAULT 200,
  price_material_per_m2 numeric NOT NULL DEFAULT 1200,
  price_apply_per_item numeric NOT NULL DEFAULT 5,
  price_apply_per_m2 numeric NOT NULL DEFAULT 0,
  setup_cost numeric NOT NULL DEFAULT 3000,
  min_cost numeric NOT NULL DEFAULT 3000,
  coef_standard numeric NOT NULL DEFAULT 1,
  coef_figured numeric NOT NULL DEFAULT 1.3,
  coef_thick_pet numeric NOT NULL DEFAULT 1.2,
  coef_manual numeric NOT NULL DEFAULT 1.5,
  coef_nonstandard_format numeric NOT NULL DEFAULT 1.2,
  coef_many_windows numeric NOT NULL DEFAULT 1.2,
  coef_complex_position numeric NOT NULL DEFAULT 1.3,
  thick_pet_threshold_mkm numeric NOT NULL DEFAULT 250,
  many_windows_threshold integer NOT NULL DEFAULT 2,
  min_window_mm integer NOT NULL DEFAULT 10,
  max_window_mm integer NOT NULL DEFAULT 600,
  max_material_thickness_mkm numeric NOT NULL DEFAULT 500,
  allowed_shapes text NOT NULL DEFAULT 'rect,round,oval,figured,nonstandard',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.window_attachment_prices TO authenticated;
GRANT ALL ON public.window_attachment_prices TO service_role;

ALTER TABLE public.window_attachment_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read window_attachment_prices"
ON public.window_attachment_prices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write window_attachment_prices"
ON public.window_attachment_prices FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_window_attachment_prices_updated_at
BEFORE UPDATE ON public.window_attachment_prices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.window_attachment_prices (name, window_material, window_shape, application_method, equipment_type, calc_mode, material_thickness_mkm, price_material_per_m2, price_apply_per_item, price_apply_per_m2, setup_cost, min_cost)
VALUES
  ('PET 200мкм, прямоуг., полуавтомат', 'pet', 'rect', 'semi_auto', 'semi_auto', 'combined', 200, 1200, 5, 0, 3000, 3000),
  ('PVC 250мкм, прямоуг., авто', 'pvc', 'rect', 'auto', 'auto', 'combined', 250, 1400, 3, 0, 3000, 3000),
  ('PET фигурное, ручное', 'pet', 'figured', 'manual', 'manual', 'combined', 250, 1500, 15, 0, 3000, 3000);