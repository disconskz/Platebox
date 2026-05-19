-- Drop the older overload of apply_item_price_change without optimistic locking
-- (3-arg version). Keep only the 4-arg version with _expected_version.
DROP FUNCTION IF EXISTS public.apply_item_price_change(uuid, numeric, text);

-- Tighten EXECUTE permissions on mutating SECURITY DEFINER functions:
-- anonymous visitors must not be able to call them.
REVOKE EXECUTE ON FUNCTION public.apply_item_price_change(uuid, numeric, text, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.apply_calculation_margin(uuid, numeric) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.apply_item_price_change(uuid, numeric, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_calculation_margin(uuid, numeric) TO authenticated;