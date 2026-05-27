
CREATE TABLE public.perforation_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,

  perforation_type text NOT NULL DEFAULT 'tear',
  equipment_type text NOT NULL DEFAULT 'tigel',
  calc_mode text NOT NULL DEFAULT 'per_length',

  price_per_meter numeric NOT NULL DEFAULT 0,
  price_per_sheet numeric NOT NULL DEFAULT 0,
  price_per_pass numeric NOT NULL DEFAULT 0,

  coef_paper_light numeric NOT NULL DEFAULT 1,
  coef_paper_med numeric NOT NULL DEFAULT 1.2,
  coef_paper_heavy numeric NOT NULL DEFAULT 1.5,
  coef_cardboard numeric NOT NULL DEFAULT 2,
  coef_plastic numeric NOT NULL DEFAULT 2.5,
  density_light_max integer NOT NULL DEFAULT 130,
  density_med_max integer NOT NULL DEFAULT 250,
  density_heavy_max integer NOT NULL DEFAULT 400,

  coef_micro numeric NOT NULL DEFAULT 1.2,
  coef_figured numeric NOT NULL DEFAULT 1.5,
  coef_manual numeric NOT NULL DEFAULT 1.5,
  coef_nonstandard_format numeric NOT NULL DEFAULT 1.3,
  coef_many_lines numeric NOT NULL DEFAULT 1.2,
  many_lines_threshold integer NOT NULL DEFAULT 3,

  min_format_short integer NOT NULL DEFAULT 0,
  max_format_long integer NOT NULL DEFAULT 1200,
  max_paper_density integer NOT NULL DEFAULT 400,
  max_lines_per_pass integer NOT NULL DEFAULT 10,

  setup_cost numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,

  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.perforation_prices TO authenticated;
GRANT ALL ON public.perforation_prices TO service_role;

ALTER TABLE public.perforation_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read perforation_prices"
  ON public.perforation_prices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin write perforation_prices"
  ON public.perforation_prices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_perforation_prices_updated_at
  BEFORE UPDATE ON public.perforation_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.perforation_prices (name, perforation_type, equipment_type, calc_mode, price_per_meter, price_per_sheet, price_per_pass, setup_cost, min_cost, sort_order) VALUES
  ('Отрывная (тигель), по длине', 'tear', 'tigel', 'per_length', 15, 0, 0, 3000, 3000, 10),
  ('Микроперфорация (нумератор), по листу', 'micro', 'numbering_machine', 'per_sheet', 0, 2, 0, 2000, 2000, 20),
  ('Перфорация сгиба (тигель), по проходу', 'fold', 'tigel', 'per_pass', 0, 0, 1.5, 2500, 2500, 30);
