import { requireSession, hasAtLeast } from "@/lib/auth";
import { getUnitScope } from "@/lib/unitScope";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { StockView, type ProductRow } from "./StockView";
import { NewProductButton } from "./NewProductButton";
import type { Unit } from "@/types/database";

export default async function EstoquePage() {
  const ctx = await requireSession();
  const scope = await getUnitScope(ctx);
  const canManage = hasAtLeast(ctx.profile.role, "unit_admin");
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (scope.unitId) query = query.eq("unit_id", scope.unitId);
  const { data: products } = await query;

  const rows: ProductRow[] = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    unit_label: p.unit_label,
    quantity: p.quantity,
    min_quantity: p.min_quantity,
  }));
  // Low-stock first, then alphabetical.
  rows.sort(
    (a, b) =>
      Number(b.quantity <= b.min_quantity) - Number(a.quantity <= a.min_quantity) ||
      a.name.localeCompare(b.name),
  );

  const lowCount = rows.filter((p) => p.quantity <= p.min_quantity).length;

  // Global admin creating a product must pick a unit.
  let units: Unit[] | undefined;
  if (!ctx.profile.unit_id) {
    const { data } = await supabase
      .from("units")
      .select("*")
      .eq("is_active", true)
      .order("code");
    units = data ?? [];
  }

  return (
    <>
      <PageHeader
        title="Estoque"
        subtitle="Produtos e recursos do TocaPlay. Registre entradas e saídas e acompanhe o mínimo."
        action={canManage ? <NewProductButton units={units} /> : undefined}
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:max-w-sm">
        <StatTile label="Produtos" value={rows.length} />
        <StatTile
          label="Baixo estoque"
          value={lowCount}
          tone={lowCount > 0 ? "terra" : "ink"}
        />
      </div>

      {rows.length === 0 && !canManage ? (
        <EmptyState title="Nenhum produto cadastrado nesta unidade." />
      ) : (
        <StockView products={rows} canManage={canManage} />
      )}
    </>
  );
}
