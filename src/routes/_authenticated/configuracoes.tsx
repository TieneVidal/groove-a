import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — AçaíBot" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [t, setT] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from("tenants").select("*").limit(1).maybeSingle();
    setT(data);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!t) return;
    setSaving(true);
    const { error } = await supabase.from("tenants").update({
      name: t.name, phone: t.phone, address: t.address, opening_hours: t.opening_hours,
      welcome_message: t.welcome_message, pix_key: t.pix_key,
    }).eq("id", t.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Salvo!");
  }

  if (!t) return <div className="p-6">Carregando...</div>;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações da loja</h1>
        <p className="text-sm text-muted-foreground">O bot usa esses dados nas respostas.</p>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <Label>Nome da loja</Label>
          <Input value={t.name ?? ""} onChange={(e) => setT({ ...t, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Telefone</Label>
            <Input value={t.phone ?? ""} onChange={(e) => setT({ ...t, phone: e.target.value })} />
          </div>
          <div>
            <Label>Chave Pix</Label>
            <Input value={t.pix_key ?? ""} onChange={(e) => setT({ ...t, pix_key: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Endereço</Label>
          <Input value={t.address ?? ""} onChange={(e) => setT({ ...t, address: e.target.value })} />
        </div>
        <div>
          <Label>Horário de funcionamento</Label>
          <Input value={t.opening_hours ?? ""} onChange={(e) => setT({ ...t, opening_hours: e.target.value })} />
        </div>
        <div>
          <Label>Mensagem de boas-vindas</Label>
          <Textarea rows={3} value={t.welcome_message ?? ""} onChange={(e) => setT({ ...t, welcome_message: e.target.value })} />
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
      </Card>

      <Card className="p-6 bg-muted/30">
        <h3 className="font-semibold mb-2">Próxima etapa: conectar no WhatsApp</h3>
        <p className="text-sm text-muted-foreground">Em breve: cole aqui a URL da sua Evolution API e o token. O bot atende sozinho no número da loja.</p>
      </Card>
    </div>
  );
}
