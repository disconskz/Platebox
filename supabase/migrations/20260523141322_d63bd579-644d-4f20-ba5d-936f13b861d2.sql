ALTER TABLE public.calc_variant_stages
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'formula',
  ADD COLUMN IF NOT EXISTS system_key text;

ALTER TABLE public.calc_variant_stages
  DROP CONSTRAINT IF EXISTS calc_variant_stages_source_check;
ALTER TABLE public.calc_variant_stages
  ADD CONSTRAINT calc_variant_stages_source_check
  CHECK (source IN ('formula','system','material'));