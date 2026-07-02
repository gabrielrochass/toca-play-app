import type { AppRole } from "@/types/database";

// Pure, client-safe role helpers (no server imports) so client components can
// use them without pulling server-only code into the browser bundle.

export const ROLE_RANK: Record<AppRole, number> = {
  volunteer: 1,
  unit_admin: 2,
  global_admin: 3,
};

export function hasAtLeast(role: AppRole, minimum: AppRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
