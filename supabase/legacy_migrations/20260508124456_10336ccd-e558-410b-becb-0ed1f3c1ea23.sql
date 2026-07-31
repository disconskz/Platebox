ALTER TABLE public.calculations
  ADD COLUMN IF NOT EXISTS purchase_format_width integer,
  ADD COLUMN IF NOT EXISTS purchase_format_height integer;