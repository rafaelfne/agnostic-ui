# @yukilabs/agnostic-ui-builder

SPA no-code do Agnostic UI (Fase E, [ADR 0004](../../docs/adr/0004-builder-no-code.md)).
Edita flows, telas SDUI e integrações sobre a **API do builder** do BFF
(`/api/builder/*`, entregue na onda E.1), com login via Supabase Auth e preview
ao vivo (FlowEngine client do pacote `react`).

> Cliente puro (Vite + React). RLS, segredos e validação de publish ficam no
> servidor — o SPA só fala com a API por sessão autenticada.

## Desenvolvimento

```bash
pnpm --filter @yukilabs/agnostic-ui-builder dev   # Vite em :5173, /api → BFF :3000
```

Suba o BFF (`pnpm --filter @yukilabs/agnostic-ui-next dev`) e o Supabase local
(`pnpm setup:local`) em paralelo. Variáveis em `.env.local` (veja `.env.example`):

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — login (Supabase Auth/GoTrue).
- `VITE_API_BASE` — base da API do builder (vazio = mesma origem, via proxy).

## Scripts

`dev` · `build` · `preview` · `test` · `typecheck` · `lint` · `gen:design-cards`.

## Design system vivo — Claude Design (K6)

O **mesmo** vocabulário e as telas publicadas, renderizados pelo renderer de
verdade (`@yukilabs/agnostic-ui-react`) e exportados como cards HTML standalone,
re-sincronizáveis no [Claude Design](https://claude.ai/design). Fecha o loop do
K0 (onde os cards eram mockups à mão): agora saem do **código**.

```bash
# 1) buildar o renderer (o gerador exige o pacote react buildado)
pnpm --filter @yukilabs/agnostic-ui-react build
# 2) gerar os cards em apps/builder/design-cards/ (gitignored)
pnpm --filter @yukilabs/agnostic-ui-builder gen:design-cards
#    opções:
#      --screens <dir>            renderiza *.json (ScreenDef) locais como cards de tela
#                                 (sidecar <nome>.data.json vira o scope de binding)
#      --api <url> [--token <jwt>]  busca telas de um endpoint que devolve ScreenDef[]
#      --out <dir>                diretório de saída
```

Saída (`design-cards/`): `primitives/<type>--<variante>.html` (o catálogo do
`screenVocabulary`), `themes/<tenant>--conta.html` (a tela de conta retintada por
`sampleThemes`, mesmas CSS vars `--tenant-*` do SSR) e `screens/<slug>.html`
(publicadas, se `--screens`/`--api`), mais um `index.html` de galeria. Cada card é
standalone (Tailwind Play CDN + tokens shadcn do `index.css` inline) e **read-only
por natureza** — é gerado, então editar no Claude Design seria sobrescrito no
próximo run. `chart`/`image` são pulados (Recharts precisa medir o DOM; image
exige asset externo) — o gerador loga o que pulou.

**Sync (interativo)** via a tool DesignSync (projeto _Agnostic UI Builder_):
`list_projects` → `finalize_plan` (declarando os paths) → `write_files` apontando
para o conteúdo de `design-cards/`.
