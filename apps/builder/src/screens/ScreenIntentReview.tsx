import type { ReactElement } from 'react';

import { Badge } from '@/components/ui/badge';

import {
  type ScreenIntent,
  type ScreenIntentDiff,
  diffScreenIntent,
  screenIntent,
} from './screenIntent';

function TypesRow({
  intent,
  diff,
}: {
  intent: ScreenIntent;
  diff: ScreenIntentDiff;
}): ReactElement {
  const unknown = new Set(intent.unknownTypes);
  const added = new Set(diff.addedTypes);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground">Types:</span>
      {intent.types.length === 0 ? (
        <span className="text-muted-foreground">none</span>
      ) : (
        intent.types.map((type) => (
          <Badge
            key={type}
            variant={unknown.has(type) ? 'destructive' : added.has(type) ? 'warning' : 'secondary'}
          >
            {type}
            {unknown.has(type) ? ' · unknown' : added.has(type) ? ' (new)' : ''}
          </Badge>
        ))
      )}
    </div>
  );
}

/** Revisão de intenção de TELA p/ o ProposePanel genérico (K5): tipos usados, bindings
 *  e mudanças de rota/dataFlow vs o publicado — não JSON cru. */
export function ScreenIntentReview({
  screen,
  published,
}: {
  screen: unknown;
  published: unknown;
}): ReactElement {
  const intent = screenIntent(screen);
  const before = published !== null && published !== undefined ? screenIntent(published) : null;
  const diff = diffScreenIntent(before, intent);
  const addedBindings = new Set(diff.addedBindings);

  return (
    <div className="space-y-2 text-sm">
      <TypesRow intent={intent} diff={diff} />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground">Bindings:</span>
        {intent.bindings.length === 0 ? (
          <span className="text-muted-foreground">none</span>
        ) : (
          intent.bindings.map((binding) => (
            <code
              key={binding}
              className={
                addedBindings.has(binding)
                  ? 'rounded bg-amber-50 px-1 text-xs text-amber-700'
                  : 'rounded bg-muted px-1 text-xs'
              }
            >
              {binding}
            </code>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>
          route: <code className="text-foreground">{intent.route || '—'}</code>
          {diff.routeChanged && <span className="ml-1 text-amber-600">(changed)</span>}
        </span>
        <span>
          dataFlow: <code className="text-foreground">{intent.dataFlow || '—'}</code>
          {diff.dataFlowChanged && <span className="ml-1 text-amber-600">(changed)</span>}
        </span>
      </div>

      {intent.unknownTypes.length > 0 && (
        <p className="text-destructive">
          ⚠ unknown types (não renderizam): {intent.unknownTypes.join(', ')}
        </p>
      )}
    </div>
  );
}
