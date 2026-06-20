import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { sendAgentMessage, newTestConversation, loadMessages } from "@/lib/agent.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, RotateCcw, Bot, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/conversas")({
  head: () => ({ meta: [{ title: "Conversas — AçaíBot" }] }),
  component: ConversasPage,
});

type Msg = { id: string; role: string; content: string | null };

function ConversasPage() {
  const send = useServerFn(sendAgentMessage);
  const newConv = useServerFn(newTestConversation);
  const load = useServerFn(loadMessages);
  const [convId, setConvId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function start() {
    const r = await newConv({ data: undefined });
    setConvId(r.id);
    setMsgs([{ id: "welcome", role: "assistant", content: "Oi! 👋 Sou o bot. Bora fazer um pedido?" }]);
  }

  useEffect(() => { start(); /* eslint-disable-next-line */ }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!convId || !input.trim() || loading) return;
    const txt = input.trim();
    setInput("");
    setMsgs((m) => [...m, { id: `tmp-${Date.now()}`, role: "user", content: txt }]);
    setLoading(true);
    try {
      const r = await send({ data: { conversationId: convId, userMessage: txt } });
      const fresh = await load({ data: { conversationId: convId } });
      setMsgs(fresh as Msg[]);
    } catch (err: any) {
      toast.error(err.message ?? "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Testar o bot</h1>
          <p className="text-sm text-muted-foreground">Converse como se fosse seu cliente. Pedidos viram pedidos reais no painel.</p>
        </div>
        <Button variant="outline" size="sm" onClick={start} disabled={loading}>
          <RotateCcw className="w-4 h-4 mr-1" /> Nova conversa
        </Button>
      </div>

      <Card className="h-[calc(100vh-220px)] flex flex-col">
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {msgs.filter(m => m.role === "user" || m.role === "assistant").map((m) => (
            <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center"><Bot className="w-4 h-4 text-primary" /></div>
              <div className="bg-muted rounded-2xl px-4 py-2 text-sm text-muted-foreground">digitando...</div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <form onSubmit={submit} className="border-t p-3 flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Digite uma mensagem..." disabled={loading || !convId} />
          <Button type="submit" disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
