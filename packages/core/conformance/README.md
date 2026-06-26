# Vetores de conformance (cross-renderer)

Corpus **renderer-agnóstico** que prova paridade semântica de data-binding e
composição entre os renderers React (`@yukilabs/agnostic-ui-react`) e Flutter
(`agnostic_ui_flutter`) — ADR 0005 §2.

Cada vetor (`vectors/*.json`) tem o formato (Zod em
[`../src/conformance/vector.ts`](../src/conformance/vector.ts)):

```jsonc
{
  "name": "path-binding",
  "description": "…",
  "template": {
    /* TemplateNode com bindings {{ ... }} */
  },
  "context": {
    /* dados */
  },
  "expected": {
    /* TemplateNode resolvido */
  },
}
```

## Estado (F1.6 — esqueleto)

- **TS:** `packages/core/src/__tests__/conformance.test.ts` carrega os vetores e
  valida o **formato** contra o schema.
- **Dart:** `dart/packages/agnostic_ui_contract/test/conformance_test.dart`
  carrega os **mesmos** arquivos e valida a estrutura.

A execução do binding (resolver `template` + `context` e comparar com `expected`)
é ligada quando a gramática rica existir — F1.A.5 (engine/React) e F2 (Dart). Até
lá, os runners garantem que o corpus está bem-formado e é lido pelos dois lados.
