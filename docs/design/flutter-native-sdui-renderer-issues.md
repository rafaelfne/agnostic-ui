# Quebra em épico / features / tarefas — Renderer SDUI nativo em Flutter

> Pronto para virar issues no GitHub. Segue o fluxo do `CLAUDE.md`: **branch por
> épico, branch por feature, commit por sub-issue**. Decisão em
> [ADR 0005](../adr/0005-flutter-native-sdui-renderer.md); design em
> [flutter-native-sdui-renderer-plan.md](./flutter-native-sdui-renderer-plan.md).
>
> Os IDs abaixo (`#E`, `#F1`, `#F1.1`…) são **lógicos** — mapear para os números
> reais de issue na criação. Cada **feature** vira 1 PR contra a branch do épico
> (commits preservados); cada **tarefa** vira 1 commit com `Closes #<sub-issue>`.

## Épico

**`#E` — Renderer SDUI nativo em Flutter**
Branch: `epic/E-flutter-native-sdui-renderer` · base: `main`
Entrega: catálogo SDUI completo renderizado nativamente em Flutter, coexistindo
com o host de WebView sob `EmbedView(renderMode:)`. Fecha por **squash & merge**
contra `main` quando todas as features mergearem no épico.

### Mapa de dependências

```
F1 (scaffold+contrato)  ──► tudo
F2 (engine+slice)       ──► F3, F4, F6, F7, F8, F9
F5 (BFF doc+client)     ──► dados reais (componentes podem usar mock antes)
F3,F4 ──► F9 (refresh/exception usam dispatcher+bridge)
F6,F7,F8 (famílias) paralelizáveis após F2
F10 (playground/publish) ──► por último
```

---

## F1 · Scaffold Dart + contrato gerado  (M0)

`#F1` — Branch: `feat/F1-dart-scaffold-contract` · base: `epic/E-...`
Objetivo: monorepo Dart buildando e o contrato do `core` gerado em Dart com check
de drift. Sem UI ainda.

- `#F1.1` chore: adicionar workspace **melos** + pipeline Dart no CI (Turbo dispara `flutter analyze`/`test`).
- `#F1.2` feat: scaffold dos pacotes `agnostic_ui_contract`, `agnostic_ui_flutter`, `agnostic_ui_sdk`.
- `#F1.3` feat(core): exportar **JSON Schema** a partir dos schemas Zod (`TemplateNode`, `Envelope`, `TenantConfig`).
- `#F1.4` feat: **codegen** de modelos Dart a partir do JSON Schema (`json_serializable`/`freezed`) em `agnostic_ui_contract`.
- `#F1.5` chore: **`gen:check`** de drift do contrato no CI (espelha `gen:di:check`).
- `#F1.6` test: harness de **vetores de conformance** no `core` + runner Dart (esqueleto).

PR `#F1` → épico. Fechar manual: `#F1.1`–`#F1.6` + `#F1`.

---

## F2 · Engine de binding + pipeline + Core UI + slice vertical  (M1)

`#F2` — Branch: `feat/F2-binding-pipeline-core` · base: `epic/E-...`
Objetivo: 1 tela real renderizando ponta a ponta contra um documento mock.

- `#F2.1` feat: interpretador de **data-binding** (paths dot-notation, condicionais `&&`/`||`/`!`, igualdade) em `agnostic_ui_contract`.
- `#F2.2` feat: registry de **filtros/pipes** (`currency`, `percent`, `date`, `uppercase`) com locale.
- `#F2.3` feat: **`dataBind`** / loop com escopo `$item`/`$index`.
- `#F2.4` feat: `parseTemplate` + **pipeline** (parse → bind → compose) em `agnostic_ui_flutter`.
- `#F2.5` feat: **composer/registry** com fallback gracioso para `type` desconhecido (empty-state + telemetria).
- `#F2.6` feat: componentes **Core UI** — `text`, `button`, `icon`, `input`, `row`, `container`.
- `#F2.7` feat: `TemplateRenderer` + **tela home** ponta a ponta contra documento mock.
- `#F2.8` test: **vetores de conformance** de binding (path/condicional/pipe/loop) verdes nos dois renderers.

PR `#F2` → épico. Fechar manual: `#F2.1`–`#F2.8` + `#F2`.

---

## F3 · Bridge nativa + EmbedView(renderMode)  (M2)

`#F3` — Branch: `feat/F3-native-bridge-embedview` · base: `epic/E-...` · dep: F1
Objetivo: bridge in-process e a `EmbedView` unificada.

- `#F3.1` feat: interface **`NativeBridge`** (envelope → handlers) + `Stream<Envelope>` de eventos.
- `#F3.2` feat: métodos `closeWebView`, `getEnvInfo`, `getCustomerContext`, `openNativeShare`, `haptics` (plugins nativos).
- `#F3.3` feat: eventos `tokenReady`, `themeChanged`, `customerChanged`, `deepLink`.
- `#F3.4` feat: ingestão de **token** no nativo (parser de marker/JWT do `core`) alimentando o cliente.
- `#F3.5` feat: **`EmbedView(renderMode: webview | native)`** estendendo `agnostic_ui_sdk`.
- `#F3.6` test: bridge com transporte fake + parsing de envelope.

PR `#F3` → épico. Fechar manual: `#F3.1`–`#F3.6` + `#F3`.

---

## F4 · Dispatcher + FlowEngine + navegação  (M2)

`#F4` — Branch: `feat/F4-dispatcher-flowengine` · base: `epic/E-...` · dep: F2
Objetivo: ações de UI e navegação nativa.

- `#F4.1` feat: **Dispatcher** middleware-based + hooks `beforeDispatch`/`afterDispatch`.
- `#F4.2` feat: **`ButtonEvent`** handling (`type: navigate | bridge`).
- `#F4.3` feat: **FlowEngine** handlers → **GoRouter** (`navigation`, `navigateFlow`, `replaceCurrent`, `back`, `refreshHomePage`).
- `#F4.4` test: unit do dispatcher/flowengine (cadeia de middlewares, roteamento de ação).

PR `#F4` → épico. Fechar manual: `#F4.1`–`#F4.4` + `#F4`.

---

## F5 · BFF documento SDUI + SduiClient  (M2)  ⚠️ cross-package

`#F5` — Branch: `feat/F5-bff-sdui-document` · base: `epic/E-...`
Objetivo: o BFF passa a **emitir o documento SDUI** e o Dart sabe buscá-lo.
Toca `core` + `next` + `agnostic_ui_flutter`. **Hard dependency** para dados
reais (os componentes podem ser construídos contra mock antes disso).

- `#F5.1` feat(core): schema do **documento SDUI** (`templateId`/`version`/`layout`/`context`/`refresh?`/`exception?`).
- `#F5.2` feat(next): **endpoint** que compõe e devolve o documento por rota/tela (reusa resolver de modo + mapa de erro→HTTP).
- `#F5.3` feat: **`SduiClient`** Dart (fetch com bearer, profiles de mock, erro HTTP → exception template).
- `#F5.4` test: `SduiClient` contra BFF mock (`happyPath`/`empty`/`error`/`slow`) + mapeamento 400/401/403/429.

PR `#F5` → épico. Fechar manual: `#F5.1`–`#F5.4` + `#F5`.

> **Nota:** se o time preferir manter `next` em fluxo próprio, F5 pode virar um
> mini-épico no `next` e esta frente consome o endpoint. Mantido aqui como
> feature por ser pré-requisito direto do renderer.

---

## F6 · Catálogo — família Cards  (M3)

`#F6` — Branch: `feat/F6-catalog-cards` · base: `epic/E-...` · dep: F2
Um commit por componente + vetores.

- `#F6.1` feat: `card-balance` · `#F6.2` `category-card` · `#F6.3` `product-card` · `#F6.4` `portfolio-card`
- `#F6.5` `catalog-card` · `#F6.6` `information-card` · `#F6.7` `invest-card` · `#F6.8` `product-performance-card`
- `#F6.9` test: conformance + golden por tenant da família Cards.

PR `#F6` → épico. Fechar manual: `#F6.1`–`#F6.9` + `#F6`.

---

## F7 · Catálogo — Headers + Listas  (M3)

`#F7` — Branch: `feat/F7-catalog-headers-lists` · base: `epic/E-...` · dep: F2

- `#F7.1` `main-header` · `#F7.2` `product-header` · `#F7.3` `product-details-header` · `#F7.4` `catalog-header`
- `#F7.5` `list` · `#F7.6` `product-list` · `#F7.7` `benefit-list` · `#F7.8` `performance-list`
- `#F7.9` test: conformance + golden das famílias Headers/Listas.

PR `#F7` → épico. Fechar manual: `#F7.1`–`#F7.9` + `#F7`.

---

## F8 · Catálogo — Especializados  (M4)

`#F8` — Branch: `feat/F8-catalog-specialized` · base: `epic/E-...` · dep: F2, F4

- `#F8.1` `window` · `#F8.2` `tabs` · `#F8.3` `empty-state` · `#F8.4` `my-wallets-content`
- `#F8.5` `invest-amount` · `#F8.6` `invest-review` · `#F8.7` `portfolio-builder-catalog`
- `#F8.8` test: conformance + golden dos especializados.

PR `#F8` → épico. Fechar manual: `#F8.1`–`#F8.8` + `#F8`.

---

## F9 · Pull-to-refresh + Exception + Theming + por tenant  (M4)

`#F9` — Branch: `feat/F9-refresh-exception-theming` · base: `epic/E-...` · dep: F3, F4, F5

- `#F9.1` feat: **`RefreshConfig`** por `templateId` + wrapper `RefreshIndicator` (re-fetch via `SduiClient`).
- `#F9.2` feat: detecção de **exception** (`RequestResult{success:false}`) + componente `exception-error`.
- `#F9.3` feat: **theming** — `TenantTheme` → `ThemeData` + tokens (`InheritedWidget`).
- `#F9.4` feat: **overlay de registry por tenant** (`partnerco-balance-card`, `partnerco-quick-actions`).
- `#F9.5` test: vetores de exception (paridade React) + golden multi-tenant.

PR `#F9` → épico. Fechar manual: `#F9.1`–`#F9.5` + `#F9`.

---

## F10 · Playground + E2E + publish  (M5)

`#F10` — Branch: `feat/F10-playground-e2e-publish` · base: `epic/E-...` · dep: todas

- `#F10.1` feat: **app de referência** (Yuki Labs Playground) dirigido por marker `app_sandbox_<tenant>_<profile>`.
- `#F10.2` test: **E2E** por profile (`empty`/`slow`/`error`) cobrindo telas inteiras.
- `#F10.3` test: **golden suite** completa do catálogo.
- `#F10.4` chore: pipeline de **publish no pub.dev** (`agnostic_ui_*`) + versionamento/changeset.
- `#F10.5` docs: **catálogo de componentes** nativo + README de adoção (`renderMode`).

PR `#F10` → épico. Fechar manual: `#F10.1`–`#F10.5` + `#F10`.

---

## Fechamento do épico

Quando F1–F10 mergearem no épico e o CI estiver verde:

- PR **`epic/E-flutter-native-sdui-renderer` → `main`** com **squash & merge** (o
  épico vira 1 commit limpo).
- Fechar manualmente a issue do épico **`#E`** (o squash não auto-fecha sub-issues
  de branches intermediárias — guardrail do `CLAUDE.md`).
