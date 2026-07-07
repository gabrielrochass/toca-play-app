# Deploy — TocaPlay

Guia curto e prático de como subir o TocaPlay para produção com segurança.

## Arquitetura

- **App:** Next.js (App Router) na **Vercel** — frontend + server actions/RSC no mesmo projeto.
- **Banco/Auth/Realtime:** **Supabase** (Postgres). Não há backend separado (sem Render, sem
  servidor Node à parte).
- **Migrations:** arquivos SQL em `supabase/migrations/`, aplicados **manualmente** via
  `supabase db push`. **Nada** no build/deploy da Vercel toca o banco — o deploy roda só
  `next build` + `next start`.

## Deploy normal (o caso do dia a dia)

Quando o merge é **só código de app** (sem arquivo novo em `supabase/migrations/`):

1. `git merge` da branch de desenvolvimento na `main` (ou abrir/mergear o PR).
2. Redeploy na Vercel (automático no push da `main`, ou manual em Deployments → Redeploy).

**Só isso.** Não precisa rodar `db push`, seed, nem nada no banco. O redeploy não escreve no
banco de produção.

## A regra de ouro (migrations)

> **Tem arquivo novo em `supabase/migrations/` neste merge?**
> - **NÃO** → só redeploy (fluxo acima). Fim.
> - **SIM** → aplique a migration em produção **antes** de o código novo atender tráfego:

```bash
supabase link --project-ref <project-ref>   # só na 1ª vez na máquina
supabase db push                             # aplica só as migrations que faltam
```

Por que a ordem importa: se o código novo espera uma tabela/coluna que a produção ainda não
tem, dá **erro de runtime** (não é perda de dados). Por isso: migration primeiro, deploy depois.

As migrations do projeto são **aditivas e idempotentes** (sem `DROP`/`TRUNCATE`/`DELETE`; os
seeds usam `on conflict do nothing`), então `supabase db push` é seguro e pode ser re-executado.

## Dados de referência (unidades, horários, contadores)

Ficam na migration `supabase/migrations/0016_seed_reference_data.sql` — idempotente. São
aplicados junto com o `supabase db push` numa base nova. **Não** rode `supabase/seed.sql` em
produção (esse arquivo só roda em `supabase db reset`, que é **local**).

## Variáveis de ambiente (Vercel → Settings → Environment Variables)

| Variável | Vai ao navegador? | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | URL do projeto Supabase de produção |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | chave publishable (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | **NÃO** | secret; marque como **Sensitive**; só servidor (bypassa RLS) |
| `NEXT_PUBLIC_SITE_URL` | Sim | URL pública do app (para redirects de auth) |

Depois de trocar env vars na Vercel, é preciso **um novo deploy** para valerem. Configure a mesma
URL do app em Supabase → Authentication → URL Configuration (Site URL + Redirect URLs).

## Segurança — regras fixas

- **Nunca commitar `.env*`** (o `.gitignore` já bloqueia; exceção só `.env.example`).
- O `SUPABASE_SERVICE_ROLE_KEY` é **server-only** — nunca com prefixo `NEXT_PUBLIC`, nunca no
  cliente. Na Vercel, marque como *Sensitive*.
- Se um segredo vazar (ex.: colado em chat), **rotacione**: Supabase → Settings → API (roll do
  `service_role`) e Settings → Database (reset da senha).
- **Scripts destrutivos são bloqueados fora do local:** `verify-rls`, `verify-concurrency` e
  `verify-flow` chamam `assertLocalDb()` (`scripts/assert-local-db.mjs`) e **abortam** se a URL
  não for `127.0.0.1`/localhost. Rode-os só contra o Supabase local (`npm run db:start` +
  `--env-file=.env.local`).
- `create-admin` (criar o primeiro admin em produção) é a única operação de escrita feita à mão
  contra a prod. Só insere o próprio usuário (não apaga nada). Para usar, crie um `.env.prod`
  temporário com as credenciais de produção, rode `node --env-file=.env.prod scripts/create-admin.mjs <email> <senha> "<Nome>"`, e **apague o `.env.prod`** depois.

## Checklist rápido de deploy

- [ ] Merge na `main`.
- [ ] Tem migration nova em `supabase/migrations/`? Se sim, `supabase db push` **antes**.
- [ ] Env vars da Vercel conferidas (mudou alguma? novo deploy para valer).
- [ ] Redeploy na Vercel.
- [ ] Conferir o app em produção (login + um check-in de teste).

## Local (desenvolvimento) — referência

- `npm run db:start` — sobe o Supabase local (Docker) e aplica migrations + `seed.sql`.
- `npm run db:reset` — recria o banco **local** do zero (destrutivo, **só local**).
- `npm run dev` — app em `http://localhost:3000`.
