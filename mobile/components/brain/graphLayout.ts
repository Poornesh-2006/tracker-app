import type { KnowledgeNode } from '@/types';

export interface Placed {
  node: KnowledgeNode;
  x: number;
  y: number;
  depth: number;
  /** Index of the top-level topic this node belongs to (for coloring). */
  root: number;
  parent: { x: number; y: number } | null;
}

/**
 * Radial tree layout in a size×size box: top-level topics on a ring, each
 * subtree fanning outward along its parent's angle with a narrowing spread.
 * Orphans (parent deleted/missing) are treated as top-level so nothing vanishes.
 * Cycles are broken (each node is placed once) and positions are clamped to the box.
 */
export function layoutGraph(nodes: KnowledgeNode[], size: number): Placed[] {
  const cx = size / 2;
  const cy = size / 2;
  const ids = new Set(nodes.map((n) => n.id));
  const kids = new Map<number, KnowledgeNode[]>();
  for (const n of nodes) {
    if (n.parentId != null && ids.has(n.parentId) && n.parentId !== n.id) {
      kids.set(n.parentId, [...(kids.get(n.parentId) ?? []), n]);
    }
  }
  const roots = nodes.filter((n) => n.parentId == null || !ids.has(n.parentId) || n.parentId === n.id);
  const out: Placed[] = [];
  const seen = new Set<number>();
  const ring = roots.length === 1 ? 0 : size * 0.22;
  const step = size * 0.17;

  const place = (n: KnowledgeNode, x: number, y: number, angle: number, spread: number, depth: number, root: number, parent: Placed['parent']) => {
    if (seen.has(n.id)) return;
    seen.add(n.id);
    const entry: Placed = { node: n, x, y, depth, root, parent };
    out.push(entry);
    const children = kids.get(n.id) ?? [];
    children.forEach((child, i) => {
      const a = children.length === 1 ? angle : angle - spread / 2 + (i * spread) / (children.length - 1);
      // Children reference the parent's entry, so its later clamping moves their edge too.
      place(child, x + Math.cos(a) * step, y + Math.sin(a) * step, a, spread * 0.7, depth + 1, root, entry);
    });
  };

  roots.forEach((r, i) => {
    const angle = (i / Math.max(roots.length, 1)) * Math.PI * 2 - Math.PI / 2;
    place(r, cx + Math.cos(angle) * ring, cy + Math.sin(angle) * ring, angle, Math.min(1.6, (Math.PI * 2) / Math.max(roots.length, 1)), 0, i, null);
  });
  // Cycles (A→B→A) have no top-level node; break them so no topic vanishes.
  const leftovers = nodes.filter((n) => !seen.has(n.id));
  leftovers.forEach((n, i) => {
    if (seen.has(n.id)) return;
    const angle = (i / Math.max(leftovers.length, 1)) * Math.PI * 2;
    place(n, cx + Math.cos(angle) * size * 0.4, cy + Math.sin(angle) * size * 0.4, angle, 1, 0, roots.length + i, null);
  });
  // Deep subtrees can run off the canvas; keep everything inside.
  const pad = size * 0.06;
  for (const p of out) {
    p.x = Math.min(size - pad, Math.max(pad, p.x));
    p.y = Math.min(size - pad, Math.max(pad, p.y));
  }
  return out;
}
