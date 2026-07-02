import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { serviceRoleKey } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role client. BYPASSES ALL RLS. Use only for privileged server-side
 * operations that must cross tenant boundaries or write auth data — chiefly
 * provisioning users (create auth user + insert profile with unit/role).
 *
 * `import "server-only"` makes the build fail if this ever reaches a client
 * bundle. Never import it from a Client Component.
 */
export function createAdminClient() {
  return createClient<Database>(env.supabaseUrl, serviceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
