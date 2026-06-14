# Canvas spec — editor visual de flow (React Flow)

> **Status: previsto, não implementado.** Esta etapa adiciona um placeholder
> (`apps/builder/src/flows/FlowCanvasPlaceholder.tsx`); a dependência
> `@xyflow/react` e o canvas em si vêm numa wave seguinte. Nada aqui altera
> lógica/contratos (brief §4).

## Objetivo

Editar um flow como **grafo de nós** — uma alternativa visual à aba _Editor_
(formulário). As duas visões operam sobre o **mesmo** `FlowDraft`; o canvas é só
apresentação + reordenação.

## Modelo

- **Nós = passos.** Cada `StepDef` (`validate`, `call-integration`,
  `compose-template`, `branch`, `emit-event`) vira um nó tipado. `trigger` e
  `output` são nós fixos de borda (entrada e saída).
- **Arestas = ordem de execução.** A sequência linear de `flow.steps[]` é a
  cadeia principal. Um nó `branch` emite **uma aresta por `case`**, cada uma
  rotulada com a expressão `when`; os `steps` aninhados de um case formam um
  sub-grafo.
- **Layout automático** com `dagre` (top-down). Sem posições persistidas no
  config — a posição é derivada da ordem, então o canvas e o formulário nunca
  divergem.

## Interações

| Ação no canvas                          | Efeito no `FlowDraft`                   |
| --------------------------------------- | --------------------------------------- |
| Arrastar nó para nova posição na cadeia | reescreve a ordem de `flow.steps[]`     |
| Selecionar nó                           | abre o **mesmo** sub-form da aba Editor |
| Adicionar nó (paleta)                   | `emptyStep(op)` anexado / inserido      |
| Remover nó                              | remove o step correspondente            |
| Conectar `branch` → step                | adiciona/edita um `case`                |

## Validação

Reusa `validateFlow()` (sem alterá-lo). Cada issue (`path` → nó) marca o nó com
borda destrutiva; o hover mostra a mensagem. O publish continua **fail-closed**:
erros do servidor aparecem via toast, idêntico ao formulário.

## Fronteira

- Fonte única de verdade: `FlowDraft`. O canvas **não** introduz novo estado de
  domínio nem novos contratos HTTP.
- Componentes: `@xyflow/react` para o grafo; nós custom em shadcn/ui; painel
  lateral reaproveita os sub-forms já existentes.
- Sem mudança em `api/`, `auth/`, `flowModel.ts`, `env.ts` ou exports de
  `packages/*`.
