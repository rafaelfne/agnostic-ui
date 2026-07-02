import type { TemplateNode } from '@yukilabs/agnostic-ui-core';
import { describe, expect, it } from 'vitest';

import {
  childrenOf,
  getNodeAt,
  insertNodeAt,
  isAncestorPath,
  moveNode,
  removeNodeAt,
  updateNodeAt,
} from './nodePath';

/** screen > [ section > [heading, text], stack > [button] ] */
function tree(): TemplateNode {
  return {
    type: 'screen',
    children: [
      {
        type: 'section',
        children: [
          { type: 'heading', props: { title: 'Saldo' } },
          { type: 'text', props: { text: 'olá' } },
        ],
      },
      { type: 'stack', children: [{ type: 'button', props: { label: 'Investir' } }] },
    ],
  };
}

describe('K1 — nodePath (operações imutáveis na árvore)', () => {
  it('getNodeAt navega por índices; path inválido → undefined', () => {
    const root = tree();
    expect(getNodeAt(root, [])?.type).toBe('screen');
    expect(getNodeAt(root, [0, 1])?.type).toBe('text');
    expect(getNodeAt(root, [1, 0])?.type).toBe('button');
    expect(getNodeAt(root, [5])).toBeUndefined();
    expect(getNodeAt(root, [0, 0, 3])).toBeUndefined();
  });

  it('updateNodeAt aplica o patch sem mutar a original (structural sharing)', () => {
    const root = tree();
    const next = updateNodeAt(root, [0, 0], (node) => ({
      ...node,
      props: { title: 'Extrato' },
    }));
    expect(getNodeAt(next, [0, 0])?.props).toEqual({ title: 'Extrato' });
    expect(getNodeAt(root, [0, 0])?.props).toEqual({ title: 'Saldo' }); // original intacta
    expect(getNodeAt(next, [1])).toBe(getNodeAt(root, [1])); // ramo não tocado é compartilhado
  });

  it('insertNodeAt insere na posição (clampada) e removeNodeAt remove', () => {
    const root = tree();
    const inserted = insertNodeAt(root, [1], 99, { type: 'divider' });
    expect(childrenOf(getNodeAt(inserted, [1])!).map((n) => n.type)).toEqual(['button', 'divider']);
    const removed = removeNodeAt(inserted, [1, 0]);
    expect(childrenOf(getNodeAt(removed, [1])!).map((n) => n.type)).toEqual(['divider']);
    expect(removeNodeAt(root, [])).toBe(root); // raiz nunca é removida
  });

  it('preserva o campo `body` quando o nó usa body em vez de children', () => {
    const root: TemplateNode = { type: 'screen', body: [{ type: 'text' }] };
    const next = insertNodeAt(root, [], 1, { type: 'divider' });
    expect(next.body?.map((n) => n.type)).toEqual(['text', 'divider']);
    expect(next.children).toBeUndefined();
  });

  it('moveNode entre pais diferentes', () => {
    const root = tree();
    // heading [0,0] → stack [1] na posição 0
    const next = moveNode(root, [0, 0], [1], 0);
    expect(childrenOf(getNodeAt(next, [0])!).map((n) => n.type)).toEqual(['text']);
    expect(childrenOf(getNodeAt(next, [1])!).map((n) => n.type)).toEqual(['heading', 'button']);
  });

  it('moveNode no mesmo pai ajusta o índice ao mover para frente', () => {
    const root = tree();
    // section [0] → depois do stack (posição 2 do screen); após remoção vira posição 1
    const next = moveNode(root, [0], [], 2);
    expect(childrenOf(next).map((n) => n.type)).toEqual(['stack', 'section']);
  });

  it('moveNode ajusta o path do destino quando ele atravessa um irmão posterior', () => {
    const root = tree();
    // heading [0,0] → dentro do stack [1]: remover [0,0] NÃO desloca [1] (outro nível)…
    // …mas mover section [0] p/ dentro do stack [1,?] desloca: stack vira [0] após a remoção.
    const next = moveNode(root, [0], [1], 1);
    expect(childrenOf(next).map((n) => n.type)).toEqual(['stack']);
    expect(childrenOf(getNodeAt(next, [0])!).map((n) => n.type)).toEqual(['button', 'section']);
  });

  it('guardas fail-safe: drop no próprio subtree e origem inexistente devolvem a árvore intacta', () => {
    const root = tree();
    expect(moveNode(root, [0], [0, 1], 0)).toBe(root); // section p/ dentro dela mesma
    expect(moveNode(root, [7], [1], 0)).toBe(root); // origem não existe
    expect(moveNode(root, [], [1], 0)).toBe(root); // raiz não move
  });

  it('isAncestorPath: prefixo estrito e igualdade', () => {
    expect(isAncestorPath([0], [0, 1])).toBe(true);
    expect(isAncestorPath([0, 1], [0, 1])).toBe(true);
    expect(isAncestorPath([1], [0, 1])).toBe(false);
  });
});
