# Plano de implementação — Renderer SDUI nativo em Flutter

> Documento de design da frente nativa. Decisão arquitetural em
> [ADR 0005](../adr/0005-flutter-native-sdui-renderer.md). Quebra em
> épico/features/tarefas em
> [flutter-native-sdui-renderer-issues.md](./flutter-native-sdui-renderer-issues.md).

## 1. Objetivo e escopo

Construir um **renderer SDUI nativo em Flutter** que interpreta o mesmo
`TemplateNode` JSON servido pelo BFF e renderiza **widgets nativos** (sem
WebView), coexistindo com o host de WebView (`agnostic_ui_sdk`) atrás de uma
única `EmbedView(renderMode:)`.

**Escopo desta frente:** catálogo **completo** (~40 tipos do composer),
Dispatcher + FlowEngine, exception templates, pull-to-refresh, theming por
tenant, bridge nativa, e o endpoint de documento SDUI no BFF que alimenta o
renderer. Inclui app de referência (playground) e suíte de conformance
cross-renderer.

**Fora de escopo (por ora):** fallback de tipo desconhecido via WebView-island;
SDKs iOS/Android nativos (SPM/Maven) — esta frente é Flutter/pub.dev.

## 2. Reuse map — o que vem do `core`, o que é nativo

O princípio é: **contrato no `core` (uma fonte), runtime reimplementado em Dart**.

| Categoria                          | Itens                                                                                                              | Onde vive / estratégia                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Reusado (contrato, neutro)**     | `TemplateNode`, documento SDUI, `Envelope`, `TenantConfig`, marker/JWT, vocabulário de `type`, semântica de binding, ações do FlowEngine, regra de exception, profiles de mock | `core` (TS/Zod) → **JSON Schema** → **codegen Dart** + **vetores de conformance**       |
| **Reimplementado em Dart**         | parse → bind → compose (pipeline), os ~40 widgets, Dispatcher/FlowEngine runtime, theming, pull-to-refresh, navegação, cliente HTTP | `agnostic_ui_flutter` (+ binding em `agnostic_ui_contract`)                              |
| **Muda de transporte (não de contrato)** | bridge: `postMessage` (WebView) → chamadas Dart in-process (nativo)                                          | `agnostic_ui_flutter` implementa a interface; `Envelope` continua o contrato            |
| **Novo no BFF**                    | endpoint que devolve o **documento SDUI** cru por rota/tela                                                        | `@yukilabs/agnostic-ui-next` (pré-requisito); schema do documento formalizado no `core` |

A consequência prática: **o renderer React e o renderer Flutter são dois clientes
do mesmo documento SDUI**. O BFF não sabe qual renderer está do outro lado.

## 3. Arquitetura dos pacotes Dart

```
                 ┌──────────────────────────┐
                 │   @yukilabs/agnostic-ui-core   │  (TS/Zod — fonte do contrato)
                 │   └─ exporta JSON Schema        │
                 └──────────────┬───────────────┘
                                │ codegen + check de drift (CI)
                                ▼
                 ┌──────────────────────────┐
                 │     agnostic_ui_contract       │  Dart puro (sem Flutter)
                 │  modelos gerados · validação    │
                 │  interpretador de data-binding  │
                 └───────┬───────────────┬───────┘
                         │               │
                         ▼               ▼
          ┌────────────────────┐   ┌────────────────────┐
          │  agnostic_ui_flutter   │   │   agnostic_ui_sdk    │
          │  TemplateRenderer       │   │  host de WebView      │
          │  registry (~40 widgets) │   │  (manual §14.3)       │
          │  Dispatcher/FlowEngine  │   │  + renderMode switch  │
          │  theming · refresh      │   └──────────┬─────────┘
          │  SduiClient (HTTP)      │              │
          └──────────┬─────────────┘              │
                     └───────────► EmbedView(renderMode: native | webview) ◄───────┘
```

- **`agnostic_ui_contract`** — Dart puro, sem dependência de Flutter (testável em
  CI rápido, reusável fora de UI). Contém os modelos gerados, validação estrutural
  e o **interpretador de binding** (lógica pura, ideal para os vetores de
  conformance).
- **`agnostic_ui_flutter`** — o renderer: widget `TemplateRenderer`, registry de
  componentes, runtime do Dispatcher/FlowEngine, provider de tema, pull-to-refresh,
  navegação e o `SduiClient` que busca o documento no BFF.
- **`agnostic_ui_sdk`** — o host de WebView do manual, **estendido** com o switch
  `renderMode` para, no modo nativo, montar o `TemplateRenderer` em vez do WebView.

## 4. Pipeline de renderização nativo

Port direto do pipeline do manual (§4.2), em Dart:

```
documento SDUI (JSON do BFF) + contexto
        │
        ▼
parseTemplate ......... valida contra o schema gerado (agnostic_ui_contract)
        │
        ▼
detectException ....... varre o contexto por RequestResult{ success:false }
        │                 → troca para o template de erro (exception-error)
        ▼
applyBindings ......... resolve {{ ... }} + dataBind (interpretador puro)
        │
        ▼
resolveRefresh ........ habilita pull-to-refresh por templateId
        │
        ▼
compose(node) ......... node.type → builder do registry → Widget
        │
        ▼
   Widget tree nativa
```

Pontos de atenção do port:

- `parseTemplate` usa os modelos gerados; falha de schema → tela de erro
  controlada (não exceção crua).
- `compose` é recursivo sobre `body`/`children`; `children` com `dataBind`
  expande N nós (`$item`/`$index`).
- O resultado é uma árvore de `Widget` memoizável por `id` para rebuilds baratos.

## 5. Engine de data-binding

A peça de lógica mais delicada — precisa casar **exatamente** com o renderer
React (daí os vetores de conformance compartilhados). Mini-linguagem de expressão
(não `eval`), com um tokenizer/parser próprio:

| Recurso       | Exemplo                                  | Semântica                                            |
| ------------- | ---------------------------------------- | ---------------------------------------------------- |
| Path          | `{{ usuario.nome }}`                     | dot-notation sobre o `context` (map aninhado)        |
| Condicional   | `{{ validacao.success && usuario.premium }}` | booleano (`&&`, `\|\|`, `!`, igualdade) → `show`     |
| Pipe / filtro | `{{ saldo \| currency('BRL') }}`         | registry de filtros extensível (`currency`, `date`…) |
| Loop          | `dataBind: {{ portfolio.positions }}`    | gera N nós; escopo com `$item` e `$index`            |

Decisões:

- **Registry de filtros** plugável (`currency`, `percent`, `date`, `uppercase`…),
  com formatação **consciente de locale** (vem do `getEnvInfo`/tenant).
- O interpretador mora em `agnostic_ui_contract` (Dart puro) → roda nos vetores
  de conformance sem Flutter.
- **Especificação congelada no `core`**: um documento "binding spec" + vetores
  garantem que React e Flutter resolvam idêntico (números, arredondamento,
  null-safety, curto-circuito de `&&`).

## 6. Composer / registry e catálogo de componentes

`Map<String, SduiBuilder>` de `node.type` → builder `(node, props, children,
dispatch, theme) → Widget`. Tipo desconhecido → `empty-state`/placeholder +
telemetria (degradação graciosa). As ~40 famílias do manual (§4.5):

| Família           | Tipos                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Core UI           | `text`, `button`, `icon`, `input`, `row`, `container`                                                                        |
| Cards             | `card-balance`, `category-card`, `product-card`, `portfolio-card`, `catalog-card`, `information-card`, `invest-card`, `product-performance-card` |
| Headers           | `main-header`, `product-header`, `product-details-header`, `catalog-header`                                                  |
| Listas            | `list`, `product-list`, `benefit-list`, `performance-list`                                                                   |
| Especializados    | `window`, `tabs`, `pull-to-refresh`, `empty-state`, `exception-error`, `my-wallets-content`, `invest-amount`, `invest-review`, `portfolio-builder-catalog` |
| Por tenant        | `partnerco-balance-card`, `partnerco-quick-actions`, … (overlay de registry por tenant)                                      |

Adicionar componente (port do manual §9.2): criar o widget → (se reage a eventos)
ligar ao dispatcher → registrar o `type` no composer → adicionar vetores de
conformance → referenciar nos templates.

## 7. Dispatcher + FlowEngine nativo

Port do middleware-based dispatcher (§4.6) para Dart, com o mesmo `ButtonEvent`
(`{ label, type: navigate|bridge, target, event, payload }`):

```
Dispatcher.dispatch(action)
  → middlewares[0..N]           // cadeia de transformações
    → hooks.beforeDispatch
      → handle(action)
        ├─ type: "navigate" → FlowEngine.handle(target)
        └─ type: "bridge"   → NativeBridge.send(envelope)
    → hooks.afterDispatch
```

Onde o web usa CustomEvents ouvidos por wrappers do React Router, o **nativo**
mapeia os handlers do FlowEngine para a navegação Flutter (**GoRouter**
recomendado):

| Handler (manual)  | Web                          | Nativo (Flutter)                       |
| ----------------- | ---------------------------- | -------------------------------------- |
| `navigation`      | `dispatchEvent("sdui:navigate")` | `GoRouter.push(target)`             |
| `navigateFlow`    | navega com prefixo            | `push` com prefixo de fluxo            |
| `replaceCurrent`  | substitui último segmento     | `GoRouter.replace`                     |
| `back`            | `dispatchEvent("sdui:back")`  | `GoRouter.pop`                         |
| `refreshHomePage` | refresh da home               | dispara o `RefreshController` da home  |

## 8. Bridge nativa

Mesmo `Envelope`/métodos/eventos do `core`; transporte direto:

- **Métodos (antes web→nativo):** `closeWebView`, `getEnvInfo`,
  `getCustomerContext`, `openNativeShare`, `haptics` → chamadas Dart diretas
  (plugins: `share_plus`, haptics da plataforma, info de device/locale).
- **Eventos (nativo→renderer):** `tokenReady`, `themeChanged`, `customerChanged`,
  `deepLink` → expostos como `Stream<Envelope>` que o renderer assina.
- **Token:** no nativo não há `window.__APP_ACCESS_TOKEN__`; o token entra pela
  API da `EmbedView` (host nativo) e alimenta o `SduiClient`. O mesmo parser de
  marker/JWT do `core` decide sandbox vs live.

## 9. Theming por tenant

As CSS vars do manual (§3.3) viram **design tokens** Dart. O `TenantTheme`
(`primaryColor`/`secondaryColor`/`accentColor`/`backgroundColor`/`logoUrl`) é
mapeado para um `ThemeData` + um `InheritedWidget` de tokens que os widgets do
registry consomem. Componentes por tenant leem tokens do mesmo provider; o
overlay de registry resolve os `partnerco-*`.

## 10. Pull-to-refresh e exception templates

- **Pull-to-refresh:** `RefreshConfig` por `templateId` → o renderer envolve o
  conteúdo num `RefreshIndicator` que re-busca o documento/contexto no BFF
  (`SduiClient`) e re-renderiza.
- **Exception templates:** varredura do contexto por `RequestResult{ success:false }`
  → troca para o template `exception-error` com a mensagem. A regra de detecção é
  **compartilhada** (vetores de conformance) com o React.

## 11. Pré-requisito no BFF — documento SDUI por HTTP

Hoje o BFF serve páginas React + rotas de dados; **não** expõe o documento SDUI
cru. O renderer nativo depende disso. Trabalho no `next`:

1. Formalizar no `core` o **schema do documento SDUI**
   (`{ templateId, version, layout, context, refresh?, exception? }`).
2. Expor um endpoint que compõe e devolve esse documento por rota/tela, reusando
   o resolver de modo (sandbox vs live) e o mapa de erro → HTTP existentes
   (`invalid_sandbox_marker`→400, `missing_subject`→401, `tenant_mismatch`→403,
   `rate_limited`→429…).
3. `SduiClient` (Dart) busca com o bearer token, trata os profiles de mock
   (`happyPath`/`empty`/`error`/`slow`) e mapeia erro HTTP → exception template.

> Decisão de produto a confirmar: o endpoint compõe um documento **por tela** ou
> um **catálogo de telas** por tenant? O plano assume **por tela/rota**, alinhado
> à árvore de rotas atual do BFF.

## 12. Estratégia de testes

- **Conformance cross-renderer (núcleo):** corpus de vetores no `core` (template +
  contexto → árvore resolvida/golden). React e Flutter rodam o **mesmo** corpus;
  divergência = falha de CI. Cobre binding, dataBind, exception, condicionais.
- **Unit (Dart puro):** interpretador de binding, parser de template, FlowEngine,
  bridge (transporte fake). Em `agnostic_ui_contract` — rápidos, sem Flutter.
- **Widget/golden:** cada família de componentes com golden tests por tema de
  tenant (regressão visual).
- **Integração:** `SduiClient` contra um BFF mock (profiles); fluxo de navegação
  ponta a ponta.
- **Drift de contrato:** `gen:check` do JSON Schema → Dart (espelha `gen:di:check`).
- **E2E (playground):** o app de referência dirige sandbox por marker
  (`app_sandbox_<tenant>_<profile>`) e valida telas inteiras.

## 13. Milestones

| Milestone | Conteúdo                                                                                          | Saída                                  |
| --------- | ------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **M0**    | Scaffold: melos + CI Dart, `agnostic_ui_contract`, codegen JSON Schema→Dart, check de drift       | Pacotes vazios buildando, contrato gerado |
| **M1**    | Engine de binding + pipeline + registry core (6 componentes) + 1 tela ponta a ponta contra mock   | Slice vertical renderizando            |
| **M2**    | Bridge nativa + Dispatcher/FlowEngine + `EmbedView(renderMode:)` + `SduiClient` + BFF doc endpoint | Navegação e dados reais                |
| **M3**    | Catálogo: famílias Cards + Headers + Listas                                                        | ~22 componentes                        |
| **M4**    | Especializados + pull-to-refresh + exception + theming + componentes por tenant                   | Catálogo completo                      |
| **M5**    | Playground (Yuki Labs Playground), E2E, golden suite, publish no pub.dev                           | Pronto para distribuição               |

O slice vertical (M1) é deliberadamente cedo — derisca o engine de binding e o
pipeline antes de investir nos ~40 widgets.

## 14. Riscos e mitigação

| Risco                                                              | Severidade | Mitigação                                                                       |
| ----------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| Drift de contrato TS↔Dart                                         | Alta       | JSON Schema gerado + `gen:check` no CI + vetores de conformance                  |
| Semântica de binding divergir do React                            | Alta       | Spec congelada no `core` + corpus golden rodado pelos dois renderers            |
| BFF ainda não emite documento SDUI                                | Alta       | Tratado como pré-requisito em M2; schema do documento no `core` primeiro        |
| ~40 componentes = escopo grande                                   | Média      | Registry + famílias incrementais + fallback gracioso (tela nunca quebra)        |
| Paridade React↔Flutter degrada com o tempo                        | Média      | React = renderer de referência; DoD exige paridade ou "não-suportado" explícito |
| Componentes por tenant exigem release do app (tradeoff do nativo) | Média      | Documentado no ADR; overlay de registry + contrato de extensão claro            |
| Dart no monorepo pnpm/Turbo                                       | Baixa      | melos isolado; Turbo só dispara o pipeline Dart; sem misturar no workspace pnpm |

## 15. Definition of Done (por componente/feature)

- [ ] Tipado e testado (unit + widget/golden quando há UI).
- [ ] Vetores de conformance adicionados ao `core` e **verdes nos dois renderers**.
- [ ] `analyze`, `test`, `gen:check` e build (Dart + JS afetado) verdes.
- [ ] Paridade com o React **ou** marcação explícita de "não suportado no nativo".
- [ ] Docs atualizadas no mesmo PR (este plano / catálogo de componentes).
- [ ] PR pequeno, escopo de UMA feature; sem dependência nova não aprovada.
