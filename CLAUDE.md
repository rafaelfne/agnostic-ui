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
  `dataSource`/`theme`/`layout`/`security`/`features`/`version`); tema aplicado
  por CSS vars em `:root`.

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

> O `core` **decodifica** o JWT (base64url) mas **não verifica assinatura** —
> verificação e rate-limit são hardening do BFF (fases posteriores).

## Monorepo

**Turborepo + pnpm.** Workspaces em `packages/*` (e `apps/*` no futuro).

| Pacote                        | Papel                                                                              | Estado                     |
| ----------------------------- | ---------------------------------------------------------------------------------- | -------------------------- |
| `@yukilabs/agnostic-ui-core`  | Shared kernel: contratos, schemas (Zod), parser de marker/JWT, protocolo do bridge | **Em construção (Fase 0)** |
| `@yukilabs/agnostic-ui-next`  | BFF Next.js (Clean Architecture, DI, gateways, rotas)                              | Planejado (Fase 1)         |
| `@yukilabs/agnostic-ui-react` | Renderer SDUI, data-binding, FlowEngine, providers de tema/sandbox                 | Planejado (Fase 2)         |

SDKs nativos (Flutter/pub.dev, iOS/SPM, Android/Maven) implementam o **contrato
do bridge** definido no `core` — adiados, mas o contrato já vive aqui.

### Roadmap

- **Fase 0 (atual):** monorepo + `core`.
- **Fase 1:** `next` (BFF).
- **Fase 2:** `react` (renderer).
- **Fase 3:** app de referência (playground) + e2e + CI de publish.
- **Fase 4:** distribuição (CLI `create-agnostic-ui` self-hosted e/ou portal managed).
- **Fase 5:** SDKs nativos.

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
pnpm turbo run build          # build de todos os pacotes
pnpm turbo run test           # testes (Vitest)
pnpm turbo run lint typecheck # lint + typecheck
pnpm changeset                # registra mudança para versionamento
pnpm release                  # build + changeset publish
```

## Glossário

- **BFF** — Backend-for-Frontend; o Next.js que serve SDUI por tenant.
- **SDUI** — Server-Driven UI; telas descritas como JSON.
- **Bridge** — protocolo de envelope JSON entre host nativo e WebView.
- **Marker** — token de sandbox `app_sandbox_<tenant>_<profile>`.
- **Tenant** — parceiro white-label com descritor próprio.
- **Profile** — perfil de mock: `happyPath`/`empty`/`error`/`slow`.
- **Envelope** — mensagem do bridge (`id`/`origin`/`type`/`method`/`params`/
  `result`/`error`/`meta`).
