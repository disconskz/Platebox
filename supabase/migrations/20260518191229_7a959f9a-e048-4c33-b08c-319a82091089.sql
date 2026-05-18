-- 1) Optimistic locking version on calculations
ALTER TABLE public.calculations
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;

-- 2) Update apply_item_price_change to support optimistic locking
CREATE OR REPLACE FUNCTION public.apply_item_price_change(
  _item_id uuid,
  _new_price numeric,
  _reason text DEFAULT NULL::text,
  _expected_version integer DEFAULT NULL
)
RETURNS TABLE(total_cost numeric, sale_price numeric, profit numeric, version integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_calc_id uuid;
  v_owner uuid;
  v_qty numeric;
  v_old_price numeric;
  v_item_name text;
  v_margin numeric;
  v_new_total_cost numeric;
  v_new_sale numeric;
  v_cur_version integer;
  v_new_version integer;
BEGIN
  IF _new_price IS NULL OR _new_price < 0 OR _new_price > 1e9 THEN
    RAISE EXCEPTION 'invalid_price';
  END IF;

  SELECT ci.calculation_id, ci.quantity, ci.unit_price, ci.name
    INTO v_calc_id, v_qty, v_old_price, v_item_name
  FROM public.calculation_items ci
  WHERE ci.id = _item_id;

  IF v_calc_id IS NULL THEN
    RAISE EXCEPTION 'item_not_found';
  END IF;

  SELECT c.user_id, COALESCE(c.margin_percent, 30), COALESCE(c.version, 0)
    INTO v_owner, v_margin, v_cur_version
  FROM public.calculations c
  WHERE c.id = v_calc_id;

  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _expected_version IS NOT NULL AND _expected_version <> v_cur_version THEN
    RAISE EXCEPTION 'version_conflict';
  END IF;

  UPDATE public.calculation_items
    SET unit_price = _new_price,
        manual_price = _new_price,
        total_price = _new_price * COALESCE(v_qty, 0)
  WHERE id = _item_id;

  IF v_old_price IS DISTINCT FROM _new_price THEN
    INSERT INTO public.calculation_adjustments(
      calculation_id, item_name, original_price, adjusted_price, reason
    ) VALUES (v_calc_id, v_item_name, v_old_price, _new_price, NULLIF(_reason, ''));
  END IF;

  SELECT COALESCE(SUM(total_price), 0)
    INTO v_new_total_cost
  FROM public.calculation_items
  WHERE calculation_id = v_calc_id;

  v_new_sale := v_new_total_cost * (1 + v_margin / 100);
  v_new_version := v_cur_version + 1;

  UPDATE public.calculations
    SET total_cost = v_new_total_cost,
        sale_price = v_new_sale,
        profit = v_new_sale - v_new_total_cost,
        version = v_new_version,
        updated_at = now()
  WHERE id = v_calc_id;

  total_cost := v_new_total_cost;
  sale_price := v_new_sale;
  profit := v_new_sale - v_new_total_cost;
  version := v_new_version;
  RETURN NEXT;
END;
$function$;

-- 3) client_logs table for centralised error reporting
CREATE TABLE IF NOT EXISTS public.client_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  message text NOT NULL,
  stack text,
  url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can insert own logs" ON public.client_logs;
CREATE POLICY "Authenticated can insert own logs"
  ON public.client_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read client_logs" ON public.client_logs;
CREATE POLICY "Admins can read client_logs"
  ON public.client_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_client_logs_created_at ON public.client_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_logs_user_id ON public.client_logs (user_id);