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
  searchParams: Promise<{ q?: string; sexo?: string; idade?: string }>;
}) {
  const ctx = await requireSession();
  const scope = await getUnitScope(ctx);
  const { q, sexo, idade } = await searchParams;
  const supabase = await createClient();
  const today = toISODate(new Date());

  let query = supabase
    .from("teens")
    .select("*")
    .eq("is_active", true)
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
  const teens: TeenDetail[] =
    idadeNum != null ? withAge.filter((t) => t.age === idadeNum) : withAge;

  const hasFilter = Boolean(q || sexo || idade);

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
          title={hasFilter ? "Ninguém encontrado" : "Ninguém cadastrado ainda"}
          hint={
            hasFilter
              ? "Ajuste os filtros ou a busca."
              : "Cadastre o primeiro pré-adolescente para começar."
          }
        />
      ) : (
        <TeenList teens={teens} refDate={today} />
      )}
    </>
  );
}
