/**
 * End-to-end RLS / tenant-isolation check against the LOCAL Supabase.
 * Exercises the access-token hook + policies with real user sessions.
 *
 *   node --env-file=.env.local scripts/verify-rls.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { assertLocalDb } from "./assert-local-db.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "tocaplay-test-123";

assertLocalDb(); // refuse to run against a non-local (e.g. production) database

let failures = 0;
const ok = (n) => console.log(`  ok  ${n}`);
const fail = (n, d = "") => {
  failures++;
  console.error(`FAIL  ${n} ${d}`);
};

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureUser(email, unitId, role) {
  const created = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: email },
  });
  let id = created.data?.user?.id;
  if (!id) {
    const { data } = await admin.auth.admin.listUsers();
    id = data.users.find((u) => u.email === email)?.id;
  }
  await admin.from("profiles").upsert({ id, unit_id: unitId, role, full_name: email });
  return id;
}

async function signedInClient(email) {
  const c = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return c;
}

function jwtClaims(token) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
}

// --- setup ---
const { data: units } = await admin.from("units").select("id, code");
const CF = units.find((u) => u.code === "CF")?.id;
const BV = units.find((u) => u.code === "BV")?.id;
if (!CF || !BV) {
  fail("units seeded (CF, BV)");
  process.exit(1);
}
ok("units seeded (CF, BV)");

await ensureUser("cf-admin@test.local", CF, "unit_admin");
await ensureUser("bv-admin@test.local", BV, "unit_admin");

// Clean prior test teens, then seed one per unit via service role.
await admin.from("teens").delete().in("name", ["CF Teen", "BV Teen"]);
await admin.from("teens").insert([
  { unit_id: CF, name: "CF Teen", birthdate: "2014-01-01", sex: "M", guardian_name: "G", guardian_phone: "11111111" },
  { unit_id: BV, name: "BV Teen", birthdate: "2014-01-01", sex: "F", guardian_name: "G", guardian_phone: "22222222" },
]);

// --- JWT hook injects claims ---
const cf = await signedInClient("cf-admin@test.local");
const { data: cfSession } = await cf.auth.getSession();
const claims = jwtClaims(cfSession.session.access_token);
if (claims.user_role === "unit_admin" && claims.unit_id === CF) {
  ok("access-token hook injected unit_id + user_role");
} else {
  fail("access-token hook claims", JSON.stringify({ role: claims.user_role, unit: claims.unit_id }));
}

// --- tenant isolation on read ---
const { data: cfTeens } = await cf.from("teens").select("name, unit_id, display_id");
const onlyCF = cfTeens?.length && cfTeens.every((t) => t.unit_id === CF);
if (onlyCF) ok("CF admin sees only CF teens");
else fail("CF read isolation", JSON.stringify(cfTeens));

// --- display_id trigger produced CF-#### ---
const cfTeen = cfTeens?.find((t) => t.name === "CF Teen");
if (cfTeen?.display_id?.startsWith("CF-")) ok(`teen display_id generated (${cfTeen.display_id})`);
else fail("display_id trigger", JSON.stringify(cfTeen));

const bv = await signedInClient("bv-admin@test.local");
const { data: bvTeens } = await bv.from("teens").select("name, unit_id");
const onlyBV = bvTeens?.length && bvTeens.every((t) => t.unit_id === BV);
if (onlyBV) ok("BV admin sees only BV teens");
else fail("BV read isolation", JSON.stringify(bvTeens));

// --- cross-unit write is rejected ---
const { error: crossErr } = await cf
  .from("teens")
  .insert({ unit_id: BV, name: "hack", birthdate: "2014-01-01", sex: "M", guardian_name: "x", guardian_phone: "0" });
if (crossErr) ok("cross-unit insert rejected by RLS");
else fail("cross-unit insert was NOT rejected");

// --- self role escalation is blocked ---
const cfAdminId = (await admin.from("profiles").select("id").eq("full_name", "cf-admin@test.local").single()).data?.id;
const { error: escErr } = await cf.from("profiles").update({ role: "global_admin" }).eq("id", cfAdminId);
if (escErr) ok("self role-escalation blocked");
else fail("self role-escalation was NOT blocked");

console.log(failures === 0 ? "\nAll RLS checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
