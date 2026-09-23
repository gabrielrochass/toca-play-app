import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { UNIT_COOKIE } from "@/lib/constants";
import type { SessionContext } from "@/lib/auth";

export interface UnitScope {
  /** unit_id to filter queries by, or null for "all units". */
  unitId: string | null;
  /** unit code in focus, or null for all. */
  code: string | null;
  /** true when the user may switch units (global admin). */
  canSwitch: boolean;
}

/**
 * Resolves which unit the current view is scoped to.
 * - Unit admins / volunteers are locked to their own unit (RLS enforces it too).
 * - Global admins may focus one unit via the tp_unit cookie, or see all.
 */
export const getUnitScope = cache(
  async (ctx: SessionContext): Promise<UnitScope> => {
  if (ctx.profile.unit_id) {
    return { unitId: ctx.profile.unit_id, code: ctx.unit?.code ?? null, canSwitch: false };
  }

  const store = await cookies();
  const code = store.get(UNIT_COOKIE)?.value ?? null;
  if (!code || code === "all") {
    return { unitId: null, code: null, canSwitch: true };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("units")
    .select("id, code")
    .eq("code", code)
    .maybeSingle();

  return { unitId: data?.id ?? null, code: data?.code ?? null, canSwitch: true };
});

/**
 * Distinct service labels ("10h", "17h"…) in clock order, for the unit in focus
 * (all units if null). Ordered by start_time because sort_order is per-unit and
 * interleaves wrongly across units. Retired slots (is_active = false) are
 * included on purpose: this feeds the HISTORY filter, not the new-culto picker.
 */
export async function serviceLabelsForScope(
  unitId: string | null,
): Promise<string[]> {
  const supabase = await createClient();
  let q = supabase.from("unit_services").select("label").order("start_time");
  if (unitId) q = q.eq("unit_id", unitId);
  const { data } = await q;
  return [...new Set((data ?? []).map((s) => s.label))];
}
