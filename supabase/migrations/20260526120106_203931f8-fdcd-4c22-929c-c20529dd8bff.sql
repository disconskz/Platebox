
CREATE TABLE public.variable_print_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  price_per_apply NUMERIC NOT NULL DEFAULT 0,
  setup_cost NUMERIC NOT NULL DEFAULT 0,
  min_cost NUMERIC NOT NULL DEFAULT 0,
  complexity NUMERIC NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kind)
);

ALTER TABLE public.variable_print_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read variable_print_prices"
  ON public.variable_print_prices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write variable_print_prices"
  ON public.variable_print_prices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_variable_print_prices_updated_at
  BEFORE UPDATE ON public.variable_print_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.variable_print_prices (kind, name, price_per_apply, setup_cost, min_cost, complexity, sort_order) VALUES
  ('numbering',       'Нумерация',         0.5, 1000, 0, 1, 10),
  ('barcode',         'Штрихкод',          1.0, 3000, 0, 1, 20),
  ('qrcode',          'QR-код',            1.5, 5000, 0, 1, 30),
  ('personalization', 'Персонализация',    2.0, 3000, 0, 1, 40),
  ('data_import',     'Переменные данные (Excel/CSV)', 2.0, 3000, 0, 1, 50);
