CREATE TABLE public.block_pressing_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  pressing_type text NOT NULL DEFAULT 'block',
  machine_type text NOT NULL DEFAULT 'hydraulic',
  calc_mode text NOT NULL DEFAULT 'per_item',
  price_per_item numeric NOT NULL DEFAULT 0,
  price_per_hour numeric NOT NULL DEFAULT 0,
  time_per_item_sec numeric NOT NULL DEFAULT 0,
  setup_cost numeric NOT NULL DEFAULT 0,
  min_cost numeric NOT NULL DEFAULT 0,
  coef_thickness_thin numeric NOT NULL DEFAULT 1,
  coef_thickness_med numeric NOT NULL DEFAULT 1.1,
  coef_thickness_thick numeric NOT NULL DEFAULT 1.3,
  coef_thickness_extra numeric NOT NULL DEFAULT 1.5,
  thickness_thin_max numeric NOT NULL DEFAULT 10,
  thickness_med_max numeric NOT NULL DEFAULT 20,
  thickness_thick_max numeric NOT NULL DEFAULT 40,
  coef_format_a5 numeric NOT NULL DEFAULT 1,
  coef_format_a4 numeric NOT NULL DEFAULT 1.2,
  coef_format_a3 numeric NOT NULL DEFAULT 1.5,
  coef_format_nonstandard numeric NOT NULL DEFAULT 1.4,
  coef_thick_block numeric NOT NULL DEFAULT 1.2,
  coef_heavy_block numeric NOT NULL DEFAULT 1.2,
  coef_manual numeric NOT NULL DEFAULT 1.5,
  coef_designer_paper numeric NOT NULL DEFAULT 1.2,
  coef_small_circulation numeric NOT NULL DEFAULT 1.2,
  thick_block_threshold numeric NOT NULL DEFAULT 25,
  heavy_block_threshold numeric NOT NULL DEFAULT 1500,
  small_circulation_threshold integer NOT NULL DEFAULT 100,
  min_format_short integer NOT NULL DEFAULT 0,
  max_format_long integer NOT NULL DEFAULT 1200,
  min_block_thickness numeric NOT NULL DEFAULT 0,
  max_block_thickness numeric NOT NULL DEFAULT 80,
  max_block_weight numeric NOT NULL DEFAULT 5000,
  min_circulation integer NOT NULL DEFAULT 0,
  max_circulation integer NOT NULL DEFAULT 1000000,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.block_pressing_prices TO authenticated;
GRANT ALL ON public.block_pressing_prices TO service_role;

ALTER TABLE public.block_pressing_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth read block_pressing_prices" ON public.block_pressing_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write block_pressing_prices" ON public.block_pressing_prices FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_block_pressing_prices_updated_at BEFORE UPDATE ON public.block_pressing_prices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.block_pressing_prices (name, pressing_type, machine_type, calc_mode, price_per_item, price_per_hour, time_per_item_sec, setup_cost, min_cost)
VALUES
  ('Гидравлический пресс — блок', 'block', 'hydraulic', 'per_item', 15, 5000, 6, 3000, 1500),
  ('Автоматическая линия — блок', 'block', 'auto', 'per_item', 8, 8000, 3, 5000, 2000),
  ('Ручной пресс', 'block', 'manual', 'per_item', 30, 2000, 30, 1000, 1000);