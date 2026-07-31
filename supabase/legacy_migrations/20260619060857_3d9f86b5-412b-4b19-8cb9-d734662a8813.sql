-- Справочник лаков для операции «Выборочный лак»
CREATE TABLE public.varnish_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  material_price_per_m2 NUMERIC NOT NULL DEFAULT 0,
  work_price_per_sheet NUMERIC NOT NULL DEFAULT 0,
  setup_price NUMERIC NOT NULL DEFAULT 0,
  tooling_price NUMERIC NOT NULL DEFAULT 0,
  circulation_coef JSONB NOT NULL DEFAULT '[{"min":0,"max":500,"k":1.3},{"min":501,"max":2000,"k":1.0},{"min":2001,"max":null,"k":0.85}]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.varnish_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.varnish_types TO authenticated;
GRANT ALL ON public.varnish_types TO service_role;

ALTER TABLE public.varnish_types ENABLE ROW LEVEL SECURITY;

-- Все авторизованные могут читать
CREATE POLICY "varnish_types readable by authenticated"
  ON public.varnish_types FOR SELECT
  TO authenticated
  USING (true);

-- Управлять может только admin
CREATE POLICY "varnish_types admin insert"
  ON public.varnish_types FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "varnish_types admin update"
  ON public.varnish_types FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "varnish_types admin delete"
  ON public.varnish_types FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER varnish_types_set_updated_at
  BEFORE UPDATE ON public.varnish_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Сидируем 3 пресета
INSERT INTO public.varnish_types (name, material_price_per_m2, work_price_per_sheet, setup_price, tooling_price, sort_order) VALUES
  ('Выборочный лак (матовый)', 450, 8, 3000, 5000, 10),
  ('Выборочный лак (глянцевый)', 480, 8, 3000, 5000, 20),
  ('Выборочный лак 3D / толстослойный', 950, 14, 5000, 8000, 30);