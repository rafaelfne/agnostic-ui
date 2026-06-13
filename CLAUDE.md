# CLAUDE.md

Guia para agentes e contribuidores do repositório **agnostic-ui**. Leia antes de
abrir qualquer branch ou PR.

## Sobre o projeto

**Agnostic UI / Embed Experience** é um template **white-label multi-tenant** de
**Server-Driven UI (SDUI)**. Permite que múltiplos parceiros (tenants) embarquem
experiências sem reescrever app: o servidor descreve a tela como **JSON** e o
cliente renderiza.

São **três peças**:

1. **App nativo (host)** — app do parceiro (Flutter/iOS/Android) que hospeda um
   **WebView** e injeta o token de acesso em `window.__APP_ACCESS_TOKEN__`.
2. **SDK / EmbedView** — camada que renderiza os templates JSON e fala com o host
   via **bridge** (protocolo de envelope JSON).
3. **BFF (Backend-for-Frontend)** — **Next.js App Router + TypeScript strict**.
   Resolve o tenant, decide a fonte de dados (Core real vs Mock), monta os
   templates SDUI e expõe o contrato do bridge.

Pacotes publicados sob o escopo `@yukilabs/agnostic-ui-*`.

> **Virada em curso (config-driven):** o engine de execução está sendo separado
> da lógica financeira. Os use cases deixam de ser TypeScript e passam a ser
> **config declarativa (Zod) interpretada em runtime** por um engine agnóstico
> (`@yukilabs/agnostic-ui-engine`), sem codegen e sem `eval`. O vertical
> financeiro vira o **primeiro conjunto de config** — a implementação de
> referência. Decisão em [ADR 0002](docs/adr/0002-meta-engine-config-runtime.md);
> trilha de fases em [`docs/plano-meta-engine.md`](docs/plano-meta-engine.md).

## Arquitetura

### Clean Architecture (no BFF)

Quatro camadas; dependências sempre apontando para dentro:

```
domain  ←  application  ←  infra
                ↑
            interface
```

- **domain** — entidades e regras puras. Sem framework, sem I/O.
- **application** — use cases e **ports** (interfaces): `ICoreGateway`,
  `ITokenProvider`, `ICache`, `ILogger`, `IConfigRepo`, `ITenantConfigRepository`.
- **infra** — adapters concretos das ports (gateways Http/Mock, cache, logger).
- **interface** — controllers e rotas Next.js; traduz HTTP ↔ use cases.

A **regra de dependência** é inviolável: domain não importa nada de fora;
application só conhece ports; infra implementa ports; interface orquestra.

### Injeção de dependência (DI, no BFF)

Container **tsyringe**: o root registra os singletons de infra (logger, tenant
repo) + os **use cases e controllers**; cada requisição cria um **child** via
`createRequestContainer(ctx, accessToken)` com o gateway e o `executionContext`
da requisição. `child.resolve(TOKEN)` acha o registro subindo até o root mas
**constrói no child**, então as deps request-scoped resolvem do child.

- **Tokens + registro são gerados** (`src/infra/di/generated/{tokens,registry}.ts`)
  por `scripts/generate-di.mjs` — **não editar à mão**; alterar o gerador e
  regenerar. Rode `pnpm --filter @yukilabs/agnostic-ui-next gen:di` ao adicionar
  um use case ou controller. `gen:di:check` (no `ci:local`) falha em caso de drift.
- **Convenção:** cada `*UseCase.ts` / `*Controller.ts` exporta uma classe com o
  nome igual ao stem do arquivo; o token é o nome em SCREAMING_SNAKE + `_TOKEN`
  (`GetBalanceUseCase` → `GET_BALANCE_USE_CASE_TOKEN`).
- Controllers injetam o use case **pelo token** e importam a classe como
  `import type`; rotas resolvem o controller **pelo token**.
- **Cuidado com ciclo no boot:** controllers importam os tokens leaf
  (`EXECUTION_CONTEXT_TOKEN`) de `infra/di/tokens`, **não** do barrel `infra` — a
  fiação no boot cria `container → registry → controllers → barrel infra`, e o
  barrel ainda não-inicializado faria o `@inject` receber `undefined`.

### Roteamento e theming por tenant (no BFF)

Cada tenant tem um **segmento de rota próprio** sob o route group organizacional
`app/(tenants)/[tenant]/` — `(tenants)` **não** aparece na URL, então os paths
são `/{slug}`, `/{slug}/invest`, etc., espelhando a árvore de telas (home,
invest, portfolios, portfolio-builder).

- **Fonte config-backed:** os descritores vivem em `src/infra/tenant/tenants/*.ts`
  e são agregados em `tenantDescriptors`; registrar um tenant = **adicionar um
  módulo**, sem editar o store nem a DI. `listTenants()` alimenta o
  `generateStaticParams` do segmento `[tenant]`.
- **Layout server-side:** `app/(tenants)/[tenant]/layout.tsx` resolve o descritor
  por slug via `getTenantConfig` e dá `notFound()` (404) em tenant desconhecido
  antes de qualquer tela renderizar.
- **Theming server-side:** `tenantThemeCssVars` mapeia o `theme` para as CSS vars
  do manual (`--tenant-primary` + `-rgb`, `--tenant-secondary`, `--tenant-canvas`,
  `--tenant-logo-url`) e o layout as injeta como custom properties inline — saem
  no **HTML do SSR**, sem JS no cliente.
- **Adiado para o pacote `react` (Fase D):** o provider de tema client
  (`useLayoutEffect` no `:root`), o renderer SDUI e a app bar interativa.

### Subsistemas

- **SDUI** — telas como árvore de `TemplateNode` (`type`, `id?`, `props?`,
  `body?`, `children?`). Um **renderer** percorre a árvore; **data-binding**
  resolve `{{...}}`; um **registry/composer** mapeia os componentes; um
  **Dispatcher + FlowEngine** executa ações; há pull-to-refresh e templates de
  exceção.
- **Bridge (native ↔ web)** — protocolo de **envelope JSON**:
  `{ id, origin, type, method?, params?, result?, error?, meta }`. Métodos:
  `closeWebView`, `getEnvInfo`, `getCustomerContext`, `openNativeShare`,
  `haptics`. Eventos: `tokenReady`, `themeChanged`, `customerChanged`,
  `deepLink`. Token entregue em `window.__APP_ACCESS_TOKEN__`;
  `meta.bridgeVersion` versiona o protocolo.
- **Sandbox** — modo de onboarding sem credenciais reais, decidido **por
  requisição** pelo formato do token.
- **Multi-tenancy** — descritor declarativo do tenant (`id`/`name`/`slug`/
  `dataSource`/`theme`/`layout`/`security`/`features`/`version`); segmentos de
  rota e tema por tenant aplicados **server-side** no BFF (ver acima), com o
  provider de tema client adiado para a Fase D.

### Modo de execução (sandbox vs live)

Resolvido **por requisição**, nunca global:

- Token no formato **marker** `app_sandbox_<tenant>_<profile>` → **sandbox**
  (dados mock).
- Caso contrário, JWT → **live** (Core real).

Marker regex: `^app_sandbox_([a-z0-9-]{1,32})_(happyPath|empty|error|slow)$`
(tenant: 1–32 letras minúsculas, dígitos e hífens — **sem** underscore)

Perfis de mock: `happyPath` (default), `empty`, `error`, `slow`.

O `tenant` do marker **deve** bater com o header `x-tenant-id` (senão
`tenant_mismatch`).

Mapeamento de erro → HTTP:

| Erro                     | HTTP |
| ------------------------ | ---- |
| `invalid_sandbox_marker` | 400  |
| `unknown_tenant`         | 400  |
| `missing_subject`        | 401  |
| `invalid_jwt`            | 401  |
| `tenant_mismatch`        | 403  |
| `rate_limited`           | 429  |

> O `core` **decodifica** o JWT (base64url) mas **não verifica assinatura**. A
> verificação de assinatura (jose, **fail-closed**) e o rate-limit por subject
> (Upstash, **fail-open** → 429) são hardening do **BFF** — ver
> [ADR 0001](docs/adr/0001-bff-hardening-jwt-rate-limit.md). Variáveis: chave do
> JWT (`JWT_JWKS_URL` **ou** `JWT_HS256_SECRET`, obrigatória em produção live) e
> Upstash opcional (`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`,
> `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW_MS`).

## Monorepo

**Turborepo + pnpm.** Workspaces em `packages/*` (e `apps/*` no futuro).

| Pacote                         | Papel                                                                                    | Estado                     |
| ------------------------------ | ---------------------------------------------------------------------------------------- | -------------------------- |
| `@yukilabs/agnostic-ui-core`   | Shared kernel: contratos, schemas (Zod), parser de marker/JWT, protocolo do bridge       | Pronto (Fase 0)            |
| `@yukilabs/agnostic-ui-next`   | BFF Next.js (Clean Architecture, DI, gateways, rotas); vira host do runtime na Fase B    | Fase 1 concluída           |
| `@yukilabs/agnostic-ui-engine` | Engine agnóstico: schemas de config, interpretador de flow, operadores, expressão segura | **Em construção (Fase A)** |
| `@yukilabs/agnostic-ui-react`  | Renderer SDUI, data-binding, FlowEngine, providers de tema/sandbox                       | Planejado (Fase D)         |

SDKs nativos (Flutter/pub.dev, iOS/SPM, Android/Maven) implementam o **contrato
do bridge** definido no `core` — adiados, mas o contrato já vive aqui.

### Roadmap

A virada para plataforma dirigida por config ([ADR 0002](docs/adr/0002-meta-engine-config-runtime.md))
reordena as fases. As **Fases 0 e 1** (monorepo + `core` + BFF `next` com Clean
Architecture, DI, gateways, multi-tenancy e hardening) estão **concluídas**.

- **Fase A (concluída):** engine core — `@yukilabs/agnostic-ui-engine`: schemas Zod
  dos primitivos, interpretador de flow, operadores (`validate`, `call-integration`,
  `compose-template`, `branch`, `emit-event`), avaliador de expressão seguro. Puro,
  100% testado, **sem UI/store**.
- **Fase B (em andamento):** host + conectores + store. **Entregue:** engine
  hospedado no `next` servindo `GetBalance` em `/api/engine/[flow]` ao lado da rota
  hardcoded (paridade provada), via `EngineCoreIntegrationRunner` sobre o
  `ICoreGateway`; config store append-only (`config_artifact`/`config_version`)
  atrás da port `IConfigStore` (Drizzle/Postgres), com RLS por tenant, draft/publish/
  versão e **publish fail-closed** (Zod + dry-run), migrations em `drizzle/`;
  ambiente local de um comando (`pnpm setup:local`, [ADR 0003](docs/adr/0003-infraestrutura-local-e-conectores.md));
  **conector REST genérico** (`RestIntegrationRunner`) dirigido por
  `IntegrationDefinition`, com guardião de egress (allowlist/anti-SSRF) e
  `ISecretResolver` (secret-ref), fail-closed; o runtime lê o **flow publicado do
  store** por tenant (cache TTL, fallback ao registry in-code) em `/api/engine/[flow]`,
  fechando o loop builder→store→runtime. **Pendente:** conector GraphQL; fiar um
  conector REST numa `IntegrationDefinition`/rota live.
- **Fase C:** migrar o vertical financeiro — 18 use cases → config; remover TS
  hardcoded; suíte verde via engine.
- **Fase D:** renderer SDUI — `@yukilabs/agnostic-ui-react` (pré-requisito do builder).
- **Fase E:** builder no-code — `apps/builder` (editor de flow/telas, wizard de
  integração, simular ao vivo).
- **Fase F:** polimento no-code — construtor visual de expressões, formulários por
  schema, authz, migração de schema de config, trace de execução.

Depois da Fase F: distribuição (CLI `create-agnostic-ui` self-hosted e/ou portal
managed) e SDKs nativos (Flutter/pub.dev, iOS/SPM, Android/Maven), que implementam
o contrato do bridge já definido no `core`.

## Convenções de código

- **TypeScript strict.** Sem `any` implícito; preferir tipos derivados de Zod.
- **Identificadores em inglês**; comentários e docs podem ser em PT.
- **Zod** como fonte da verdade para schemas; tipos via `z.infer`.
- **ESM + CJS** nos pacotes publicados (tsup): saída CJS com extensão `.cjs`;
  `exports` com a condição `types` **primeiro**.
- **Uma única versão de Zod** no workspace (via `overrides` no `pnpm-workspace.yaml`).
- **Sem comentários supérfluos** — só o "porquê" não óbvio.
- **Testes** com Vitest (`environment: 'node'` no core).

## Fluxo de trabalho (git)

**Princípio central:** _Branch por épico, branch por feature, commit por
sub-issue. Nada de branch ou PR por sub-issue._

### Hierarquia

```
Epic (por quê — entrega grande, mês+, valor de negócio)
└── Feature (o quê — entrega coerente, dias a semanas → vira PR)
    └── Tarefa (como — unidade acionável, horas a 1–2 dias → vira commit)
        └── Commit (UM commit por tarefa, com Closes #N)
```

### Branches

| Caso                      | Padrão                   | Base            |
| ------------------------- | ------------------------ | --------------- |
| Épico                     | `epic/<n>-<descricao>`   | `main`          |
| Feature (dentro do épico) | `<tipo>/<n>-<descricao>` | branch do épico |
| Avulso (sem épico)        | `<tipo>/<n>-<descricao>` | `main`          |

Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.

### Fluxo de merge

- Sub-issues entram como **commits distintos** na branch da feature
  (`Closes #<sub-issue>`).
- **Feature completa → PR contra a branch do épico** (merge commit ou rebase;
  **squash desabilitado** para preservar os commits).
- **Épico completo → PR da branch do épico contra `main`** (**squash & merge** —
  o épico vira 1 commit limpo).
- **Exceção (avulso):** tarefa sem épico vai direto de `main` → PR para `main`.

### Commits (Conventional Commits em PT)

```
<tipo>: <descrição no imperativo, minúsculo, sem ponto>

<corpo opcional — o porquê, não o quê>

Closes #<sub-issue>
```

### Fechamento manual de issues

O GitHub só auto-fecha com `Closes #N` quando o PR mergeia em **main**. Como o
fluxo usa branches intermediárias (feature → épico), todo merge intermediário
exige fechar issues **manualmente**:

| Merge           | Fechar manualmente                  |
| --------------- | ----------------------------------- |
| feature → épico | sub-issues do PR + issue da feature |
| épico → main    | issue do épico                      |
| avulso → main   | nada (auto-fecha)                   |

### Trivial (dispensa o fluxo)

Typo, lint, rename simples, ajuste de cor, copy. Cabe em 1 linha e não muda
comportamento → commit direto em `chore/` ou `docs/`.

## Guardrails de segurança

**NUNCA:**

- Push direto em `main`/`staging` ou force-push em branches compartilhadas.
- Apagar branches remotas sem confirmação explícita.
- Commitar segredos.
- Atravessar a fronteira **Mock ↔ Core** na mesma execução.
- Cair em sandbox por default em produção.
- Instalar dependências novas sem aprovação.
- Alterar a camada de segurança sem decisão arquitetural registrada.

**SEMPRE:**

- Branch isolada por tarefa; PR pequeno e focado.
- Marcar explicitamente trechos **sandbox-only**.
- CI verde antes de marcar PR pronto.
- Atualizar documentação no mesmo PR.
- **Pré-flight para ações irreversíveis:** listar afetados → repetir intenção em
  uma frase → aguardar confirmação humana explícita → só então executar.

### Definition of Done

- [ ] Código tipado (strict) e testado (Vitest).
- [ ] `lint`, `typecheck`, `test`, `build` verdes.
- [ ] PR pequeno, com escopo de UMA feature.
- [ ] Docs/CLAUDE.md atualizados no mesmo PR quando o comportamento muda.
- [ ] Sem segredos, sem dependência nova não aprovada.

## Comandos

```bash
pnpm install                  # instala o workspace
pnpm setup:local              # sobe o Supabase local + migrations + seed + .env.local (ADR 0003)
pnpm reset:local              # derruba o Supabase local (supabase stop)
pnpm turbo run build          # build de todos os pacotes
pnpm turbo run test           # testes (Vitest)
pnpm turbo run lint typecheck # lint + typecheck
pnpm changeset                # registra mudança para versionamento
pnpm release                  # build + changeset publish
```

> **Ambiente local:** `pnpm setup:local` (ADR 0003) precisa de Docker + CLI do
> Supabase; sobe o stack em portas `554xx`, aplica `packages/next/drizzle/*.sql` e
> seeda o flow `get-balance` no config store. Gera `packages/next/.env.local`
> (gitignored); `.env.example` documenta o shape.

## Glossário

- **BFF** — Backend-for-Frontend; o Next.js que serve SDUI por tenant.
- **SDUI** — Server-Driven UI; telas descritas como JSON.
- **Bridge** — protocolo de envelope JSON entre host nativo e WebView.
- **Marker** — token de sandbox `app_sandbox_<tenant>_<profile>`.
- **Tenant** — parceiro white-label com descritor próprio.
- **Profile** — perfil de mock: `happyPath`/`empty`/`error`/`slow`.
- **Envelope** — mensagem do bridge (`id`/`origin`/`type`/`method`/`params`/
  `result`/`error`/`meta`).
