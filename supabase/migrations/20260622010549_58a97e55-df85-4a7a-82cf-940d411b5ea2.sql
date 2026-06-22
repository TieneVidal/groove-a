CREATE TABLE public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  instance_name text UNIQUE NOT NULL,
  evolution_url text NOT NULL,
  evolution_api_key text NOT NULL,
  webhook_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  phone_number text,
  status text NOT NULL DEFAULT 'desconectado',
  last_qr text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_instances TO authenticated;
GRANT ALL ON public.whatsapp_instances TO service_role;
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_wai_updated BEFORE UPDATE ON public.whatsapp_instances FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "tenant whatsapp instances" ON public.whatsapp_instances
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

CREATE INDEX idx_conversations_tenant_external ON public.conversations(tenant_id, external_id);
CREATE INDEX idx_whatsapp_instance_name ON public.whatsapp_instances(instance_name);