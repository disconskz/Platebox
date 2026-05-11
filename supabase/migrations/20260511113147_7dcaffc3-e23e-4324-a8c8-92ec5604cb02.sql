
ALTER TABLE public.calculations
  ADD COLUMN IF NOT EXISTS is_multi_sku boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sku_count integer,
  ADD COLUMN IF NOT EXISTS impositions_count integer,
  ADD COLUMN IF NOT EXISTS empty_slots integer;

CREATE TABLE IF NOT EXISTS public.calculation_skus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_id uuid NOT NULL REFERENCES public.calculations(id) ON DELETE CASCADE,
  name text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  circulation integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calculation_skus_calc ON public.calculation_skus(calculation_id);

ALTER TABLE public.calculation_skus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access skus of own calcs"
ON public.calculation_skus
FOR ALL
USING (EXISTS (SELECT 1 FROM public.calculations c WHERE c.id = calculation_skus.calculation_id AND c.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.calculations c WHERE c.id = calculation_skus.calculation_id AND c.user_id = auth.uid()));
