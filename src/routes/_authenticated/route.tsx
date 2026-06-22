import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, MessageSquare, Menu as MenuIcon, Settings, LogOut, Bot, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = [
    { to: "/pedidos", label: "Pedidos", icon: ShoppingBag },
    { to: "/conversas", label: "Conversas", icon: MessageSquare },
    { to: "/cardapio", label: "Cardápio", icon: MenuIcon },
    { to: "/whatsapp", label: "WhatsApp", icon: Smartphone },
    { to: "/configuracoes", label: "Configurações", icon: Settings },
  ] as const;

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="w-60 border-r bg-background flex flex-col">
        <div className="p-5 border-b flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold leading-tight">AçaíBot</div>
            <div className="text-xs text-muted-foreground">Atendimento IA</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors [&.active]:bg-primary/10 [&.active]:text-primary [&.active]:font-medium"
              activeProps={{ className: "active" }}
            >
              <n.icon className="w-4 h-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t">
          <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
