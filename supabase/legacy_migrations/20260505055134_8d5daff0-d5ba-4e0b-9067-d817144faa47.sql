
ALTER TABLE public.equipment 
  ADD COLUMN IF NOT EXISTS cost_per_impression numeric DEFAULT 3,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.calculations
  ADD COLUMN IF NOT EXISTS equipment_id uuid,
  ADD COLUMN IF NOT EXISTS print_cost_per_impression numeric;

INSERT INTO public.equipment (name, type, max_format_width, max_format_height, cost_per_impression, notes)
SELECT 'GTO 52', 'print', 360, 520, 3, 'Малоформатная офсетная машина'
WHERE NOT EXISTS (SELECT 1 FROM public.equipment WHERE name = 'GTO 52');

INSERT INTO public.equipment (name, type, max_format_width, max_format_height, cost_per_impression, notes)
SELECT 'SM-52', 'print', 360, 520, 3.5, 'Офсетная машина среднего формата'
WHERE NOT EXISTS (SELECT 1 FROM public.equipment WHERE name = 'SM-52');

INSERT INTO public.equipment (name, type, max_format_width, max_format_height, cost_per_impression, notes)
SELECT 'SM-74', 'print', 530, 740, 5, 'Офсет полуформата'
WHERE NOT EXISTS (SELECT 1 FROM public.equipment WHERE name = 'SM-74');
