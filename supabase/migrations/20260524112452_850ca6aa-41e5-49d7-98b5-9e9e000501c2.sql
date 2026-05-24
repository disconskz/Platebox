-- Atomic replace of variant stages: delete + insert in single transaction.
CREATE OR REPLACE FUNCTION public.replace_variant_stages(
  _variant_id uuid,
  _stages jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.calc_variants WHERE id = _variant_id) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'variant_not_found';
  END IF;

  IF _stages IS NULL OR jsonb_typeof(_stages) <> 'array' THEN
    RAISE EXCEPTION 'invalid_stages_payload';
  END IF;

  DELETE FROM public.calc_variant_stages WHERE variant_id = _variant_id;

  IF jsonb_array_length(_stages) > 0 THEN
    INSERT INTO public.calc_variant_stages (
      variant_id, name, unit, formula,
      material_id, material_formula, sort_order, source, system_key
    )
    SELECT
      _variant_id,
      COALESCE(s->>'name', 'Этап'),
      COALESCE(s->>'unit', 'шт'),
      COALESCE(s->'formula', '{"num":0}'::jsonb),
      NULLIF(s->>'material_id','')::uuid,
      CASE WHEN s ? 'material_formula' AND jsonb_typeof(s->'material_formula') <> 'null'
           THEN s->'material_formula' ELSE NULL END,
      COALESCE((s->>'sort_order')::int, (ord * 10)),
      COALESCE(NULLIF(s->>'source',''), 'formula'),
      NULLIF(s->>'system_key','')
    FROM jsonb_array_elements(_stages) WITH ORDINALITY AS t(s, ord);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_variant_stages(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_variant_stages(uuid, jsonb) TO authenticated;

-- Atomic activation of variant: deactivate all of its product type, activate the chosen one.
CREATE OR REPLACE FUNCTION public.set_active_variant(_variant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT base_product_type INTO v_base FROM public.calc_variants WHERE id = _variant_id;
  IF v_base IS NULL THEN
    RAISE EXCEPTION 'variant_not_found';
  END IF;

  UPDATE public.calc_variants
     SET is_active = (id = _variant_id),
         updated_at = now()
   WHERE base_product_type = v_base
     AND (is_active <> (id = _variant_id));
END;
$$;

REVOKE ALL ON FUNCTION public.set_active_variant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_active_variant(uuid) TO authenticated;