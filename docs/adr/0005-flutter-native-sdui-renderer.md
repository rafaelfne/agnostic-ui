# ADR 0005 — Renderer SDUI nativo em Flutter (coexistindo com o host de WebView)

- **Status:** Proposto
- **Data:** 2026-06-15
- **Contexto da fase:** nova frente nativa — renderer Flutter, paralela ao
  `@yukilabs/agnostic-ui-react` (Fase 2). Pré-requisito no BFF (Fase 1+).
- **Camada afetada:** nova ponta nativa (Dart/Flutter), shared kernel
  (`@yukilabs/agnostic-ui-core`) e BFF (`@yukilabs/agnostic-ui-next`, novo
  endpoint de documento SDUI).

## Contexto

O manual (§14.3) define a ponta Flutter como um **host de WebView**: o pacote
`agnostic_ui_sdk` (pub.dev) abre a `EmbedView`, carrega a URL do BFF, injeta o
token e gerencia a bridge. Quem **interpreta e renderiza** o SDUI é o web —
`@yukilabs/agnostic-ui-react` (§14.2) — rodando _dentro_ do WebView.

Esta ADR registra uma direção nova: **além** de manter o host de WebView, passar
a oferecer um **renderer nativo em Flutter** que faz parse do mesmo
`TemplateNode` JSON (definido hoje em `packages/core/src/schemas/template.ts`) e
renderiza **widgets Flutter nativos**, sem WebView. É um **segundo
interpretador**, par do renderer React, consumindo o mesmo contrato.

Motivação: parceiros que exigem _look-and-feel_ nativo — performance e fluidez
sem o overhead do WebView, gestos e haptics diretos, acessibilidade da
plataforma, melhor integração com o app casca. O host de WebView continua
existindo para quem prioriza entrega instantânea de UI (ver tradeoff abaixo).

Mexer aqui cria uma nova superfície de produto e toca o shared kernel e o BFF —
logo, exige decisão arquitetural registrada (guardrail do CLAUDE.md).

## Decisão

### 1. Renderer nativo **coexiste** com o host de WebView, sob uma única `EmbedView`

A `EmbedView` ganha um parâmetro de modo de renderização:

```dart
EmbedView({ required this.token, required this.tenant, this.renderMode = RenderMode.webview });
// RenderMode.webview → carrega o WebView do BFF (comportamento do manual)
// RenderMode.native  → monta o TemplateRenderer nativo
```

Mesmo token, mesmo tenant, mesma superfície de bridge. O parceiro adota o nativo
**virando uma flag**, sem trocar de API. Os dois modos compartilham o ciclo de
token e a configuração de tenant.

### 2. O **contrato continua no `core`** (fonte única); o Dart é **gerado**, não escrito à mão

`@yukilabs/agnostic-ui-core` (TS/Zod) permanece a fonte da verdade dos schemas
(`TemplateNode`, `Envelope`, `TenantConfig`, e o novo **documento SDUI** — ver
§5). O lado Dart é derivado por **codegen**:

```
Zod (core)  →  JSON Schema (artefato publicado pelo core)  →  modelos Dart (json_serializable/freezed) + validação
```

Um **check de drift no CI** falha se os modelos Dart saírem de sincronia com o
JSON Schema — espelhando exatamente a filosofia do `gen:di` / `gen:di:check` já
usada no BFF (composição auto-gerada, manual §1.4). Além dos tipos, um **corpus
de vetores de conformance** (template + contexto → árvore resolvida esperada)
mora no `core` e é executado pelos **dois** renderers (React e Flutter),
garantindo paridade semântica de data-binding e composição.

### 3. Três pacotes Dart, no **mesmo monorepo**

| Pacote                  | Papel                                                                                  | Dep. de Flutter |
| ----------------------- | -------------------------------------------------------------------------------------- | --------------- |
| `agnostic_ui_contract`  | Modelos gerados + validação + interpretador de binding (espelho Dart do `core`)        | Não (Dart puro) |
| `agnostic_ui_flutter`   | Renderer nativo: `TemplateRenderer`, registry de ~40 widgets, Dispatcher/FlowEngine    | Sim             |
| `agnostic_ui_sdk`       | Host de WebView do manual, **estendido** com `renderMode` para plugar o renderer nativo | Sim             |

Ficam no **mesmo repositório** (manual §14.1 — monorepo para sincronizar
contratos), sob um diretório Dart dedicado, orquestrado por **melos**; o CI do
Turbo dispara o pipeline Dart (`flutter analyze`/`test`/`build`) junto do JS. O
Dart **não** entra no workspace pnpm (toolchains separadas), mas compartilha o
mesmo repo e o mesmo artefato de contrato (JSON Schema do `core`).

### 4. A **bridge muda de transporte, não de contrato**

O `EnvelopeSchema` continua o contrato canônico de métodos/eventos. O que muda é
o **transporte**:

- **Modo WebView:** IPC via `window.postMessage` (web ↔ nativo), como hoje.
- **Modo nativo:** **não há WebView** — o envelope é despachado para handlers
  Dart **in-process** (platform channels / plugins). `closeWebView`, `haptics`,
  `openNativeShare`, `getEnvInfo`, `getCustomerContext` viram chamadas diretas;
  eventos (`tokenReady`, `themeChanged`, `customerChanged`, `deepLink`) chegam
  via stream nativo. A correlação por UUID some no modo nativo (chamada direta),
  mas o **formato** do envelope é preservado para reuso e testes.

### 5. O **BFF passa a expor o documento SDUI** por HTTP; o schema é formalizado no `core`

Hoje o BFF serve **páginas React** (`(tenants)/[tenant]/...`) e **rotas de
dados** (`/api/*`). O renderer nativo precisa do **documento SDUI cru**
(`{ templateId, version, layout, context, refresh?, exception? }`) por HTTP. Por
isso:

- formaliza-se o **schema do documento SDUI** no `core` (hoje só existe
  `TemplateNode`, não o documento completo com `context`/`version`) — beneficia
  os **dois** renderers;
- o BFF ganha um endpoint que devolve esse documento por rota/tela, com o mesmo
  resolver de modo (sandbox vs live) e o mesmo mapa de erro → HTTP já existentes.

### 6. Catálogo **incremental** com fallback gracioso

O composer nativo adota os ~40 tipos por famílias, mas um `type` desconhecido
**não quebra a tela**: cai em `empty-state`/placeholder + telemetria. Componentes
por tenant (`partnerco-*`) entram por um **overlay de registry** com escopo de
tenant, sem tocar o registry base.

## Consequências

- **Tradeoff fundamental (o motivo de manter os dois modos):** no modo **nativo**,
  **novos _tipos_ de componente exigem release do app** — `templates` e dados
  mudam livremente em runtime, mas um `type` que o app não conhece não existe até
  o próximo release. O modo **WebView preserva a entrega instantânea de qualquer
  UI** (inclusive tipos novos). Por isso a decisão é **híbrida**, não substitutiva.
- **Custo de manutenção** de um terceiro renderer; mitigado por contrato único
  (`core`) + codegen + suíte de conformance compartilhada.
- **Nova toolchain no CI:** Dart/Flutter via melos (`analyze`/`test`/golden),
  além do pipeline JS.
- **Nova capacidade no BFF:** endpoint de documento SDUI + schema de documento no
  `core` (shared kernel).
- **Risco de drift TS↔Dart:** mitigado por JSON Schema gerado + `*:check` no CI +
  vetores de conformance.
- **Governança de paridade:** o React permanece o **renderer de referência**; o
  _Definition of Done_ de um componente novo exige paridade no Flutter **ou**
  marcação explícita de "não suportado no nativo".

## Alternativas consideradas

- **Só host de WebView (status quo do manual):** rejeitado — não entrega a UX
  nativa que motiva a frente. (Continua disponível como um dos dois modos.)
- **Renderer nativo _substituindo_ o WebView:** rejeitado — perderia a entrega
  instantânea de tipos novos e o caminho de onboarding/playground por marker; o
  híbrido cobre os dois públicos.
- **Contrato reescrito em formato neutro (protobuf/OpenAPI) como fonte:**
  considerado e adiado — bom a longo prazo, custoso agora; `Zod → JSON Schema`
  reaproveita o `core` existente e pode evoluir para isso depois.
- **Espelhar os tipos à mão em Dart:** rejeitado — drift garantido sem
  codegen + check.
- **Repositório Dart separado:** rejeitado por ora — contraria o monorepo do
  §14.1 (sync de contrato em tempo de build); melos no mesmo repo resolve sem
  arrastar Dart para o pnpm.
- **Fallback de `type` desconhecido via _WebView-island_ embarcada:** adiado —
  resolveria a entrega instantânea no nativo, mas é complexo; MVP usa
  placeholder + telemetria.
