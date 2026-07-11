import { type ReactElement, useState } from 'react';
import { GripVertical, Search } from 'lucide-react';

import { Input } from '@/components/ui/input';

import { NEW_MIME } from './canvasRegistry';
import { VOCAB_GROUPS, VOCABULARY, type VocabEntry } from './screenVocabulary';

/** Paleta de componentes (K2): busca + 3 grupos; arraste p/ o canvas ou clique p/ anexar. */
export function Palette({ onAdd }: { onAdd: (type: string) => void }): ReactElement {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = (entry: VocabEntry): boolean =>
    q === '' || entry.type.includes(q) || entry.label.toLowerCase().includes(q);

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto border-r bg-sidebar/40 p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar componente…"
          className="h-8 pl-8 text-xs"
        />
      </div>

      {VOCAB_GROUPS.map((group) => {
        const items = VOCABULARY.filter((entry) => entry.group === group && matches(entry));
        if (items.length === 0) return null;
        return (
          <div key={group}>
            <p className="mb-1 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {group}
            </p>
            <ul className="flex flex-col gap-0.5">
              {items.map((entry) => (
                <li
                  key={entry.type}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(NEW_MIME, entry.type);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => onAdd(entry.type)}
                  className="flex cursor-grab items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 hover:border-border hover:bg-white active:cursor-grabbing"
                >
                  <GripVertical className="size-3.5 shrink-0 text-zinc-300" />
                  <entry.icon className="size-4 shrink-0 text-zinc-500" />
                  <span className="text-sm text-zinc-700">{entry.label}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <p className="mt-auto px-1 pt-2 text-[11px] leading-snug text-muted-foreground">
        Arraste para o canvas ou clique para adicionar ao container selecionado.
      </p>
    </div>
  );
}
