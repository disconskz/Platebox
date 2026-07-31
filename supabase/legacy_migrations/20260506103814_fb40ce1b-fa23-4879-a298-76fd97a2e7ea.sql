
-- 1. Schema changes
ALTER TABLE public.print_formats ADD COLUMN purchase_format_id uuid REFERENCES public.purchase_formats(id) ON DELETE CASCADE;
ALTER TABLE public.materials ADD COLUMN purchase_format_id uuid REFERENCES public.purchase_formats(id) ON DELETE SET NULL;

CREATE TABLE public.envelope_formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.envelope_formats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read envelope_formats" ON public.envelope_formats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write envelope_formats" ON public.envelope_formats FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Reset and seed
DELETE FROM public.print_formats;
DELETE FROM public.purchase_formats;

-- Insert purchase formats with deterministic IDs via temp variable approach using CTE inserts
WITH pf AS (
  INSERT INTO public.purchase_formats (material_category, width, height, sort_order) VALUES
    ('coated', 720, 1040, 10),
    ('coated', 700, 1000, 20),
    ('coated', 640, 920, 30),
    ('coated', 640, 900, 40),
    ('coated', 620, 860, 50),
    ('coated', 500, 700, 60),
    ('coated', 450, 640, 70),
    ('coated', 430, 610, 80),
    ('coated', 430, 305, 90),
    ('coated', 320, 450, 100),
    ('coated', 297, 420, 110)
  RETURNING id, width, height
)
INSERT INTO public.print_formats (width, height, sort_order, purchase_format_id)
SELECT v.w, v.h, v.so, pf.id FROM (VALUES
  (720,1040, 720,520, 10),(720,1040, 520,360, 20),(720,1040, 720,346, 30),(720,1040, 520,240, 40),(720,1040, 360,260, 50),(720,1040, 360,345, 60),
  (700,1000, 333,700, 70),(700,1000, 500,700, 80),(700,1000, 500,350, 90),(700,1000, 500,233, 100),(700,1000, 350,250, 110),(700,1000, 350,333, 120),
  (640,920, 640,460, 130),(640,920, 640,306, 140),(640,920, 460,320, 150),(640,920, 320,305, 160),(640,920, 320,230, 170),(640,920, 460,213, 180),
  (640,900, 640,300, 190),(640,900, 640,450, 200),(640,900, 450,320, 210),(640,900, 320,225, 220),(640,900, 320,300, 230),(640,900, 450,213, 240),
  (620,860, 620,286, 250),(620,860, 620,430, 260),(620,860, 430,310, 270),(620,860, 310,215, 280),
  (500,700, 500,700, 290),(500,700, 500,350, 300),(500,700, 350,250, 310),(500,700, 250,700, 320),(500,700, 500,233, 330),
  (450,640, 450,640, 340),(450,640, 450,320, 350),(450,640, 320,225, 360),(450,640, 450,213, 370),
  (430,610, 430,610, 380),(430,610, 430,305, 390),(430,610, 305,215, 400),(430,610, 430,183, 410),
  (430,305, 430,305, 420),
  (320,450, 320,450, 430),(320,450, 225,320, 440),
  (297,420, 297,420, 450),(297,420, 210,297, 460)
) AS v(pw,ph,w,h,so)
JOIN pf ON pf.width = v.pw AND pf.height = v.ph;

-- Envelopes
INSERT INTO public.envelope_formats (name, width, height, sort_order) VALUES
  ('C65', 114, 229, 10),
  ('C5',  162, 229, 20),
  ('C4',  225, 320, 30),
  ('E65', 110, 220, 40);
