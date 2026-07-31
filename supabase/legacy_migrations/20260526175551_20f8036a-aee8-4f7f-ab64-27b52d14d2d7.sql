CREATE TABLE public.signature_collation_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  collation_type text NOT NULL DEFAULT 'machine',
  price_per_signature numeric NOT NULL DEFAULT 0,
  setup_cost numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,
  coef_standard_format numeric NOT NULL DEFAULT 1,
  coef_nonstandard_format numeric NOT NULL DEFAULT 1.2,
  coef_manual numeric NOT NULL DEFAULT 1.5,
  coef_machine numeric NOT NULL DEFAULT 1,
  coef_complex_sequence numeric NOT NULL DEFAULT 1.3,
  coef_inserts numeric NOT NULL DEFAULT 1.4,
  coef_thin_paper numeric NOT NULL DEFAULT 1.1,
  coef_many_signatures numeric NOT NULL DEFAULT 1.2,
  min_format_short integer NOT NULL DEFAULT 0,
  max_format_long integer NOT NULL DEFAULT 1200,
  min_density integer NOT NULL DEFAULT 0,
  max_density integer NOT NULL DEFAULT 350,
  min_circulation integer NOT NULL DEFAULT 0,
  max_circulation integer NOT NULL DEFAULT 1000000,
  max_signatures integer NOT NULL DEFAULT 32,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.signature_collation_prices TO authenticated;
GRANT ALL ON public.signature_collation_prices TO service_role;

ALTER TABLE public.signature_collation_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read signature_collation_prices"
  ON public.signature_collation_prices FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin write signature_collation_prices"
  ON public.signature_collation_prices FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_signature_collation_prices_updated_at
  BEFORE UPDATE ON public.signature_collation_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.signature_collation_prices
  (name, collation_type, price_per_signature, setup_cost, min_cost, max_signatures, sort_order)
VALUES
  ('Машинная подборка (стандарт)', 'machine', 0.8, 2000, 5000, 32, 10),
  ('Ручная подборка', 'manual', 1.5, 1000, 3000, 64, 20),
  ('Машинная подборка с вкладками', 'machine_inserts', 1.2, 3000, 6000, 24, 30);