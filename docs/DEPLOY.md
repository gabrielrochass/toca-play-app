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
A `0018` é a primeira a fazer `UPDATE` em linha viva — só em colunas de apresentação
(`is_active`, `sort_order`), nunca em `label`/`start_time`, que o histórico lê ao vivo.

### Lançar o módulo de Eventos (migration `0017_events.sql`)

É a **primeira feature com migration**. A `0017` é **100% aditiva**: cria 3 tabelas **novas e
vazias** (`events`, `event_visitors`, `event_checkins`), 4 funções e as políticas de RLS delas.
**Não** faz `ALTER`/`DROP`/`DELETE`/`TRUNCATE` em nada que já existe — os dados de produção
(pré-adolescentes, cultos, check-ins, estoque, usuários) **não são tocados**. O redeploy da
Vercel **sozinho não aplica** migration nenhuma; enquanto você não rodar o `db push`, a `0017`
simplesmente não existe em produção.

Passo a passo seguro, quando quiser lançar:

1. **Backup** (rede de segurança, mesmo sendo aditivo): Supabase → **Database → Backups**
   (ou Settings → Database → *Point-in-time recovery*). Confirme que há um backup recente.
2. **Aplicar só a `0017`:**

   ```bash
   supabase link --project-ref <project-ref>   # se ainda não linkou nesta máquina
   supabase db push                             # aplica as migrations que faltam (aqui, a 0017)
   ```

   O `db push` mostra a lista antes de aplicar — confira que é a `0017_events.sql`.
3. **Redeploy** na Vercel (código que já está na `main`).
4. **Conferir:** abra **/eventos** em produção, crie um evento de teste "Todas", faça um
   check-in e um visitante, e confira a seção **Eventos** em **/relatorios**. Se quiser, apague
   o evento de teste (Admin: botão de excluir — remove só aquele evento e seus registros).

### Novos horários da Boa Viagem (migration `0018_bv_service_times.sql`)

A BV passou a ter **09h, 11h10, 16h e 18h30** (o culto das 10h virou dois de manhã). CF e RA
não mudam. A `0018` é **não-destrutiva**: insere os dois horários novos e marca o slot das
**10h da BV como `is_active = false`** — ele **não é apagado nem renomeado**. Como `sessions` e
as views de relatório resolvem o horário por join ao vivo, todo culto, check-in e relatório
antigo continua mostrando *"10h"*. Ela não faz `DELETE`/`TRUNCATE` e não toca em `sessions`
nem em `checkins`. Os três statements são idempotentes e restritos à BV.

**Antes de aplicar**, rode no SQL Editor (só leitura):

```sql
-- 1) Estado atual. Se o label da BV não for exatamente '10h', PARE: a migration casa por label.
select u.code, svc.label, svc.start_time, svc.sort_order, svc.is_active
from unit_services svc join units u on u.id = svc.unit_id
order by u.code, svc.sort_order;

-- 2) Culto futuro já aberto no slot das 10h da BV (aposentar não quebra um que já existe,
--    mas é bom saber). Se houver um sem check-in, apague pelo app antes.
select s.id, s.session_date,
       (select count(*) from checkins c where c.session_id = s.id) as checkins
from sessions s
join unit_services svc on svc.id = s.service_id
join units u on u.id = s.unit_id
where u.code = 'BV' and svc.label = '10h' and s.session_date >= current_date;

-- 3) Baseline do histórico — GUARDE a saída e compare depois. Tem que bater número por número.
select svc.label, count(*) as cultos, min(s.session_date) as primeiro,
       max(s.session_date) as ultimo,
       sum((select count(*) from checkins c where c.session_id = s.id)) as checkins
from sessions s
join unit_services svc on svc.id = s.service_id
join units u on u.id = s.unit_id
where u.code = 'BV' group by svc.label order by svc.label;
```

Ordem, com backup conferido antes: **merge + redeploy primeiro, `db push` depois**. É a
inversão consciente da regra de ouro acima, e vale só aqui: nenhuma parte do código novo
depende das linhas que a `0018` cria, então a ordem inversa é segura — e o contrário abriria
uma janela em que a BV perde o "10h" do filtro de histórico em `/cultos`. Note que o redeploy
sozinho já muda duas coisas em **todas** as unidades, de propósito: o selo "1ª vez" passa a
considerar cultos do mesmo dia, e os gráficos por culto passam a mostrar mais histórico.

Depois do `db push`, **repita o check 1**: o `10h` da BV tem que estar com `is_active = false` e
as linhas `09h`/`11h10` têm que existir. Se não estiverem, a `0018` não foi aplicada — confira a
saída do `db push` e o registro em `supabase_migrations.schema_migrations` antes de rodar
qualquer coisa à mão. Por fim repita o check 3 e confira contra a saída guardada.

Reversão (não-destrutiva): reative o `10h` da BV e desative `09h`/`11h10`. **Nunca apague** as
linhas novas — se já houver culto nelas a FK bloqueia, e desativar é o movimento certo.

## Dados de referência (unidades, horários, contadores)

Ficam na migration `supabase/migrations/0016_seed_reference_data.sql` — idempotente, é o
conjunto **original**; a `0018` é o delta da BV. São aplicados junto com o `supabase db push`
numa base nova. **Não** rode `supabase/seed.sql` em produção (esse arquivo só roda em
`supabase db reset`, que é **local**). Migrations aplicadas são registro histórico: mudança de
horário entra como migration **nova**, nunca editando a `0016` ou o `seed.sql`.

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
