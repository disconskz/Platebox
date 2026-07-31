CREATE TABLE public.signature_folding_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  fold_type text NOT NULL DEFAULT 'parallel',
  machine_type text NOT NULL DEFAULT 'machine',
  price_per_fold numeric NOT NULL DEFAULT 0,
  price_per_signature numeric NOT NULL DEFAULT 0,
  setup_cost numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,
  coef_density_light numeric NOT NULL DEFAULT 1,
  coef_density_medium numeric NOT NULL DEFAULT 1.2,
  coef_density_heavy numeric NOT NULL DEFAULT 1.5,
  coef_manual numeric NOT NULL DEFAULT 2,
  coef_nonstandard_format numeric NOT NULL DEFAULT 1.3,
  min_density integer NOT NULL DEFAULT 0,
  max_density integer NOT NULL DEFAULT 350,
  min_format_short integer NOT NULL DEFAULT 0,
  max_format_long integer NOT NULL DEFAULT 1200,
  max_folds integer NOT NULL DEFAULT 4,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.signature_folding_prices TO authenticated;
GRANT ALL ON public.signature_folding_prices TO service_role;

ALTER TABLE public.signature_folding_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read signature_folding_prices" ON public.signature_folding_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write signature_folding_prices" ON public.signature_folding_prices FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_signature_folding_prices_updated_at BEFORE UPDATE ON public.signature_folding_prices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.signature_folding_prices (name, fold_type, machine_type, price_per_fold, price_per_signature, setup_cost, min_cost, sort_order) VALUES
  ('Машинная — параллельная',     'parallel',      'machine', 0.5, 0, 3000, 0, 10),
  ('Машинная — перпендикулярная', 'perpendicular', 'machine', 0.5, 0, 3000, 0, 20),
  ('Машинная — комбинированная',  'combined',      'machine', 0.6, 0, 3500, 0, 30),
  ('Ручная — гармошка',           'accordion',     'manual',  1.5, 0, 1500, 0, 90);