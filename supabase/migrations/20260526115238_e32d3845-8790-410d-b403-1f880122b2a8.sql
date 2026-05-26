
INSERT INTO public.calc_constants (slug, name, value, unit, description, sort_order)
VALUES ('diecut_waste_pick_per_item', 'Выдергивание облоя — цена за изделие', 1, '₸', 'Стоимость выдергивания облоя после высечки за 1 готовое изделие.', 200)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE public.pouch_lamination_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  film_type text NOT NULL DEFAULT 'gloss',
  film_thickness integer NOT NULL DEFAULT 75,
  price_per_item numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pouch_lamination_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read pouch_lamination_prices" ON public.pouch_lamination_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write pouch_lamination_prices" ON public.pouch_lamination_prices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER pouch_lamination_prices_set_updated_at
  BEFORE UPDATE ON public.pouch_lamination_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.pouch_lamination_prices (name, width, height, film_type, film_thickness, price_per_item, min_cost, sort_order) VALUES
  ('A7 (визиточный)', 80,  111, 'gloss', 75, 10, 2000, 10),
  ('A6',              111, 154, 'gloss', 75, 15, 2500, 20),
  ('A5',              154, 216, 'gloss', 75, 25, 3000, 30),
  ('A4',              216, 303, 'gloss', 75, 45, 4000, 40),
  ('A3',              303, 426, 'gloss', 75, 80, 6000, 50);
