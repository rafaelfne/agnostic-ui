# Plano — Virada para plataforma extensível dirigida por IA

Documento de planejamento da segunda virada: de **plataforma config-driven com
builder no-code** (ADR 0002/0004, Fases A–E entregues) para **plataforma
extensível por terceiros e editável por IA**. A decisão está registrada no
[ADR 0006](adr/0006-plataforma-extensivel-ia.md); o racional completo está no
[direcional](direcional-construtor-apps-ia.md). Ainda é planejamento — quando uma
decisão aqui virar permanente, promover ao ADR.

## 1. A virada (em uma frase)

Não "a IA escreve seu app" (vibe coding) nem "arraste caixas na nossa ferramenta"
(low-code), mas: **a IA compõe o app a partir de uma config que o time possui,
contra um schema aberto, num runtime self-hostável, com código real como escape
hatch — não como fundação.** Para isso, faltam duas capacidades que a base atual
não tem: **abrir o vocabulário** (hoje fixo no core) sem perder a segurança, e
**a IA como editor** da config.

## 2. Reconciliação — o que já existe vs. o que a virada adiciona

Boa parte do substrato já está pronto. Separar o entregue do novo é o que mantém o
plano honesto.

| Já entregue / em curso                                           | Onde                                                                                       | A virada adiciona                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Engine agnóstico + interpretador + expressão segura              | `packages/engine/src/{interpreter,expression}`                                             | — (base)                                                                        |
| Vocabulário de operadores **fixo e fechado** (6 ops)             | `engine/src/operators/operator.ts` (`buildDefaultRegistry`), `schemas/step.ts` (`StepDef`) | **Registry governado + namespaced**; `op` aceita refs `<tenant>.*` por contrato |
| Config store append-only, draft/publish fail-closed              | `packages/next/src/infra/store/*`                                                          | Versão/proposta gerada por IA passa **pelo mesmo portão**                       |
| Conectores REST/GraphQL, allowlist/anti-SSRF, secret-ref         | `next/src/infra/connectors/*` (ADR 0003)                                                   | Capabilities de operador **reusam** isto (sem egress cru)                       |
| Renderer React + overlay de registry                             | `packages/react/src/registry.ts` (`createRegistry`)                                        | **Props schema (Zod) + sandbox render-only + namespacing**                      |
| Renderer Flutter nativo + corpus de conformância nos 2 renderers | ADR 0005 §2/§6                                                                             | Corpus **elevado a spec pública + certificação de extensões**                   |
| Builder no-code (visual + manual, dirigido por schema)           | `apps/builder` (ADR 0004)                                                                  | **IA-como-editor** (prompt → proposta → diff de intenção)                       |
| Fixtures-as-oracle (nível de rota)                               | `next/src/__tests__/{fixtures,catchAll.route}.test.ts`                                     | Generalizado para **conformância de operador/componente**                       |

Conclusão: o novo se concentra em **três frentes** — não numa reconstrução.

## 3. As três frentes (e suas dependências)

```
Frente G — Modelo de extensão  ──┬──>  Frente I — IA como editor
(contratos, registry governado,  │     (precisa do vocabulário/contrato estável)
 sandbox, trust-tier)            │
                                 └──>  Frente H — Conformância como spec
Frente H começa JÁ, em paralelo        (a parte cross-renderer já é urgente
ao renderer Flutter ───────────────>   porque o Flutter está sendo construído)
```

- **G é a fundação:** I e a parte de extensões de H dependem do contrato estável.
- **H tem urgência independente:** a parte _cross-renderer_ (React+Flutter
  concordarem sobre o mesmo `TemplateNode`) precisa começar **agora**, junto com o
  Flutter — cada componente Flutter nasce com um fixture que o React também passa,
  senão os dialetos divergem desde o dia 1.
- **I é a feature-manchete,** mas depende de G; construir antes seria a IA gerando
  contra um vocabulário que ainda vai mudar.

## 4. Arquitetura — onde as peças novas encaixam

```
apps/builder
  editor visual · edição manual · IA (prompt → proposta)      [Frente I]
        │  todos escrevem a MESMA config
Portão de validação (Zod + dry-run, fail-closed)              [já existe]
        │
Config store (draft/publish/versão, por tenant, RLS)          [já existe]
        │  runtime lê a versão publicada
Engine agnóstico
  interpretador · registry GOVERNADO + namespaced · grant +
  sandbox de capabilities · trust-tier derivado               [Frente G]
        │  via ports
Conectores (IntegrationDefinition: REST/GraphQL/Mock)         [já existe]
  egress-guardian · secret-ref · allowlist/SSRF
core  ──  contratos de extensão + CORPUS DE CONFORMÂNCIA       [Frentes G+H]
          (a especificação pública; rodada pelos 2 renderers)
```

A regra de dependência da Clean Architecture é preservada: o engine continua
`domain`+`application`; o sandbox e o grant são `infra`/`application`; o `core`
ganha o papel novo de **guardião do contrato e da conformância**.

## 5. O modelo de extensão (o coração da Frente G)

Cada extensão é um **contrato declarativo serializável** (a IA/builder raciocinam
sobre ele sem executar código) + uma **implementação de código** ligada por `ref`
e checada por conformância. Esboço executável em
[`docs/sketches/operator-capability-contract.sketch.ts`](sketches/operator-capability-contract.sketch.ts).

- **OperatorContract** — `ref` (namespace+name+version), `input`/`output`
  (serializável, **JSON Schema**), **capabilities** (`pure`, `integrations`,
  `secrets`, `emits`, `limits`), **efeitos** (`reads`/`writes`, `idempotent`,
  `reversible` + `compensation`), `conformance.fixtures`.
- **ComponentContract** — `ref`, **props schema (Zod)** (a interface da IA),
  sandbox render-only, `conformance.fixtures`.
- **Trust tier derivado** — `safe`/`sensitive`/`critical` computado do contrato;
  `critical` (irreversível) dispara pré-flight humano. O mesmo contrato gera o
  **review summary** para a IA e para o humano.

> Propriedade preservada: o registry deixa de ser fechado, mas continua **sem
> `eval` e auditável** — a auditoria migra de `buildDefaultRegistry` para o par
> **contrato + conformância + sandbox**.

## 6. Roadmap

A trilha continua a numeração das fases (A–F do meta-engine). G/H/I são as novas;
J é o polimento de governança.

| Fase                           | Entrega                                                                                                                                                                                                                                                     | Depende de                                                           | Pacote / área                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------- |
| **G — Modelo de extensão**     | Contratos (operator/component) no `core`; registry de operadores governado + namespaced no `engine`; grant + sandbox de capabilities; trust-tier derivado + review summary. Migrar os 6 operadores atuais para o formato de contrato como prova (paridade). | Fases A–E                                                            | `core` + `engine` + `next`      |
| **H — Conformância como spec** | Elevar o corpus do `core` (ADR 0005 §2) a suíte pública; estender para operadores (input→efeito/output) e componentes (props+ctx→árvore) nos 2 renderers; certificação de extensão (fixtures obrigatórios); CI gates.                                       | Renderer Flutter (em curso); contrato de G para a parte de extensões | `core` + `react` + Flutter      |
| **I — IA como editor**         | `prompt → proposta de config → portão fail-closed`; comportamento triagem-primeiro; geração contra contratos/props-schemas namespaced; **diff de intenção** para revisão humana no builder.                                                                 | G (vocabulário estável), 0004 (builder), portão                      | `apps/builder` + `next`         |
| **J — Governança & graduação** | Processo RFC para `core.*`; fluxo de certificação; distribuição de extensões namespaced (registry/marketplace); migração de schema de contrato.                                                                                                             | G, H                                                                 | `core` + `apps/builder` + infra |

**Definition of Done por frente** (além do DoD geral do CLAUDE.md):

- **G:** os 6 operadores atuais expressos como contrato, com paridade verde;
  sandbox recusa acesso não declarado (teste); trust-tier derivado coberto por
  testes nos 3 tiers (`safe`/`sensitive`/`critical`).
- **H:** um componente novo só mergeia com fixture de conformância que **React e
  Flutter** passam (ou marcação explícita "não suportado no nativo" — 0005
  §6); CI falha em drift/divergência.
- **I:** toda proposta da IA é validada pelo portão **antes** de aparecer como
  "pronta"; nenhuma proposta publica sem revisão humana; o review summary mostra o
  que a proposta toca (egress/secrets/irreversível).

## 7. Relação com o renderer Flutter (por que H é co-urgente)

O renderer Flutter está sendo construído **agora**. O ADR 0005 já decide
que o contrato vive no `core` (Zod → JSON Schema → Dart) e que um corpus de
conformância roda nos dois renderers. A virada **eleva a aposta**: com React **e**
Flutter renderizando o mesmo `TemplateNode`, a suíte de conformância deixa de ser
boa-prática e vira o **contrato que impede os renderers de divergirem** — a tese
"fragmentação é o inimigo", agora dentro de casa. Consequência prática imediata:
**cada componente implementado no Flutter precisa nascer com seu fixture de
conformância** (props+contexto → árvore resolvida esperada) no `core`, que o React
também passe. Adiar isso é deixar os dialetos nascerem divergentes.

## 8. Riscos honestos

- **Expressividade vs. validável.** Quanto mais a config expressa para fugir do
  teto, mais ela vira linguagem — e herda a superfície infinita do vibe coding.
  Disciplina: operadores **componíveis mas poucos**; preferir composição/expressão
  a operador novo. Cada operador é imposto sobre a confiabilidade da IA.
- **Custo do sandbox.** A tecnologia do sandbox não-`pure` (isolate/worker/wasm)
  define o custo real de um operador. Se for caro/complexo, reforça a regra de
  manter operadores raros.
- **Cerimônia tem que escalar com o raio.** Burocratizar componente como operador
  mata a adoção OSS. O processo pesado é só para operador.
- **Coerência é disciplina de produto, não só arquitetura.** No minuto em que o
  portal managed tiver mágica que o self-hosted não tem, vira Bubble com passos
  extras. Defender o self-host e a spec pública todo release.
- **UX da revisão da IA.** O diff de intenção precisa ser legível por humano; um
  muro de JSON não é revisão. Reusar a ideia de trace do builder (ADR 0004 §6,
  Fase F).
- **Versionamento de contrato.** Quando um contrato evolui, extensões e configs
  salvas precisam migrar — herda o problema de migração de schema do ADR 0002.

## 9. Decisões em aberto (espelham o ADR 0006)

1. **Representação serializável de `input`/`output`:** **resolvida — JSON Schema**
   (consistente com o `Zod → JSON Schema` que o 0005 já adota — forte puxão), em
   vez de um DSL Zod-as-data. **Destravou o resto.**
2. Binding contrato↔implementação e o check de conformância no build.
3. Tecnologia do sandbox do operador não-`pure`.
4. UX do diff de intenção da proposta da IA.
5. Enforcement do sandbox render-only do componente, por renderer.

## 10. Próximos passos imediatos

1. **Ratificar o ADR 0006** (Proposto → Aceito). A **Decisão em aberto #1** já foi
   resolvida (JSON Schema) — ela condicionava G, H e o builder.
2. **Spike da Frente G:** expressar os 6 operadores atuais como `OperatorContract`
   e fazer o interpretador despachar pelo registry governado, provando paridade
   contra os testes existentes (mesma estratégia strangler-fig do ADR 0002 §8).
3. **Iniciar a Frente H junto do Flutter:** fixar o formato do fixture de
   conformância no `core` e exigi-lo no DoD de cada componente Flutter desde já.
