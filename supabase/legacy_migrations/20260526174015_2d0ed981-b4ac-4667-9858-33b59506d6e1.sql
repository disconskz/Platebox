
CREATE TABLE public.wire_spring_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  spring_type text NOT NULL DEFAULT 'wire_o_3_1',
  color text NOT NULL DEFAULT 'silver',
  diameter_mm numeric NOT NULL DEFAULT 0,
  pitch_mm numeric NOT NULL DEFAULT 0,
  min_block_thickness numeric NOT NULL DEFAULT 0,
  max_block_thickness numeric NOT NULL DEFAULT 0,
  price_per_loop numeric NOT NULL DEFAULT 0,
  work_price_per_item numeric NOT NULL DEFAULT 0,
  setup_cost numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wire_spring_prices TO authenticated;
GRANT ALL ON public.wire_spring_prices TO service_role;

ALTER TABLE public.wire_spring_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read wire_spring_prices" ON public.wire_spring_prices
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write wire_spring_prices" ON public.wire_spring_prices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_wire_spring_prices_updated_at
  BEFORE UPDATE ON public.wire_spring_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.paper_thickness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  density integer NOT NULL UNIQUE,
  thickness_mm numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paper_thickness TO authenticated;
GRANT ALL ON public.paper_thickness TO service_role;

ALTER TABLE public.paper_thickness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read paper_thickness" ON public.paper_thickness
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write paper_thickness" ON public.paper_thickness
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_paper_thickness_updated_at
  BEFORE UPDATE ON public.paper_thickness
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.paper_thickness (density, thickness_mm, sort_order) VALUES
  (80, 0.10, 10),
  (120, 0.13, 20),
  (160, 0.17, 30),
  (200, 0.22, 40),
  (250, 0.28, 50),
  (300, 0.35, 60);

INSERT INTO public.wire_spring_prices
  (name, spring_type, color, diameter_mm, pitch_mm, min_block_thickness, max_block_thickness,
   price_per_loop, work_price_per_item, setup_cost, min_cost, sort_order)
VALUES
  ('Wire-O 3:1 ⌀6 мм',  'wire_o_3_1', 'silver',  6, 8,  0,  4, 1.2, 20, 3000, 0, 10),
  ('Wire-O 3:1 ⌀8 мм',  'wire_o_3_1', 'silver',  8, 8,  4,  6, 1.4, 20, 3000, 0, 20),
  ('Wire-O 3:1 ⌀10 мм', 'wire_o_3_1', 'silver', 10, 8,  6,  8, 1.5, 22, 3000, 0, 30),
  ('Wire-O 3:1 ⌀12 мм', 'wire_o_3_1', 'silver', 12, 8,  8, 10, 1.7, 22, 3000, 0, 40),
  ('Wire-O 2:1 ⌀14 мм', 'wire_o_2_1', 'silver', 14, 12, 10, 13, 2.0, 24, 3500, 0, 50),
  ('Wire-O 2:1 ⌀16 мм', 'wire_o_2_1', 'silver', 16, 12, 13, 16, 2.3, 24, 3500, 0, 60),
  ('Wire-O 2:1 ⌀20 мм', 'wire_o_2_1', 'silver', 20, 12, 16, 20, 2.8, 26, 4000, 0, 70);
