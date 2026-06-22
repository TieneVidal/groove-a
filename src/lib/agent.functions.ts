import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AgentInput = { conversationId: string; userMessage: string };

export const sendAgentMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: AgentInput) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    const tenantId = profile?.tenant_id;
    if (!tenantId) throw new Error("Sem loja vinculada");

    const { runAgentTurn } = await import("@/lib/agent-runner.server");
    const out = await runAgentTurn({ supabase, tenantId, conversationId: data.conversationId, userMessage: data.userMessage });
    return { reply: out.reply };
  });

export const newTestConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    if (!profile?.tenant_id) throw new Error("Sem loja");
    const { data } = await supabase.from("conversations").insert({ tenant_id: profile.tenant_id, channel: "interno", status: "ativa" }).select("id").single();
    return { id: data!.id };
  });

export const loadMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { conversationId: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: msgs } = await context.supabase
      .from("messages").select("id,role,content,created_at").eq("conversation_id", data.conversationId).order("created_at");
    return msgs ?? [];
  });
