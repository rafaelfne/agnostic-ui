import { type ReactElement } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useI18n } from '@/i18n/i18n';

const AXIS = { fill: 'var(--muted-foreground)', fontSize: 11, fontFamily: 'var(--font-sans)' };

/** Artifacts grouped by kind. */
export function ArtifactsByTypeChart({
  data,
}: {
  data: { type: string; count: number }[];
}): ReactElement {
  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={data} margin={{ top: 14, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 4" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="type" tickLine={false} axisLine={false} tick={AXIS} />
        <YAxis tickLine={false} axisLine={false} tick={AXIS} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
          contentStyle={{
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Published vs draft donut. */
export function PublicationChart({
  published,
  drafts,
}: {
  published: number;
  drafts: number;
}): ReactElement {
  const { t } = useI18n();
  const data = [
    { name: t('dash.statPublished'), value: published, fill: 'var(--success)' },
    { name: t('dash.statDrafts'), value: drafts, fill: 'var(--muted-foreground)' },
  ];
  return (
    <ResponsiveContainer width="100%" height={210}>
      <PieChart>
        <Tooltip
          contentStyle={{
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            fontSize: 12,
          }}
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={54}
          outerRadius={82}
          paddingAngle={3}
          strokeWidth={0}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Publishes per day (last 7 days). */
export function PublishActivityChart({
  data,
}: {
  data: { day: string; count: number }[];
}): ReactElement {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="pubArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 4" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={AXIS} />
        <YAxis tickLine={false} axisLine={false} tick={AXIS} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          fill="url(#pubArea)"
          dot={{ r: 3, fill: 'var(--card)', stroke: 'var(--chart-1)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
