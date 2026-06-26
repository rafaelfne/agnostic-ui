# Catálogo de componentes nativo

Tipos que o renderer Flutter (`agnostic_ui_flutter`) resolve por padrão
(`createDefaultRegistry`). Cada `type` mapeia para um builder que lê as **props já
resolvidas** (binding aplicado no `resolveTemplate`). Tipo desconhecido cai em
fallback gracioso (placeholder + telemetria) — a tela nunca quebra.

## Core UI (F2)

| `type`      | Props principais         |
| ----------- | ------------------------ |
| `text`      | `value`                  |
| `button`    | `label`, `action?`       |
| `icon`      | `name`                   |
| `input`     | `placeholder`            |
| `row`       | — (arranja `children`)   |
| `container` | — (empilha `children`)   |

## Cards (F6)

`card-balance` (`label`,`amount`) · `category-card` (`title`,`icon`) ·
`product-card` (`name`,`description?`,`price?`) · `portfolio-card`
(`name`,`value`,`change?`) · `catalog-card` (`title`,`subtitle?`) ·
`information-card` (`title`,`body`) · `invest-card` (`title`,`cta?`,`action?`) ·
`product-performance-card` (`name`,`performance`).

## Headers + Listas (F7)

Headers: `main-header` · `product-header` · `product-details-header` ·
`catalog-header` (título + apoio). Listas (arranjam `children`, expandidos por
`dataBind`): `list` · `product-list` · `benefit-list` · `performance-list`.

## Especializados (F8) + exceção (F9)

`window` · `tabs` (stateful) · `empty-state` · `my-wallets-content` ·
`invest-amount` (input) · `invest-review` (despacha `action`) ·
`portfolio-builder-catalog` · `exception-error` (`message`).

## Binding e ações

- **Binding** `{{ ... }}` nas props: paths, comparações, `&&`/`||`/`!`, ternário,
  pipes (`{{ x | currency('BRL') }}`) e interpolação. Mesma gramática do engine
  TS (provada por vetores de conformance compartilhados).
- **`dataBind`** num nó expande-o por item de um array, com `$item`/`$index`.
- **`action`** (prop): `ActionDef` despachado pelo `NativeDispatcher` via
  `SduiScope` — `navigate`/`navigateFlow`/`replaceCurrent`/`back`/
  `refreshHomePage`/`bridge`.

## Overlay por tenant

`createDefaultRegistry().withOverrides(partnercoOverlay)` adiciona/sobrescreve
componentes `partnerco-*` sem tocar o catálogo base. Componentes lêem o tema do
tenant via `SduiScope.themeOf`.
