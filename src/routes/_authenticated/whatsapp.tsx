import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, QrCode, Plug, PlugZap, RefreshCw } from "lucide-react";
import {
  getWhatsappInstance,
  saveWhatsappInstance,
  connectWhatsapp,
  whatsappStatus,
  disconnectWhatsapp,
} from "@/lib/whatsapp.functions";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  component: WhatsappPage,
});

function WhatsappPage() {
  const qc = useQueryClient();
  const getInst = useServerFn(getWhatsappInstance);
  const saveInst = useServerFn(saveWhatsappInstance);
  const connect = useServerFn(connectWhatsapp);
  const status = useServerFn(whatsappStatus);
  const disconnect = useServerFn(disconnectWhatsapp);

  const inst = useQuery({ queryKey: ["wa-inst"], queryFn: () => getInst() });
  const st = useQuery({
    queryKey: ["wa-status"],
    queryFn: () => status(),
    refetchInterval: 5000,
    enabled: !!inst.data,
  });

  const [form, setForm] = useState({
    instance_name: "",
    evolution_url: "http://localhost:8080",
    evolution_api_key: "",
  });

  // hydrate form once
  if (inst.data && !form.instance_name && inst.data.instance_name) {
    setForm({
      instance_name: inst.data.instance_name,
      evolution_url: inst.data.evolution_url,
      evolution_api_key: inst.data.evolution_api_key,
    });
  }

  const save = useMutation({
    mutationFn: () => saveInst({ data: form }),
    onSuccess: () => { toast.success("Configuração salva"); qc.invalidateQueries({ queryKey: ["wa-inst"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const conn = useMutation({
    mutationFn: () => connect(),
    onSuccess: () => { toast.success("Escaneia o QR no WhatsApp"); qc.invalidateQueries({ queryKey: ["wa-inst"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const disc = useMutation({
    mutationFn: () => disconnect(),
    onSuccess: () => { toast.success("Desconectado"); qc.invalidateQueries({ queryKey: ["wa-inst"] }); qc.invalidateQueries({ queryKey: ["wa-status"] }); },
  });

  const statusValue = st.data?.status ?? inst.data?.status ?? "sem_config";
  const statusBadge = statusValue === "conectado"
    ? <Badge className="bg-green-600">Conectado</Badge>
    : statusValue === "aguardando_qr"
      ? <Badge variant="secondary">Aguardando QR</Badge>
      : <Badge variant="outline">Desconectado</Badge>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">WhatsApp (Evolution API)</h1>
        <p className="text-muted-foreground text-sm">Conecta o número da loja pra atender no zap.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plug className="w-5 h-5" /> Conexão Evolution</CardTitle>
          <CardDescription>
            Rode a Evolution localmente e exponha com <a className="underline" href="https://ngrok.com" target="_blank" rel="noreferrer">ngrok</a> (ou similar) — o Lovable precisa alcançar a URL pra mandar mensagens. Veja <code>docker-compose.evolution.yml</code> na raiz.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Nome da instância</Label>
            <Input value={form.instance_name} onChange={(e) => setForm({ ...form, instance_name: e.target.value })} placeholder="acai-mae" />
          </div>
          <div className="grid gap-2">
            <Label>URL da Evolution</Label>
            <Input value={form.evolution_url} onChange={(e) => setForm({ ...form, evolution_url: e.target.value })} placeholder="https://abc123.ngrok.app" />
          </div>
          <div className="grid gap-2">
            <Label>API Key global (AUTHENTICATION_API_KEY)</Label>
            <Input type="password" value={form.evolution_api_key} onChange={(e) => setForm({ ...form, evolution_api_key: e.target.value })} />
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </CardContent>
      </Card>

      {inst.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PlugZap className="w-5 h-5" /> Status</CardTitle>
            <CardDescription className="flex items-center gap-3">
              {statusBadge}
              {st.data?.phone && <span className="text-xs">📱 {st.data.phone}</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => conn.mutate()} disabled={conn.isPending}>
                {conn.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}
                Conectar / Gerar QR
              </Button>
              <Button variant="outline" onClick={() => st.refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
              </Button>
              {statusValue === "conectado" && (
                <Button variant="destructive" onClick={() => disc.mutate()} disabled={disc.isPending}>
                  Desconectar
                </Button>
              )}
            </div>

            {conn.data?.qr && statusValue !== "conectado" && (
              <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-muted/30">
                <img src={conn.data.qr} alt="QR" className="w-64 h-64" />
                <p className="text-xs text-muted-foreground">Abre WhatsApp → Aparelhos conectados → Conectar aparelho</p>
              </div>
            )}

            {conn.data?.webhookUrl && (
              <div className="text-xs text-muted-foreground break-all p-3 bg-muted/30 rounded">
                <b>Webhook configurado:</b> {conn.data.webhookUrl}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
