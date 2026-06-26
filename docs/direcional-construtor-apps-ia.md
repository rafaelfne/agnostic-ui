# Direcional — Construtor de apps com IA sobre SDUI

> O Fim do Vibe Coding. O Fim do Lock-in. Uma nova arquitetura guiada por
> **configuração**.

Documento de conhecimento consolidado e racional estratégico por trás da virada
registrada no [ADR 0006](adr/0006-plataforma-extensivel-ia.md) e sequenciada no
[plano](plano-virada-extensivel-ia.md). É a tese; o ADR é a decisão; o plano é a
execução.

## 1. A tese, em uma frase

A IA **compõe** o app a partir de uma **configuração que o time possui**, contra um
**schema aberto**, num **runtime que você pode hospedar**, com **código real como
fundação e escape hatch** — não como artefato final. Três palavras-chave: **Core
pequeno. Extensão declarada. IA obrigada a provar o novo.**

Não é "a IA escreve seu app" (Caos). Não é "arraste caixas na nossa ferramenta"
(Prisão). É um terceiro caminho.

## 2. O colapso estrutural do vibe coding

A IA gerando **código como artefato final** falha por motivo **estrutural**, não
por falta de um "modelo melhor". Quatro modos de falha:

1. **Superfície infinita.** Código expressa qualquer coisa; não há invariantes. O
   raio de explosão de uma geração é o repositório inteiro.
2. **Penhasco de handoff.** O humano herda um código que não desenhou e no qual não
   confia. O custo de entender supera o de reescrever.
3. **Validação tardia.** Sem schema, "quebras" só aparecem em runtime — não na
   compilação.
4. **Regeneração destrutiva.** Pedir uma mudança reescreve arquivos que
   funcionavam. Existe diff de **código**, mas não histórico de **intenção**.

## 3. As três fechaduras do low-code

A alternativa tradicional trava a escala com restrições artificiais impostas por
negócios fechados:

1. **Runtime fechado.** Seu app é refém; só executa no motor proprietário da
   plataforma.
2. **Schema fechado.** Você não é dono da configuração estrutural. O modelo visual
   deles é o seu teto técnico.
3. **Sem escape hatch.** A ferramenta decide a fronteira do possível. Código
   customizado e plugins são cidadãos de segunda classe.

## 4. Mapeando o terreno

| Eixo                | Vibe Coding (Lovable/v0) | Low-Code (Bubble)     | **Agnostic UI (nosso caminho)**  |
| ------------------- | ------------------------ | --------------------- | -------------------------------- |
| Superfície de risco | Repositório inteiro      | Plataforma            | **Alvo limitado / validável**    |
| Validação           | Tardia / runtime         | Fechada               | **Imediata via portão Zod**      |
| Custo de handoff    | Penhasco / alto          | Inexistente / lock-in | **Zero (mesmo artefato)**        |
| Risco de lock-in    | Baixo                    | Total                 | **Nenhum (open source)**         |
| Escape hatch        | Nativo                   | Restrito              | **Componentes nativos isolados** |

## 5. A inversão fundamental: IA escreve **configuração**, não código

A virada de chave é uma inversão estrutural. **A IA gera configuração contra um
schema fechado, em vez de código contra uma linguagem aberta.** A superfície
infinita vira um **alvo limitado**. A IA ganha **autonomia segura** porque uma
geração errada é **bloqueada pelo schema antes de subir** — eliminando surpresas em
produção.

## 6. A IA não substitui o dev: é apenas mais um editor

Não existe "penhasco de handoff" porque **não existe handoff**. Builder visual, dev
(edição manual) e IA (prompt) manipulam **exatamente o mesmo artefato** (a config),
passando pelas **mesmas regras** — o **portão de validação** (Zod + dry-run,
fail-closed) — até a **fonte da verdade: a config Zod**. A IA produz uma **proposta
versionada**, nunca o app final.

## 7. A anatomia do sistema desacoplado

Vibe coding colapsa tudo num único "codebase"; low-code fecha a config e o
vocabulário. Nós **separamos as camadas e mantemos a base aberta**:

- **Editores** (builder visual · dev manual · IA) — cidadãos iguais.
- **Portão** — validação Zod + dry-run + fixtures-as-oracle.
- **Config** — fluxos e telas em Zod, append-only, versionados. A fonte da verdade.
- **Vocabulário** — operadores (engine) e componentes (UI), escritos à mão,
  testados, com escape hatch real.

## 8. O schema é a interface nativa da IA

No instante em que um dev registra um componente novo, **a IA já consegue usá-lo**.
Zero fine-tuning, zero mexer no core. O ciclo virtuoso:

```
dev escreve componente → gera Zod props schema → IA lê o schema instantaneamente
   → IA compõe nova UI via prompt → dev visualiza o gap e escreve o próximo componente
```

Dev e IA se **reforçam** em vez de competir. Cada componente criado aumenta de
graça a capacidade criativa da IA.

## 9. O verdadeiro desafio do open source é a **fragmentação**

Com licença open source, o **lock-in deixa de ser ameaça** — o runtime é livre. Mas
o risco **se inverte**: o inimigo passa a ser a **fragmentação**. Se dois deployments
não compartilham o mesmo vocabulário, a config perde portabilidade e a IA alucina
contra dialetos diferentes (a "Babel de operadores").

> **Conclusão: o ativo supremo a proteger não é o código, é a Coerência (a
> especificação).**

## 10. Princípio 1 — triagem rigorosa antes da extensão

Diante de um "crie X", a IA segue um funil:

```
É só composição do vocabulário existente?   → Sim → resolve (sem extensão)
É um dado externo via IntegrationDefinition? → Sim → resolve (config, ADR 0003)
É uma expressão no avaliador seguro?         → Sim → resolve (AST segura)
                                              ↓ Não
                          Extensão real (Operador / Componente)
```

**O primeiro trabalho da IA não é criar um primitivo; é provar que não precisa de
um.** Um vocabulário pequeno mantém a IA confiável.

## 11. Escalando a cerimônia pelo raio de explosão

A burocracia escala **exclusivamente** com o raio de explosão. Tratar componente
como operador mata a adoção; tratar operador como componente fura a segurança.

| Camada                             | O que é                                                    | Cerimônia   |
| ---------------------------------- | ---------------------------------------------------------- | ----------- |
| **Composição** (config)            | Rearranjo validado. Habitat da IA (~90%). Confiança total. | **Nenhuma** |
| **Componente** (view sandbox)      | Widget de UI. Sem I/O, sem segredos.                       | **Mínima**  |
| **Operador** (primitivo do engine) | Fronteira de segurança. Altera semântica de fluxo.         | **Pesada**  |

## 12. Operadores declaram suas próprias algemas

Um operador não é código livre. Ele é **obrigado a declarar**:

- **O que precisa (capabilities):** `pure`, `integrations`, `secrets`. **Não há
  egress cru.**
- **O que faz (efeitos):** `reads`/`writes`, `idempotent`, `reversible`.

O engine **isola** o operador num sandbox, expondo **apenas o que foi concedido**.
Acesso não declarado **lança exceção imediata**.

## 13. A elegância inevitável do contrato unificado

Uma única declaração de contrato policia três coisas ao mesmo tempo. Exemplo:
`acme.execute-transfer { secrets: ["ACME_KEY"], reversible: false }`:

- **Runtime security** — deriva o trust tier para **critical** (bloqueia execução
  sem pré-flight humano).
- **AI context** — alimenta o review summary (informa a IA sobre egress e riscos
  sem ela precisar adivinhar o código).
- **Review diff** — gera o diff de intenção para revisão humana.

> **O modelo de extensão é o modelo de segurança da IA.**

## 14. O contrato é o produto (enforçado por conformância)

- **Spec > implementação.** O vocabulário é versionado como uma **especificação
  pública**. Namespaces por tenant evitam a Babel.
- **Oráculos nativos.** Cada operador traz seu próprio oráculo (fixtures). Sem ele,
  o engine **recusa carregamento** em modo estrito.
- **Fluxo de vida saudável.** Estender é livre (namespaces por tenant) →
  **conformar é obrigatório** → ideias validadas viram RFC e **graduam para o
  core**.

## 15. A nova arquitetura de construção

```
IA Input ─────┐
Visual Input ─┼─▶ [VALIDATION GATE: Zod + dry-run] ─▶ CONFIG CORE ─▶ Runtime & Output
Dev Input ────┘                                            │
                                                      VOCABULÁRIO
```

**Core pequeno. Extensão declarada. IA obrigada a provar o novo.**
