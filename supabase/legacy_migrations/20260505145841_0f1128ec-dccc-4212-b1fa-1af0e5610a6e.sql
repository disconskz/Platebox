ALTER TABLE public.calculations DROP CONSTRAINT IF EXISTS calculations_product_type_check;
ALTER TABLE public.calculations ADD CONSTRAINT calculations_product_type_check CHECK (product_type = ANY (ARRAY[
  'leaflet','leaflet_diecut','booklet','sticker','sticker_diecut','bag',
  'businesscard','business_card','envelope','box','blank','selfcopy','folder',
  'poster','notepad','book','magazine','brochure','label',
  'calendar_wall','calendar_desk','calendar_quarter',
  'wobbler','shelftalker','kubus','catalog','custom'
]));