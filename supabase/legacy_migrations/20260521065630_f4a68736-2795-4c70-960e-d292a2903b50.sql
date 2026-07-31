CREATE TABLE IF NOT EXISTS public.operation_work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_code integer NOT NULL,
  code integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  price_source text NOT NULL DEFAULT '',
  quantity_source text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operation_code, code)
);
ALTER TABLE public.operation_work_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read operation_work_items" ON public.operation_work_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write operation_work_items" ON public.operation_work_items FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_op_work_items_updated BEFORE UPDATE ON public.operation_work_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();