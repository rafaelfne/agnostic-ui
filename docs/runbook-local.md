# Runbook — rodar a plataforma local

Guia fim-a-fim para subir a **Agnostic UI** na sua máquina: Supabase local + BFF
(runtime + API do builder) + builder SPA, com login, IA e o E2E. Consolida o que estava
espalhado (CLAUDE.md, ADR 0003, `.env.example`, `e2e/README.md`).

## 1. Pré-requisitos

| Ferramenta       | Uso                                 | Checar               |
| ---------------- | ----------------------------------- | -------------------- |
| **Docker**       | roda o stack do Supabase            | `docker info`        |
| **Supabase CLI** | sobe/gerencia o Supabase local      | `supabase --version` |
| **Node ≥ 20**    | monorepo                            | `node -v`            |
| **pnpm**         | gerenciador de pacotes do workspace | `pnpm -v`            |

```bash
pnpm install   # instala o workspace (uma vez, ou após mudar deps)
```

## 2. Subir o ambiente (um comando)

```bash
pnpm setup:local
```

Faz (ADR 0003, idempotente — pode repetir): pré-flight (Docker + CLI) → builda o engine →
`supabase start` (a 1ª vez baixa as imagens) → aplica as migrations de
`packages/next/drizzle/*` → **seeda** flows/telas/integrações + os **usuários** →
escreve `packages/next/.env.local` e `apps/builder/.env.local` (gitignored).

Ao fim ele imprime a URL do **Studio** e o `DATABASE_URL`. Portas do Supabase local: API
(GoTrue/REST) `:55421`, Postgres `:55422`, Studio `:554xx`.

## 3. Rodar os apps

Em dois terminais (ou um com `&`):

```bash
pnpm --filter @yukilabs/agnostic-ui-next dev      # BFF  → http://localhost:3000
pnpm --filter @yukilabs/agnostic-ui-builder dev   # SPA  → http://localhost:5173
```

O SPA (`:5173`) faz proxy de `/api` para o BFF (`:3000`) — abra **http://localhost:5173**.

## 4. Login (usuários do seed)

O `setup:local` **já cria usuários admin/editor** no Supabase Auth (não precisa cadastrar
nada). Senha compartilhada: **`builder-local-123`**.

| E-mail                 | Tenant    | Papel         | Pode                                    |
| ---------------------- | --------- | ------------- | --------------------------------------- |
| `admin@partnerco.com`  | partnerco | **publisher** | salvar rascunho **e publicar/rollback** |
| `editor@partnerco.com` | partnerco | editor        | salvar rascunho (não publica → 403)     |
| `admin@acme.com`       | acme      | publisher     | idem, no tenant acme                    |

O papel e o tenant vivem em `app_metadata` do JWT (`builder_roles`, `tenant_id`) — claims
controlados pelo admin, nunca editáveis pelo usuário. A authz do builder é **fail-closed**
e escopada por tenant (RLS): o acme não enxerga artefatos do partnerco.

> **Criar/alterar usuários:** os usuários seed vivem em
> `packages/next/scripts/provision-local.ts` (array `SEED_USERS` + `SEED_PASSWORD`).
> Edite lá e rode `pnpm setup:local` de novo (idempotente). Ou crie um usuário direto no
> **Studio** (Authentication) — lembrando de pôr `app_metadata.{tenant_id, builder_roles}`,
> senão a API do builder nega (fail-closed).

## 5. Ligar a IA (opcional — Frente I, ADR 0006)

A IA (o "Propor com IA" nos editores de flow/tela) é **opcional**. **Sem chave**, a rota
`/api/builder/.../propose` responde **`503 llm_unavailable`** e o resto do builder segue
normal (edição visual/manual, publish, etc.).

Para ligar, cadastre a chave da Anthropic no **`.env.local` do BFF** e reinicie o BFF:

```bash
# packages/next/.env.local  (gitignored — nunca commitar)
ANTHROPIC_API_KEY="sk-ant-..."
# opcional — modelo usado p/ gerar config (default: claude-sonnet-4-6)
ANTHROPIC_MODEL="claude-sonnet-4-6"
```

Depois **reinicie** `...next dev` (a chave é lida uma vez no boot). O shape já está
documentado (comentado) em `packages/next/.env.example`.

- **Como escolher o modelo:** o default `claude-sonnet-4-6` é um bom custo/capacidade para
  gerar config. Para mais capacidade, use `ANTHROPIC_MODEL="claude-opus-4-8"`; para o
  Sonnet mais novo, `claude-sonnet-5`.
- **De onde vem a chave:** console da Anthropic (platform.claude.com) → API keys. É um
  segredo — só no `.env.local` (gitignored), nunca no código nem no git.
- **Determinismo em teste:** o E2E **não** usa chave real — injeta um `FakeLlm` canned via
  `BUILDER_FAKE_LLM` (seam em `packages/next/src/infra/llm/getLlm.ts`). Ver `e2e/README.md`.

## 6. Rodar o E2E da plataforma (opcional)

Com o `setup:local` de pé:

```bash
pnpm --filter @yukilabs/agnostic-ui-e2e install:browsers   # 1ª vez (chromium)
pnpm e2e                                                    # sobe BFF+builder próprios, roda, derruba
pnpm e2e:report                                            # abre o relatório HTML
```

O E2E usa **portas dedicadas** (BFF `:3100`, builder `:5173`) para não colidir com o dev.
Detalhes e jornadas em [`e2e/README.md`](../e2e/README.md).

## 7. Verificação rápida (sem UI)

```bash
# 1) token de um usuário seed (GoTrue)
ANON=$(supabase status -o env | sed -nE 's/^ANON_KEY="?([^"]+)"?/\1/p')
TOKEN=$(curl -s -X POST "http://127.0.0.1:55421/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"email":"admin@partnerco.com","password":"builder-local-123"}' \
  | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0,"utf8")).access_token)')

# 2) runtime (marker sandbox → mock) — deve devolver o saldo
curl -s http://localhost:3000/api/balance \
  -H "Authorization: Bearer app_sandbox_partnerco_happyPath" -H "x-tenant-id: partnerco"

# 3) API do builder (JWT Supabase) — lista os flows do tenant
curl -s "http://localhost:3000/api/builder/artifacts?kind=flow" -H "Authorization: Bearer $TOKEN"
```

## 8. Parar / resetar

```bash
pnpm reset:local     # supabase stop (derruba o stack)
pnpm setup:local     # sobe de novo (idempotente)
```

## 9. Troubleshooting

| Sintoma                                        | Causa / correção                                                                                                                                                                                                                   |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next dev` diz "Port 3000 in use / using 3001" | Já há um processo na `:3000` (às vezes um dev server órfão de sessão antiga). Ache com `lsof -ti tcp:3000` e mate, ou aceite a `:3001` (mas aí o proxy do SPA aponta p/ `:3000` — ajuste `VITE_PROXY_TARGET` ou libere a `:3000`). |
| Login falha / API do builder dá 401/403        | Sem `SUPABASE_JWT_JWKS_URL` no `.env.local` (o Supabase local emite ES256/JWKS). O `setup:local` já preenche; se editou à mão, confira.                                                                                            |
| Propor com IA dá `503 llm_unavailable`         | Falta `ANTHROPIC_API_KEY` no `packages/next/.env.local` (ver §5). Reinicie o BFF após setar.                                                                                                                                       |
| `supabase start` falha                         | Docker parado, ou portas `554xx` ocupadas. Suba o Docker; `pnpm reset:local` e tente de novo.                                                                                                                                      |
| Runtime dá 403 `tenant_mismatch`               | O `x-tenant-id` diverge do tenant do marker `app_sandbox_<tenant>_<profile>`.                                                                                                                                                      |

## 10. Referências

- Arquitetura, fluxo git, glossário: [`CLAUDE.md`](../CLAUDE.md).
- Ambiente local + conectores: [ADR 0003](adr/0003-infraestrutura-local-e-conectores.md).
- Hardening (JWT/rate-limit): [ADR 0001](adr/0001-bff-hardening-jwt-rate-limit.md).
- IA como editor: [ADR 0006](adr/0006-plataforma-extensivel-ia.md).
- Builder SPA: [`apps/builder/README.md`](../apps/builder/README.md).
- E2E: [`e2e/README.md`](../e2e/README.md).
