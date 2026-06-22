import { createFileRoute } from "@tanstack/react-router";

function extractText(msg: any): string | null {
  if (!msg) return null;
  return (
    msg.conversation ??
    msg.extendedTextMessage?.text ??
    msg.imageMessage?.caption ??
    msg.videoMessage?.caption ??
    msg.buttonsResponseMessage?.selectedDisplayText ??
    msg.listResponseMessage?.title ??
    null
  );
}

export const Route = createFileRoute("/api/public/whatsapp/$instance")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        const instanceName = params.instance;
        const body: any = await request.json().catch(() => ({}));

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: inst } = await supabaseAdmin
          .from("whatsapp_instances")
          .select("*")
          .eq("instance_name", instanceName)
          .maybeSingle();
        if (!inst || inst.webhook_token !== token) {
          return new Response("forbidden", { status: 403 });
        }

        const event: string = body.event ?? "";

        // CONNECTION_UPDATE → atualiza status / número
        if (event === "connection.update" || event === "CONNECTION_UPDATE") {
          const state = body?.data?.state ?? body?.state;
          const phone = body?.data?.wuid?.split("@")?.[0] ?? body?.sender?.split("@")?.[0] ?? null;
          const mapped = state === "open" ? "conectado" : state === "connecting" ? "aguardando_qr" : "desconectado";
          await supabaseAdmin.from("whatsapp_instances")
            .update({ status: mapped, phone_number: phone ?? inst.phone_number, last_qr: mapped === "conectado" ? null : inst.last_qr })
            .eq("id", inst.id);
          return Response.json({ ok: true });
        }

        if (event !== "messages.upsert" && event !== "MESSAGES_UPSERT") {
          return Response.json({ ok: true, ignored: event });
        }

        const data = body.data ?? {};
        if (data?.key?.fromMe) return Response.json({ ok: true, fromMe: true });

        const remoteJid: string = data?.key?.remoteJid ?? "";
        if (!remoteJid || remoteJid.endsWith("@g.us")) {
          return Response.json({ ok: true, ignored: "group_or_empty" });
        }
        const phone = remoteJid.split("@")[0];
        const pushName: string | undefined = data?.pushName;
        const text = extractText(data?.message);
        if (!text) return Response.json({ ok: true, ignored: "no_text" });

        // conversa
        let { data: conv } = await supabaseAdmin
          .from("conversations")
          .select("*")
          .eq("tenant_id", inst.tenant_id)
          .eq("external_id", remoteJid)
          .maybeSingle();

        if (!conv) {
          // customer
          let { data: customer } = await supabaseAdmin.from("customers")
            .select("id").eq("tenant_id", inst.tenant_id).eq("phone", phone).maybeSingle();
          if (!customer) {
            const { data: nc } = await supabaseAdmin.from("customers")
              .insert({ tenant_id: inst.tenant_id, phone, name: pushName ?? phone })
              .select("id").single();
            customer = nc;
          }
          const { data: nconv } = await supabaseAdmin.from("conversations").insert({
            tenant_id: inst.tenant_id,
            customer_id: customer?.id ?? null,
            channel: "whatsapp",
            status: "ativa",
            external_id: remoteJid,
          }).select("*").single();
          conv = nconv;
        }
        if (!conv) return new Response("conv error", { status: 500 });

        if (conv.bot_paused || conv.status === "aguardando_humano") {
          return Response.json({ ok: true, paused: true });
        }

        const { runAgentTurn } = await import("@/lib/agent-runner.server");
        let reply = "";
        try {
          const out = await runAgentTurn({
            supabase: supabaseAdmin as any,
            tenantId: inst.tenant_id,
            conversationId: conv.id,
            userMessage: text,
          });
          reply = out.reply;
        } catch (e: any) {
          console.error("agent error", e?.message);
          reply = "Opa, tive um problema aqui 😅 já chamei alguém pra te ajudar.";
          await supabaseAdmin.from("conversations")
            .update({ status: "aguardando_humano", bot_paused: true }).eq("id", conv.id);
        }

        if (reply?.trim()) {
          await fetch(`${inst.evolution_url}/message/sendText/${inst.instance_name}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: inst.evolution_api_key },
            body: JSON.stringify({ number: phone, text: reply }),
          }).catch((e) => console.error("send err", e));
        }

        return Response.json({ ok: true });
      },
    },
  },
});
