/**
 * Authenticated SSR smoke test. Signs in with the real @supabase/ssr client to
 * mint the exact session cookies the app uses, then fetches every major page and
 * fails on non-200 or a runtime error boundary. Requires `npm run dev` running.
 *
 *   node --env-file=.env.local scripts/smoke-auth.mjs
 */
import { createServerClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BASE = "http://localhost:3000";
const EMAIL = process.argv[2] ?? "admin@aponte.local";
const PASSWORD = process.argv[3] ?? "aponte123";

const jar = {};
const supabase = createServerClient(url, anon, {
  cookies: {
    getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })),
    setAll: (list) => list.forEach(({ name, value }) => (jar[name] = value)),
  },
});

const { error } = await supabase.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});
if (error) {
  console.error("login failed:", error.message);
  process.exit(1);
}
const cookie = Object.entries(jar)
  .map(([n, v]) => `${n}=${v}`)
  .join("; ");

const pages = [
  "/dashboard",
  "/cultos",
  "/cultos/novo",
  "/cadastros/pre-adolescentes",
  "/cadastros/pre-adolescentes/novo",
  "/cadastros/voluntarios",
  "/cadastros/voluntarios/novo",
  "/relatorios",
  "/config/usuarios",
  "/conta",
];

let bad = 0;
for (const p of pages) {
  const res = await fetch(BASE + p, { headers: { cookie }, redirect: "manual" });
  const body = res.status === 200 ? await res.text() : "";
  const crashed =
    body.includes("Application error") ||
    body.includes("__next_error__") ||
    body.includes("client-side exception");
  const good = res.status === 200 && !crashed;
  console.log(
    `${good ? "  ok " : "FAIL"} ${p} -> ${res.status}${crashed ? " (runtime error)" : ""}`,
  );
  if (!good) bad++;
}

console.log(bad === 0 ? "\nAll pages rendered." : `\n${bad} page(s) failed.`);
process.exit(bad === 0 ? 0 : 1);
