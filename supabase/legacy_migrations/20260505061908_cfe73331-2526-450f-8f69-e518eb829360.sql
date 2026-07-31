
-- 1. Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company', '')
  );
  -- Default role = user
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Attach calculations to user
ALTER TABLE public.calculations ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX idx_calculations_user_id ON public.calculations(user_id);

DROP POLICY IF EXISTS public_all_calculations ON public.calculations;
CREATE POLICY "Users view own calculations" ON public.calculations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own calculations" ON public.calculations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own calculations" ON public.calculations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own calculations" ON public.calculations FOR DELETE USING (auth.uid() = user_id);

-- calculation_items follow parent calculation
DROP POLICY IF EXISTS public_all_calculation_items ON public.calculation_items;
CREATE POLICY "Users access items of own calcs" ON public.calculation_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.calculations c WHERE c.id = calculation_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.calculations c WHERE c.id = calculation_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS public_all_calculation_adjustments ON public.calculation_adjustments;
CREATE POLICY "Users access adjustments of own calcs" ON public.calculation_adjustments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.calculations c WHERE c.id = calculation_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.calculations c WHERE c.id = calculation_id AND c.user_id = auth.uid()));

-- 5. Reference tables: read for authenticated, write for admins
DROP POLICY IF EXISTS public_all_materials ON public.materials;
CREATE POLICY "Auth read materials" ON public.materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write materials" ON public.materials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS public_all_equipment ON public.equipment;
CREATE POLICY "Auth read equipment" ON public.equipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write equipment" ON public.equipment FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS public_all_operations ON public.operations;
CREATE POLICY "Auth read operations" ON public.operations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write operations" ON public.operations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS public_all_lamination_prices ON public.lamination_prices;
CREATE POLICY "Auth read lamination" ON public.lamination_prices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write lamination" ON public.lamination_prices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS public_all_system_settings ON public.system_settings;
CREATE POLICY "Auth read settings" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write settings" ON public.system_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS public_all_clients ON public.clients;
CREATE POLICY "Auth read clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write clients" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
