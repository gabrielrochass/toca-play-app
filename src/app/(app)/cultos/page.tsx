import Link from "next/link";
import { Plus, Users, ChevronRight } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getUnitScope, serviceLabelsForScope } from "@/lib/unitScope";
import { createClient } from "@/lib/supabase/server";
import { formatDateBR } from "@/lib/utils";
import { unitTone } from "@/lib/units";
import { dateRangeFor } from "@/lib/period";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { PeriodFilters } from "@/components/shell/PeriodFilters";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

export default async function CultosPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; servico?: string }>;
}) {
  const ctx = await requireSession();
  const scope = await getUnitScope(ctx);
  const { dia, servico } = await searchParams;
  const supabase = await createClient();
  const services = await serviceLabelsForScope(scope.unitId);

  let query = supabase
    .from("v_session_attendance")
    .select("*")
    .order("session_date", { ascending: false })
    .order("service_label")
    .limit(100);
  if (scope.unitId) query = query.eq("unit_id", scope.unitId);
  if (servico) query = query.eq("service_label", servico);
  const range = dateRangeFor({ day: dia });
  if (range.gte) query = query.gte("session_date", range.gte);
  if (range.lte) query = query.lte("session_date", range.lte);

  const { data: sessions } = await query;

  // Global admin on "Todas": label each culto with its unit (a BV/CF 10h on the
  // same day are otherwise indistinguishable). The view exposes unit_id only.
  const showUnit = !scope.unitId;
  const unitCodeById = new Map<string, string>();
  if (showUnit) {
    const { data: unitRows } = await supabase.from("units").select("id, code");
    for (const u of unitRows ?? []) unitCodeById.set(u.id, u.code);
  }

  return (
    <>
      <PageHeader
        title="Cultos"
        subtitle="Cada culto tem seu check-in, grupos e presença de voluntários."
        action={
          <Link href="/cultos/novo">
            <Button variant="grass" size="sm">
              <Plus className="h-4 w-4" strokeWidth={3} /> Novo culto
            </Button>
          </Link>
        }
      />

      <PeriodFilters services={services} />

      {!sessions?.length ? (
        <EmptyState
          title="Nenhum culto encontrado"
          hint="Ajuste os filtros ou abra um novo culto."
          action={
            <Link href="/cultos/novo">
              <Button variant="grass" size="sm">
                Abrir culto
              </Button>
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {sessions.map((s) => (
            <li key={s.session_id}>
              <Link
                href={`/cultos/${s.session_id}`}
                className="panel flex items-center gap-4 p-4 transition-colors hover:border-night-600 hover:bg-night-800"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-2xl leading-none text-ink">
                    {s.session_date ? formatDateBR(s.session_date) : "—"}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {showUnit && s.unit_id && unitCodeById.get(s.unit_id) ? (
                      <Chip tone={unitTone(unitCodeById.get(s.unit_id))}>
                        {unitCodeById.get(s.unit_id)}
                      </Chip>
                    ) : null}
                    <Chip tone="gold">{s.service_label ?? ""}</Chip>
                    {s.closed_at ? (
                      <Chip tone="night">Encerrado</Chip>
                    ) : (
                      <Chip tone="grass">Aberto</Chip>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-muted">
                  <Users className="h-4 w-4" />
                  <span className="font-mono text-2xl text-grass">
                    {s.teens_present ?? 0}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
