import Link from "next/link";
import { Plus, Pencil, Phone } from "lucide-react";
import { requireSession, hasAtLeast } from "@/lib/auth";
import { getUnitScope } from "@/lib/unitScope";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";

export default async function VoluntariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireSession();
  const scope = await getUnitScope(ctx);
  const canManage = hasAtLeast(ctx.profile.role, "unit_admin");
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("volunteers")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (scope.unitId) query = query.eq("unit_id", scope.unitId);
  if (q) {
    const safe = q.replace(/[,()%*]/g, " ").trim();
    if (safe) query = query.ilike("name", `%${safe}%`);
  }
  const { data: volunteers } = await query;

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

      <div className="mb-4 max-w-md">
        <SearchInput placeholder="Buscar voluntário" />
      </div>

      {!volunteers?.length ? (
        <EmptyState
          title={q ? "Nenhum voluntário encontrado" : "Nenhum voluntário cadastrado"}
          hint={canManage ? "Cadastre o time da sua unidade." : undefined}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {volunteers.map((v) => (
            <li key={v.id} className="panel flex items-center gap-3 p-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-night-600 bg-night-800 font-display text-sm text-orange">
                {v.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-ink">
                  {v.name}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                  {v.phone ? (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {v.phone}
                    </span>
                  ) : (
                    <span>Sem telefone</span>
                  )}
                </div>
              </div>
              {canManage ? (
                <Link
                  href={`/cadastros/voluntarios/${v.id}/editar`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-night-700 text-muted transition-colors hover:border-orange hover:text-orange"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" strokeWidth={2.5} />
                  <span className="sr-only">Editar {v.name}</span>
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
