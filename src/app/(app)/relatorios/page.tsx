import { requireSession } from "@/lib/auth";
import { getUnitScope } from "@/lib/unitScope";
import { createClient } from "@/lib/supabase/server";
import {
  teenGrowthByMonth,
  teensPerSession,
  volunteersPerSession,
  teensBySexPerSession,
} from "@/lib/analytics/queries";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { ChartCard } from "@/components/charts/ChartCard";
import {
  LineChartMc,
  BarChartMc,
  GroupedBarChartMc,
} from "@/components/charts/Charts";
import { CHART_COLORS, SEX_COLORS } from "@/components/charts/palette";

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
