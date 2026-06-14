# ADR 0004 — Builder no-code: SPA Vite + API no BFF

- **Status:** Aceito (implementação na Fase E)
- **Data:** 2026-06-14
- **Contexto da fase:** Fase E do meta-engine — a UI no-code que torna a config
  editável por não-devs (a meta de produto do ADR 0002 §6). Primeiro `apps/*`.
- **Camada afetada:** novo `apps/builder` (Vite/React SPA); novas rotas
  `/api/builder/*` no `@yukilabs/agnostic-ui-next`; nova port `IAuthz`; consome
  `@yukilabs/agnostic-ui-react` (renderer/preview), `@yukilabs/agnostic-ui-engine`
  (schemas/dry-run) e o config store.
- **Relacionado:** estende o [ADR 0002](0002-meta-engine-config-runtime.md) (§4
  store, §5 simular, §6 no-code), o [ADR 0003](0003-infraestrutura-local-e-conectores.md)
  (conectores/secret-ref) e a Fase D (pacote `react`).

## Contexto

As Fases A–D entregaram tudo abaixo da UI: engine (schemas, interpretador,
operadores, expressão segura, `validate` com schema), host do runtime (catch-all
dirigindo flows pelo engine), config store (Drizzle/Postgres, RLS, draft/publish
fail-closed), conectores REST/GraphQL seguros, e o renderer React + FlowEngine
client + providers. **Falta a peça que define o produto:** a interface que deixa
um não-dev montar fluxos e telas e publicá-los — sem tocar em código (ADR 0002 §6).

Construir um app é decisão arquitetural (novo `apps/*`, nova superfície de API,
authz). Esta ADR registra as escolhas, fechadas com o time.

## Decisão

### 1. `apps/builder` é um SPA **Vite + React**

O primeiro `apps/*` do monorepo. Cliente puro (deploy estático), reusando os
pacotes já prontos: **`react`** (`SduiRenderer`, `FlowScreen`, `useFlow`,
`createMockRunner`, providers) para o preview; **`engine`** (schemas Zod para
validação em tempo de edição; `runFlow` para dry-run) e **`core`** (`TemplateNode`,
`MockProfile`). Vite (não Next) porque um editor é client-side por natureza — SSR
não agrega, e separa o **admin** do **runtime** (o BFF continua só host).

### 2. A API do builder vive no **BFF** (`/api/builder/*`)

O SPA **não** acessa o store direto — RLS e segredos pertencem ao servidor. O
`next` ganha rotas `/api/builder/*` sobre a port `IConfigStore` (FB.2) e o
`publishFlowVersion` (publish fail-closed): listar artefatos, ler/salvar **draft**,
**publicar**, listar versões e **rollback**, por tenant e por `kind` (flow /
screen / integration / event / hook). Reaproveita store, RLS e validação já
existentes — a API é fina.

### 3. Authz por uma port `IAuthz` (Supabase Auth)

Nova port `IAuthz` (impl Supabase Auth, opt-in — ADR 0002 §4). Toda rota
`/api/builder/*` exige sessão e autoriza por **papel** (`editor` publica draft;
`publisher` publica) e por **tenant** (RLS no banco + checagem na aplicação).
**Fail-closed:** sem sessão/sem papel → recusa.

### 4. MVP cobre os três editores + authz

- **Editor de flow** — CRUD da `FlowDefinition`: a lista de `StepDef` por
  **formulários dirigidos pelos schemas Zod** do engine (não JSON cru); draft →
  **publish fail-closed**.
- **Editor de telas SDUI** — a árvore de `TemplateNode` (`ScreenDef`) ligada a um
  flow; preview pelo `SduiRenderer`.
- **Wizard de integração** — `IntegrationDefinition` (REST/GraphQL, `auth` por
  **secret-ref**, allowlist); o segredo **nunca** é digitado/salvo em claro, só a
  referência (ADR 0003).
- **Authz** — login + papéis (§3).

### 5. "Simular" — preview ao vivo, sem tocar o Core

O builder roda o flow **no browser** via o FlowEngine client (`createMockRunner` +
perfis `happyPath`/`empty`/`error`/`slow`) e renderiza a tela (`SduiRenderer`).
Editar → simular na hora, contra mock, sem nunca chamar o Core real (ADR 0002 §5).

### 6. Edição dirigida por schema, nunca config crua

Os formulários do builder são derivados dos **schemas Zod** do engine (a fonte da
verdade), com validação rica em tempo de edição. Expressões são montadas, não
digitadas como código — no MVP, um editor de expressão simples sobre a **AST
restrita** (o construtor **visual** completo é Fase F). **Zero `eval`.**

### 7. Segurança herdada, não relaxada

O builder não afrouxa nenhum guardrail: **secret-ref** (segredo nunca na config
nem na UI), **allowlist/anti-SSRF** dos conectores, **publish fail-closed** (Zod +
dry-run), **RLS** por tenant. A superfície nova (`/api/builder/*` + Auth) é a única
adição, atrás de authz.

## Consequências

- **Novo app + toolchain:** `apps/builder` (Vite/React) e o workspace passa a
  incluir `apps/*` (já previsto no `pnpm-workspace.yaml`).
- **Nova superfície no BFF:** rotas `/api/builder/*` + a port `IAuthz`; CORS/sessão
  entre o SPA e o BFF a definir (mesma origem em dev via proxy do Vite).
- **Supabase Auth entra** (opt-in, atrás de `IAuthz`) — antes era só Postgres/RLS.
- **Dependências do builder:** `react`, `react-dom`, Vite, e os pacotes do
  workspace (`react`/`engine`/`core`). Decisão de libs de UI (forms, roteamento,
  estado) fica para a implementação.
- **Fica para a Fase F:** construtor **visual** de expressões, formulários ricos
  dirigidos por schema, migração de schema de config e **trace de execução** no
  builder.
- **Licença OSS** (#58) continua bloqueante antes de release público.

## Alternativas consideradas

- **App Next.js próprio para o builder:** rejeitado — peso e duplicação de
  toolchain; SSR desnecessário para um editor.
- **Route group `/builder` no `next` existente:** rejeitado — mistura o admin UI
  com o host de runtime (que deve permanecer enxuto e público).
- **SPA acessando o store direto:** rejeitado — RLS e segredos pertencem ao
  servidor; o SPA não pode portar credenciais de banco.
- **Editar JSON cru da config:** rejeitado — o público é não-dev (ADR 0002 §6); a
  edição é dirigida por schema com validação.
