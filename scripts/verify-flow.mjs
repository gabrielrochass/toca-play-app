/**
 * End-to-end data + business-rule flow against local Supabase, as the CF admin
 * (same RLS path the app uses). Validates the check-in state machine, the
 * display_id trigger, uniqueness, volunteer attendance and the analytics views.
 *
 *   node --env-file=.env.local scripts/verify-flow.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { assertLocalDb } from "./assert-local-db.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

assertLocalDb(); // refuse to run against a non-local (e.g. production) database

let failures = 0;
const ok = (n) => console.log(`  ok  ${n}`);
const fail = (n, d = "") => {
  failures++;
  console.error(`FAIL  ${n} ${d}`);
};

const admin = createClient(url, service, { auth: { persistSession: false } });
const { data: units } = await admin.from("units").select("id, code");
const CF = units.find((u) => u.code === "CF").id;

// ensure a CF admin user exists
const email = "cf-admin@test.local";
const created = await admin.auth.admin.createUser({
  email,
  password: "tocaplay-test-123",
  email_confirm: true,
  user_metadata: { full_name: email },
});
let uid = created.data?.user?.id;
if (!uid) {
  const { data } = await admin.auth.admin.listUsers();
  uid = data.users.find((u) => u.email === email)?.id;
}
await admin.from("profiles").upsert({ id: uid, unit_id: CF, role: "unit_admin", full_name: email });

const cf = createClient(url, anon, { auth: { persistSession: false } });
await cf.auth.signInWithPassword({ email, password: "tocaplay-test-123" });

// --- create a culto (using a CF service slot) ---
const { data: cfService } = await cf
  .from("unit_services")
  .select("id, label")
  .eq("unit_id", CF)
  .order("sort_order")
  .limit(1)
  .single();
if (cfService?.id) ok(`CF service slot present (${cfService.label})`);
else fail("CF service slot present");

const dateISO = "2026-05-10";
await cf.from("sessions").delete().eq("session_date", dateISO).eq("service_id", cfService.id);
const { data: session, error: sErr } = await cf
  .from("sessions")
  .insert({ unit_id: CF, session_date: dateISO, service_id: cfService.id, created_by: uid })
  .select("id")
  .single();
if (sErr) fail("create session", sErr.message);
else ok("create session (culto)");
const sessionId = session.id;

// --- create teens (display_id trigger + sequence) ---
const teenRows = [
  { name: "Ana", sex: "F", birthdate: "2014-03-01" },
  { name: "Bia", sex: "F", birthdate: "2013-06-01" },
];
const teenIds = [];
for (const t of teenRows) {
  const { data, error } = await cf
    .from("teens")
    .insert({ unit_id: CF, guardian_name: "Resp", guardian_phone: "81999999999", ...t })
    .select("id, display_id")
    .single();
  if (error) fail(`create teen ${t.name}`, error.message);
  else teenIds.push(data.id);
}
const { data: sample } = await cf.from("teens").select("display_id").eq("id", teenIds[0]).single();
if (/^CF-\d{4}$/.test(sample?.display_id ?? "")) ok(`display_id format (${sample.display_id})`);
else fail("display_id format", sample?.display_id);

// --- check-in ---
const { data: ci, error: ciErr } = await cf
  .from("checkins")
  .insert({ unit_id: CF, session_id: sessionId, teen_id: teenIds[0], checked_in_by: uid })
  .select("id, status")
  .single();
if (ciErr) fail("check-in", ciErr.message);
else if (ci.status === "present") ok("check-in defaults to present");
else fail("check-in status", ci.status);
await cf.from("checkins").insert({ unit_id: CF, session_id: sessionId, teen_id: teenIds[1], checked_in_by: uid });

// --- double check-in rejected (unique session_id, teen_id) ---
const { error: dupErr } = await cf
  .from("checkins")
  .insert({ unit_id: CF, session_id: sessionId, teen_id: teenIds[0] });
if (dupErr) ok("double check-in rejected");
else fail("double check-in was NOT rejected");

// --- state machine: illegal transition rejected ---
const { error: illegalErr } = await cf
  .from("checkins")
  .update({ status: "left", check_out_time: new Date().toISOString() })
  .eq("id", ci.id);
if (illegalErr) ok("illegal transition (present->left) rejected by CHECK");
else fail("illegal transition was NOT rejected");

// --- state machine: legal present -> authorized -> left ---
const { error: aErr } = await cf
  .from("checkins")
  .update({ status: "authorized_to_leave", authorized_at: new Date().toISOString(), authorized_by: uid })
  .eq("id", ci.id);
if (aErr) fail("authorize exit", aErr.message);
else ok("present -> authorized_to_leave");

const { error: lErr } = await cf
  .from("checkins")
  .update({ status: "left", check_out_time: new Date().toISOString() })
  .eq("id", ci.id);
if (lErr) fail("register checkout", lErr.message);
else ok("authorized_to_leave -> left");

// --- volunteer + attendance upsert ---
const { data: vol } = await cf
  .from("volunteers")
  .insert({ unit_id: CF, name: "Voluntário Teste" })
  .select("id")
  .single();
await cf.from("volunteer_attendance").upsert(
  { unit_id: CF, session_id: sessionId, volunteer_id: vol.id, present: true },
  { onConflict: "session_id,volunteer_id" },
);
const { data: reUpsert, error: vaErr } = await cf
  .from("volunteer_attendance")
  .upsert(
    { unit_id: CF, session_id: sessionId, volunteer_id: vol.id, present: false },
    { onConflict: "session_id,volunteer_id" },
  )
  .select("present")
  .single();
if (!vaErr && reUpsert.present === false) ok("volunteer attendance upsert toggles");
else fail("volunteer attendance upsert", vaErr?.message);

// --- analytics views ---
const { data: att } = await cf
  .from("v_session_attendance")
  .select("teens_present")
  .eq("session_id", sessionId)
  .single();
if (att?.teens_present === 2) ok("v_session_attendance counts check-ins (2)");
else fail("v_session_attendance", JSON.stringify(att));

console.log(failures === 0 ? "\nAll flow checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
