ALTER TABLE public.press_machines
  ADD COLUMN cost_per_impression NUMERIC NOT NULL DEFAULT 3;

UPDATE public.press_machines SET cost_per_impression = 3 WHERE name = 'A3+';
UPDATE public.press_machines SET cost_per_impression = 5 WHERE name = 'A2+';
UPDATE public.press_machines SET cost_per_impression = 8 WHERE name = 'A1';