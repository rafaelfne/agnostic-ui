# Brief de Design — Agnostic UI Builder

> **Para o Claude Design.** Este documento é o prompt/spec do redesign visual do
> `apps/builder`. Tudo abaixo roda sobre código **já mergeado na `main`** e
> funcional (verificado ao vivo). Sua tarefa é **transformar a UI** — não a lógica.

## 1. Contexto do produto

**Agnostic UI** é uma plataforma **white-label multi-tenant** de **Server-Driven
UI (SDUI)**: o servidor descreve telas como **config JSON** e o cliente renderiza.
A virada em curso ([ADR 0002](../adr/0002-meta-engine-config-runtime.md)) separou
um **engine agnóstico** (interpreta flows/telas declarativos) da lógica de negócio.

O **builder** (`apps/builder`) é o **console no-code** onde um não-dev edita
**flows** (casos de uso como passos), **telas SDUI** e **integrações**, e
**publica** — sem tocar em código. Ele conversa com a **API do builder** do BFF
(`/api/builder/*`), que valida e persiste no config store (fail-closed, RLS por
tenant). Veja [ADR 0004](../adr/0004-builder-no-code.md).

Hoje o builder **funciona ponta a ponta** (login → lista → editor de flow →
salvar/publicar), mas está **sem estilo** (HTML cru). Seu trabalho é deixá-lo
**incrível**.

## 2. Objetivo

Redesenhar **100% das telas** do builder com um design system coeso e profissional.

- **shadcn/ui** (Radix + Tailwind) é **obrigatório** em **todas** as telas. Zero
  HTML cru estilizado à mão; zero CSS ad-hoc fora do design system.
- **Recharts** para **toda** visualização de dados (métricas, distribuições,
  histórico de versões, etc.).
- **React Flow** (`@xyflow/react`) será o **canvas visual do editor** (flow/tela
  como grafo de nós) — **apenas especificar e deixar previsto agora; NÃO
  implementar** (vem numa etapa seguinte). Adicione a dependência e deixe um
  componente placeholder + um spec claro de como o canvas deve funcionar.

## 3. Stack e setup (obrigatório)

- **Tailwind CSS** no `apps/builder` (plugin oficial do Vite).
- **shadcn/ui** via `npx shadcn@latest init` → componentes copiados em
  `apps/builder/src/components/ui/`. Use-os para tudo: `Button`, `Input`, `Label`,
  `Select`, `Table`, `Card`, `Dialog`, `Tabs`, `Badge`, `Sonner` (toasts),
  `Form`, `Textarea`, `DropdownMenu`, `Skeleton`, etc.
- **Recharts** para gráficos.
- **lucide-react** para ícones (já vem com shadcn).
- **@xyflow/react** (React Flow) — dependência prevista + placeholder/spec, **sem
  implementar** o canvas agora.
- **Dark/light** desde o início (shadcn já estrutura via CSS vars). Responsivo.

## 4. Mapa do código — a fronteira inviolável

A regra de ouro: **mude só a apresentação.** Não altere contratos, lógica de
dados, auth, nem o protocolo HTTP. Os testes atuais são de **lógica pura** (não
de DOM), então o redesign não deve quebrá-los — mantenha-os verdes.

**NÃO TOCAR (lógica/contrato):**

- `apps/builder/src/api/client.ts`, `api/types.ts`, `api/useBuilderClient.ts` —
  cliente HTTP da API do builder. Consuma, não reescreva.
- `apps/builder/src/auth/AuthContext.tsx`, `auth/gotrue.ts` — sessão e sign-in.
  (Pode redesenhar a **LoginPage**, mantendo campos e o fluxo `signIn → navigate`.)
- `apps/builder/src/flows/flowModel.ts` — `emptyFlow`/`emptyStep`/`validateFlow`.
- `apps/builder/src/env.ts` — leitura de env.
- `packages/**` — exceto **adicionar** um registry novo no pacote `react` (§6),
  sem quebrar exports existentes.

**REDESENHAR (apresentação):**

- `src/App.tsx` — rotas + `RequireAuth` (mantenha o guard e as rotas; pode
  introduzir um **layout/shell** compartilhado).
- `src/auth/LoginPage.tsx` — tela de login.
- `src/components/Nav.tsx`, `src/components/StringListInput.tsx` — migrar p/ shadcn.
- `src/pages/ArtifactsPage.tsx` — dashboard/lista de artefatos.
- `src/flows/FlowsListPage.tsx`, `src/flows/FlowEditorPage.tsx`,
  `src/flows/StepEditor.tsx` — lista e editor de flow.

## 5. Telas a desenhar

Para cada uma: trate **loading / erro / vazio / sucesso** explicitamente.

1. **Login** — branding, form (e-mail/senha), erro de credencial, estado "entrando…".
2. **Shell/Layout** — navegação persistente (sidebar ou topbar) com "Artefatos",
   "Flows", usuário/sair, toggle de tema. Identidade visual do produto.
3. **Dashboard de artefatos** (`ArtifactsPage`) — visão geral por tenant: cards/tabela
   por tipo (flow/screen/integration/event/hook) com status **draft/publicado** e
   versões. Inclua **pelo menos um gráfico Recharts** (ex.: artefatos por tipo, ou
   publicados × rascunhos).
4. **Lista de flows** (`FlowsListPage`) — listar + criar (slug), status de publicação.
5. **Editor de flow** (`FlowEditorPage`) — a tela mais rica. Hoje é um formulário
   empilhado; precisa virar um **editor de verdade**:
   - Campos do flow (id, name, output, emits), **trigger** (none/http), **input**
     (from + pick).
   - **Steps**: lista ordenada; cada step tem um `op` (validate, call-integration,
     compose-template, branch, emit-event) com seu próprio sub-form. Considere
     painéis colapsáveis, drag-to-reorder, e um cabeçalho por step.
   - **Validação**: as issues do schema (path + message) bem apresentadas.
   - **Ações**: "Salvar rascunho", "Salvar e publicar" (com erros **fail-closed**
     do servidor exibidos via toast), e o **histórico de versões** (publicar/rollback).
   - **Spec do React Flow (não implementar):** descreva como o flow poderia ser
     editado como um **grafo de nós** (cada step = nó; `branch` = ramificações),
     com um placeholder na UI indicando "canvas visual em breve".

## 6. Telas SDUI — registry shadcn/Recharts (o que o usuário final vê)

O renderer SDUI vive em `@yukilabs/agnostic-ui-react`: ele percorre uma árvore de
`TemplateNode` (`{ type, id?, props?, body?, children? }`) e mapeia cada `type` a
um componente React via um **`ComponentRegistry`** (`createRegistry`). O registry
**default** hoje usa HTML cru e é **propositalmente agnóstico/leve** — não force
Tailwind nele (parceiros e o host nativo consomem esse pacote).

**Entregue um registry shadcn/Recharts dedicado** (export novo, ex.
`shadcnRegistry`), usado **por padrão no builder** (lista/preview/"simular") e
disponível para hosts web. Regras:

- Mapeie **todo** o vocabulário atual a componentes shadcn:
  `screen`, `section`, `stack`, `heading`, `text`, `button`, `image`.
- Adicione tipo(s) de **gráfico** renderizados com **Recharts** (ex.: `chart` com
  `props.kind` = line/bar/area/pie e `props.data`).
- **Sem fallback de HTML cru** nesse registry → um `type` desconhecido deve
  sinalizar erro, não cair em `<div>`. É isso que **garante os 100%**.
- Não quebre o registry default nem os exports atuais do pacote.

## 7. Regras invioláveis

- **Lógica/contratos intactos** (§4). Só apresentação.
- **Rotas e `RequireAuth`** preservados (guard fail-closed → `/login` sem sessão).
- **Segurança:** nada de segredo no cliente; a `anon key` do Supabase é pública
  por design, o `service_role` **nunca** vai ao cliente.
- **Acessibilidade:** labels, roles, foco e teclado (shadcn/Radix já ajudam).
- **`pnpm ci:local` verde** (format, lint, typecheck, test, build) e
  `pnpm --filter @yukilabs/agnostic-ui-builder build` ok.

## 8. Como rodar localmente

```bash
pnpm install
pnpm setup:local                                   # Supabase local + migrations + seed (flow get-balance, tenant partnerco)
pnpm --filter @yukilabs/agnostic-ui-next dev       # BFF em :3000
pnpm --filter @yukilabs/agnostic-ui-builder dev    # SPA em :5173 (proxy /api → :3000)
```

Para login local, crie um usuário no Supabase com
`app_metadata = { tenant_id: "partnerco", builder_roles: ["publisher"] }` e
configure `SUPABASE_JWT_SECRET` no `.env.local` do BFF (o builder é opt-in;
veja `packages/next/.env.example` e `apps/builder/.env.example`).

## 9. Critérios de aceite

- [ ] **100%** das telas do builder em shadcn; zero HTML cru estilizado à mão.
- [ ] **Recharts** em toda visualização de dados (≥ 1 no dashboard).
- [ ] **Registry SDUI shadcn/Recharts** sem fallback de HTML; default agnóstico intacto.
- [ ] **React Flow** previsto (dep + placeholder + spec do canvas) — **não** implementado.
- [ ] Dark/light, responsivo, acessível.
- [ ] Lógica/contratos intactos; **`ci:local` verde**; build do `apps/builder` ok.

## 10. Tom

Estética de ferramenta de desenvolvedor moderna e limpa (referências: Linear,
Vercel, Supabase Studio). Decisão final de identidade é sua — priorize clareza,
densidade de informação confortável e consistência.
