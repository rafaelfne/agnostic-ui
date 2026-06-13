---
'@yukilabs/agnostic-ui-engine': minor
---

Fase A do meta-engine (ADR 0002): novo pacote `@yukilabs/agnostic-ui-engine` com
o núcleo do interpretador, puro e 100% testado.

- **Schemas Zod** dos primitivos de config: `FlowDefinition`, `StepDef` (union
  discriminada dos operadores), `TriggerDef`, `IntegrationDefinition`,
  `EventDef`/`SubscriptionDef`, `HookDef` e `ScreenDef` (reusa `TemplateNode`).
- **Interpretador** `runFlow` sobre contexto tipado: fase de input, execução de
  steps com guard `when`, avaliação da expressão de output e classificação de
  erro agnóstica a HTTP (`kind`/`code`).
- **Operadores** `validate`, `call-integration`, `compose-template`, `branch` e
  `emit-event` num registry fixo, atrás das ports `IIntegrationRunner`/`IEventBus`.
- **Avaliador de expressão seguro** (AST restrita, sem `eval`): acesso a caminho
  protegido, funções curadas, compat com o `{{ ... }}` do SDUI.
- **Provas de paridade**: `GetBalance` (data-flow) e a tela de invest
  (`compose-template`) reproduzidas contra o mock, reusando os perfis.
