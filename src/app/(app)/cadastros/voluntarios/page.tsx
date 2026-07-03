import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSession, hasAtLeast } from "@/lib/auth";
import { getUnitScope } from "@/lib/unitScope";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { InactiveToggle } from "@/components/ui/InactiveToggle";
import { Button } from "@/components/ui/Button";
import { VolunteerList } from "./VolunteerList";

export default async function VoluntariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; inativos?: string }>;
}) {
  const ctx = await requireSession();
  const scope = await getUnitScope(ctx);
  const canManage = hasAtLeast(ctx.profile.role, "unit_admin");
  const { q, inativos } = await searchParams;
  const showInactive = canManage && inativos === "1";
  const supabase = await createClient();

  let query = supabase
    .from("volunteers")
    .select("*")
    .eq("is_active", !showInactive)
    .order("name");
  if (scope.unitId) query = query.eq("unit_id", scope.unitId);
  if (q) {
    const safe = q.replace(/[,()%*]/g, " ").trim();
    if (safe) query = query.ilike("name", `%${safe}%`);
  }
  const { data: volunteers } = await query;

  const rows = (volunteers ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    phone: v.phone,
    functions: v.functions,
  }));

  return (
    <>
      <PageHeader
        title="Voluntários"
        subtitle="Time do TocaPlay. A presença por culto é marcada dentro de cada culto."
        action={
          canManage ? (
            <Link href="/cadastros/voluntarios/novo">
              <Button variant="grass" size="sm">
                <Plus className="h-4 w-4" strokeWidth={3} /> Novo voluntário
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="min-w-56 flex-1 sm:max-w-md">
          <SearchInput placeholder="Buscar voluntário" />
        </div>
        {canManage ? <InactiveToggle /> : null}
      </div>

      {rows.length === 0 && !canManage ? (
        <EmptyState
          title={q ? "Nenhum voluntário encontrado" : "Nenhum voluntário cadastrado"}
        />
      ) : (
        <VolunteerList
          volunteers={rows}
          canManage={canManage}
          showInactive={showInactive}
          emptyLabel={
            showInactive
              ? "Nenhum voluntário inativo."
              : q
                ? `Nenhum resultado para “${q}”.`
                : "Cadastre o time da sua unidade."
          }
        />
      )}
    </>
  );
}
