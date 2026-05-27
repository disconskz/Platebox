CREATE TABLE public.congrev_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  congrev_type TEXT NOT NULL DEFAULT 'standard',
  allowed_materials TEXT NOT NULL DEFAULT 'paper,cardboard,leather,leatherette,fabric',
  cliche_price_per_cm2 NUMERIC NOT NULL DEFAULT 350,
  cliche_min_cost NUMERIC NOT NULL DEFAULT 8000,
  setup_cost NUMERIC NOT NULL DEFAULT 7000,
  price_per_impression NUMERIC NOT NULL DEFAULT 20,
  complexity_coef NUMERIC NOT NULL DEFAULT 1,
  min_cost NUMERIC NOT NULL DEFAULT 0,
  coef_standard NUMERIC NOT NULL DEFAULT 1,
  coef_deep NUMERIC NOT NULL DEFAULT 1.3,
  coef_3d NUMERIC NOT NULL DEFAULT 1.5,
  coef_with_foil NUMERIC NOT NULL DEFAULT 1.7,
  coef_reverse NUMERIC NOT NULL DEFAULT 1.3,
  coef_multilevel NUMERIC NOT NULL DEFAULT 1.5,
  coef_micro NUMERIC NOT NULL DEFAULT 1.3,
  coef_leather NUMERIC NOT NULL DEFAULT 1.4,
  coef_complex_position NUMERIC NOT NULL DEFAULT 1.5,
  coef_small_elements NUMERIC NOT NULL DEFAULT 1.3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.congrev_prices TO authenticated;
GRANT ALL ON public.congrev_prices TO service_role;

ALTER TABLE public.congrev_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read congrev_prices" ON public.congrev_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write congrev_prices" ON public.congrev_prices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_congrev_prices_updated_at BEFORE UPDATE ON public.congrev_prices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.congrev_prices (name, congrev_type, cliche_price_per_cm2, cliche_min_cost, setup_cost, price_per_impression, complexity_coef)
VALUES ('Конгрев стандартный', 'standard', 350, 8000, 7000, 20, 1.3);