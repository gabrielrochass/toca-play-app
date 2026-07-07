import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The session row, cached per request so the layout and the active tab page
 * share a single fetch (was fetched 2x per navigation — layout + tab). Selects
 * the union of columns the layout/tabs need.
 */
export const getSession = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select("id, session_date, notes, unit_id, service_id, closed_at")
    .eq("id", id)
    .maybeSingle();
  return data;
});

/** Service label ("10h"…) for a session's service_id, cached per request. */
export const getServiceLabel = cache(async (serviceId: string | null) => {
  if (!serviceId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("unit_services")
    .select("label")
    .eq("id", serviceId)
    .maybeSingle();
  return data?.label ?? null;
});

/** A session's unit ({code, name}), cached per request. */
export const getUnit = cache(async (unitId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("units")
    .select("code, name")
    .eq("id", unitId)
    .maybeSingle();
  return data;
});
