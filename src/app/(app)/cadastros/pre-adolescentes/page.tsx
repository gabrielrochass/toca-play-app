import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getUnitScope } from "@/lib/unitScope";
import { createClient } from "@/lib/supabase/server";
import { toISODate } from "@/lib/utils";
import { ageAt } from "@/lib/age";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { TeenList } from "./TeenList";
import { TeenFilters } from "./TeenFilters";
import type { TeenDetail } from "@/components/TeenDetailModal";

export default async function PreAdolescentesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sexo?: string; idade?: string; inativos?: string }>;
}) {
  const ctx = await requireSession();
  const scope = await getUnitScope(ctx);
  const { q, sexo, idade, inativos } = await searchParams;
  const supabase = await createClient();
  const today = toISODate(new Date());
  const showInactive = inativos === "1";

  let query = supabase
    .from("teens")
    .select("*")
    .eq("is_active", !showInactive)
    .order("name");
  if (scope.unitId) query = query.eq("unit_id", scope.unitId);
  if (sexo === "M" || sexo === "F") query = query.eq("sex", sexo);
  if (q) {
    const safe = q.replace(/[,()%*]/g, " ").trim();
    if (safe) query = query.or(`name.ilike.%${safe}%,display_id.ilike.%${safe}%`);
  }

  const { data: rows } = await query;
  const withAge = (rows ?? []).map((t) => ({ ...t, age: ageAt(t.birthdate, today) }));

  // Age options come from the sex/search-filtered set (before the age filter).
  const ages = [...new Set(withAge.map((t) => t.age))].sort((a, b) => a - b);

  const idadeNum = idade ? Number(idade) : null;
  const filtered =
    idadeNum != null ? withAge.filter((t) => t.age === idadeNum) : withAge;

  // Full guardian list for the shown teens (one query, grouped in JS).
  const ids = filtered.map((t) => t.id);
  const guardiansByTeen = new Map<
    string,
    { name: string; phone: string; relationship: string | null }[]
  >();
  if (ids.length) {
    const { data: gRows } = await supabase
      .from("teen_guardians")
      .select("teen_id, name, phone, relationship")
      .in("teen_id", ids)
      .order("sort_order");
    for (const g of gRows ?? []) {
      const arr = guardiansByTeen.get(g.teen_id) ?? [];
      arr.push({ name: g.name, phone: g.phone, relationship: g.relationship });
      guardiansByTeen.set(g.teen_id, arr);
    }
  }

  const teens: TeenDetail[] = filtered.map((t) => ({
    id: t.id,
    display_id: t.display_id,
    name: t.name,
    sex: t.sex,
    birthdate: t.birthdate,
    guardian_name: t.guardian_name,
    guardian_phone: t.guardian_phone,
    guardians: guardiansByTeen.get(t.id),
    neighborhood: t.neighborhood,
    observations: t.observations,
    is_active: t.is_active,
  }));

  const hasFilter = Boolean(q || sexo || idade || showInactive);

  return (
    <>
      <PageHeader
        title="Pré-adolescentes"
        subtitle="Cadastre uma vez e reutilize a cada check-in."
        action={
          <Link href="/cadastros/pre-adolescentes/novo">
            <Button variant="grass" size="sm">
              <Plus className="h-4 w-4" strokeWidth={3} /> Novo
            </Button>
          </Link>
        }
      />

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <SearchInput placeholder="Buscar por nome ou ID (ex: CF-0042)" />
        </div>
        <TeenFilters ages={ages} />
      </div>

      <p className="mb-4 text-xs text-muted">
        <span className="font-mono text-sm text-ink">{teens.length}</span>{" "}
        {teens.length === 1 ? "pré-adolescente" : "pré-adolescentes"}
      </p>

      {teens.length === 0 ? (
        <EmptyState
          title={
            showInactive
              ? "Nenhum inativo"
              : hasFilter
                ? "Ninguém encontrado"
                : "Ninguém cadastrado ainda"
          }
          hint={
            hasFilter
              ? "Ajuste os filtros ou a busca."
              : "Cadastre o primeiro pré-adolescente para começar."
          }
        />
      ) : (
        <TeenList teens={teens} refDate={today} showInactive={showInactive} />
      )}
    </>
  );
}
