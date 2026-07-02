import type { TemplateNode } from '@yukilabs/agnostic-ui-core';

/**
 * Operações puras/imutáveis na árvore de `TemplateNode` do editor de telas (K1).
 * Paths são índices de filho a partir da raiz (`[]` = raiz, `[0,2]` = 3º filho do
 * 1º filho). Índices são a fonte de verdade da sessão de edição — `id` é opcional
 * e sem unicidade no schema. Toda operação retorna uma árvore NOVA (structural
 * sharing: só a espinha até o alvo é recriada); a original nunca muta.
 */
export type NodePath = number[];

/** Filhos de um nó — o renderer aceita `children` OU `body`. */
export function childrenOf(node: TemplateNode): TemplateNode[] {
  return node.children ?? node.body ?? [];
}

/** Recria o nó com novos filhos, preservando o campo que ele já usa (`body` vs `children`). */
function withChildren(node: TemplateNode, next: TemplateNode[]): TemplateNode {
  if (node.body !== undefined && node.children === undefined) return { ...node, body: next };
  return { ...node, children: next };
}

export function getNodeAt(root: TemplateNode, path: NodePath): TemplateNode | undefined {
  let current: TemplateNode | undefined = root;
  for (const index of path) {
    if (current === undefined) return undefined;
    current = childrenOf(current)[index];
  }
  return current;
}

/** Aplica `patch` ao nó em `path`; path inválido devolve a árvore intacta. */
export function updateNodeAt(
  root: TemplateNode,
  path: NodePath,
  patch: (node: TemplateNode) => TemplateNode,
): TemplateNode {
  if (path.length === 0) return patch(root);
  const [head, ...rest] = path;
  const kids = childrenOf(root);
  const child = head !== undefined ? kids[head] : undefined;
  if (head === undefined || child === undefined) return root;
  const nextKids = [...kids];
  nextKids[head] = updateNodeAt(child, rest, patch);
  return withChildren(root, nextKids);
}

/** Insere `node` como filho de `parentPath` na posição `index` (clampado). */
export function insertNodeAt(
  root: TemplateNode,
  parentPath: NodePath,
  index: number,
  node: TemplateNode,
): TemplateNode {
  return updateNodeAt(root, parentPath, (parent) => {
    const kids = [...childrenOf(parent)];
    const clamped = Math.max(0, Math.min(index, kids.length));
    kids.splice(clamped, 0, node);
    return withChildren(parent, kids);
  });
}

/** Remove o nó em `path`; a raiz (`[]`) nunca é removida. */
export function removeNodeAt(root: TemplateNode, path: NodePath): TemplateNode {
  if (path.length === 0) return root;
  const parentPath = path.slice(0, -1);
  const index = path[path.length - 1];
  return updateNodeAt(root, parentPath, (parent) => {
    const kids = childrenOf(parent);
    if (index === undefined || index < 0 || index >= kids.length) return parent;
    const nextKids = [...kids];
    nextKids.splice(index, 1);
    return withChildren(parent, nextKids);
  });
}

/** `a` é ancestral (ou igual) de `b`? — prefixo de path. */
export function isAncestorPath(a: NodePath, b: NodePath): boolean {
  if (a.length > b.length) return false;
  return a.every((segment, i) => segment === b[i]);
}

const samePath = (a: NodePath, b: NodePath): boolean =>
  a.length === b.length && isAncestorPath(a, b);

/**
 * Move o nó de `fromPath` para dentro de `toParentPath` na posição `toIndex`.
 * Guardas fail-safe (devolvem a árvore intacta): mover a raiz; drop no próprio
 * subtree; origem inexistente. Como a remoção acontece ANTES da inserção, os
 * índices do destino são reajustados quando o destino fica depois da origem no
 * mesmo pai (irmão direto ou subtree de um irmão posterior).
 */
export function moveNode(
  root: TemplateNode,
  fromPath: NodePath,
  toParentPath: NodePath,
  toIndex: number,
): TemplateNode {
  if (fromPath.length === 0) return root;
  if (isAncestorPath(fromPath, toParentPath)) return root;
  const node = getNodeAt(root, fromPath);
  if (node === undefined) return root;

  const fromParent = fromPath.slice(0, -1);
  const fromIndex = fromPath[fromPath.length - 1] ?? 0;

  // Reajuste pós-remoção: se o caminho do destino atravessa o pai da origem num
  // índice DEPOIS do removido, aquele segmento desloca 1 para trás.
  const adjustedParent = [...toParentPath];
  const crossSegment = adjustedParent[fromParent.length];
  const passesThroughFromParent =
    adjustedParent.length > fromParent.length && isAncestorPath(fromParent, adjustedParent);
  if (passesThroughFromParent && crossSegment !== undefined && crossSegment > fromIndex) {
    adjustedParent[fromParent.length] = crossSegment - 1;
  }
  // Mesmo pai: inserir depois da posição original também desloca 1.
  let adjustedIndex = toIndex;
  if (samePath(fromParent, toParentPath) && fromIndex < toIndex) {
    adjustedIndex = toIndex - 1;
  }

  const without = removeNodeAt(root, fromPath);
  return insertNodeAt(without, adjustedParent, adjustedIndex, node);
}
