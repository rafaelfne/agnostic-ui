import type { TemplateNode } from '@yukilabs/agnostic-ui-core';

/**
 * Descritor de tela (mínimo da frente nativa, ADR 0005 §5): o `root` é o template
 * **bindável** (o renderer resolve `{{ }}` no cliente) e `dataFlow` é o flow cujo
 * resultado vira o `context` do documento. Stand-in in-code do config store, como
 * o `flowRegistry`; uma tela demo basta para fechar o loop BFF→cliente.
 */
export interface ScreenDescriptor {
  version: string;
  dataFlow: string;
  root: TemplateNode;
}

const HOME_ROOT: TemplateNode = {
  type: 'container',
  children: [
    { type: 'heading', props: { text: 'Saldo' } },
    { type: 'text', props: { value: '{{ amount }}' } },
  ],
};

const SCREENS: Record<string, ScreenDescriptor> = {
  home: { version: '1', dataFlow: 'get-balance', root: HOME_ROOT },
};

export function getScreen(id: string): ScreenDescriptor | undefined {
  return SCREENS[id];
}
