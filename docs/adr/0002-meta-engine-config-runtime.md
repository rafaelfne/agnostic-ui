# ADR 0002 — Meta-engine de cenários dirigido por configuração

- **Status:** Aceito (implementação pendente — abre a Fase A)
- **Data:** 2026-06-13
- **Contexto da fase:** nova trilha — vira o produto de "BFF de vertical
  financeiro" para "plataforma de cenários dirigida por config + builder no-code"
- **Camada afetada:** novo pacote `@yukilabs/agnostic-ui-engine`; `@yukilabs/agnostic-ui-next` (vira host do runtime); novo config store
- **Relacionado:** plano em [`docs/plano-meta-engine.md`](../plano-meta-engine.md); spike de prova em [`docs/spikes/getbalance-flow.spike.ts`](../spikes/getbalance-flow.spike.ts); estende o [ADR 0001](0001-bff-hardening-jwt-rate-limit.md)

## Contexto

Hoje o **engine de execução e a lógica financeira são o mesmo código**: os 18 use
cases (`GetBalanceUseCase`, …), controllers, gateways e a composição SDUI vivem
como TypeScript. Cada cenário novo exige código novo e deploy.

A meta é separar o que está fundido em (1) um **engine agnóstico** que só sabe ler
configuração validada e executá-la, e (2) **configuração declarativa** que
descreve um vertical. Os use cases financeiros deixam de ser "o produto" e viram o
**primeiro conjunto de config** — a implementação de referência. O produto passa a
ser o engine + um builder no-code.

Mexer nessa fronteira é decisão arquitetural — esta ADR a registra. As quatro
bifurcações que governam o resto foram decididas com o time (ver §Decisão).

## Decisão

### 1. Separação engine agnóstico × config

Novo pacote `@yukilabs/agnostic-ui-engine` contendo `domain` + `application`
puros, sem nada de finanças: interpretador, registry de operadores, avaliador de
expressão, event bus, pipeline de hooks. O vertical financeiro existente é
expresso como dado e migrado para esse engine (ver §8).

### 2. Execução **interpretada em runtime** (não codegen)

A config é carregada e executada por um engine tipado, em tempo de requisição, via
um **registry fixo de operadores** auditados. **Não** geramos TypeScript a partir
da config. Motivo: a promessa central é editar cenários pela interface **sem
redeploy** — codegen exige ciclo de build/deploy a cada mudança e mataria isso.

### 3. Config como artefatos versionados (Zod), com vocabulário de operadores fechado

Cada primitivo é um **schema Zod** versionado: `FlowDefinition` (use case),
`StepDef` (union discriminada de operadores), `TriggerDef`, `IntegrationDefinition`,
`EventDef`/`SubscriptionDef`, `HookDef`, `ScreenDef` (árvore SDUI). O conjunto
fechado de operadores — `validate`, `call-integration`, `transform`, `branch`,
`foreach`, `compose-template`, `emit-event`, `call-flow`, `delay`, `guard` — é o
que mantém o sistema seguro **sem `eval`**. O binding entre passos usa uma
**linguagem de expressão restrita (AST, estilo JSONLogic)**, estendendo o `{{...}}`
do SDUI; nunca JS arbitrário.

> O spike (`docs/spikes/getbalance-flow.spike.ts`) já provou que esse vocabulário
> reproduz o `GetBalance` real em paridade (happyPath/empty/error→500/slow/
> validação→400), com um interpretador genérico que não menciona "balance".

### 4. Store = **Supabase (Postgres)**, atrás de port, acesso via Drizzle

O config store é **Supabase**, escolhido por ser OSS e self-hostável (coerente com
§7). Por baixo é Postgres puro; o acesso é via **Drizzle** (`drizzle-zod` faz a
ponte com os schemas do engine) atrás de uma port **`IConfigStore`** — então roda
em Supabase hospedado, Supabase local em Docker, ou Postgres pelado, sem o engine
perceber.

- Schema append-only: `config_artifact (id, tenant_id, kind, slug)` +
  `config_version (artifact_id, version, status: draft|published, body jsonb)`.
  "published" é um ponteiro por artefato/tenant; rollback = reapontar versão.
- Isolamento de tenant via **RLS** (`tenant_id`), no banco, não só na aplicação.
- **Publish é fail-closed:** valida Zod completo + dry-run de simulação antes de
  liberar; draft pode estar quebrado.
- Extras do Supabase **opt-in**, atrás de ports: **Auth** (authz de quem edita/
  publica), **Realtime** (preview/colaboração no builder), **Vault** (segredos).
- **Migrations (schema + RLS) versionadas no repo** — pré-requisito do OSS.
- Runtime lê a versão publicada com **cache** (reaproveita o Upstash do ADR 0001,
  ou LRU em memória, por tenant+artefato+versão).

### 5. Escopo: **backend + telas SDUI** no mesmo builder

A meta-programação cobre fluxo de dados (use cases/integrações/eventos/hooks/
triggers) **e** a árvore de `TemplateNode` da tela (`ScreenDef`, ligada a um flow
pelos dados). Um builder único.

### 6. Público: **no-code para não-devs**

A interface é para quem não é dev. Isso eleva o sarrafo: exige construtor **visual**
de expressões, validação rica dirigida por schema e trace de execução legível.
Recomenda-se separar em fases "engine funcionando" (devs) de "UX para leigos"
(polimento), mesmo mantendo o no-code como meta (ver §8 e roadmap no plano).

### 7. **Open source sempre**, self-host first-class

O núcleo é OSS e qualquer um sobe um stack idêntico com `supabase start`. Um SaaS
gerenciado pode existir por cima, mas não às custas do self-host. Implica: zero
segredo no repo ou no config store, secret store plugável, e licença OSS a definir
(bloqueante para release — ver Consequências).

### 8. Migração **strangler-fig**, com os 177 testes como oráculo

Sem big-bang. Expressar `GetBalance` como `FlowDefinition` (spike pronto) → rota
servida pelo engine ao lado da hardcoded → assertar paridade contra os testes
existentes → migrar em ondas (catalog → invest → portfolio-builder), apagando TS a
cada onda → quando os 18 estiverem em config, remover use cases/controllers
hardcoded. O hardening do ADR 0001 (JWT, rate-limit) deixa de ser código especial e
vira **hook embutido** (`auth`, `rateLimit`), aplicável por config.

## Escopo de implementação (Fase A — para o Claude Code começar)

Construir **só o engine core**, puro, 100% testado, **sem UI e sem store ainda**:

1. Pacote `@yukilabs/agnostic-ui-engine` (tsup ESM+CJS, Vitest, mesma convenção do
   `core`).
2. Schemas Zod dos primitivos do §3, com tipos via `z.infer`.
3. Interpretador de `FlowDefinition` sobre um contexto de execução tipado.
4. Operadores na ordem: `validate`, `call-integration`, `compose-template`,
   `branch`, `emit-event` (o resto depois).
5. Avaliador de expressão **seguro** (AST restrita, sem `eval`) para o binding.
6. Provas de paridade: `GetBalance` (já no spike) **e** um use case **de tela**
   (ex. `invest/flow`) para exercitar `compose-template`, ambos contra o gateway
   mock, reaproveitando os perfis (`happyPath`/`empty`/`error`/`slow`).

Fora do escopo da Fase A: Supabase/store, builder, renderer React, RLS, Auth.

## Consequências

- **Novo pacote:** `@yukilabs/agnostic-ui-engine` (kernel do interpretador).
- **`next` vira host do runtime:** roteamento catch-all resolve triggers HTTP a
  partir da config; use cases/controllers hardcoded migram e são removidos ao fim.
- **Novas dependências (fases B+):** `drizzle-orm` + driver Postgres, cliente/CLI
  Supabase, e uma lib de expressão (ou implementação própria da AST). A Fase A não
  adiciona dependência de runtime além de Zod.
- **Reaproveitamento:** markers de sandbox + perfis de mock alimentam o "simular"
  do builder de graça; Upstash (ADR 0001) cacheia config publicada.
- **Versionamento de schema de config:** quando o schema do engine evolui, as
  configs salvas precisam migrar — exige versão de schema + migrações de config.
- **Depurabilidade:** flow interpretado é mais difícil de debugar que código →
  trace de execução passo-a-passo exposto no builder é requisito, não extra.
- **Licença OSS pendente** (MIT/Apache-2.0 vs copyleft) — bloqueante antes de
  qualquer release público.
- **Risco aceito:** no-code desde cedo multiplica o esforço de UX/validação/
  segurança; mitigado fasiando engine (devs) antes do polimento no-code.

## Alternativas consideradas

- **Codegen (config → TypeScript):** rejeitado — type-safety total, mas contraria a
  promessa de editar ao vivo sem deploy.
- **`eval` / JS arbitrário nas expressões:** rejeitado — inaceitável com público
  não-dev, repo público e os guardrails de segurança; daí a AST restrita.
- **Document store (Mongo):** rejeitado — precisamos de relações entre artefatos e
  publish transacional, e o time é Zod/TS; Postgres + `JSONB` dá a flexibilidade de
  documento sem abrir mão disso.
- **Config em git/arquivos:** rejeitado — incompatível com edição pela UI com
  draft/publish/versão.
- **Neon / Turso (libSQL):** considerados. Neon (Postgres serverless, branching
  instantâneo) e Turso (SQLite no edge, banco-por-tenant barato, ótimo p/
  self-host) são fortes; Supabase venceu por ser OSS + self-hostável **e** trazer
  Auth/RLS/Realtime/Vault úteis ao builder, sem perder a portabilidade Postgres
  (Drizzle mantém a decisão reversível).
