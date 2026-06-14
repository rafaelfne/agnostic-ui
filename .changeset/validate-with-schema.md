---
'@yukilabs/agnostic-ui-engine': minor
---

O operador `validate` passa a validar contra um **schema Zod referenciado**
(`StepDef.validate.schema`), resolvido por nome via `EngineServices.schemas`
(`SchemaResolver`, injetado por `runFlow({ schemas })`). `ValidationError` carrega
as `issues` (path/message) para o host renderizar a mensagem de erro; o engine
segue agnóstico aos schemas (o host os registra).
