import { createClient } from "@/lib/supabase/server";
import { formatMonthShort, formatDateBR } from "@/lib/utils";
import { dateRangeFor, type SessionFilters } from "@/lib/period";

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
