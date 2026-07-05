import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { ComponentRegistry, SduiComponent } from './registry';

/**
 * shadcn/Recharts SDUI registry.
 *
 * Maps the full SDUI vocabulary to shadcn/ui-style (Radix + Tailwind) markup and
 * renders every data visualization with Recharts. Unlike {@link defaultRegistry}
 * (which is presentation-neutral HTML and ships to partners / native hosts), this
 * registry is the **web/builder** look: it is what the builder uses for the
 * artifact preview and the "simular" panel, and it is available to web hosts.
 *
 * Hard rule (brief §6): there is **no raw-HTML fallback**. An unknown `type` does
 * not silently degrade to a `<div>` — {@link createShadcnRegistry} returns a Proxy
 * whose missing-key lookup yields a component that throws, so a typo or an
 * unsupported node is surfaced loudly. That is what guarantees "100%".
 *
 * Tailwind note: the elements below carry the same utility classes shadcn/ui emits
 * for Button / Card / typography, expressed against the shadcn CSS-variable tokens
 * (`bg-card`, `text-muted-foreground`, `bg-primary`, …). Keeping them as classed
 * elements (rather than importing the app's `components/ui/*`) leaves this package
 * decoupled from any single app while staying pixel-identical to shadcn output.
 * A host that prefers its own shadcn components can pass overrides to
 * {@link createShadcnRegistry}.
 */

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

const text = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value);
const str = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/** `stack` direction + spacing, mirroring a shadcn flex container. */
function stackClass(props: Record<string, unknown>): string {
  const horizontal = props.direction === 'horizontal' || props.direction === 'row';
  const gap = props.gap === 'sm' ? 'gap-2' : props.gap === 'lg' ? 'gap-6' : 'gap-4';
  return cx('flex', horizontal ? 'flex-row items-center' : 'flex-col', gap);
}

/** Heading level → shadcn typography scale. */
function headingClass(level: unknown): string {
  switch (level) {
    case 1:
    case '1':
      return 'scroll-m-20 text-3xl font-semibold tracking-tight';
    case 3:
    case '3':
      return 'scroll-m-20 text-lg font-semibold tracking-tight';
    default:
      return 'scroll-m-20 text-xl font-semibold tracking-tight';
  }
}

/** Button variant → shadcn Button classes. */
function buttonClass(variant: unknown): string {
  const base =
    'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  switch (variant) {
    case 'secondary':
      return cx(base, 'bg-secondary text-secondary-foreground hover:bg-secondary/80');
    case 'outline':
      return cx(
        base,
        'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      );
    case 'ghost':
      return cx(base, 'hover:bg-accent hover:text-accent-foreground');
    case 'destructive':
      return cx(base, 'bg-destructive text-destructive-foreground hover:bg-destructive/90');
    default:
      return cx(base, 'bg-primary text-primary-foreground hover:bg-primary/90');
  }
}

interface ChartProps {
  kind?: 'line' | 'bar' | 'area' | 'pie';
  data?: Array<Record<string, unknown>>;
  /** Category key (x axis / pie label). Defaults to `name`. */
  x?: string;
  /** Value key(s). Defaults to `value`. */
  y?: string;
  height?: number;
}

const CHART_COLORS = [
  'var(--chart-1, hsl(262 83% 58%))',
  'var(--chart-2, hsl(212 95% 48%))',
  'var(--chart-3, hsl(152 60% 45%))',
  'var(--chart-4, hsl(48 96% 53%))',
  'var(--chart-5, hsl(330 75% 56%))',
];

/** `chart` node → Recharts inside a responsive container. */
function ChartNode({ props }: { props: Record<string, unknown> }): ReactNode {
  const p = props as ChartProps;
  const data = Array.isArray(p.data) ? p.data : [];
  const xKey = p.x ?? 'name';
  const yKey = p.y ?? 'value';
  const height = typeof p.height === 'number' ? p.height : 240;
  const grid = <CartesianGrid strokeDasharray="3 4" className="stroke-border" vertical={false} />;
  const axes = (
    <>
      <XAxis
        dataKey={xKey}
        tickLine={false}
        axisLine={false}
        className="fill-muted-foreground text-xs"
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        className="fill-muted-foreground text-xs"
        width={28}
      />
    </>
  );

  let chart: ReactNode;
  switch (p.kind) {
    case 'bar':
      chart = (
        <BarChart data={data}>
          {grid}
          {axes}
          <Tooltip cursor={{ className: 'fill-muted/40' }} />
          <Bar dataKey={yKey} radius={[6, 6, 0, 0]} fill={CHART_COLORS[0]} />
        </BarChart>
      );
      break;
    case 'area':
      chart = (
        <AreaChart data={data}>
          <defs>
            <linearGradient id="sdui-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.32} />
              <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {grid}
          {axes}
          <Tooltip />
          <Area dataKey={yKey} stroke={CHART_COLORS[0]} strokeWidth={2.5} fill="url(#sdui-area)" />
        </AreaChart>
      );
      break;
    case 'pie':
      chart = (
        <PieChart>
          <Tooltip />
          <Pie
            data={data}
            dataKey={yKey}
            nameKey={xKey}
            innerRadius={56}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      );
      break;
    case 'line':
    default:
      chart = (
        <LineChart data={data}>
          {grid}
          {axes}
          <Tooltip />
          <Line dataKey={yKey} stroke={CHART_COLORS[0]} strokeWidth={2.5} dot={false} />
        </LineChart>
      );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {chart}
      </ResponsiveContainer>
    </div>
  );
}

/** `kpi.trend` → cor da pílula de variação (K3). */
function trendClass(trend: unknown): string {
  if (trend === 'up') return 'bg-green-50 text-green-700';
  if (trend === 'down') return 'bg-red-50 text-red-700';
  return 'bg-muted text-muted-foreground';
}

/** `badge.variant` → cores da pílula (K3). */
function badgeVariantClass(variant: unknown): string {
  if (variant === 'success') return 'border-green-200 bg-green-50 text-green-700';
  if (variant === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (variant === 'destructive') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-transparent bg-muted text-muted-foreground';
}

/** The known component map. Every entry returns shadcn/Recharts markup. */
const components: ComponentRegistry = {
  screen: ({ children }) => (
    <div data-sdui="screen" className="flex flex-col gap-4 text-foreground">
      {children}
    </div>
  ),
  section: ({ props, children }) => (
    <section className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm">
      {props.title !== undefined && (
        <h3 className="mb-3 text-sm font-semibold tracking-tight">{text(props.title)}</h3>
      )}
      {children}
    </section>
  ),
  stack: ({ props, children }) => <div className={stackClass(props)}>{children}</div>,
  heading: ({ props }) => (
    <h2 className={headingClass(props.level)}>{text(props.title ?? props.text)}</h2>
  ),
  text: ({ props, children }) => (
    <p
      className={cx(
        'text-sm leading-relaxed',
        props.muted ? 'text-muted-foreground' : 'text-foreground',
      )}
    >
      {props.text !== undefined ? text(props.text) : children}
    </p>
  ),
  button: ({ props }) => (
    <button type="button" className={buttonClass(props.variant)} disabled={props.disabled === true}>
      {text(props.label ?? props.text)}
    </button>
  ),
  image: ({ props }) => (
    <div className="overflow-hidden rounded-lg border border-border bg-muted">
      <img
        src={str(props.src)}
        alt={text(props.alt)}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  ),
  chart: ({ props }) => <ChartNode props={props} />,
  card: ({ props, children }) => (
    <div className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm">
      {props.title !== undefined && (
        <h3 className="mb-3 text-sm font-semibold tracking-tight">{text(props.title)}</h3>
      )}
      {children}
    </div>
  ),
  kpi: ({ props }) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {text(props.label)}
      </span>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-semibold tabular-nums tracking-tight">
          {text(props.value)}
        </span>
        {props.delta !== undefined && (
          <span
            className={cx(
              'mb-1 rounded-full px-1.5 py-0.5 text-xs font-medium',
              trendClass(props.trend),
            )}
          >
            {text(props.delta)}
          </span>
        )}
      </div>
    </div>
  ),
  badge: ({ props }) => (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        badgeVariantClass(props.variant),
      )}
    >
      {text(props.text ?? props.label)}
    </span>
  ),
  divider: ({ props }) =>
    props.label !== undefined ? (
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {text(props.label)}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
    ) : (
      <hr className="border-border" />
    ),
  list: ({ children }) => <div className="flex flex-col divide-y divide-border">{children}</div>,
  'list-item': ({ props }) => (
    <div className="flex items-center justify-between py-2.5">
      <span className={cx('text-sm', props.muted ? 'text-muted-foreground' : 'text-foreground')}>
        {text(props.label)}
      </span>
      {props.value !== undefined && (
        <span className="text-sm font-medium tabular-nums">{text(props.value)}</span>
      )}
    </div>
  ),
};

/** Component returned for any unmapped `type` — throws instead of degrading. */
function unknownType(type: string): SduiComponent {
  return () => {
    throw new Error(
      `[shadcnRegistry] Unknown SDUI type "${type}". This registry has no raw-HTML ` +
        `fallback by design (brief §6). Map the type before rendering.`,
    );
  };
}

/**
 * Builds the shadcn registry. The returned object is a Proxy: known types resolve
 * to their shadcn/Recharts component; any other key resolves to a throwing
 * component, so {@link SduiRenderer} surfaces the bad node instead of silently
 * rendering a `<div data-sdui-unknown>`.
 *
 * @param overrides Optional host components that win over the defaults (e.g. a
 *   host's real shadcn `<Button>` or extra `type`s). Overridden types are also
 *   considered "known".
 */
export function createShadcnRegistry(overrides: ComponentRegistry = {}): ComponentRegistry {
  const known: ComponentRegistry = { ...components, ...overrides };
  return new Proxy(known, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      // Unknown type — return a throwing component (no fallback).
      return unknownType(prop);
    },
    has() {
      // Report every key as present so renderNode never takes its unknown-type
      // branch; resolution (and the throw) happens here in `get`.
      return true;
    },
  });
}

/** Ready-to-use shadcn/Recharts registry — the builder's default. */
export const shadcnRegistry: ComponentRegistry = createShadcnRegistry();

/** The set of natively-mapped types (useful for tests / docs). */
export const SHADCN_REGISTRY_TYPES = Object.keys(components);
