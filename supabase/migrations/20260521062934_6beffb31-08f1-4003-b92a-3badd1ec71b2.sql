-- Каталог видов работ (операций)
CREATE TABLE public.operation_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code integer NOT NULL UNIQUE,
  category text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operation_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read operation_catalog" ON public.operation_catalog
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write operation_catalog" ON public.operation_catalog
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_operation_catalog_updated
  BEFORE UPDATE ON public.operation_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_operation_catalog_category ON public.operation_catalog(category, sort_order);

-- Параметры операций (по одной строке на параметр)
CREATE TABLE public.operation_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_code integer NOT NULL REFERENCES public.operation_catalog(code) ON DELETE CASCADE,
  code integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  default_value text NOT NULL DEFAULT '',
  formula text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(operation_code, code)
);

ALTER TABLE public.operation_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read operation_parameters" ON public.operation_parameters
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write operation_parameters" ON public.operation_parameters
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_operation_parameters_updated
  BEFORE UPDATE ON public.operation_parameters
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_operation_parameters_op ON public.operation_parameters(operation_code, sort_order);