/**
 * Concurrency / simultaneous-use checks against the LOCAL Supabase.
 * Simulates the 3 churches using the app at the same time and asserts the DB
 * holds: no duplicate check-ins, gapless teen IDs under parallel inserts, no
 * lost stock updates, and full tenant isolation under concurrent load.
 *
 *   node --env-file=.env.local scripts/verify-concurrency.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = "tocaplay-test-123";

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

// --- setup ---------------------------------------------------------------
const { data: units } = await admin.from("units").select("id, code");
const CF = units.find((u) => u.code === "CF")?.id;
const BV = units.find((u) => u.code === "BV")?.id;
const RA = units.find((u) => u.code === "RA")?.id;
if (!CF || !BV || !RA) {
  fail("units seeded (CF, BV, RA)");
  process.exit(1);
}
ok("units seeded (CF, BV, RA)");

await ensureUser("cf-admin@test.local", CF, "unit_admin");
await ensureUser("bv-admin@test.local", BV, "unit_admin");
await ensureUser("ra-admin@test.local", RA, "unit_admin");
const cf = await signedInClient("cf-admin@test.local");
const bv = await signedInClient("bv-admin@test.local");
const ra = await signedInClient("ra-admin@test.local");
const clientOf = { [CF]: cf, [BV]: bv, [RA]: ra };

// --- cleanup previous test data ------------------------------------------
async function cleanup() {
  const { data: sess } = await admin
    .from("sessions")
    .select("id")
    .eq("notes", "conc-test");
  const ids = (sess ?? []).map((s) => s.id);
  if (ids.length) {
    await admin.from("checkins").delete().in("session_id", ids);
    await admin.from("small_groups").delete().in("session_id", ids);
    await admin.from("sessions").delete().in("id", ids);
  }
  await admin.from("teens").delete().like("name", "CONC %");
  await admin.from("products").delete().like("name", "CONC %");
}
await cleanup();

const svcOf = {};
for (const unit of [CF, BV, RA]) {
  const { data } = await admin
    .from("unit_services")
    .select("id")
    .eq("unit_id", unit)
    .limit(1);
  svcOf[unit] = data?.[0]?.id;
}

const teenRow = (unit, name) => ({
  unit_id: unit,
  name,
  birthdate: "2013-05-10",
  sex: "M",
  guardian_name: "Resp",
  guardian_phone: "81999999999",
});

// --- A) concurrent duplicate check-in ------------------------------------
{
  const { data: teen } = await admin
    .from("teens")
    .insert(teenRow(CF, "CONC A teen"))
    .select("id")
    .single();
  const { data: session } = await admin
    .from("sessions")
    .insert({
      unit_id: CF,
      session_date: "2099-01-01",
      service_id: svcOf[CF],
      notes: "conc-test",
    })
    .select("id")
    .single();

  const N = 8;
  const results = await Promise.all(
    Array.from({ length: N }, () =>
      cf
        .from("checkins")
        .insert({ unit_id: CF, session_id: session.id, teen_id: teen.id })
        .then((r) => r),
    ),
  );
  const successes = results.filter((r) => !r.error).length;
  const dupes = results.filter((r) => r.error?.code === "23505").length;
  if (successes === 1 && dupes === N - 1)
    ok(`concurrent duplicate check-in: 1 ok, ${dupes} rejected (23505)`);
  else
    fail(
      "concurrent duplicate check-in",
      `successes=${successes} dupes=${dupes}`,
    );
}

// --- B) concurrent teen inserts → gapless, unique ids --------------------
{
  const N = 12;
  const results = await Promise.all(
    Array.from({ length: N }, (_, i) =>
      cf
        .from("teens")
        .insert(teenRow(CF, `CONC B ${i}`))
        .select("seq, display_id")
        .single()
        .then((r) => r),
    ),
  );
  const rows = results.filter((r) => !r.error).map((r) => r.data);
  const seqs = rows.map((r) => r.seq);
  const displayIds = new Set(rows.map((r) => r.display_id));
  const uniqueSeqs = new Set(seqs);
  const contiguous =
    seqs.length > 0 && Math.max(...seqs) - Math.min(...seqs) === seqs.length - 1;
  if (
    rows.length === N &&
    uniqueSeqs.size === N &&
    displayIds.size === N &&
    contiguous
  )
    ok(`concurrent teen inserts: ${N} unique gapless ids`);
  else
    fail(
      "concurrent teen inserts",
      `rows=${rows.length} uniqSeq=${uniqueSeqs.size} uniqId=${displayIds.size} contiguous=${contiguous}`,
    );
}

// --- C) concurrent stock movements → no lost update ----------------------
{
  const START = 100;
  const { data: product } = await admin
    .from("products")
    .insert({ unit_id: CF, name: "CONC C produto", quantity: START, min_quantity: 5 })
    .select("id")
    .single();

  const ups = Array.from({ length: 50 }, () =>
    cf.rpc("record_stock_movement", {
      p_product: product.id,
      p_delta: 1,
      p_reason: "conc +",
    }),
  );
  const downs = Array.from({ length: 50 }, () =>
    cf.rpc("record_stock_movement", {
      p_product: product.id,
      p_delta: -1,
      p_reason: "conc -",
    }),
  );
  await Promise.all([...ups, ...downs]);

  const { data: after } = await admin
    .from("products")
    .select("quantity")
    .eq("id", product.id)
    .single();
  const { count: moves } = await admin
    .from("stock_movements")
    .select("id", { count: "exact", head: true })
    .eq("product_id", product.id);

  if (after.quantity === START && moves === 100)
    ok(`100 concurrent stock movements: quantity intact (${after.quantity}), ${moves} logged`);
  else
    fail(
      "concurrent stock movements",
      `quantity=${after.quantity} (expected ${START}), movements=${moves}`,
    );
}

// --- D) 3 units operating in parallel → isolation ------------------------
{
  await Promise.all(
    [CF, BV, RA].map((unit) =>
      clientOf[unit].from("teens").insert(teenRow(unit, `CONC D ${unit.slice(0, 4)}`)),
    ),
  );
  const reads = await Promise.all(
    [CF, BV, RA].map((unit) =>
      clientOf[unit].from("teens").select("unit_id").then((r) => ({ unit, r })),
    ),
  );
  const isolated = reads.every(
    ({ unit, r }) => r.data?.length && r.data.every((t) => t.unit_id === unit),
  );
  if (isolated) ok("3 units in parallel: each sees only its own rows");
  else
    fail(
      "parallel tenant isolation",
      JSON.stringify(reads.map(({ unit, r }) => ({ unit, n: r.data?.length }))),
    );
}

await cleanup();
console.log(
  failures === 0
    ? "\nAll concurrency checks passed."
    : `\n${failures} check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
