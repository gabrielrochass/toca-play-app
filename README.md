# TocaPlay — Check-in

App de check-in do ministério **TocaPlay** da Igreja Aponte. Cadastro persistente
de pré-adolescentes, check-in por culto (manhã/tarde), gestão de saída, formação
automática de pequenos grupos, presença de voluntários, configuração de horários e
relatórios de crescimento. Multi-unidade (Boa Viagem, **Casa Forte**, Recife Antigo),
isolado por unidade no nível do banco.

## Stack

- **Next.js** (App Router, TypeScript) na **Vercel**
- **Supabase** — Postgres + Auth + **RLS** (isolamento por unidade) + Realtime
- Tailwind v4, Recharts, react-hook-form/zod
- Identidade visual "voxel night" (estética Minecraft)

## Rodando localmente

Pré-requisitos: Node 20+, Docker (para o Supabase local).

```bash
npm install
cp .env.example .env.local            # já preenchido com as chaves locais padrão

npm run db:start                      # sobe o Supabase local (aplica migrations + seed)
# se as chaves impressas diferirem, atualize .env.local

npm run create-admin -- admin@aponte.local suaSenha123 "Seu Nome"   # 1º admin geral
npm run dev                           # http://localhost:3000
```

Comandos úteis:

| Comando | O que faz |
|---|---|
| `npm run db:reset` | Recria o banco local aplicando migrations + seed |
| `npm run gen:types` | Regenera `src/types/database.ts` a partir do banco local |
| `npm run test:grouping` | Testa o algoritmo de pequenos grupos |
| `npm run typecheck` / `npm run lint` | Checagens estáticas |

### Papéis

- **global_admin** — vê todas as unidades. Crie o primeiro com `create-admin`.
- **unit_admin** — gerencia a própria unidade (cadastros, horários, usuários).
- **volunteer** — faz check-in e forma grupos na própria unidade.

Novos usuários são criados dentro do app em **Config → Usuários** (usa a service role
no servidor; a chave nunca vai ao cliente).

## Deploy

### Supabase (banco)
1. Crie um projeto em supabase.com.
2. `supabase link --project-ref <ref>` e `supabase db push` (aplica as migrations).
3. **Auth → Hooks**: ative o *Custom Access Token* apontando para
   `public.custom_access_token_hook` (as migrations já criam a função e as permissões).
4. **Auth → URL Configuration**: adicione a URL da Vercel em Site URL e Redirect URLs.
5. Rode o `create-admin` apontando para a URL/chaves do projeto (via `.env` temporário).

### Vercel (app)
1. Importe o repositório.
2. Variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (marque como *sensitive*, só servidor)
   - `NEXT_PUBLIC_SITE_URL` = URL de produção
3. Deploy.

## Segurança

- Isolamento por unidade é imposto por **RLS** lendo `unit_id`/`user_role` das
  **claims do JWT** (injetadas pelo access token hook a partir de `profiles`). Nunca
  confie em `unit_id` vindo do cliente — as server actions derivam de `current_unit()`.
- FKs compostas `(unit_id, …)` impedem, no nível do banco, referências cruzadas
  entre unidades.
- A **service role** só é usada no servidor (`src/lib/supabase/admin.ts`, marcado
  `server-only`) para provisionar usuários.
- Ao mudar a unidade/papel de um usuário, o novo claim vale a partir do próximo
  login (peça para a pessoa sair e entrar de novo).
