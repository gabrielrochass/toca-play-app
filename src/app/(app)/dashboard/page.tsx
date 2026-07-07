import Link from "next/link";
import { Plus, CalendarDays, ArrowRight } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getUnitScope } from "@/lib/unitScope";
import { createClient } from "@/lib/supabase/server";
import { teensPerSession } from "@/lib/analytics/queries";
import { formatDateBR, toISODate } from "@/lib/utils";
import { isBirthday } from "@/lib/age";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { ChartCard } from "@/components/charts/ChartCard";
import { LineChartMc } from "@/components/charts/ChartsLazy";
import { CHART_COLORS } from "@/components/charts/palette";
import {
  DashboardAlerts,
  type BirthdayTeen,
  type LowStockItem,
} from "./DashboardAlerts";

export default async function DashboardPage() {
  const ctx = await requireSession();
  const scope = await getUnitScope(ctx);
  const supabase = await createClient();
  const todayISO = toISODate(new Date());

  const teenCountQ = supabase
    .from("teens")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  const sessionCountQ = supabase
    .from("sessions")
    .select("id", { count: "exact", head: true });
  let todayQ = supabase
    .from("sessions")
    .select("id, service_id, unit_id, closed_at")
    .eq("session_date", todayISO)
    .order("unit_id")
    .order("service_id");
  if (scope.unitId) {
    teenCountQ.eq("unit_id", scope.unitId);
    sessionCountQ.eq("unit_id", scope.unitId);
    todayQ = todayQ.eq("unit_id", scope.unitId);
  }

  const [{ data: todaySessions }, { count: teenCount }, { count: sessionCount }, series] =
    await Promise.all([
      todayQ,
      teenCountQ,
      sessionCountQ,
      teensPerSession(supabase, scope.unitId),
    ]);

  // Resolve today's service labels.
  const serviceIds = (todaySessions ?? []).map((s) => s.service_id);
  const { data: services } = serviceIds.length
    ? await supabase.from("unit_services").select("id, label").in("id", serviceIds)
    : { data: [] };
  const labelOf = new Map((services ?? []).map((s) => [s.id, s.label]));

  // --- Alerts: birthdays today + low stock -------------------------------
  let teenBdayQ = supabase
    .from("teens")
    .select("id, name, birthdate, unit_id")
    .eq("is_active", true);
  let productsQ = supabase
    .from("products")
    .select("id, name, quantity, min_quantity, unit_label, unit_id")
    .eq("is_active", true);
  if (scope.unitId) {
    teenBdayQ = teenBdayQ.eq("unit_id", scope.unitId);
    productsQ = productsQ.eq("unit_id", scope.unitId);
  }
  const [{ data: allTeens }, { data: allProducts }] = await Promise.all([
    teenBdayQ,
    productsQ,
  ]);

  // Global admin viewing "Todas": alerts span units, so label each item with its
  // unit. Resolve a unit_id -> {code, name} map (unnecessary when a unit is focused).
  const showUnit = !scope.unitId;
  const unitById = new Map<string, { code: string; name: string }>();
  if (showUnit) {
    const { data: unitRows } = await supabase.from("units").select("id, code, name");
    for (const u of unitRows ?? []) unitById.set(u.id, { code: u.code, name: u.name });
  }

  const bdayTeens = (allTeens ?? []).filter((t) =>
    isBirthday(t.birthdate, todayISO),
  );
  let birthdays: BirthdayTeen[] = [];
  if (bdayTeens.length) {
    const bdayIds = bdayTeens.map((t) => t.id);
    const { data: gRows } = await supabase
      .from("teen_guardians")
      .select("teen_id, name, phone")
      .in("teen_id", bdayIds)
      .order("sort_order");
    const byTeen = new Map<string, { name: string; phone: string }[]>();
    for (const g of gRows ?? []) {
      const arr = byTeen.get(g.teen_id) ?? [];
      arr.push({ name: g.name, phone: g.phone });
      byTeen.set(g.teen_id, arr);
    }
    birthdays = bdayTeens.map((t) => {
      const u = showUnit ? unitById.get(t.unit_id) : undefined;
      return {
        id: t.id,
        name: t.name,
        guardians: byTeen.get(t.id) ?? [],
        unitCode: u?.code ?? null,
        unitName: u?.name ?? null,
      };
    });
  }

  const lowStock: LowStockItem[] = (allProducts ?? [])
    .filter((p) => p.quantity <= p.min_quantity)
    .map((p) => ({
      id: p.id,
      name: p.name,
      quantity: p.quantity,
      min_quantity: p.min_quantity,
      unit_label: p.unit_label,
      unitCode: showUnit ? (unitById.get(p.unit_id)?.code ?? null) : null,
    }));

  const firstName = ctx.profile.full_name.split(" ")[0];

  // Only OPEN cultos are continuable (a closed one is done). For a global admin
  // on "Todas", label each with its unit so it's clear which culto it is.
  const openToday = (todaySessions ?? []).filter((s) => !s.closed_at);
  const cultoLabel = (s: { service_id: string; unit_id: string }) => {
    const service = labelOf.get(s.service_id) ?? "culto";
    const code = showUnit ? unitById.get(s.unit_id)?.code : null;
    return code ? `${code} · ${service}` : service;
  };

  return (
    <>
      <PageHeader
        title={`Olá, ${firstName}!`}
        subtitle={`Hoje é ${formatDateBR(todayISO)}.`}
      />

      <DashboardAlerts
        birthdays={birthdays}
        lowStock={lowStock}
        dateKey={todayISO}
      />

      {/* Today's culto */}
      <Card className="mb-5">
        <CardTitle className="mb-3">Culto de hoje</CardTitle>
        {openToday.length ? (
          <div className="flex flex-wrap gap-2">
            {openToday.map((s) => (
              <Link key={s.id} href={`/cultos/${s.id}`}>
                <Button variant="grass">
                  <CalendarDays className="h-4 w-4" strokeWidth={2.5} />
                  Continuar {cultoLabel(s)}
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </Button>
              </Link>
            ))}
            <Link href="/cultos/novo">
              <Button>
                <Plus className="h-4 w-4" strokeWidth={3} /> Outro horário
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted">Nenhum culto aberto hoje.</p>
            <Link href="/cultos/novo">
              <Button variant="grass">
                <Plus className="h-4 w-4" strokeWidth={3} /> Abrir culto de hoje
              </Button>
            </Link>
          </div>
        )}
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Pré-adolescentes" value={teenCount ?? 0} tone="grass" />
        <StatTile label="Cultos" value={sessionCount ?? 0} tone="gold" />
        <StatTile
          label="Unidade"
          value={scope.code ?? "Todas"}
          tone="diamond"
        />
      </div>

      <ChartCard title="Presença nos últimos cultos" empty={series.length === 0}>
        <LineChartMc data={series} dataKey="value" color={CHART_COLORS.diamond} />
      </ChartCard>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/cadastros/pre-adolescentes/novo">
          <Button size="sm">
            <Plus className="h-4 w-4" strokeWidth={3} /> Novo pré-adolescente
          </Button>
        </Link>
        <Link href="/relatorios">
          <Button size="sm">
            Ver relatórios <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Button>
        </Link>
      </div>
    </>
  );
}
