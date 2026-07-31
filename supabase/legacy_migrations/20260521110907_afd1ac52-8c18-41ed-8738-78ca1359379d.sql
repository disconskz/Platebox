ALTER TABLE public.operations
  ADD COLUMN IF NOT EXISTS min_cost numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description text;