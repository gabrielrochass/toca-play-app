/**
 * Creates the first global admin (auth user + profile). Run once after the DB
 * is up. Uses the service role, so run it locally/CI only — never expose the key.
 *
 *   node --env-file=.env.local scripts/create-admin.mjs <email> <senha> "<Nome>"
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const [, , email, password, fullName] = process.argv;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!email || !password) {
  console.error(
    'Uso: node --env-file=.env.local scripts/create-admin.mjs <email> <senha> "<Nome>"',
  );
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName ?? "Admin" },
});
if (error || !data.user) {
  console.error("Erro ao criar usuário:", error?.message);
  process.exit(1);
}

const { error: profileError } = await admin.from("profiles").insert({
  id: data.user.id,
  role: "global_admin",
  unit_id: null,
  full_name: fullName ?? "Admin",
});
if (profileError) {
  console.error("Erro ao criar profile:", profileError.message);
  await admin.auth.admin.deleteUser(data.user.id);
  process.exit(1);
}

console.log(`Admin geral criado: ${email}`);
