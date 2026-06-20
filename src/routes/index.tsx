import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Bot, MessageSquare, ShoppingBag, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AçaíBot — Atendimento por IA pra açaiteria" },
      { name: "description", content: "Bot inteligente que tira pedido, manda cardápio, calcula taxa e transfere pra humano. Pronto pra WhatsApp em minutos." },
      { property: "og:title", content: "AçaíBot — Atendimento por IA" },
      { property: "og:description", content: "Atendimento automático no WhatsApp pra sua açaiteria." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-violet-50">
      <header className="container mx-auto px-6 py-5 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <span className="font-semibold">AçaíBot</span>
        </div>
        <Link to="/auth">
          <Button>Entrar</Button>
        </Link>
      </header>

      <main className="container mx-auto px-6 py-20 text-center max-w-3xl">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          O atendente que <span className="text-primary">nunca dorme</span> pra sua açaiteria
        </h1>
        <p className="mt-6 text-xl text-muted-foreground">
          IA que tira o pedido completinho no WhatsApp — sabe seu cardápio, conta adicionais grátis, calcula taxa de entrega e só passa pra você o que importa.
        </p>
        <div className="mt-10 flex gap-3 justify-center">
          <Link to="/auth">
            <Button size="lg" className="text-base">Começar grátis</Button>
          </Link>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-6 text-left">
          <Feature icon={MessageSquare} title="Conversa de verdade" desc="Atende como gente, no jeitinho regional. Confirma antes de fechar." />
          <Feature icon={ShoppingBag} title="Pedido formatado" desc="Cai no painel em tempo real, com som e tudo. Você só prepara." />
          <Feature icon={Zap} title="Em minutos" desc="Conecta no WhatsApp e tá pronto. Cardápio já vem pré-cadastrado." />
        </div>
      </main>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="p-6 rounded-xl bg-white border">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
