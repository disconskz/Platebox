CREATE TABLE public.cut_count_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  print_format text NOT NULL,
  item_format text NOT NULL,
  cuts integer NOT NULL CHECK (cuts >= 0 AND cuts <= 200),
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (print_format, item_format)
);

ALTER TABLE public.cut_count_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read cut_count_rules" ON public.cut_count_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write cut_count_rules" ON public.cut_count_rules
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.cut_count_rules (print_format, item_format, cuts, sort_order) VALUES
  ('A1', 'A2', 6, 10),
  ('A1', 'A3', 8, 20),
  ('A3', 'A6', 12, 30);

INSERT INTO public.calc_constants (slug, name, value, unit, description, sort_order)
VALUES ('cut_price_per_print', 'Цена реза печатного листа', 1, '₸', 'Стоимость одного реза при резке печатного листа на конечный формат изделия', 50)
ON CONFLICT DO NOTHING;