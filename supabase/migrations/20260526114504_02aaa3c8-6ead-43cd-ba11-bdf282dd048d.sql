
CREATE TABLE public.film_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  film_type text NOT NULL,
  price_per_m2 numeric NOT NULL DEFAULT 0,
  setup_cost numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.film_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read film_prices" ON public.film_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write film_prices" ON public.film_prices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER film_prices_set_updated_at
  BEFORE UPDATE ON public.film_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.film_prices (name, film_type, price_per_m2, setup_cost, min_cost, sort_order) VALUES
  ('Глянцевая', 'gloss', 100, 3000, 0, 10),
  ('Матовая', 'matte', 100, 3000, 0, 20),
  ('Бархатная (soft touch)', 'velvet', 180, 3000, 0, 30),
  ('Soft touch', 'soft_touch', 200, 3000, 0, 40),
  ('Золотая', 'gold', 350, 5000, 0, 50),
  ('Серебряная', 'silver', 350, 5000, 0, 60),
  ('Цветная', 'color', 250, 5000, 0, 70);
