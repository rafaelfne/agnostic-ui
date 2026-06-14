# Plano — Meta-engine de cenários

Documento de planejamento da virada de **BFF white-label de vertical financeiro**
para uma **plataforma de cenários dirigida por configuração**, com builder no-code.
Ainda é planejamento: nada aqui foi implementado. Quando uma decisão aqui virar
permanente, ela deve ser promovida a um ADR em `docs/adr/`.

## 1. A virada

Hoje o **engine** e a **lógica financeira são o mesmo código**: os use cases
(`GetBalanceUseCase`, `PostInvestAmountUseCase`, …), controllers, gateways e a
composição SDUI vivem como TypeScript. Cada cenário novo é código novo.

A meta é separar em duas coisas que hoje estão fundidas:

1. um **engine de execução agnóstico** que não sabe nada de finanças — ele só
   sabe ler configuração validada e executá-la;
2. **configuração declarativa** que descreve um vertical (fluxos, integrações,
   eventos, telas).

Os 18 use cases financeiros de hoje deixam de ser "o produto" e passam a ser o
**primeiro conjunto de configuração** — a implementação de referência que prova
o engine. O produto passa a ser o engine + o builder.

## 2. Decisões travadas

Quatro bifurcações foram decididas e governam todo o resto do plano:

| Eixo         | Decisão                                          | Consequência                                                                                                                                                                                 |
| ------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Execução     | **Interpretada em runtime**                      | Engine tipado lê config validada por Zod e executa via registry fixo de operadores. Editável sem redeploy. Sem `eval`, sem código arbitrário.                                                |
| Público      | **No-code para não-devs já**                     | Builder de expressões visual, validação rica e UX de primeira são requisito desde o início — é o item que mais eleva o esforço.                                                              |
| Store        | **Supabase (Postgres) com draft/publish/versão** | A interface escreve no store; o runtime lê a versão publicada; rollback por versão; publish é fail-closed. Acesso via Drizzle (Postgres puro) atrás de uma port — ver §4.1.                  |
| Escopo       | **Backend + telas SDUI**                         | Um builder único cobre fluxo de dados (use cases/integrações/eventos/hooks/triggers) **e** a árvore de `TemplateNode` da tela.                                                               |
| Distribuição | **Open source sempre; self-host first-class**    | O Supabase é OSS e self-hostável, então não compromete a promessa. Qualquer um sobe um stack idêntico com `supabase start`. Um SaaS gerenciado pode existir por cima, mas o núcleo é aberto. |

## 3. Arquitetura em camadas

Quatro camadas, dependência sempre apontando para dentro — a mesma regra da Clean
Architecture que o BFF já segue.

```
Builder no-code (apps/builder, React)
  editor de flows · editor de telas SDUI · wizard de integração · simular (mock)
        │  escreve e lê config validada por Zod
Config store + API   (draft / publish / versão · por tenant · rollback)
        │  runtime carrega a config publicada
Engine agnóstico (@yukilabs/agnostic-ui-engine)
  interpretador de flow · operadores (registry) · expressões seguras ·
  event bus · pipeline de hooks · resolução de trigger · compositor SDUI
        │  via ports
Conectores (integration runtime)
  REST / GraphQL / Mock · secret por referência · allowlist/SSRF · fronteira Mock↔Core
```

O BFF `next` atual deixa de hospedar use cases hardcoded e passa a ser o **host
do runtime**: carrega a config publicada, resolve triggers HTTP por uma rota
catch-all e executa tudo através do engine. A Clean Architecture é preservada — o
engine é `domain` + `application` (genéricos), os conectores são `infra`, as
rotas do `next` são `interface`.

## 4. Modelo de configuração (o coração)

Cada primitivo vira um **schema Zod** versionado e validado, guardado no store. O
builder é, no fundo, um editor CRUD/grafo sobre esses schemas — **desenhar os
schemas é a maior parte do trabalho**. Esboço (pseudo-tipos, não final):

### Integração — o conector declarativo

A versão genérica do `CoreHttpGateway` de hoje. Em vez de uma classe por gateway,
uma definição de dados:

```ts
IntegrationDefinition {
  id, name,
  kind: 'rest' | 'graphql' | 'mock',
  baseUrlRef,                         // referência, nunca URL inline em segredo
  auth: { type, secretRef },          // segredo por referência, nunca embutido
  operations: [{
    id, method, path,
    input:  SchemaRef,                // Zod schema do request
    output: MappingExpr,              // mapeia a resposta crua → forma de domínio
  }],
  security: { allowlistRef, timeoutMs, retries },
}
```

### Flow — o use case

```ts
FlowDefinition {
  id, name,
  trigger: TriggerRef,
  input:   SchemaDef,
  steps:   StepDef[],                 // executados em ordem / com desvio
  output:  TemplateRef | CompositionExpr,
  emits:   EventRef[],
}
```

### StepDef — o vocabulário de operadores

Uma **union discriminada** — o conjunto fechado e auditado de operações que o
engine sabe executar. Esse conjunto é o que mantém o sistema seguro sem `eval`:

```
call-integration · transform · branch · foreach · validate
compose-template · emit-event · call-flow · delay · guard
```

Cada passo lê do **contexto de execução** tipado (as saídas dos passos
anteriores) por expressão, e escreve a própria saída de volta no contexto. Essa é
a camada de binding.

### Trigger, Evento, Hook

```ts
TriggerDef {
  kind: 'http' | 'event' | 'schedule' | 'bridge-action',
  // http     → { method, path }  registra uma rota automaticamente
  // event    → { eventName }     assina um evento
  // schedule → { cron }
}

EventDef       { name, payload: SchemaDef }
SubscriptionDef{ event: EventRef, flow: FlowRef }

HookDef {
  phase: 'before' | 'after' | 'onError',
  scope: 'global' | 'flow' | 'step',
  when:  Expr,                        // condição opcional
  action: BuiltinHook | FlowRef,      // auth, rateLimit, cache, log, metrics, transform
}
```

O **hardening atual de JWT e rate-limit deixa de ser código especial e vira hook
embutido** (`auth`, `rateLimit`) — aplicável por config, com o mesmo
comportamento fail-closed / fail-open do ADR 0001.

### Tela SDUI

A árvore de `TemplateNode` já é declarativa; agora ela passa a ser **editável** e
ligada a um flow para os dados:

```ts
ScreenDef {
  id, route,
  root:     TemplateNode,             // a árvore da tela
  dataFlow: FlowRef,                  // o flow que alimenta a tela
}
```

### Expressão — a linguagem segura

A cola entre tudo, estendendo o `{{...}}` que o SDUI já usa. Para um público
não-dev e para respeitar os guardrails de segurança, a expressão **não pode ser
JS arbitrário**: é uma AST restrita (estilo JSONLogic) — acesso a caminho,
comparações, aritmética, formatação, condicionais e uma biblioteca curada de
funções. **Zero `eval`.** No builder, ela é montada por um construtor visual de
expressões, não digitada como código.

### 4.1. Banco e config store — Supabase (Postgres)

O store é **Supabase**, escolhido porque é OSS e self-hostável — coerente com a
decisão de manter o projeto aberto. Por baixo é Postgres puro, então a camada de
acesso (**Drizzle**, com `drizzle-zod` fazendo a ponte para os schemas do engine)
fala SQL padrão e fica atrás de uma port `IConfigStore`. Resultado: dá para rodar
em Supabase hospedado, Supabase local em Docker, ou Postgres pelado, sem o engine
perceber a diferença.

Esboço do schema (append-only para versionamento):

```
config_artifact (id, tenant_id, kind, slug, created_at)
config_version  (artifact_id, version, status: 'draft'|'published',
                 body jsonb, created_at, published_at)
```

Cada artefato (flow, integração, tela, evento, hook) tem N versões; "published" é
um ponteiro por artefato/tenant; rollback = apontar para uma versão anterior.

Os extras do Supabase entram **opt-in, nunca como dependência dura**:

- **RLS (Row-Level Security)** por `tenant_id` — isolamento de tenant aplicado no
  banco, não só na aplicação.
- **Auth** — authz de quem edita/publica no builder, atrás de uma port `IAuthz`.
- **Realtime** — colaboração ao vivo / preview reativo no builder (fase tardia).
- **Vault** — secret store para as credenciais referenciadas pelas integrações.

As **migrations (schema + políticas RLS) ficam versionadas no repo** — é
pré-requisito do open source: qualquer pessoa sobe um stack idêntico com
`supabase start`. O runtime lê a versão publicada com cache (reaproveitando o
Upstash Redis opcional que o BFF já suporta, ou um LRU em memória por
tenant+artefato+versão).

## 5. O superpoder do "simular"

Os **markers de sandbox** (`app_sandbox_<tenant>_<profile>`) e os perfis de mock
(`happyPath` / `empty` / `error` / `slow`) **já existem**. Eles transformam o
no-code em algo viável: o não-dev monta um flow ou tela, clica em "Simular", o
engine roda contra o gateway mock no perfil escolhido e o SDUI renderizado
aparece na hora — sem nunca tocar o Core real. É preview instantâneo de graça,
reaproveitando infra que já está pronta e testada.

## 6. Migração — strangler-fig

Nada de big-bang. O vertical financeiro existente é migrado fluxo a fluxo,
usando os 177 testes atuais como **oráculo de regressão**:

1. Construir engine + schemas; expressar **`GetBalance`** como `FlowDefinition`.
2. Adicionar uma rota servida pelo engine ao lado da hardcoded; assertar
   **paridade** de resposta contra os testes existentes.
3. Migrar em ondas (catalog → invest → portfolio-builder). Cada migração apaga TS
   hardcoded e adiciona config equivalente.
4. Quando os 18 estiverem em config, remover use cases/controllers hardcoded; o
   `next` fica só com o host do engine + os conectores genéricos.

A cada onda, a suíte verde prova que o engine reproduz o comportamento anterior.

## 7. Segurança (elevada pelo no-code + config em banco)

Tirar a lógica do código e botar URLs e regras numa UI **aumenta** a superfície de
ataque. Não-negociáveis:

- **Sem `eval` / sem código arbitrário** — só o registry de operadores e a AST de
  expressão restrita.
- **Segredos por referência** — a config nunca guarda credencial, só uma
  referência a um secret store (Supabase Vault ou env, atrás de uma port). O
  guardrail "nunca commitar segredos" estende-se para "nunca persistir segredo no
  config store" — ainda mais crítico num repo público.
- **Allowlist de egress / anti-SSRF** — integrações só chamam hosts liberados.
  Crítico agora que a URL vem de uma interface.
- **Fronteira Mock↔Core** preservada por requisição (guardrail atual).
- **Publish fail-closed** — o draft pode estar quebrado; o publish roda validação
  Zod completa + um dry-run de simulação antes de liberar.
- **Isolamento por tenant** — aplicado no banco via RLS (`tenant_id`), não só na
  aplicação; o flow de um tenant não lê config de outro.
- **Authz no builder** — quem pode editar e quem pode publicar.

## 8. Riscos e problemas difíceis (honestos)

- **No-code desde o dia 1 é o maior risco.** Ele multiplica o trabalho de UX,
  validação e segurança. Um engine tipado para devs é da ordem de um trimestre;
  um builder no-code polido para não-devs em cima dele é múltiplos disso.
  Recomendação de sequenciamento: construir o engine e um builder _interno e
  cru_ primeiro, fechar o loop ponta-a-ponta com o vertical financeiro, e só
  então investir no polimento no-code. (Mesmo tendo escolhido no-code-já, vale
  separar "engine funcionando" de "UX para leigos" em fases distintas.)
- **Construtor visual de expressões** é um projeto dentro do projeto.
- **Versionamento dos próprios schemas** — quando o schema do engine evolui, as
  configs já salvas precisam migrar. Exige versão de schema de config + migrações.
- **Depurabilidade** — flow interpretado é mais difícil de debugar que código.
  Precisa de trace de execução / log passo-a-passo exposto no builder.
- **Performance** — overhead de interpretação; mitigar com plano de flow
  compilado/cacheado por versão publicada.
- **Type-safety na borda** — Zod valida em runtime, mas o builder precisa
  mostrar erros de tipo em tempo de edição, derivados dos schemas.

## 9. Roadmap

A virada é estratégica, então entra como uma nova trilha de fases. A antiga
"Fase 2 (react renderer)" é reordenada porque o renderer agora é pré-requisito do
builder.

| Fase                           | Entrega                                                                                                                                                                                                     | Pacote / área                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| A — Engine core                | Schemas Zod de todos os primitivos + interpretador + avaliador de expressão seguro + event bus + pipeline de hooks. Puro, 100% testado, sem UI.                                                             | `@yukilabs/agnostic-ui-engine` (novo) |
| B — Host + conectores          | Integrar engine no `next`; conectores REST/GraphQL/Mock genéricos com allowlist/secret-ref; roteamento catch-all de trigger; config store (banco) com draft/publish/versão. Migrar `GetBalance` como prova. | `next` + store                        |
| C — Migrar vertical financeiro | Mover os 18 use cases para config; remover TS hardcoded; 177 testes verdes via engine.                                                                                                                      | `next` + config                       |
| D — Renderer SDUI              | O pacote `react` (renderer, data-binding, FlowEngine client) — necessário para renderizar telas e para o preview do builder.                                                                                | `@yukilabs/agnostic-ui-react`         |
| E — Builder                    | Editor de grafo de flow, editor de árvore SDUI, wizard de integração, simular ao vivo.                                                                                                                      | `apps/builder` (novo)                 |
| F — Polimento no-code          | Construtor visual de expressões, formulários dirigidos por schema, authz, migração de schema de config, trace de execução.                                                                                  | `apps/builder` + store                |

## 10. Próximos passos imediatos

Antes de codar a Fase A, três coisas baratas destravam o resto:

1. **Promover este plano a ADR** (`docs/adr/0002-meta-engine-runtime-config.md`)
   registrando a decisão runtime-interpreted + store em banco + no-code +
   backend/SDUI.
2. **Provar o conceito num spike**: expressar `GetBalance` como um
   `FlowDefinition` em papel/JSON e desenhar à mão o interpretador mínimo que o
   executa contra o mock — valida o vocabulário de operadores antes de investir.
3. **Atualizar o `CLAUDE.md`** (que ainda diz "Fase 0 atual") para refletir o
   estado real e esta nova trilha.
4. **Definir a licença OSS** (MIT/Apache-2.0 vs copyleft) e a higiene de repo
   público — decisão pendente que o "open source sempre" torna obrigatória antes
   de qualquer release.
