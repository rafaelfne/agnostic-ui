# ADR 0006 — Plataforma extensível: vocabulário governado por contratos + IA como editor de config

- **Status:** Proposto
- **Data:** 2026-06-25
- **Contexto da fase:** nova trilha — de "plataforma config-driven com builder
  no-code" (ADR 0002/0004) para **plataforma extensível por terceiros e editável
  por IA**. Abre novas fases sobre as Fases A–E já entregues.
- **Camada afetada:** `@yukilabs/agnostic-ui-engine` (registry de operadores →
  modelo de extensão governado), `@yukilabs/agnostic-ui-core` (contratos +
  corpus de conformância), `@yukilabs/agnostic-ui-next` (grant/sandbox de
  capabilities, API do builder), `apps/builder` (IA-como-editor), os dois
  renderers (`react` + Flutter) via registry namespaced.
- **Relacionado:** estende o [ADR 0002](0002-meta-engine-config-runtime.md)
  (config em runtime, vocabulário de operadores fechado), o
  [ADR 0005](0005-flutter-native-sdui-renderer.md) (corpus de conformância
  nos dois renderers §2, overlay de registry por tenant §6), o
  [ADR 0003](0003-infraestrutura-local-e-conectores.md) (conectores/secret-ref/
  anti-SSRF) e o [ADR 0004](0004-builder-no-code.md) (builder). Consolida o
  direcional em [`docs/direcional-construtor-apps-ia.md`](../direcional-construtor-apps-ia.md)
  e o sketch em [`docs/sketches/operator-capability-contract.sketch.ts`](../sketches/operator-capability-contract.sketch.ts).

## Contexto

As Fases A–E entregaram a base config-driven: um **engine agnóstico** que
interpreta config (`packages/engine`), um **config store** append-only com
draft/publish fail-closed (`packages/next/src/infra/store`), **conectores**
REST/GraphQL seguros (`packages/next/src/infra/connectors`), um **renderer React**
(`packages/react`), um **renderer Flutter** nativo proposto (ADR 0005) e
um **builder no-code** dirigido por schema (ADR 0004). A config é a fonte da
verdade; os editores (visual, manual) escrevem nela e passam pelo mesmo portão de
validação.

Duas coisas que esse desenho **ainda não resolve**, e que a virada de produto
exige:

1. **O vocabulário é fechado _e_ vive no código do core.** O registry de
   operadores é um mapa fechado por design — `buildDefaultRegistry()` em
   `packages/engine/src/operators/operator.ts` documenta: _"não há registro
   dinâmico em produção — auditar essa função audita o vocabulário inteiro"_ — e
   `StepDef` (`packages/engine/src/schemas/step.ts`) é uma union discriminada com
   `op` literal. Isso é ótimo para segurança (sem `eval`), mas significa que
   **adicionar um operador ou um componente exige PR + release no core**. Quando a
   IA ou um usuário bate na borda do vocabulário, recria-se exatamente o gargalo do
   low-code (a fechadura "schema fechado" do Bubble).

2. **Open source inverte o risco de _lock-in_ para _fragmentação_.** Com runtime
   livre, qualquer um self-hosta — o lock-in some. Mas sem um modelo de extensão
   governado, operadores/componentes de terceiros forkam o vocabulário em dialetos
   incompatíveis: a config perde portabilidade e a IA alucina contra dialetos
   diferentes. O ativo a proteger deixa de ser o código e passa a ser a
   **coerência** (a especificação).

Esta ADR registra **como abrir o vocabulário sem perder a segurança** e **como a
IA entra como editor**, construindo sobre 0002/0005/0004. É decisão
arquitetural (toca a fronteira de segurança do engine e o shared kernel) — logo,
registrada (guardrail do CLAUDE.md).

## Decisão

### 1. A IA é **só mais um editor de config** — nunca gera código

O caminho é `prompt → proposta de config → mesmo portão fail-closed (Zod +
dry-run) dos editores visual e manual`. A IA produz uma **proposta versionada e
revisável**, nunca o app final. Não há "penhasco de handoff" porque não há
handoff: os três editores manipulam o mesmo artefato (a config no store) e passam
pelas mesmas regras. A inversão central: a IA gera **config contra um schema
fechado**, não **código contra uma linguagem aberta** — uma geração errada é
**barrada pelo schema antes de subir**, não descoberta em produção.

### 2. Triagem antes de extensão (o primeiro trabalho da IA é **não** criar primitivo)

Antes de propor qualquer extensão, a IA precisa provar que o pedido **não** é:
(a) composição do vocabulário existente, (b) uma `IntegrationDefinition` nova
(dado externo já é config — ADR 0003), ou (c) uma expressão na AST segura
(`packages/engine/src/expression`). Só o resíduo irredutível vira extensão. Manter
`core.*` pequeno é o que mantém a IA confiável.

### 3. Três tiers de extensão, por **raio de explosão** (não por autor)

| Tier                               | O que é                           | Restrições                                                                                          | Cerimônia                                              |
| ---------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Composição** (config)            | Rearranjo do vocabulário validado | Confiança total; roda em todo lugar. Habitat da IA (~90%)                                           | Nenhuma                                                |
| **Componente** (view sandbox)      | Widget novo, **só renderização**  | Sem I/O, sem segredo, sem egress. Contrato = props schema (Zod) + sandbox de render                 | **Mínima** — dev do tenant publica sem revisão do core |
| **Operador** (primitivo do engine) | Semântica nova de fluxo           | **Não é código livre no registry.** Declara capabilities + efeitos; o engine concede só o declarado | **Pesada** — toca a fronteira de segurança             |

A cerimônia **escala com o raio**. Tratar componente como operador mata a adoção
OSS; tratar operador como componente fura a segurança.

### 4. Operadores e componentes viram **contratos declarativos**, não entradas de código no registry

Hoje o `OperatorRegistry` é `{ [op]: handler }` fechado e o `ComponentRegistry`
(`packages/react/src/registry.ts`) é `Record<string, SduiComponent>`. A virada
generaliza ambos para um **registry governado por contrato**:

- O **contrato é dado serializável** — a IA, o builder e o validador raciocinam
  sobre ele **sem executar** o código da extensão.
- A **implementação é um pacote de código à parte**, ligada ao contrato por `ref`
  (namespace + name + version) e checada por **conformância** no build.

O `OperatorContract` declara `input`/`output` (serializável), **capabilities**
(`pure`, `integrations`, `secrets`, `emits`, `limits`) e **efeitos** (`reads`/
`writes`, `idempotent`, `reversible` + `compensation`). O `ComponentContract`
declara o **props schema (Zod)** e roda num **sandbox render-only**. O esboço
executável está em
[`docs/sketches/operator-capability-contract.sketch.ts`](../sketches/operator-capability-contract.sketch.ts).

> O props schema **é a interface da IA**: a IA configura qualquer componente
> lendo seu schema, e no instante em que um dev registra um componente novo a IA
> já o usa — sem retrain, sem mexer no core. Cada componente aumenta de graça o
> que a IA monta. O `createRegistry(base, custom)` que já existe no `react` é a
> semente do overlay; falta o contrato de props + o sandbox + o namespacing.

A propriedade de segurança do registry fechado **é preservada, não descartada**:
o que era "auditar `buildDefaultRegistry`" passa a ser "auditar o contrato + a
conformância + o sandbox". O `op` do `StepDef` deixa de ser uma literal fechada e
passa a aceitar `ref` namespaced governado por contrato.

### 5. Trust tier é **derivado** das capabilities/efeitos, nunca declarado

`safe` / `sensitive` / `critical` são computados do contrato, não num campo manual
que poderia mentir: `reversible:false → critical` (exige **pré-flight humano**,
reusando o guardrail de ação irreversível do CLAUDE.md); usa `integrations`/
`secrets → sensitive`; `pure → safe`. **O mesmo contrato gera o resumo de revisão
humana** (tier, egress, secrets, irreversível, o que escreve) — um diff de
_intenção_, não um muro de JSON. **O modelo de extensão é o modelo de segurança da
IA:** uma única declaração policia o runtime, instrui a IA e alimenta a revisão.

### 6. Capabilities **reusam a infra existente** — sem egress cru

Um operador **não abre socket**. Ele referencia uma `IntegrationDefinition`
(`integrations: [ref]`), reusando os runners e o egress-guardian/anti-SSRF/
secret-ref já prontos (`RestIntegrationRunner`, `GraphqlIntegrationRunner`,
ADR 0003) em vez de abrir um segundo caminho de saída. O engine roda a extensão
num **sandbox que só expõe o concedido**; acesso não declarado lança exceção
imediata.

### 7. Registry **namespaced** (`core.*` vs `<tenant>.*`), nos dois renderers

Generaliza o "overlay de registry por tenant" do ADR 0005 §6 para
**operadores e componentes**, em React **e** Flutter. `core.*` é pequeno e
RFC-gated; extensões de tenant são pacotes **namespaced**, instaláveis por tenant,
com proveniência explícita. A IA gera contra `core.*` primeiro e só alcança o
namespaced quando o tenant o declarou.

### 8. **Conformância é o ativo anti-fragmentação** — a spec é o produto

Eleva o corpus de conformância do ADR 0005 §2 (que já roda nos dois
renderers) de "os dois renderers concordam" para **"a especificação pública + o
portão de certificação"**. Cada operador/componente **traz o próprio oráculo**
(fixtures). O corpus do `core` se estende para cobrir operadores (input → efeito/
output) e componentes (props + contexto → árvore resolvida), nos dois renderers.
Implementação que passa a suíte é **"compatível"**; extensão que traz os próprios
fixtures é **"certificada"**; em modo estrito o engine **recusa carregar** o não
certificado. Ciclo de vida: extensão namespaced → provada em uso → RFC → **gradua**
para `core.*`. É assim que se estende sem fragmentar.

## Escopo de implementação (as fases que isto abre)

Sequenciado em [`docs/plano-virada-extensivel-ia.md`](../plano-virada-extensivel-ia.md):

- **Fase G — Modelo de extensão:** contratos no `core`; registry de operadores
  governado/namespaced no `engine`; grant + sandbox de capabilities no `engine`/
  `next`; derivação de trust-tier + review summary.
- **Fase H — Conformância como spec (cross-renderer):** elevar/estender o corpus do
  `core` para operadores + componentes nos dois renderers; suíte pública +
  certificação; CI gates. **Co-urgente com a construção do renderer Flutter.**
- **Fase I — IA como editor:** prompt → proposta → portão; triagem-primeiro;
  revisão por diff de intenção no builder; a IA gera contra os contratos/props
  schemas namespaced.

## Decisões em aberto

1. **Representação serializável de `input`/`output`.** **Resolvida: JSON Schema**
   (padrão; **e já consistente com o `Zod → JSON Schema` que o ADR 0005 adota para
   o codegen Dart** — forte puxão por coerência), em vez de um DSL Zod-as-data.
   Destrava o resto.
2. **Binding contrato↔implementação** e o check de conformância no build.
3. **Tecnologia do sandbox** do operador não-`pure` (isolate / worker / wasm) —
   define o custo real de "operador" e, portanto, quão raro ele precisa ser.
4. **UX da revisão da proposta da IA** (o diff de intenção) no builder.
5. **Enforcement do sandbox render-only** do componente, por renderer.

## Consequências

- **`engine`:** o registry fechado vira governado/namespaced; `op` do `StepDef`
  passa a aceitar refs; nova camada de grant + sandbox. A propriedade "sem `eval`,
  vocabulário auditável" é preservada pelo par contrato+conformância.
- **`core`:** passa a abrigar os contratos de extensão **e** o corpus de
  conformância público — vira o guardião da coerência (o ativo OSS).
- **`next`:** enforcement de capabilities em runtime; a API do builder ganha os
  endpoints do IA-editor.
- **`apps/builder`:** nova superfície IA-editor (prompt → proposta → portão).
- **Renderers:** registry namespaced; ambos obrigados a passar o corpus
  compartilhado (React continua o renderer de referência — 0005 §6).
- **Governança nova:** processo RFC para `core.*` e certificação para extensões —
  overhead de processo assumido em troca de não fragmentar.
- **Segurança:** a declaração de capability + sandbox é superfície nova a endurecer;
  mas least-privilege + trust-tier derivado + pré-flight a fortalecem.
- **OSS:** suíte de conformância + registry namespaced são o que mantém o
  ecossistema coerente — disciplina de produto a defender todo release. Licença OSS
  (ADR 0002) segue bloqueante antes de release público.
- **Risco aceito:** expressividade vs. validável é tensão permanente — resistir a
  inchar operadores; preferir composição/expressão (Decisão §2).

## Alternativas consideradas

- **Manter o vocabulário fixo no core (status quo):** rejeitado — recria o gargalo
  low-code; toda extensão vira PR + release no core, e a IA/usuário trava na borda.
- **Terceiros adicionam operadores como código livre no registry:** rejeitado —
  traz de volta a superfície infinita do vibe coding e o risco de segurança; daí o
  contrato declarativo + sandbox + conformância.
- **IA gera código (vibe coding):** rejeitado — colapso estrutural após o MVP
  (superfície infinita, validação tardia, penhasco de handoff); detalhado no
  direcional.
- **Fork por tenant em vez de extensão namespaced:** rejeitado — fragmentação,
  config não portável, IA alucinando contra dialetos.
- **Egress cru nos operadores:** rejeitado — reusa `IntegrationDefinition` +
  allowlist/secret-ref já existentes; um segundo caminho de saída seria superfície
  de ataque redundante.
- **Trust tier declarado à mão:** rejeitado — um campo manual mente; derivar das
  capabilities/efeitos garante que o tier reflete o que a extensão realmente faz.
