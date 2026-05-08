DELETE FROM public.system_settings WHERE key = 'rule.layout.marginLR';
INSERT INTO public.system_settings (key, value, description) VALUES
  ('rule.layout.marginTop',    '3',  'Верхнее техполе, мм'),
  ('rule.layout.marginBottom', '3',  'Нижнее техполе, мм'),
  ('rule.layout.marginLeft',   '12', 'Внутреннее техполе (захват), мм'),
  ('rule.layout.marginRight',  '4',  'Внешнее техполе, мм'),
  ('rule.layout.bleed',        '2',  'Вылеты под обрез, мм')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;