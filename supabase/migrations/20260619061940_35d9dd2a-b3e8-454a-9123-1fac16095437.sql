
ALTER TABLE public.film_prices
  ADD COLUMN IF NOT EXISTS work_price_per_m2 numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.film_prices
SET work_price_per_m2 = CASE
  WHEN film_type IN ('gloss','matte') THEN 60
  WHEN film_type IN ('velvet','soft_touch') THEN 90
  WHEN film_type IN ('gold','silver','color') THEN 120
  ELSE 60
END
WHERE work_price_per_m2 = 0;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.film_prices TO authenticated;
GRANT ALL ON public.film_prices TO service_role;
