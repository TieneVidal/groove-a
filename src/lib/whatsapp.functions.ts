import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function getTenantId(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
  if (!data?.tenant_id) throw new Error("Sem loja vinculada");
  return data.tenant_id as string;
}

export const getWhatsappInstance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await getTenantId(context.supabase, context.userId);
    const { data } = await context.supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    return data;
  });

export const saveWhatsappInstance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { instance_name: string; evolution_url: string; evolution_api_key: string }) =>
    z.object({
      instance_name: z.string().min(2).regex(/^[a-zA-Z0-9_-]+$/, "Só letras, números, _ ou -"),
      evolution_url: z.string().url(),
      evolution_api_key: z.string().min(4),
    }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await getTenantId(context.supabase, context.userId);
    const { data: existing } = await context.supabase
      .from("whatsapp_instances").select("id").eq("tenant_id", tenantId).maybeSingle();

    const payload = {
      tenant_id: tenantId,
      instance_name: data.instance_name,
      evolution_url: data.evolution_url.replace(/\/$/, ""),
      evolution_api_key: data.evolution_api_key,
    };

    if (existing) {
      const { data: upd } = await context.supabase
        .from("whatsapp_instances").update(payload).eq("id", existing.id).select("*").single();
      return upd;
    }
    const { data: ins } = await context.supabase
      .from("whatsapp_instances").insert(payload).select("*").single();
    return ins;
  });

// Cria a instância na Evolution + configura webhook + retorna QR
export const connectWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await getTenantId(context.supabase, context.userId);
    const { data: inst } = await context.supabase
      .from("whatsapp_instances").select("*").eq("tenant_id", tenantId).maybeSingle();
    if (!inst) throw new Error("Configure a Evolution primeiro");

    const headers = { "Content-Type": "application/json", apikey: inst.evolution_api_key };
    const base = inst.evolution_url;

    // URL pública do webhook (Lovable preview ou prod)
    const publicHost = process.env.LOVABLE_PUBLIC_URL || process.env.PUBLIC_URL;
    const webhookUrl = `${publicHost ?? ""}/api/public/whatsapp/${inst.instance_name}?token=${inst.webhook_token}`;

    // 1. cria instância (idempotente — ignora se já existir)
    await fetch(`${base}/instance/create`, {
      method: "POST", headers,
      body: JSON.stringify({
        instanceName: inst.instance_name,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        webhook: {
          url: webhookUrl,
          enabled: true,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
          byEvents: false,
        },
      }),
    }).catch(() => null);

    // 2. garante webhook (caso já existisse)
    await fetch(`${base}/webhook/set/${inst.instance_name}`, {
      method: "POST", headers,
      body: JSON.stringify({
        webhook: { url: webhookUrl, enabled: true, events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"] },
      }),
    }).catch(() => null);

    // 3. pega QR
    const qrRes = await fetch(`${base}/instance/connect/${inst.instance_name}`, { headers });
    const qrJson: any = await qrRes.json().catch(() => ({}));
    const qr = qrJson?.base64 ?? qrJson?.qrcode?.base64 ?? null;

    await context.supabase.from("whatsapp_instances")
      .update({ last_qr: qr, status: qr ? "aguardando_qr" : "desconectado" })
      .eq("id", inst.id);

    return { qr, webhookUrl, status: qr ? "aguardando_qr" : "desconectado" };
  });

export const whatsappStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await getTenantId(context.supabase, context.userId);
    const { data: inst } = await context.supabase
      .from("whatsapp_instances").select("*").eq("tenant_id", tenantId).maybeSingle();
    if (!inst) return { status: "sem_config" };

    const res = await fetch(`${inst.evolution_url}/instance/connectionState/${inst.instance_name}`, {
      headers: { apikey: inst.evolution_api_key },
    }).catch(() => null);
    if (!res || !res.ok) return { status: inst.status, phone: inst.phone_number };
    const json: any = await res.json();
    const state = json?.instance?.state ?? json?.state ?? "desconectado";
    const mapped = state === "open" ? "conectado" : state === "connecting" ? "aguardando_qr" : "desconectado";
    await context.supabase.from("whatsapp_instances").update({ status: mapped }).eq("id", inst.id);
    return { status: mapped, phone: inst.phone_number };
  });

export const disconnectWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await getTenantId(context.supabase, context.userId);
    const { data: inst } = await context.supabase
      .from("whatsapp_instances").select("*").eq("tenant_id", tenantId).maybeSingle();
    if (!inst) return { ok: true };
    await fetch(`${inst.evolution_url}/instance/logout/${inst.instance_name}`, {
      method: "DELETE", headers: { apikey: inst.evolution_api_key },
    }).catch(() => null);
    await context.supabase.from("whatsapp_instances")
      .update({ status: "desconectado", last_qr: null }).eq("id", inst.id);
    return { ok: true };
  });
