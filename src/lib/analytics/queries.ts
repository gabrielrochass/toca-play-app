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
  /** Teens present per month, one value column per unit code. */
  attendance: UnitSeriesPoint[];
}

/**
 * Cross-unit comparison for a global admin viewing "Todas". Reads the same
 * per-unit views WITHOUT a unit filter and pivots in JS to
 * `{ label: month, CF: n, BV: n, RA: n }`. Entirely app-side — no DB changes.
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

  let attQ = supabase
    .from("v_session_attendance")
    .select("unit_id, session_date, service_label, teens_present")
    .order("session_date");
  if (filters.service) attQ = attQ.eq("service_label", filters.service);
  if (range.gte) attQ = attQ.gte("session_date", range.gte);
  if (range.lte) attQ = attQ.lte("session_date", range.lte);

  const [{ data: unitRows }, { data: growthRows }, { data: attRows }] =
    await Promise.all([
      supabase.from("units").select("id, code, name").eq("is_active", true).order("code"),
      growthQ,
      attQ,
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
    const k = `${month}|${code}`;
    growthByKey.set(k, (growthByKey.get(k) ?? 0) + ((r.new_teens as number | null) ?? 0));
  }
  const running = new Map<string, number>();
  const growth: UnitSeriesPoint[] = [...growthMonths]
    .sort()
    .map((month) => {
      const point: UnitSeriesPoint = { label: formatMonthShort(month) };
      for (const u of units) {
        running.set(u.code, (running.get(u.code) ?? 0) + (growthByKey.get(`${month}|${u.code}`) ?? 0));
        point[u.code] = running.get(u.code) ?? 0;
      }
      return point;
    });

  // Teens present per month per unit (total).
  const attByKey = new Map<string, number>();
  const attMonths = new Set<string>();
  for (const r of (attRows ?? []) as Array<Record<string, unknown>>) {
    const date = r.session_date as string | null;
    const code = codeById.get(r.unit_id as string);
    if (!date || !code) continue;
    const month = date.slice(0, 7);
    attMonths.add(month);
    const k = `${month}|${code}`;
    attByKey.set(k, (attByKey.get(k) ?? 0) + ((r.teens_present as number | null) ?? 0));
  }
  const attendance: UnitSeriesPoint[] = [...attMonths]
    .sort()
    .map((month) => {
      const point: UnitSeriesPoint = { label: formatMonthShort(month) };
      for (const u of units) point[u.code] = attByKey.get(`${month}|${u.code}`) ?? 0;
      return point;
    });

  return { units, growth, attendance };
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
    .order("service_label")
    .limit(limit);
  if (unitId) query = query.eq("unit_id", unitId);
  if (filters.service) query = query.eq("service_label", filters.service);
  const range = dateRangeFor({ day: filters.day, month: filters.month });
  if (range.gte) query = query.gte("session_date", range.gte);
  if (range.lte) query = query.lte("session_date", range.lte);

  const rows = (await query).data as unknown as Array<Record<string, unknown>>;

  return (rows ?? [])
    .reverse()
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
    .order("service_label")
    .limit(limit);
  if (unitId) query = query.eq("unit_id", unitId);
  if (filters.service) query = query.eq("service_label", filters.service);
  const range = dateRangeFor({ day: filters.day, month: filters.month });
  if (range.gte) query = query.gte("session_date", range.gte);
  if (range.lte) query = query.lte("session_date", range.lte);

  const rows = (await query).data as unknown as Array<Record<string, unknown>>;

  return (rows ?? []).reverse().map((r) => {
    const date = r.session_date as string | null;
    const service = (r.service_label as string | null) ?? "";
    return {
      label: date ? `${formatDateBR(date).slice(0, 5)} ${service}` : "—",
      m: (r.teens_m as number | null) ?? 0,
      f: (r.teens_f as number | null) ?? 0,
    };
  });
}
