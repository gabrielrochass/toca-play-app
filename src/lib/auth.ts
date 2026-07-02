import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasAtLeast } from "@/lib/roles";
import type { AppRole, Profile, Unit } from "@/types/database";

export { hasAtLeast } from "@/lib/roles";

export interface SessionContext {
  userId: string;
  email: string | null;
  profile: Profile;
  unit: Unit | null;
}

/**
 * Loads the authenticated user's profile + unit. Returns null when there is no
 * session or the user has no profile yet (unprovisioned). RLS guarantees the
 * profile row read here is the user's own.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  let unit: Unit | null = null;
  if (profile.unit_id) {
    const { data } = await supabase
      .from("units")
      .select("*")
      .eq("id", profile.unit_id)
      .maybeSingle();
    unit = data ?? null;
  }

  return { userId: user.id, email: user.email ?? null, profile, unit };
}

/** Redirects to /login (no session) or /sem-acesso (no profile) if not usable. */
export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? "/sem-acesso" : "/login");
  }
  return ctx;
}

/** Guard for admin-only pages/actions. Redirects volunteers away. */
export async function requireRole(minimum: AppRole): Promise<SessionContext> {
  const ctx = await requireSession();
  if (!hasAtLeast(ctx.profile.role, minimum)) {
    redirect("/dashboard");
  }
  return ctx;
}

export function isGlobalAdmin(ctx: SessionContext): boolean {
  return ctx.profile.role === "global_admin";
}
