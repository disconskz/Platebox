-- 1. Add setup_sheets column to operations
ALTER TABLE public.operations ADD COLUMN IF NOT EXISTS setup_sheets integer DEFAULT 0;
ALTER TABLE public.operations ADD COLUMN IF NOT EXISTS format_label text;

-- 2. Format presets table
CREATE TABLE IF NOT EXISTS public.format_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  category text DEFAULT 'standard',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.format_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth read formats" ON public.format_presets;
CREATE POLICY "Auth read formats" ON public.format_presets
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin write formats" ON public.format_presets;
CREATE POLICY "Admin write formats" ON public.format_presets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. System settings: upsert keys
INSERT INTO public.system_settings (key, value, description) VALUES
  ('vat_percent', '16', 'НДС, %'),
  ('soc_deductions_percent', '10', 'Социальные отчисления, %'),
  ('energy_overhead_percent', '20', 'Накладные расходы (энергия и пр.), %'),
  ('currency', 'тг', 'Валюта расчётов')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;
