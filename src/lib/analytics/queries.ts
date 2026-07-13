import { createClient } from "@/lib/supabase/server";
import { formatMonthShort, formatDateBR } from "@/lib/utils";
import { dateRangeFor, type SessionFilters } from "@/lib/period";

export interface UnitInfo {
  code: string;
  name: string;
}
export type UnitSeriesPoint = { label: string } & Record<string, number | string>;
export interface UnitComparison {
  /** Units present, ordered by code — one chart series each. */
  units: UnitInfo[];
  /** Cumulative registered teens per month, one value column per unit code. */
  growth: UnitSeriesPoint[];
  /** Teens present per CULTO (temporal, ordered by date then service start_time). */
  attendancePerCulto: UnitSeriesPoint[];
  /** Volunteers present per culto (same temporal x-axis). */
  volunteersPerCulto: UnitSeriesPoint[];
  /** Average teens present per culto, per unit code. */
  averages: Record<string, number>;
}

/**
 * Service label -> {start,sort}. `unit_services` seeds a 1:1 label↔start_time
 * mapping across units (10h→10:00, 16h→16:00, 17h→17:00, 18h30→18:30), so a
 * label-keyed map is enough to order cultos by real time (not by label text).
 */
async function serviceTimeMap(
  supabase: Supabase,
): Promise<Map<string, { start: string; sort: number }>> {
  const { data } = await supabase
    .from("unit_services")
    .select("label, start_time, sort_order");
  const m = new Map<string, { start: string; sort: number }>();
  for (const s of data ?? []) {
    if (!m.has(s.label)) {
      m.set(s.label, {
        start: (s.start_time as string | null) ?? "",
        sort: (s.sort_order as number | null) ?? 0,
      });
    }
  }
  return m;
}

/**
 * Pivot per-session rows into one point per (date, service) SLOT, ordered by
 * (date, service start_time). Units sharing a (date,service) land on the same
 * x-slot (compared side by side); a unit with no culto at a slot is left
 * undefined so `connectNulls` bridges its line. Keeps the last `limit` slots.
 */
function pivotPerCulto(
  rows: Array<Record<string, unknown>>,
  units: UnitInfo[],
  codeById: Map<string, string>,
  startByLabel: Map<string, { start: string; sort: number }>,
  valueKey: string,
  limit = 14,
): UnitSeriesPoint[] {
  const slots = new Map<
    string,
    { date: string; label: string; start: string; byCode: Record<string, number> }
  >();
  for (const r of rows) {
    const date = r.session_date as string | null;
    const label = (r.service_label as string | null) ?? "";
    const code = codeById.get(r.unit_id as string);
    if (!date || !code) continue;
    const key = `${date}|${label}`;
    let slot = slots.get(key);
    if (!slot) {
      slot = { date, label, start: startByLabel.get(label)?.start ?? label, byCode: {} };
      slots.set(key, slot);
    }
    slot.byCode[code] = (r[valueKey] as number | null) ?? 0;
  }
  const ordered = [...slots.values()].sort((a, b) =>
    a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date),
  );
  return ordered.slice(-limit).map((s) => {
    const point: UnitSeriesPoint = {
      label: `${formatDateBR(s.date).slice(0, 5)} ${s.label}`,
    };
    // Only set a value for units that actually had a culto at this slot; a
    // missing key renders as a gap (bridged by connectNulls).
    for (const u of units) {
      if (u.code in s.byCode) point[u.code] = s.byCode[u.code];
    }
    return point;
  });
}

/**
 * Cross-unit comparison for a global admin viewing "Todas". Reads the same
 * per-unit views WITHOUT a unit filter and pivots in JS. Per-culto series are
 * ordered by (date, service start_time) so 10h→16h→17h→18h30 reads correctly.
 * Entirely app-side — no DB changes.
 */
export async function unitComparison(
  supabase: Supabase,
  filters: SessionFilters = {},
): Promise<UnitComparison> {
  const range = dateRangeFor({ day: filters.day, month: filters.month });

  let growthQ = supabase
    .from("v_teen_growth")
    .select("unit_id, month, new_teens")
    .order("month");
  if (range.gte) growthQ = growthQ.gte("month", range.gte.slice(0, 7) + "-01");
  if (range.lte) growthQ = growthQ.lte("month", range.lte.slice(0, 7) + "-01");

  const mkSessionQ = (
    view: "v_session_attendance" | "v_volunteer_engagement",
    valueKey: string,
  ) => {
    let q = supabase
      .from(view)
      .select(`unit_id, session_date, service_label, ${valueKey}`)
      .order("session_date");
    if (filters.service) q = q.eq("service_label", filters.service);
    if (range.gte) q = q.gte("session_date", range.gte);
    if (range.lte) q = q.lte("session_date", range.lte);
    return q;
  };

  const [{ data: unitRows }, { data: growthRows }, { data: attRows }, { data: volRows }, startByLabel] =
    await Promise.all([
      supabase.from("units").select("id, code, name").eq("is_active", true).order("code"),
      growthQ,
      mkSessionQ("v_session_attendance", "teens_present"),
      mkSessionQ("v_volunteer_engagement", "volunteers_present"),
      serviceTimeMap(supabase),
    ]);

  const units: UnitInfo[] = (unitRows ?? []).map((u) => ({ code: u.code, name: u.name }));
  const codeById = new Map((unitRows ?? []).map((u) => [u.id, u.code]));

  // Cumulative growth per unit per month.
  const growthByKey = new Map<string, number>(); // `${month}|${code}` -> new teens
  const growthMonths = new Set<string>();
  for (const r of (growthRows ?? []) as Array<Record<string, unknown>>) {
    const month = r.month as string | null;
    const code = codeById.get(r.unit_id as string);
    if (!month || !code) continue;
    growthMonths.add(month);
    growthByKey.set(`${month}|${code}`, (growthByKey.get(`${month}|${code}`) ?? 0) + ((r.new_teens as number | null) ?? 0));
  }
  const running = new Map<string, number>();
  const growth: UnitSeriesPoint[] = [...growthMonths].sort().map((month) => {
    const point: UnitSeriesPoint = { label: formatMonthShort(month) };
    for (const u of units) {
      running.set(u.code, (running.get(u.code) ?? 0) + (growthByKey.get(`${month}|${u.code}`) ?? 0));
      point[u.code] = running.get(u.code) ?? 0;
    }
    return point;
  });

  const att = (attRows ?? []) as unknown as Array<Record<string, unknown>>;
  const attendancePerCulto = pivotPerCulto(att, units, codeById, startByLabel, "teens_present");
  const volunteersPerCulto = pivotPerCulto(
    (volRows ?? []) as unknown as Array<Record<string, unknown>>,
    units,
    codeById,
    startByLabel,
    "volunteers_present",
  );

  // Average teens present per culto, per unit.
  const sumByCode = new Map<string, number>();
  const cntByCode = new Map<string, number>();
  for (const r of att) {
    const code = codeById.get(r.unit_id as string);
    if (!code) continue;
    sumByCode.set(code, (sumByCode.get(code) ?? 0) + ((r.teens_present as number | null) ?? 0));
    cntByCode.set(code, (cntByCode.get(code) ?? 0) + 1);
  }
  const averages: Record<string, number> = {};
  for (const u of units) {
    const c = cntByCode.get(u.code) ?? 0;
    averages[u.code] = c ? Math.round((sumByCode.get(u.code) ?? 0) / c) : 0;
  }

  return { units, growth, attendancePerCulto, volunteersPerCulto, averages };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface MonthlyGrowthPoint {
  label: string;
  newTeens: number;
  cumulative: number;
}

export interface SessionPoint {
  label: string;
  value: number;
}

/**
 * Teen growth by month. Views are per-unit (RLS), and a global admin sees rows
 * for every unit, so we sum new teens per month in JS and recompute the
 * cumulative curve from that sum — the per-row cumulative can't be trusted once
 * more than one unit is present.
 */
export async function teenGrowthByMonth(
  supabase: Supabase,
  unitId?: string | null,
  filters: SessionFilters = {},
): Promise<MonthlyGrowthPoint[]> {
  let q = supabase.from("v_teen_growth").select("month, new_teens").order("month");
  if (unitId) q = q.eq("unit_id", unitId);
  // Growth = registrations; only a period narrows it (service doesn't apply).
  const range = dateRangeFor({ day: filters.day, month: filters.month });
  if (range.gte) q = q.gte("month", range.gte.slice(0, 7) + "-01");
  if (range.lte) q = q.lte("month", range.lte.slice(0, 7) + "-01");
  const { data } = await q;

  const byMonth = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.month) continue;
    byMonth.set(row.month, (byMonth.get(row.month) ?? 0) + (row.new_teens ?? 0));
  }

  let running = 0;
  return [...byMonth.entries()].map(([month, newTeens]) => {
    running += newTeens;
    return { label: formatMonthShort(month), newTeens, cumulative: running };
  });
}

async function sessionSeries(
  supabase: Supabase,
  view: "v_session_attendance" | "v_volunteer_engagement",
  valueKey: "teens_present" | "volunteers_present",
  unitId?: string | null,
  filters: SessionFilters = {},
  limit = 24,
): Promise<SessionPoint[]> {
  let query = supabase
    .from(view)
    .select("session_date, service_label, " + valueKey)
    .order("session_date", { ascending: false })
    .limit(limit);
  if (unitId) query = query.eq("unit_id", unitId);
  if (filters.service) query = query.eq("service_label", filters.service);
  const range = dateRangeFor({ day: filters.day, month: filters.month });
  if (range.gte) query = query.gte("session_date", range.gte);
  if (range.lte) query = query.lte("session_date", range.lte);

  const [{ data }, startByLabel] = await Promise.all([query, serviceTimeMap(supabase)]);
  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;

  // Order by (date, service start_time) — robust vs. sorting by label text.
  const startOf = (r: Record<string, unknown>) =>
    startByLabel.get((r.service_label as string) ?? "")?.start ?? "";
  return rows
    .sort((a, b) => {
      const da = (a.session_date as string) ?? "";
      const db = (b.session_date as string) ?? "";
      return da === db ? startOf(a).localeCompare(startOf(b)) : da.localeCompare(db);
    })
    .map((r) => {
      const date = r.session_date as string | null;
      const service = (r.service_label as string | null) ?? "";
      return {
        label: date ? `${formatDateBR(date).slice(0, 5)} ${service}` : "—",
        value: (r[valueKey] as number | null) ?? 0,
      };
    });
}

export function teensPerSession(
  supabase: Supabase,
  unitId?: string | null,
  filters: SessionFilters = {},
) {
  return sessionSeries(
    supabase,
    "v_session_attendance",
    "teens_present",
    unitId,
    filters,
  );
}

export function volunteersPerSession(
  supabase: Supabase,
  unitId?: string | null,
  filters: SessionFilters = {},
) {
  return sessionSeries(
    supabase,
    "v_volunteer_engagement",
    "volunteers_present",
    unitId,
    filters,
  );
}

export interface SexSessionPoint {
  label: string;
  m: number;
  f: number;
}

/** Present teens per culto, split by sex — for the by-sex report. */
export async function teensBySexPerSession(
  supabase: Supabase,
  unitId?: string | null,
  filters: SessionFilters = {},
  limit = 24,
): Promise<SexSessionPoint[]> {
  let query = supabase
    .from("v_session_attendance_by_sex")
    .select("session_date, service_label, teens_m, teens_f")
    .order("session_date", { ascending: false })
    .limit(limit);
  if (unitId) query = query.eq("unit_id", unitId);
  if (filters.service) query = query.eq("service_label", filters.service);
  const range = dateRangeFor({ day: filters.day, month: filters.month });
  if (range.gte) query = query.gte("session_date", range.gte);
  if (range.lte) query = query.lte("session_date", range.lte);

  const [{ data }, startByLabel] = await Promise.all([query, serviceTimeMap(supabase)]);
  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const startOf = (r: Record<string, unknown>) =>
    startByLabel.get((r.service_label as string) ?? "")?.start ?? "";

  return rows
    .sort((a, b) => {
      const da = (a.session_date as string) ?? "";
      const db = (b.session_date as string) ?? "";
      return da === db ? startOf(a).localeCompare(startOf(b)) : da.localeCompare(db);
    })
    .map((r) => {
      const date = r.session_date as string | null;
      const service = (r.service_label as string | null) ?? "";
    return {
      label: date ? `${formatDateBR(date).slice(0, 5)} ${service}` : "—",
      m: (r.teens_m as number | null) ?? 0,
      f: (r.teens_f as number | null) ?? 0,
    };
  });
}
