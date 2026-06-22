import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AgentTurnInput = {
  supabase: SupabaseClient<any>;
  tenantId: string;
  conversationId: string;
  userMessage: string;
};

export async function runAgentTurn({ supabase, tenantId, conversationId, userMessage }: AgentTurnInput) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

  const [{ data: conv }, { data: history }, { data: tenant }, { data: sizes }, { data: addons }, { data: zones }] =
    await Promise.all([
      supabase.from("conversations").select("*").eq("id", conversationId).maybeSingle(),
      supabase.from("messages").select("role,content").eq("conversation_id", conversationId).order("created_at"),
      supabase.from("tenants").select("*").eq("id", tenantId).maybeSingle(),
      supabase.from("sizes").select("*").eq("tenant_id", tenantId).eq("active", true).order("display_order"),
      supabase.from("addons").select("*").eq("tenant_id", tenantId).eq("active", true),
      supabase.from("delivery_zones").select("*").eq("tenant_id", tenantId).eq("active", true),
    ]);
  if (!conv) throw new Error("Conversa não encontrada");
  if (conv.bot_paused) return { reply: "", paused: true };

  await supabase.from("messages").insert({ conversation_id: conversationId, tenant_id: tenantId, role: "user", content: userMessage });

  const menuText = [
    "TAMANHOS:",
    ...(sizes ?? []).map((s: any) => `- ${s.name} (${s.category}${s.volume_ml ? `, ${s.volume_ml}ml` : ""}) — R$ ${Number(s.price).toFixed(2)} — ${s.free_addons} adicionais grátis + ${s.free_toppings} coberturas grátis`),
    "",
    "ADICIONAIS GRÁTIS:",
    ...(addons ?? []).filter((a: any) => !a.is_paid).map((a: any) => `- ${a.name} (${a.category})`),
    "",
    "ADICIONAIS PAGOS (R$ 3,00 cada):",
    ...(addons ?? []).filter((a: any) => a.is_paid).map((a: any) => `- ${a.name}`),
    "",
    "BAIRROS / TAXA:",
    ...(zones ?? []).map((z: any) => `- ${z.neighborhood}: R$ ${Number(z.fee).toFixed(2)} (${z.eta_minutes} min)`),
  ].join("\n");

  const systemPrompt = `Você é o atendente virtual da ${tenant?.name ?? "açaiteria"}. Seja simpática, breve, regional ("bora", "show", "demais"), 1-2 emojis quando couber. Tira pedido completo, confirma SEMPRE antes de finalizar.

REGRAS:
- Para CADA item, respeite a quantidade de adicionais grátis do tamanho. Acima disso, cada adicional vira PAGO (R$ 3,00).
- Use a tool consultar_taxa para informar entrega.
- Antes de finalizar, repete o pedido formatado e pergunta se tá certo.
- Pagamento: Dinheiro, Pix${tenant?.pix_key ? ` (chave ${tenant.pix_key})` : ""} ou Cartão na entrega.
- Horário: ${tenant?.opening_hours ?? "ver com a loja"}.
- Se o cliente pedir pra falar com gente, chame transferir_humano.

CARDÁPIO:
${menuText}`;

  const gateway = createLovableAiGatewayProvider(apiKey);
  const model = gateway("google/gemini-2.5-flash");

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...((history ?? []).filter((m: any) => m.role === "user" || m.role === "assistant").map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content ?? "" }))),
    { role: "user" as const, content: userMessage },
  ];

  const sizeMap = new Map((sizes ?? []).map((s: any) => [s.name.toLowerCase(), s]));
  const addonMap = new Map((addons ?? []).map((a: any) => [a.name.toLowerCase(), a]));
  const zoneMap = new Map((zones ?? []).map((z: any) => [z.neighborhood.toLowerCase(), z]));

  const result = await generateText({
    model,
    messages,
    stopWhen: stepCountIs(50),
    tools: {
      consultar_taxa: tool({
        description: "Consulta taxa e tempo de entrega por bairro",
        inputSchema: z.object({ bairro: z.string() }),
        execute: async ({ bairro }) => {
          const z = zoneMap.get(bairro.toLowerCase());
          if (!z) return { erro: "Bairro não atendido", bairros: [...zoneMap.keys()] };
          return { bairro: z.neighborhood, taxa: Number(z.fee), tempo_min: z.eta_minutes };
        },
      }),
      calcular_item: tool({
        description: "Calcula o preço de UM item dado tamanho e adicionais. Use antes de confirmar pra mostrar valores.",
        inputSchema: z.object({
          tamanho: z.string(),
          adicionais: z.array(z.string()).default([]),
        }),
        execute: async ({ tamanho, adicionais }) => {
          const s = sizeMap.get(tamanho.toLowerCase());
          if (!s) return { erro: "Tamanho não encontrado" };
          const cota = s.free_addons + s.free_toppings;
          const itensValidos = adicionais.map((n) => addonMap.get(n.toLowerCase())).filter(Boolean) as any[];
          const desconhecidos = adicionais.filter((n) => !addonMap.has(n.toLowerCase()));
          const pagosObrigatorios = itensValidos.filter((a) => a.is_paid);
          const gratisCand = itensValidos.filter((a) => !a.is_paid);
          const gratisUsados = gratisCand.slice(0, cota);
          const gratisQueViraramPagos = gratisCand.slice(cota);
          const totalPagos = pagosObrigatorios.length + gratisQueViraramPagos.length;
          const extraPago = totalPagos * 3;
          const total = Number(s.price) + extraPago;
          return { tamanho: s.name, base: Number(s.price), cota_gratis: cota, gratis_usados: gratisUsados.map((a) => a.name), pagos: [...pagosObrigatorios, ...gratisQueViraramPagos].map((a) => a.name), extra_pago: extraPago, total, desconhecidos };
        },
      }),
      finalizar_pedido: tool({
        description: "Finaliza e grava o pedido após confirmação do cliente",
        inputSchema: z.object({
          cliente_nome: z.string(),
          cliente_telefone: z.string().optional(),
          itens: z.array(z.object({
            tamanho: z.string(),
            quantidade: z.number().int().min(1).default(1),
            adicionais: z.array(z.string()).default([]),
          })),
          endereco: z.string().optional(),
          bairro: z.string().optional(),
          pagamento: z.string(),
          troco_para: z.number().optional(),
          observacoes: z.string().optional(),
        }),
        execute: async (input) => {
          let subtotal = 0;
          const itemsOut: any[] = [];
          for (const it of input.itens) {
            const s = sizeMap.get(it.tamanho.toLowerCase());
            if (!s) return { erro: `Tamanho '${it.tamanho}' inválido` };
            const cota = s.free_addons + s.free_toppings;
            const itensValidos = it.adicionais.map((n) => addonMap.get(n.toLowerCase())).filter(Boolean) as any[];
            const pagosObrig = itensValidos.filter((a) => a.is_paid);
            const gratisCand = itensValidos.filter((a) => !a.is_paid);
            const gratisUsados = gratisCand.slice(0, cota);
            const gratisExcedente = gratisCand.slice(cota);
            const pagos = [...pagosObrig, ...gratisExcedente];
            const sub = (Number(s.price) + pagos.length * 3) * it.quantidade;
            subtotal += sub;
            itemsOut.push({ size: s.name, qty: it.quantidade, free: gratisUsados.map((a) => a.name), paid: pagos.map((a) => a.name), subtotal: sub });
          }
          let fee = 0; let eta = 0;
          if (input.bairro) {
            const z = zoneMap.get(input.bairro.toLowerCase());
            if (z) { fee = Number(z.fee); eta = z.eta_minutes; }
          }
          const total = subtotal + fee;

          let customerId: string | null = null;
          if (input.cliente_telefone) {
            const { data: existing } = await supabase.from("customers").select("id").eq("tenant_id", tenantId).eq("phone", input.cliente_telefone).maybeSingle();
            if (existing) {
              customerId = existing.id;
              await supabase.from("customers").update({ name: input.cliente_nome, default_address: input.endereco }).eq("id", customerId);
            } else {
              const { data: nc } = await supabase.from("customers").insert({ tenant_id: tenantId, phone: input.cliente_telefone, name: input.cliente_nome, default_address: input.endereco }).select("id").single();
              customerId = nc?.id ?? null;
            }
            await supabase.from("conversations").update({ customer_id: customerId }).eq("id", conversationId);
          }

          const { data: order } = await supabase.from("orders").insert({
            tenant_id: tenantId,
            customer_id: customerId,
            conversation_id: conversationId,
            status: "novo",
            items: itemsOut,
            subtotal, delivery_fee: fee, total,
            payment_method: input.pagamento,
            change_for: input.troco_para,
            address: input.endereco,
            neighborhood: input.bairro,
            eta_minutes: eta,
            notes: input.observacoes,
          }).select("id").single();
          return { ok: true, pedido_id: order?.id, total, tempo_estimado_min: eta };
        },
      }),
      transferir_humano: tool({
        description: "Transfere a conversa para um atendente humano",
        inputSchema: z.object({ motivo: z.string() }),
        execute: async ({ motivo }) => {
          await supabase.from("conversations").update({ status: "aguardando_humano", bot_paused: true }).eq("id", conversationId);
          return { ok: true, motivo };
        },
      }),
    },
  });

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    tenant_id: tenantId,
    role: "assistant",
    content: result.text,
    tool_calls: result.steps.flatMap((s) => s.toolCalls.map((tc) => ({ name: tc.toolName, args: tc.input }))) as any,
  });

  return { reply: result.text, paused: false };
}
