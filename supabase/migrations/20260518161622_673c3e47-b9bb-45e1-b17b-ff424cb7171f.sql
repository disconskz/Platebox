
CREATE OR REPLACE FUNCTION public.apply_item_price_change(
  _item_id uuid,
  _new_price numeric,
  _reason text DEFAULT NULL
)
RETURNS TABLE(total_cost numeric, sale_price numeric, profit numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_calc_id uuid;
  v_owner uuid;
  v_qty numeric;
  v_old_price numeric;
  v_item_name text;
  v_margin numeric;
  v_new_total_cost numeric;
  v_new_sale numeric;
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

  SELECT c.user_id, COALESCE(c.margin_percent, 30)
    INTO v_owner, v_margin
  FROM public.calculations c
  WHERE c.id = v_calc_id;

  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
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

  UPDATE public.calculations
    SET total_cost = v_new_total_cost,
        sale_price = v_new_sale,
        profit = v_new_sale - v_new_total_cost,
        updated_at = now()
  WHERE id = v_calc_id;

  total_cost := v_new_total_cost;
  sale_price := v_new_sale;
  profit := v_new_sale - v_new_total_cost;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_item_price_change(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_item_price_change(uuid, numeric, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.apply_calculation_margin(
  _calculation_id uuid,
  _margin numeric
)
RETURNS TABLE(total_cost numeric, sale_price numeric, profit numeric, margin_percent numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_total numeric;
  v_sale numeric;
BEGIN
  IF _margin IS NULL OR _margin < 0 OR _margin > 1000 THEN
    RAISE EXCEPTION 'invalid_margin';
  END IF;

  SELECT user_id INTO v_owner FROM public.calculations WHERE id = _calculation_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COALESCE(SUM(total_price), 0)
    INTO v_total
  FROM public.calculation_items
  WHERE calculation_id = _calculation_id;

  v_sale := v_total * (1 + _margin / 100);

  UPDATE public.calculations
    SET margin_percent = _margin,
        total_cost = v_total,
        sale_price = v_sale,
        profit = v_sale - v_total,
        updated_at = now()
  WHERE id = _calculation_id;

  total_cost := v_total;
  sale_price := v_sale;
  profit := v_sale - v_total;
  margin_percent := _margin;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_calculation_margin(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_calculation_margin(uuid, numeric) TO authenticated;
