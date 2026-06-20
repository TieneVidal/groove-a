
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin','owner','attendant');
CREATE TYPE public.size_category AS ENUM ('copo','barca','marmita','roleta');
CREATE TYPE public.addon_category AS ENUM ('fruta','cobertura','complemento','creme','pago');
CREATE TYPE public.order_status AS ENUM ('novo','preparando','entrega','entregue','cancelado');
CREATE TYPE public.conv_channel AS ENUM ('whatsapp','instagram','interno');
CREATE TYPE public.conv_status AS ENUM ('ativa','aguardando_humano','encerrada');
CREATE TYPE public.msg_role AS ENUM ('user','assistant','system','tool');

-- ============ TENANTS ============
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  phone text,
  address text,
  pix_key text,
  payment_methods text[] DEFAULT ARRAY['Dinheiro','Pix','Cartão'],
  opening_hours text,
  welcome_message text DEFAULT 'Oi! 👋 Bem-vindo(a) ao nosso açaí. Quer dar uma olhada no cardápio?',
  whatsapp_config jsonb DEFAULT '{}'::jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  full_name text,
  email text,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ SECURITY DEFINER HELPERS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'super_admin')
$$;

-- ============ PROFILES / TENANTS POLICIES ============
CREATE POLICY "view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_super_admin());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "view own tenant" ON public.tenants FOR SELECT TO authenticated USING (id = public.current_tenant_id() OR public.is_super_admin());

CREATE POLICY "view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_super_admin());

-- ============ AUTO-CREATE PROFILE ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ MENU: SIZES ============
CREATE TABLE public.sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category public.size_category NOT NULL,
  name text NOT NULL,
  volume_ml int,
  price numeric(10,2) NOT NULL,
  free_addons int NOT NULL DEFAULT 0,
  free_toppings int NOT NULL DEFAULT 0,
  display_order int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sizes TO authenticated;
GRANT ALL ON public.sizes TO service_role;
ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_sizes_updated BEFORE UPDATE ON public.sizes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "tenant select sizes" ON public.sizes FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());
CREATE POLICY "tenant modify sizes" ON public.sizes FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() OR public.is_super_admin()) WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- ============ MENU: ADDONS ============
CREATE TABLE public.addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category public.addon_category NOT NULL,
  name text NOT NULL,
  is_paid boolean DEFAULT false,
  price numeric(10,2) DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addons TO authenticated;
GRANT ALL ON public.addons TO service_role;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_addons_updated BEFORE UPDATE ON public.addons FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "tenant select addons" ON public.addons FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());
CREATE POLICY "tenant modify addons" ON public.addons FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() OR public.is_super_admin()) WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- ============ DELIVERY ZONES ============
CREATE TABLE public.delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  neighborhood text NOT NULL,
  fee numeric(10,2) NOT NULL DEFAULT 0,
  eta_minutes int DEFAULT 40,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_zones TO authenticated;
GRANT ALL ON public.delivery_zones TO service_role;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant zones" ON public.delivery_zones FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() OR public.is_super_admin()) WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone text,
  name text,
  default_address text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, phone)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant customers" ON public.customers FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() OR public.is_super_admin()) WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- ============ CONVERSATIONS ============
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  channel public.conv_channel NOT NULL DEFAULT 'interno',
  status public.conv_status NOT NULL DEFAULT 'ativa',
  bot_paused boolean DEFAULT false,
  external_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_conv_updated BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE POLICY "tenant conversations" ON public.conversations FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() OR public.is_super_admin()) WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- ============ MESSAGES ============
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.msg_role NOT NULL,
  content text,
  tool_calls jsonb,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant messages" ON public.messages FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() OR public.is_super_admin()) WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'novo',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text,
  change_for numeric(10,2),
  address text,
  neighborhood text,
  eta_minutes int,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE POLICY "tenant orders" ON public.orders FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id() OR public.is_super_admin()) WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
