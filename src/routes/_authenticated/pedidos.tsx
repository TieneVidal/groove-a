import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Clock, Volume2, VolumeX } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — AçaíBot" }] }),
  component: PedidosPage,
});

type Order = {
  id: string;
  status: "novo" | "preparando" | "entrega" | "entregue" | "cancelado";
  items: Array<{ size: string; qty: number; free: string[]; paid: string[]; subtotal: number }>;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string | null;
  change_for: number | null;
  address: string | null;
  neighborhood: string | null;
  eta_minutes: number | null;
  notes: string | null;
  created_at: string;
  customer_id: string | null;
};

const COLS: { key: Order["status"]; label: string; color: string }[] = [
  { key: "novo", label: "Novo", color: "bg-blue-500" },
  { key: "preparando", label: "Preparando", color: "bg-amber-500" },
  { key: "entrega", label: "Saiu p/ entrega", color: "bg-purple-500" },
  { key: "entregue", label: "Entregue", color: "bg-emerald-500" },
];

function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Record<string, { name: string | null; phone: string | null }>>({});
  const [soundOn, setSoundOn] = useState(true);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const knownIds = useRef<Set<string>>(new Set());

  async function load() {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100);
    const list = (data as Order[]) ?? [];
    list.forEach((o) => knownIds.current.add(o.id));
    setOrders(list);
    const ids = Array.from(new Set(list.map((o) => o.customer_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: cs } = await supabase.from("customers").select("id,name,phone").in("id", ids);
      const map: typeof customers = {};
      cs?.forEach((c: any) => (map[c.id] = { name: c.name, phone: c.phone }));
      setCustomers(map);
    }
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("orders-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const n = payload.new as Order;
          if (!knownIds.current.has(n.id) && soundRef.current) {
            new Audio("data:audio/wav;base64,UklGRlYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTIAAACA").play().catch(() => {});
          }
          load();
        } else load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function move(id: string, status: Order["status"]) {
    await supabase.from("orders").update({ status }).eq("id", id);
    load();
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-sm text-muted-foreground">Arraste com os botões. Atualiza em tempo real.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSoundOn(!soundOn)}>
          {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLS.map((col) => {
          const items = orders.filter((o) => o.status === col.key);
          return (
            <div key={col.key} className="bg-background rounded-lg border">
              <div className="p-3 border-b flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.color}`} />
                <span className="font-medium text-sm">{col.label}</span>
                <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
              </div>
              <div className="p-2 space-y-2 max-h-[calc(100vh-200px)] overflow-auto">
                {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Sem pedidos</p>}
                {items.map((o) => (
                  <OrderCard key={o.id} order={o} customer={o.customer_id ? customers[o.customer_id] : undefined} onMove={move} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({ order, customer, onMove }: { order: Order; customer?: { name: string | null; phone: string | null }; onMove: (id: string, s: Order["status"]) => void }) {
  const nextStatus: Record<Order["status"], Order["status"] | null> = {
    novo: "preparando",
    preparando: "entrega",
    entrega: "entregue",
    entregue: null,
    cancelado: null,
  };
  const next = nextStatus[order.status];
  return (
    <Card className="p-3 text-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-semibold">{customer?.name ?? "Cliente"}</div>
          {customer?.phone && (
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{customer.phone}</div>
          )}
        </div>
        <div className="text-right">
          <div className="font-bold text-primary">R$ {order.total.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><Clock className="w-3 h-3" />{format(new Date(order.created_at), "HH:mm")}</div>
        </div>
      </div>
      <div className="space-y-1 mb-2 text-xs">
        {order.items.map((it, i) => (
          <div key={i} className="bg-muted/40 rounded p-1.5">
            <div className="font-medium">{it.qty}x {it.size}</div>
            {it.free.length > 0 && <div className="text-muted-foreground">+ {it.free.join(", ")}</div>}
            {it.paid.length > 0 && <div className="text-amber-600">+ {it.paid.join(", ")} (pagos)</div>}
          </div>
        ))}
      </div>
      {order.address && (
        <div className="text-xs text-muted-foreground flex gap-1 mb-2"><MapPin className="w-3 h-3 mt-0.5 shrink-0" /><span>{order.address}{order.neighborhood ? `, ${order.neighborhood}` : ""}</span></div>
      )}
      {order.payment_method && (
        <div className="text-xs mb-2"><span className="text-muted-foreground">Pagamento:</span> {order.payment_method}{order.change_for ? ` (troco p/ R$ ${order.change_for.toFixed(2)})` : ""}</div>
      )}
      <div className="flex gap-1 mt-2">
        {next && (
          <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => onMove(order.id, next)}>
            → {next === "preparando" ? "Preparar" : next === "entrega" ? "Sair p/ entrega" : "Entregue"}
          </Button>
        )}
        {order.status !== "entregue" && order.status !== "cancelado" && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onMove(order.id, "cancelado")}>Cancelar</Button>
        )}
      </div>
    </Card>
  );
}
