import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMenu } from "@/lib/menu.functions";

const menuQ = queryOptions({ queryKey: ["menu"], queryFn: () => getMenu({ data: undefined }) });

export const Route = createFileRoute("/_authenticated/cardapio")({
  head: () => ({ meta: [{ title: "Cardápio — AçaíBot" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(menuQ),
  component: () => (
    <Suspense fallback={<div className="p-6">Carregando...</div>}>
      <CardapioPage />
    </Suspense>
  ),
});

function CardapioPage() {
  const { data } = useSuspenseQuery(menuQ);
  const groups = ["copo", "barca", "marmita", "roleta"] as const;
  const addonGroups = [
    { key: "fruta", label: "Frutas (grátis)" },
    { key: "cobertura", label: "Coberturas (grátis)" },
    { key: "complemento", label: "Complementos (grátis)" },
    { key: "creme", label: "Cremes (grátis)" },
    { key: "pago", label: "Adicionais pagos" },
  ] as const;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Cardápio</h1>
        <p className="text-sm text-muted-foreground">O bot usa exatamente esses itens pra montar o pedido.</p>
      </div>

      {groups.map((g) => {
        const items = data.sizes.filter((s: any) => s.category === g);
        if (!items.length) return null;
        return (
          <section key={g}>
            <h2 className="font-semibold capitalize mb-3">{g === "copo" ? "Copos" : g === "barca" ? "Barcas" : g === "marmita" ? "Marmitas" : "Roletas"}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {items.map((s: any) => (
                <Card key={s.id} className="p-4">
                  <div className="flex justify-between">
                    <div className="font-medium">{s.name}</div>
                    <div className="font-bold text-primary">R$ {Number(s.price).toFixed(2)}</div>
                  </div>
                  {s.volume_ml && <div className="text-xs text-muted-foreground">{s.volume_ml}ml</div>}
                  <div className="mt-2 text-xs">
                    <Badge variant="secondary">{s.free_addons} adicionais</Badge>{" "}
                    <Badge variant="secondary">{s.free_toppings} coberturas</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      <section>
        <h2 className="font-semibold mb-3">Adicionais</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {addonGroups.map((g) => {
            const items = data.addons.filter((a: any) => a.category === g.key);
            if (!items.length) return null;
            return (
              <Card key={g.key} className="p-4">
                <div className="font-medium mb-2">{g.label}</div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((a: any) => (
                    <Badge key={a.id} variant={a.is_paid ? "default" : "outline"}>
                      {a.name}{a.is_paid ? ` · R$ ${Number(a.price).toFixed(2)}` : ""}
                    </Badge>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Bairros e taxa de entrega</h2>
        <Card className="p-4">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground text-left">
              <tr><th className="pb-2">Bairro</th><th className="pb-2">Taxa</th><th className="pb-2">Tempo</th></tr>
            </thead>
            <tbody>
              {data.zones.map((z: any) => (
                <tr key={z.id} className="border-t">
                  <td className="py-2">{z.neighborhood}</td>
                  <td>R$ {Number(z.fee).toFixed(2)}</td>
                  <td>{z.eta_minutes} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </div>
  );
}
