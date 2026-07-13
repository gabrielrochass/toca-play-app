import { requireSession } from "@/lib/auth";
import { getUnitScope } from "@/lib/unitScope";
import { createClient } from "@/lib/supabase/server";
import {
  teenGrowthByMonth,
  teensPerSession,
  volunteersPerSession,
  teensBySexPerSession,
  unitComparison,
} from "@/lib/analytics/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { ChartCard } from "@/components/charts/ChartCard";
import {
  LineChartMc,
  BarChartMc,
  GroupedBarChartMc,
  MultiLineChartMc,
} from "@/components/charts/ChartsLazy";
import { CHART_COLORS, SEX_COLORS, UNIT_CHART_COLORS } from "@/components/charts/palette";

// Unit → StatTile tone (mirrors the chart/badge unit colors: CF=grass, BV=teal, RA=terra).
const UNIT_TILE_TONE: Record<string, "grass" | "diamond" | "terra"> = {
  CF: "grass",
  BV: "diamond",
  RA: "terra",
};

export default async function RelatoriosPage() {
  const ctx = await requireSession();
  const scope = await getUnitScope(ctx);
  const u = scope.unitId;
  const supabase = await createClient();

  const [growth, teenSeries, volSeries, sexSeries] = await Promise.all([
    teenGrowthByMonth(supabase, u),
    teensPerSession(supabase, u),
    volunteersPerSession(supabase, u),
    teensBySexPerSession(supabase, u),
  ]);

  // Global admin on "Todas" also gets a cross-unit comparison section.
  const comparison = u ? null : await unitComparison(supabase);
  const unitSeries =
    comparison?.units.map((un) => ({
      key: un.code,
      name: un.name,
      color: UNIT_CHART_COLORS[un.code] ?? "var(--unit-cf)",
    })) ?? [];

  const teenCountQ = supabase
    .from("teens")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  const volCountQ = supabase
    .from("volunteers")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  const sessionCountQ = supabase
    .from("sessions")
    .select("id", { count: "exact", head: true });
  if (u) {
    teenCountQ.eq("unit_id", u);
    volCountQ.eq("unit_id", u);
    sessionCountQ.eq("unit_id", u);
  }
  const [{ count: teenCount }, { count: volCount }, { count: sessionCount }] =
    await Promise.all([teenCountQ, volCountQ, sessionCountQ]);

  const avgAttendance = teenSeries.length
    ? Math.round(
        teenSeries.reduce((s, p) => s + p.value, 0) / teenSeries.length,
      )
    : 0;

  const avgBoys = sexSeries.length
    ? Math.round(sexSeries.reduce((s, p) => s + p.m, 0) / sexSeries.length)
    : 0;
  const avgGirls = sexSeries.length
    ? Math.round(sexSeries.reduce((s, p) => s + p.f, 0) / sexSeries.length)
    : 0;

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Crescimento dos pré-adolescentes e engajamento dos voluntários ao longo do tempo."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Pré-adolescentes" value={teenCount ?? 0} tone="grass" />
        <StatTile label="Voluntários" value={volCount ?? 0} tone="diamond" />
        <StatTile label="Cultos" value={sessionCount ?? 0} tone="gold" />
        <StatTile label="Média/culto" value={avgAttendance} tone="terra" />
        <StatTile label="Média meninos/culto" value={avgBoys} tone="diamond" />
        <StatTile label="Média meninas/culto" value={avgGirls} tone="terra" />
      </div>

      {comparison ? (
        <section className="mb-6">
          <h2 className="mb-1 font-display text-[0.72rem] text-ink [word-spacing:-0.1em]">
            Comparativo entre unidades
          </h2>
          <p className="mb-3 text-xs text-muted">Média de presentes por culto</p>
          <div className="mb-4 grid grid-cols-3 gap-3">
            {comparison.units.map((un) => (
              <StatTile
                key={un.code}
                label={un.name}
                value={comparison.averages[un.code] ?? 0}
                tone={UNIT_TILE_TONE[un.code] ?? "ink"}
              />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="Presença por culto"
              subtitle="Presentes por culto — em ordem de dia e horário (10h, 16h, 17h, 18h30)"
              empty={comparison.attendancePerCulto.length === 0}
            >
              <MultiLineChartMc data={comparison.attendancePerCulto} series={unitSeries} />
            </ChartCard>
            <ChartCard
              title="Voluntários por culto"
              subtitle="Time presente por culto, na sequência temporal"
              empty={comparison.volunteersPerCulto.length === 0}
            >
              <MultiLineChartMc data={comparison.volunteersPerCulto} series={unitSeries} />
            </ChartCard>
            <ChartCard
              title="Crescimento por unidade"
              subtitle="Pré-adolescentes cadastrados (acumulado), mês a mês"
              empty={comparison.growth.length === 0}
            >
              <MultiLineChartMc data={comparison.growth} series={unitSeries} />
            </ChartCard>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Crescimento acumulado"
          subtitle="Total de pré-adolescentes cadastrados, mês a mês"
          empty={growth.length === 0}
        >
          <LineChartMc
            data={growth}
            dataKey="cumulative"
            color={CHART_COLORS.grass}
          />
        </ChartCard>

        <ChartCard title="Novos por mês" empty={growth.length === 0}>
          <BarChartMc data={growth} dataKey="newTeens" color={CHART_COLORS.gold} />
        </ChartCard>

        <ChartCard
          title="Presença por culto"
          subtitle="Pré-adolescentes presentes nos últimos cultos"
          empty={teenSeries.length === 0}
        >
          <LineChartMc
            data={teenSeries}
            dataKey="value"
            color={CHART_COLORS.diamond}
          />
        </ChartCard>

        <ChartCard
          title="Voluntários por culto"
          subtitle="Presença do time nos últimos cultos"
          empty={volSeries.length === 0}
        >
          <BarChartMc
            data={volSeries}
            dataKey="value"
            color={CHART_COLORS.terra}
          />
        </ChartCard>

        <ChartCard
          title="Presença por sexo"
          subtitle="Meninos e meninas presentes por culto"
          empty={sexSeries.length === 0}
        >
          <GroupedBarChartMc
            data={sexSeries}
            series={[
              { key: "m", name: "Meninos", color: SEX_COLORS.M },
              { key: "f", name: "Meninas", color: SEX_COLORS.F },
            ]}
          />
        </ChartCard>
      </div>
    </>
  );
}
