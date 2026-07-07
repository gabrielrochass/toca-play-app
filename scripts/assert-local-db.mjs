/**
 * Safety guard for DESTRUCTIVE dev scripts. The verify-* scripts DELETE rows via
 * the Supabase service role (bypassing RLS), so they must NEVER touch a remote
 * database. This aborts unless NEXT_PUBLIC_SUPABASE_URL points at a LOCAL
 * Supabase — a stray `--env-file=.env.prod` can then never wipe production.
 */
export function assertLocalDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const isLocal = /127\.0\.0\.1|localhost|\[::1\]/i.test(url);
  if (!isLocal) {
    console.error(
      "\n⛔ ABORTADO: script destrutivo (apaga dados via service role) só roda contra o Supabase LOCAL.\n" +
        `   NEXT_PUBLIC_SUPABASE_URL = ${url || "(vazio)"}\n` +
        '   Suba o local com "npm run db:start" e rode com --env-file=.env.local.\n',
    );
    process.exit(1);
  }
}
