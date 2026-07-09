/**
 * Gerador de design-cards (K6, ADR 0004) — o design system VIVO.
 *
 * No K0 os cards do Claude Design eram mockups desenhados à mão; aqui o MESMO catálogo
 * passa a ser renderizado pelo renderer de verdade (`@yukilabs/agnostic-ui-react`) — o
 * vocabulário e as telas publicadas viram HTML standalone, re-sincronizável a cada
 * mudança do código. Fecha o loop: código → cards → Claude Design.
 *
 *   pnpm --filter @yukilabs/agnostic-ui-builder gen:design-cards
 *   # opções:
 *   #   --screens <dir>            renderiza *.json (ScreenDef) locais como cards de tela
 *   #   --api <url> [--token <jwt>]  busca telas de um endpoint que devolve ScreenDef[]
 *   #   --out <dir>                diretório de saída (default: apps/builder/design-cards)
 *
 * Sem JSX (createElement + renderToStaticMarkup) e SEM dependência nova. Exige o pacote
 * react BUILDADO (mesma constraint do scripts/conformance-report.mjs) — rode antes:
 *   pnpm --filter @yukilabs/agnostic-ui-react build
 *
 * A saída é standalone (Tailwind Play CDN + tokens shadcn inline) e READ-ONLY por
 * natureza: é gerada do código, então editar no Claude Design seria sobrescrito no
 * próximo run. O sync em si é interativo, via a tool DesignSync (ver README do builder).
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const builderRoot = join(here, '..');

let sdui;
try {
  sdui = await import('@yukilabs/agnostic-ui-react');
} catch (error) {
  console.error(
    `\nFALHA ao carregar @yukilabs/agnostic-ui-react — o pacote precisa estar buildado.\n` +
      `Rode:  pnpm --filter @yukilabs/agnostic-ui-react build\n\n(${error.message})`,
  );
  process.exit(1);
}
const { SduiRenderer, shadcnRegistry, themeToCssVars, SHADCN_REGISTRY_TYPES } = sdui;

// ─────────────────────────────────────────────────────────────────────────────
// CLI
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? (argv[i + 1] ?? '') : undefined;
};
const outDir = flag('--out') ?? join(builderRoot, 'design-cards');
const screensDir = flag('--screens');
const apiUrl = flag('--api');
const apiToken = flag('--token');

// ─────────────────────────────────────────────────────────────────────────────
// Tokens shadcn: lidos do index.css do app (fonte da verdade — sem drift). Extrai o
// primeiro bloco :root { … } com as CSS vars em oklch que os componentes referenciam.
function rootTokens() {
  const css = readFileSync(join(builderRoot, 'src/index.css'), 'utf8');
  const match = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  return (match ? match[1].trim() : '')
    .split('\n')
    .map((line) => '      ' + line.trim())
    .join('\n');
}
const TOKENS = rootTokens();

/** Mapeia as utilities semânticas do shadcn (bg-card, text-muted-foreground, …) para as
 *  CSS vars — o Tailwind Play CDN não conhece esses nomes sem config. */
const TW_CONFIG = {
  theme: {
    extend: {
      colors: Object.fromEntries(
        [
          'background',
          'foreground',
          'card',
          'card-foreground',
          'popover',
          'popover-foreground',
          'primary',
          'primary-foreground',
          'secondary',
          'secondary-foreground',
          'muted',
          'muted-foreground',
          'accent',
          'accent-foreground',
          'destructive',
          'destructive-foreground',
          'border',
          'input',
          'ring',
          'success',
          'warning',
        ].map((name) => [name, `var(--${name})`]),
      ),
      fontFamily: { sans: ['Geist', 'system-ui', 'sans-serif'] },
    },
  },
};

const GEN_HEADER = 'gerado por gen-design-cards.mjs — NÃO EDITE; re-gere (K6)';

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"]/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch],
  );

/** Cabeça compartilhada dos documentos: tokens shadcn + Tailwind CDN + fonte Geist. */
const HEAD = (title) => `  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>tailwind.config = ${JSON.stringify(TW_CONFIG)};</script>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap');
      :root {
${TOKENS}
      }
      body { font-family: 'Geist', system-ui, sans-serif; }
    </style>
  </head>`;

/** Documento de um card: o markup renderizado centrado num palco, com legenda.
 *  `themeVars` sobrepõe os tokens (retint por tenant). */
function cardDocument({ title, subtitle, bodyHtml, themeVars = '', stageClass = '' }) {
  return `<!doctype html>
<!-- ${GEN_HEADER} -->
<html lang="pt-BR">
${HEAD(title)}
  <body class="bg-background text-foreground">
    <div class="flex min-h-screen flex-col items-center justify-center gap-4 p-10">
      <div class="w-full max-w-md${stageClass ? ' ' + stageClass : ''}"${
        themeVars ? ` style="${themeVars}"` : ''
      }>${bodyHtml}</div>
      <div class="flex flex-col items-center gap-0.5 text-center">
        <span class="text-sm font-medium">${escapeHtml(title)}</span>
        ${subtitle ? `<span class="text-xs text-muted-foreground">${escapeHtml(subtitle)}</span>` : ''}
      </div>
    </div>
  </body>
</html>
`;
}

/** Renderiza um TemplateNode via o renderer real (shadcn registry) → HTML estático. */
const renderNode = (node, scope = {}) =>
  renderToStaticMarkup(createElement(SduiRenderer, { node, registry: shadcnRegistry, scope }));

/** Vars de tema (mesma sobreposição do PreviewFrame do K4): tokens --tenant-* + os
 *  overrides que retintam os componentes (--primary/--ring/--accent/--background). */
function themeStyle(theme) {
  const vars = { ...themeToCssVars(theme) };
  vars['--primary'] = theme.primaryColor;
  vars['--ring'] = theme.primaryColor;
  if (theme.secondaryColor) vars['--accent'] = theme.secondaryColor;
  if (theme.backgroundColor) vars['--background'] = theme.backgroundColor;
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo showcase: cada primitivo × variantes representativas. Curado (props ricas)
// em vez de espelhar o `defaultNode` mínimo do screenVocabulary — o objetivo é vitrine.
// `chart`/`image`/`screen` são pulados: Recharts precisa medir o DOM (SSR sai vazio),
// image exige asset externo e screen é a raiz (aparece nos cards de tema/tela) — logados.
const SKIP_PRIMITIVES = new Set(['chart', 'image', 'screen']);

const badgeChildren = ['default', 'success', 'warning', 'destructive'].map((variant) => ({
  type: 'badge',
  props: { text: variant, variant },
}));

const listItems = [
  { type: 'list-item', props: { label: 'Mercado', value: '-R$ 182,90' } },
  { type: 'list-item', props: { label: 'Salário', value: '+R$ 4.200,00' } },
  { type: 'list-item', props: { label: 'Taxa', value: '-R$ 12,90', muted: true } },
];

const PRIMITIVES = [
  {
    type: 'card',
    variants: [
      {
        name: 'title',
        node: {
          type: 'card',
          props: { title: 'Conta' },
          children: [{ type: 'kpi', props: { label: 'Saldo', value: 'R$ 1.500,00' } }],
        },
      },
    ],
  },
  {
    type: 'kpi',
    variants: ['up', 'down', 'flat'].map((trend) => ({
      name: trend,
      node: {
        type: 'kpi',
        props: {
          label: 'Saldo',
          value: 'R$ 1.500,00',
          delta: trend === 'up' ? '+2,4%' : trend === 'down' ? '-1,1%' : '0,0%',
          trend,
        },
      },
    })),
  },
  {
    type: 'badge',
    variants: ['default', 'success', 'warning', 'destructive'].map((variant) => ({
      name: variant,
      node: { type: 'badge', props: { text: variant, variant } },
    })),
  },
  {
    type: 'divider',
    variants: [
      { name: 'plain', node: { type: 'divider', props: {} } },
      { name: 'label', node: { type: 'divider', props: { label: 'hoje' } } },
    ],
  },
  {
    type: 'list',
    variants: [{ name: 'default', node: { type: 'list', children: listItems } }],
  },
  {
    type: 'list-item',
    variants: [
      {
        name: 'default',
        node: { type: 'list-item', props: { label: 'Mercado', value: '-R$ 182,90' } },
      },
      {
        name: 'muted',
        node: { type: 'list-item', props: { label: 'Taxa', value: '-R$ 12,90', muted: true } },
      },
    ],
  },
  {
    type: 'heading',
    variants: [{ name: 'default', node: { type: 'heading', props: { title: 'Sua conta' } } }],
  },
  {
    type: 'text',
    variants: [
      { name: 'default', node: { type: 'text', props: { text: 'Texto de apoio.' } } },
      { name: 'muted', node: { type: 'text', props: { text: 'Texto secundário.', muted: true } } },
    ],
  },
  {
    type: 'button',
    variants: ['default', 'secondary', 'outline', 'ghost', 'destructive'].map((variant) => ({
      name: variant,
      node: { type: 'button', props: { label: 'Ação', variant } },
    })),
  },
  {
    type: 'section',
    variants: [
      {
        name: 'default',
        node: {
          type: 'section',
          children: [
            { type: 'heading', props: { title: 'Seção' } },
            { type: 'text', props: { text: 'Conteúdo agrupado.', muted: true } },
          ],
        },
      },
    ],
  },
  {
    type: 'stack',
    variants: ['column', 'row'].map((direction) => ({
      name: direction,
      node: { type: 'stack', props: { direction, gap: 8 }, children: badgeChildren },
    })),
  },
];

/** Tela composta de amostra (extrato de conta) — usada nos cards de tema p/ mostrar o
 *  retint white-label sobre um layout financeiro real. */
const ACCOUNT_SCREEN = {
  type: 'card',
  props: { title: 'partnerco • conta' },
  children: [
    {
      type: 'kpi',
      props: { label: 'Saldo disponível', value: 'R$ 1.500,00', delta: '+2,4%', trend: 'up' },
    },
    { type: 'divider', props: { label: 'movimentações' } },
    { type: 'list', children: listItems },
    {
      type: 'stack',
      props: { direction: 'row', gap: 8 },
      children: [
        { type: 'button', props: { label: 'Transferir' } },
        { type: 'button', props: { label: 'Extrato', variant: 'outline' } },
      ],
    },
  ],
};

const SAMPLE_THEMES = [
  {
    id: 'partnerco',
    theme: { primaryColor: '#6D28D9', secondaryColor: '#9333EA', backgroundColor: '#ffffff' },
  },
  {
    id: 'acme',
    theme: { primaryColor: '#0284C7', secondaryColor: '#0EA5E9', backgroundColor: '#ffffff' },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Telas publicadas (opcional): --screens <dir> local, ou --api <url> --token
async function loadScreens() {
  if (screensDir) {
    if (!existsSync(screensDir)) {
      console.warn(`--screens: diretório não encontrado: ${screensDir}`);
      return [];
    }
    return readdirSync(screensDir)
      .filter((f) => f.endsWith('.json') && !f.endsWith('.data.json'))
      .map((f) => {
        const screen = JSON.parse(readFileSync(join(screensDir, f), 'utf8'));
        const dataPath = join(screensDir, f.replace(/\.json$/, '.data.json'));
        const scope = existsSync(dataPath) ? JSON.parse(readFileSync(dataPath, 'utf8')) : {};
        return { id: screen.id ?? basename(f, '.json'), screen, scope };
      });
  }
  if (apiUrl) {
    const res = await fetch(apiUrl, {
      headers: apiToken ? { authorization: `Bearer ${apiToken}` } : {},
    });
    if (!res.ok) {
      console.warn(`--api: ${res.status} ${res.statusText}`);
      return [];
    }
    const body = await res.json();
    const list = Array.isArray(body) ? body : (body.screens ?? body.items ?? []);
    return list.map((screen, i) => ({ id: screen.id ?? `screen-${i}`, screen, scope: {} }));
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Geração (passada única, após limpar a saída — sem cards órfãos de types removidos)
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });

const known = new Set(SHADCN_REGISTRY_TYPES);
const paths = [];
const skipped = [];

function writeCard(rel, html) {
  const full = join(outDir, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, html);
  paths.push(rel);
}

// 1) Primitivos × variantes
for (const entry of PRIMITIVES) {
  if (!known.has(entry.type)) {
    skipped.push(`${entry.type} (fora do registry)`);
    continue;
  }
  for (const variant of entry.variants) {
    writeCard(
      join('primitives', `${entry.type}--${variant.name}.html`),
      cardDocument({
        title: `${entry.type} · ${variant.name}`,
        subtitle: 'primitivo',
        bodyHtml: renderNode(variant.node),
      }),
    );
  }
}
// types no registry sem showcase (ex.: os pulados) → logados, sem corte silencioso
for (const type of SHADCN_REGISTRY_TYPES) {
  if (!PRIMITIVES.some((p) => p.type === type)) {
    skipped.push(SKIP_PRIMITIVES.has(type) ? type : `${type} (sem showcase)`);
  }
}

// 2) Temas × a tela de conta (retint white-label)
for (const { id, theme } of SAMPLE_THEMES) {
  writeCard(
    join('themes', `${id}--conta.html`),
    cardDocument({
      title: `tema · ${id}`,
      subtitle: `primary ${theme.primaryColor}`,
      bodyHtml: renderNode(ACCOUNT_SCREEN),
      themeVars: themeStyle(theme),
      stageClass: 'rounded-xl',
    }),
  );
}

// 3) Telas publicadas
const screens = await loadScreens();
for (const { id, screen, scope } of screens) {
  writeCard(
    join('screens', `${id}.html`),
    cardDocument({
      title: `tela · ${id}`,
      subtitle: screen.route ?? '',
      bodyHtml: renderNode(screen.root ?? screen, scope),
      stageClass: 'rounded-xl',
    }),
  );
}
if (screens.length === 0 && !screensDir && !apiUrl) {
  skipped.push('screens (passe --screens <dir> ou --api <url>)');
}

// 4) Galeria índice — navega os cards no projeto DesignSync
function galleryDocument() {
  const groups = { primitives: [], themes: [], screens: [] };
  for (const rel of paths) {
    const top = rel.split('/')[0];
    if (groups[top]) groups[top].push(rel);
  }
  const section = (title, items) =>
    items.length === 0
      ? ''
      : `<section class="flex flex-col gap-2">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">${title}</h2>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          ${items
            .map(
              (rel) =>
                `<a class="rounded-lg border border-border bg-card px-3 py-2 text-xs hover:bg-muted" href="./${rel}">${escapeHtml(
                  rel
                    .split('/')
                    .slice(1)
                    .join('/')
                    .replace(/\.html$/, ''),
                )}</a>`,
            )
            .join('\n          ')}
        </div>
      </section>`;
  const body = `
    <div class="mx-auto flex max-w-3xl flex-col gap-6 p-10">
      <div class="flex flex-col gap-1">
        <h1 class="text-lg font-semibold">Agnostic UI — design system vivo</h1>
        <p class="text-sm text-muted-foreground">Gerado do renderer real (K6). ${paths.length} cards.</p>
      </div>
      ${section('Primitivos', groups.primitives)}
      ${section('Temas', groups.themes)}
      ${section('Telas', groups.screens)}
    </div>`;
  return `<!doctype html>
<!-- ${GEN_HEADER} -->
<html lang="pt-BR">
${HEAD('Design system vivo')}
  <body class="bg-background text-foreground">${body}</body>
</html>
`;
}
writeCard('index.html', galleryDocument());

// ─────────────────────────────────────────────────────────────────────────────
console.log(`design-cards → ${outDir}`);
console.log(`  ${paths.length} arquivos (inclui index.html)`);
console.log(
  `  primitivos: ${paths.filter((p) => p.startsWith('primitives')).length} · ` +
    `temas: ${paths.filter((p) => p.startsWith('themes')).length} · ` +
    `telas: ${paths.filter((p) => p.startsWith('screens')).length}`,
);
if (skipped.length > 0) console.log(`  pulados: ${[...new Set(skipped)].join(', ')}`);
