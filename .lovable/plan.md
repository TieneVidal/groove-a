
# Plataforma "AçaíBot" — Atendimento por IA multi-tenant

## Visão geral

Construir uma plataforma web onde cada loja (sua mãe + futuros clientes) tem:

- **Cardápio configurável** (tamanhos, regras de adicionais grátis, itens grátis e pagos)
- **Agente de IA** que conversa com o cliente final, tira pedido completo, calcula valor, informa taxa/pagamento/tempo, e transfere pra humano quando necessário
- **Painel de pedidos em tempo real** (kanban: novo → preparando → entrega → entregue + som de notificação)
- **Integração direta com WhatsApp** (Evolution API — open-source, roda em Docker, igual ao WaHa que você já usa)
- **Login multi-tenant** (cada loja vê só os próprios dados; você como super-admin vê todas)

## O que vai ser entregue

### 1. Onboarding e contas
- Cadastro/login com e-mail e senha + Google
- Cada usuário pertence a uma loja (`tenant`). Roles: `super_admin` (você), `owner` (dono da loja), `attendant` (atendente)
- Página "Minha Loja" com nome, telefone, endereço, horário de funcionamento, formas de pagamento, chave Pix, mensagem de boas-vindas

### 2. Cardápio (pré-populado com o Açaí da Floresta)
- **Tamanhos de copo**: P 300ml R$12 (2 ad + 2 cob), M 400ml R$14 (3+2), G 500ml R$17 (4+2), GG 700ml R$22 (4+2)
- **Barcas**: P R$25 (4+2), G R$55 (8+2), GG R$70 (9+2)
- **Marmitas**: M R$25 (5+2), G R$35 (5+2)
- **Roletas**: P R$25 (4+2), G R$40 (6+2)
- **Adicionais grátis**: frutas, coberturas, complementos, cremes (categorizados, com nomes do PDF)
- **Adicionais pagos**: R$3,00 cada (ovomaltine, kitkat, ouro branco, etc.)
- CRUD completo: dono edita preços, adiciona/remove itens, ativa/desativa

### 3. Taxas de entrega
- Tabela de bairros → valor + tempo estimado
- Opção "retirar na loja" (taxa zero)

### 4. Agente de IA
- **Lovable AI Gateway** (Gemini 2.5 Flash por padrão; trocável pra Pro nos cardápios maiores)
- Recebe mensagem do cliente + histórico da conversa + contexto da loja (cardápio, taxas, horário)
- **Tools** que o agente chama:
  - `enviar_cardapio` (link/imagem)
  - `consultar_taxa_entrega(bairro)`
  - `criar_item_pedido(tamanho, adicionais_gratis[], adicionais_pagos[])` — valida regra de quantos grátis caben no tamanho
  - `finalizar_pedido(itens, endereco, pagamento, troco_para)` — grava no banco, dispara notificação no painel
  - `transferir_humano(motivo)` — marca conversa como "aguardando atendente"
- Personalidade: simpática, regional ("bora", "show"), confirma sempre antes de fechar

### 5. Painel de pedidos (tempo real)
- Kanban: Novo → Em preparo → Saiu pra entrega → Entregue (+ Cancelado)
- Card mostra: cliente, itens detalhados, total, endereço, pagamento, horário
- Som ao chegar pedido novo + badge no título da aba
- Filtros por status, busca por nome/telefone
- Realtime via Lovable Cloud (Supabase Realtime)

### 6. Conversas
- Tela de conversas ativas (WhatsApp + Instagram)
- Atendente pode "assumir" uma conversa (pausa o bot) e responder manualmente
- Histórico completo de mensagens por cliente

### 7. Integração WhatsApp (Evolution API)
- Webhook público em `/api/public/whatsapp/:tenantId` recebe mensagens
- Envio via REST da Evolution API (URL + token configurados por loja)
- Suporte a texto, imagem (cardápio), localização
- **Instagram fica como fase 2** — mesma arquitetura, só troca o adapter

### 8. Painel super-admin
- Lista de lojas, status (ativa/suspensa), uso de IA do mês
- Criar nova loja em 1 clique (clona template de cardápio padrão)

## Detalhes técnicos

**Stack:** TanStack Start + Lovable Cloud (Postgres + Auth + Realtime + Storage) + Lovable AI Gateway (Gemini)

**Modelagem (resumo):**
```text
tenants(id, name, slug, whatsapp_config jsonb, settings jsonb)
profiles(id, tenant_id, role)            -- role: super_admin|owner|attendant
user_roles(user_id, role)                 -- separado, com has_role()
sizes(tenant_id, name, volume_ml, price, free_addons, free_toppings, category)
addons(tenant_id, name, category, is_paid, price)
delivery_zones(tenant_id, neighborhood, fee, eta_minutes)
customers(tenant_id, phone, name, default_address)
conversations(tenant_id, customer_id, channel, status, bot_paused)
messages(conversation_id, role, content, tool_calls jsonb)
orders(tenant_id, customer_id, status, items jsonb, total, payment, address, eta)
```

**Segurança:**
- RLS em todas as tabelas filtrando por `tenant_id` via JWT claim
- Webhook valida assinatura HMAC
- Service-role só em edge paths verificados

**Multi-tenant resolution:**
- Login → busca `profiles.tenant_id` → todas as queries filtradas
- Super-admin pode dar "switch" pra qualquer loja

## Fora do escopo desta primeira fase

- Instagram DM (estrutura pronta, integração depois)
- Pagamento online integrado (Pix copia-e-cola sim; gateway não)
- App mobile nativo (web responsivo serve)
- Relatórios/BI avançado (versão simples: pedidos do dia, faturamento)

## Ordem de implementação

1. Lovable Cloud + auth + tabelas + RLS + seed do cardápio Açaí da Floresta
2. Painel admin (cardápio, taxas, configurações da loja)
3. Painel de pedidos (kanban + realtime + som)
4. Agente de IA com tools (testável via tela de chat interno antes do WhatsApp)
5. Webhook + envio Evolution API
6. Painel super-admin + onboarding de novas lojas

Como é grande, vou começar pelos passos 1–4 (já dá pra testar tudo no chat interno) e depois plugamos o WhatsApp. Tudo bem assim?
