import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { ensureTenant } from "@/lib/onboarding.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — AçaíBot" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const ensure = useServerFn(ensureTenant);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/pedidos", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await ensure({ data: undefined });
      navigate({ to: "/pedidos", replace: true });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error("Falha no Google: " + (result.error as Error).message);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-violet-100 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">AçaíBot</h1>
            <p className="text-sm text-muted-foreground">Atendimento por IA pra açaiteria</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Seu nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : mode === "signup" ? "Criar conta" : "Entrar"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Button variant="outline" onClick={google} className="w-full">
          Continuar com Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signup" ? "Já tem conta?" : "Não tem conta?"}{" "}
          <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="text-primary font-medium hover:underline">
            {mode === "signup" ? "Entrar" : "Criar conta"}
          </button>
        </p>
      </Card>
    </div>
  );
}
