CREATE TABLE public.endpaper_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  endpaper_type text NOT NULL DEFAULT 'standard',
  paper_name text NOT NULL DEFAULT '',
  paper_density integer NOT NULL DEFAULT 120,
  paper_calc_mode text NOT NULL DEFAULT 'per_m2',
  paper_price_per_m2 numeric NOT NULL DEFAULT 0,
  paper_price_per_sheet numeric NOT NULL DEFAULT 0,
  sheet_width integer NOT NULL DEFAULT 700,
  sheet_height integer NOT NULL DEFAULT 1000,
  endpapers_per_item integer NOT NULL DEFAULT 2,
  needs_print boolean NOT NULL DEFAULT false,
  print_price_per_sheet numeric NOT NULL DEFAULT 0,
  fold_price numeric NOT NULL DEFAULT 0,
  crease_price numeric NOT NULL DEFAULT 0,
  density_threshold integer NOT NULL DEFAULT 150,
  glue_price_per_item numeric NOT NULL DEFAULT 0,
  setup_cost numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,
  coef_standard numeric NOT NULL DEFAULT 1,
  coef_printed numeric NOT NULL DEFAULT 1.2,
  coef_heavy_paper numeric NOT NULL DEFAULT 1.2,
  coef_designer_paper numeric NOT NULL DEFAULT 1.3,
  coef_nonstandard_format numeric NOT NULL DEFAULT 1.3,
  coef_manual_glue numeric NOT NULL DEFAULT 1.5,
  heavy_paper_threshold integer NOT NULL DEFAULT 170,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.endpaper_prices TO authenticated;
GRANT ALL ON public.endpaper_prices TO service_role;

ALTER TABLE public.endpaper_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read endpaper_prices" ON public.endpaper_prices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write endpaper_prices" ON public.endpaper_prices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER endpaper_prices_updated_at
  BEFORE UPDATE ON public.endpaper_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.endpaper_prices (name, endpaper_type, paper_name, paper_density, paper_price_per_m2, endpapers_per_item, fold_price, crease_price, glue_price_per_item, setup_cost, min_cost)
VALUES
  ('Стандартный форзац (офсет 120г)', 'standard', 'Офсет', 120, 200, 2, 2, 3, 8, 1500, 0),
  ('Дизайнерский форзац (160г)', 'designer', 'Дизайнерская бумага', 160, 300, 2, 2, 3, 10, 2000, 0),
  ('Печатный форзац (офсет 150г)', 'printed', 'Офсет', 150, 220, 2, 2, 3, 10, 2500, 0);