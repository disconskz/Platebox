
-- Materials (бумага)
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('coated','offset','self_adhesive','cardboard','other')),
  density INTEGER NOT NULL,
  format_width INTEGER NOT NULL,
  format_height INTEGER NOT NULL,
  cost_per_sheet NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_fortress_sync BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Equipment
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('print','cut','fold','laminate','die_cut','stamp','other')),
  max_format_width INTEGER,
  max_format_height INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Operations
CREATE TABLE public.operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('prepress','print','postpress','logistics')),
  fixed_cost NUMERIC(10,2) DEFAULT 0,
  variable_cost NUMERIC(10,2) DEFAULT 0,
  unit TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lamination prices
CREATE TABLE public.lamination_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  film_type TEXT NOT NULL CHECK (film_type IN ('gloss','matte','velvet','gold','silver','color')),
  size_range TEXT NOT NULL CHECK (size_range IN ('up_to_a4_plus','a4_plus_to_a3_plus','a3_plus_to_a2_plus','a2_plus_to_a1')),
  cost_per_side NUMERIC(10,2) NOT NULL,
  UNIQUE(film_type, size_range)
);

-- System settings
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  default_margin_percent NUMERIC(5,2) DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Calculations
CREATE TABLE public.calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  product_type TEXT NOT NULL CHECK (product_type IN (
    'leaflet','leaflet_diecut','booklet','sticker','sticker_diecut','bag',
    'business_card','brochure','catalog','custom'
  )),
  category TEXT NOT NULL CHECK (category IN ('sheet','book_journal')),
  circulation INTEGER NOT NULL,
  format_type TEXT NOT NULL,
  format_width INTEGER,
  format_height INTEGER,
  color_front INTEGER NOT NULL DEFAULT 4,
  color_back INTEGER NOT NULL DEFAULT 4,
  material_id UUID REFERENCES public.materials(id),
  print_format_width INTEGER,
  print_format_height INTEGER,
  items_per_sheet INTEGER,
  is_rotated BOOLEAN DEFAULT false,
  turnaround_type TEXT CHECK (turnaround_type IN ('none','own','foreign')),
  forms_count INTEGER,
  forms_cost NUMERIC(12,2),
  forms_prep_cost NUMERIC(12,2),
  setup_sheets INTEGER,
  purchase_sheets INTEGER,
  paper_cost NUMERIC(12,2),
  paper_cut_cost NUMERIC(12,2),
  print_sheets INTEGER,
  print_cost NUMERIC(12,2),
  ink_cost NUMERIC(12,2),
  postpress JSONB DEFAULT '[]'::jsonb,
  total_cost NUMERIC(12,2),
  margin_percent NUMERIC(5,2) DEFAULT 30,
  sale_price NUMERIC(12,2),
  profit NUMERIC(12,2),
  is_template BOOLEAN DEFAULT false,
  client_id UUID REFERENCES public.clients(id),
  fortress_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.calculation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_id UUID REFERENCES public.calculations(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('prepress','material','print','postpress','logistics')),
  sort_order INTEGER DEFAULT 0,
  name TEXT NOT NULL,
  quantity NUMERIC(12,2),
  unit TEXT,
  unit_price NUMERIC(12,2),
  total_price NUMERIC(12,2),
  is_editable BOOLEAN DEFAULT true,
  manual_price NUMERIC(12,2)
);

CREATE TABLE public.calculation_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_id UUID REFERENCES public.calculations(id) ON DELETE CASCADE,
  item_name TEXT,
  original_price NUMERIC(12,2),
  adjusted_price NUMERIC(12,2),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS with permissive policies (internal tool, no auth in MVP)
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lamination_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculation_adjustments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['materials','equipment','operations','lamination_prices','system_settings','clients','calculations','calculation_items','calculation_adjustments']) LOOP
    EXECUTE format('CREATE POLICY "public_all_%I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER calc_updated_at BEFORE UPDATE ON public.calculations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed system_settings
INSERT INTO public.system_settings(key,value,description) VALUES
('margin_left_right','2','Отступ справа/слева, мм'),
('margin_top','5','Отступ сверху, мм'),
('margin_bottom','10','Отступ снизу, мм'),
('bleed','3','Доливка с каждой стороны, мм'),
('max_print_width','520','Макс. формат печати, мм'),
('max_print_height','360','Макс. формат печати, мм'),
('sticker_gap','4','Зазор между стикерами, мм'),
('sticker_edge_margin','8','Отступ от края для стикеров, мм'),
('setup_sheets_own','150','Базовая приладка свой/без оборота'),
('setup_sheets_foreign','300','Базовая приладка чужой оборот'),
('setup_percent','1','Приладка, % от печатных листов'),
('bag_min_setup','200','Мин. приладка для пакетов'),
('form_cost','1000','Стоимость формы, тг'),
('form_prep_cost','500','Подготовка к печати за форму, тг'),
('cut_cost_per_sheet','1','Резка закупочного формата, тг/лист'),
('finish_cut_cost','1','Резка готовых листов, тг/сторона'),
('numbering_cost','2','Нумерация, тг/номер'),
('stamping_setup','5000','Приладка тиснения, тг'),
('stamping_cliche_min','5000','Мин. стоимость клише, тг'),
('stamping_cliche_per_cm2','200','Клише, тг/см²'),
('stamping_impression','20','Тиснение обычное, тг/оттиск'),
('stamping_impression_notebook','50','Тиснение блокноты, тг/оттиск'),
('design_cost','500','Дизайн, тг/единица'),
('default_margin_percent','30','Наценка по умолчанию, %');

-- Seed materials
INSERT INTO public.materials(name,type,density,format_width,format_height,cost_per_sheet,is_fortress_sync) VALUES
('Мелованная 130 г/м² 640×920','coated',130,640,920,100,false),
('Мелованная 130 г/м² 720×1040','coated',130,720,1040,120,false),
('Мелованная 150 г/м² 640×920','coated',150,640,920,115,false),
('Мелованная 200 г/м² 640×920','coated',200,640,920,140,false),
('Мелованная 300 г/м² 640×920','coated',300,640,920,180,false),
('Офсетная 80 г/м² 640×920','offset',80,640,920,55,false),
('Офсетная 120 г/м² 640×920','offset',120,640,920,75,false),
('Самоклейка глянцевая 640×920','self_adhesive',80,640,920,210,false),
('Картон 250 г/м² 640×920','cardboard',250,640,920,160,false);

-- Seed equipment
INSERT INTO public.equipment(name,type,max_format_width,max_format_height) VALUES
('ГТО-46','print',460,320),
('Heidelberg SM52','print',520,360),
('Резка POLAR','cut',1000,1000),
('Фальцмашина','fold',520,720),
('Ламинатор','laminate',520,720),
('Высечной пресс','die_cut',520,720),
('Тигель тиснения','stamp',360,520);

-- Seed operations
INSERT INTO public.operations(name,category,fixed_cost,variable_cost,unit) VALUES
('Дизайн / подготовка макета','prepress',0,500,'шт'),
('Фотовывод А3','prepress',0,800,'шт'),
('Фотовывод А2','prepress',0,1400,'шт'),
('Пластина (форма)','prepress',0,1000,'шт'),
('Подготовка к печати','prepress',0,500,'шт'),
('Печать офсетная (свой/без оборота)','print',0,3,'оттиск'),
('Печать офсетная (чужой оборот)','print',0,5,'оттиск'),
('Краска (комплект)','print',0,500,'комплект'),
('Резка закупочного формата','prepress',0,1,'рез'),
('Резка готовых листов','postpress',0,1,'сторона'),
('Фальцовка 1 сгиб','postpress',0,1.5,'шт'),
('Фальцовка 2 сгиба','postpress',0,2.5,'шт'),
('Высечка','postpress',2000,2,'шт'),
('Припрессовка плёнки','postpress',1000,8,'сторона'),
('Нумерация','postpress',0,2,'номер'),
('Упаковка','logistics',0,5,'пачка'),
('Пакеты А3+А4+А5 сборка','postpress',2000,15,'шт'),
('Упаковка журналов + резка','logistics',0,8,'шт');

-- Seed lamination prices
INSERT INTO public.lamination_prices(film_type,size_range,cost_per_side) VALUES
('gloss','up_to_a4_plus',17),
('gloss','a4_plus_to_a3_plus',26),
('gloss','a3_plus_to_a2_plus',42),
('gloss','a2_plus_to_a1',70),
('matte','up_to_a4_plus',17),
('matte','a4_plus_to_a3_plus',26),
('matte','a3_plus_to_a2_plus',42),
('matte','a2_plus_to_a1',70),
('velvet','up_to_a4_plus',25),
('velvet','a4_plus_to_a3_plus',35),
('velvet','a3_plus_to_a2_plus',70),
('velvet','a2_plus_to_a1',120),
('gold','up_to_a4_plus',45),
('gold','a4_plus_to_a3_plus',70),
('gold','a3_plus_to_a2_plus',120),
('gold','a2_plus_to_a1',200),
('silver','up_to_a4_plus',45),
('silver','a4_plus_to_a3_plus',70),
('silver','a3_plus_to_a2_plus',120),
('silver','a2_plus_to_a1',200),
('color','up_to_a4_plus',55),
('color','a4_plus_to_a3_plus',85),
('color','a3_plus_to_a2_plus',140),
('color','a2_plus_to_a1',230);
