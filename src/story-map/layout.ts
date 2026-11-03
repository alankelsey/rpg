import type { Choice, Scene, Story } from '../engine';

export const MAP_NODE_WIDTH = 248;
export const MAP_NODE_HEIGHT = 126;
export const MAP_COLUMN_GAP = 150;
export const MAP_ROW_GAP = 32;
export const MAP_PADDING = 56;

export interface StoryMapNode {
  id: string;
  scene: Scene;
  depth: number;
  x: number;
  y: number;
  reachable: boolean;
}

export interface StoryMapEdge {
  id: string;
  source: string;
  target: string;
  choice: Choice;
}

export interface StoryMapLayout {
  nodes: StoryMapNode[];
  edges: StoryMapEdge[];
  width: number;
  height: number;
}

/**
 * Produces a stable left-to-right flow layout from story data. The current stories are DAGs,
 * but the fallback depth pass keeps a future story with a loop viewable instead of hanging.
 */
export function layoutStory(story: Story): StoryMapLayout {
  const sceneIds = Object.keys(story.scenes);
  const sceneOrder = new Map(sceneIds.map((id, index) => [id, index]));
  const edges: StoryMapEdge[] = [];
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const [source, scene] of Object.entries(story.scenes)) {
    for (const [index, choice] of (scene.choices ?? []).entries()) {
      if (!story.scenes[choice.to]) continue;
      edges.push({ id: `${source}/${choice.id}/${index}`, source, target: choice.to, choice });
      outgoing.set(source, [...(outgoing.get(source) ?? []), choice.to]);
      incoming.set(choice.to, [...(incoming.get(choice.to) ?? []), source]);
    }
  }

  const reachable = findReachable(story.start, outgoing);
  const depth = longestDagDepth(sceneIds, incoming, outgoing, reachable);
  const maxReachableDepth = Math.max(0, ...[...reachable].map((id) => depth.get(id) ?? 0));
  for (const id of sceneIds) {
    if (!reachable.has(id)) depth.set(id, maxReachableDepth + 1);
  }

  const layers = new Map<number, string[]>();
  for (const id of sceneIds) {
    const layer = depth.get(id) ?? 0;
    layers.set(layer, [...(layers.get(layer) ?? []), id]);
  }

  // Put nodes near their parents to reduce crossings while retaining stable source order on ties.
  for (const [layer, ids] of [...layers.entries()].sort(([a], [b]) => a - b)) {
    if (layer === 0) continue;
    const previousPositions = new Map<string, number>();
    for (const [previousLayer, previousIds] of layers) {
      if (previousLayer >= layer) continue;
      previousIds.forEach((id, index) => previousPositions.set(id, index));
    }
    ids.sort((a, b) => {
      const aScore = parentScore(a, incoming, previousPositions);
      const bScore = parentScore(b, incoming, previousPositions);
      return aScore - bScore || (sceneOrder.get(a) ?? 0) - (sceneOrder.get(b) ?? 0);
    });
  }

  const maxRows = Math.max(1, ...[...layers.values()].map((ids) => ids.length));
  const height = MAP_PADDING * 2 + maxRows * MAP_NODE_HEIGHT + (maxRows - 1) * MAP_ROW_GAP;
  const maxDepth = Math.max(0, ...layers.keys());
  const width = MAP_PADDING * 2 + (maxDepth + 1) * MAP_NODE_WIDTH + maxDepth * MAP_COLUMN_GAP;
  const nodes: StoryMapNode[] = [];

  for (const [layer, ids] of layers) {
    const layerHeight = ids.length * MAP_NODE_HEIGHT + Math.max(0, ids.length - 1) * MAP_ROW_GAP;
    const offsetY = (height - layerHeight) / 2;
    ids.forEach((id, row) => {
      nodes.push({
        id,
        scene: story.scenes[id]!,
        depth: layer,
        x: MAP_PADDING + layer * (MAP_NODE_WIDTH + MAP_COLUMN_GAP),
        y: offsetY + row * (MAP_NODE_HEIGHT + MAP_ROW_GAP),
        reachable: reachable.has(id),
      });
    });
  }

  return { nodes, edges, width, height };
}

function findReachable(start: string, outgoing: Map<string, string[]>): Set<string> {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push(...(outgoing.get(id) ?? []));
  }
  return seen;
}

function longestDagDepth(
  sceneIds: string[],
  incoming: Map<string, string[]>,
  outgoing: Map<string, string[]>,
  reachable: Set<string>,
): Map<string, number> {
  const indegree = new Map<string, number>();
  for (const id of reachable) {
    indegree.set(id, (incoming.get(id) ?? []).filter((parent) => reachable.has(parent)).length);
  }
  const queue = sceneIds.filter((id) => reachable.has(id) && indegree.get(id) === 0);
  const depth = new Map<string, number>(queue.map((id) => [id, 0]));
  const processed = new Set<string>();

  while (queue.length > 0) {
    const source = queue.shift()!;
    processed.add(source);
    for (const target of outgoing.get(source) ?? []) {
      if (!reachable.has(target)) continue;
      depth.set(target, Math.max(depth.get(target) ?? 0, (depth.get(source) ?? 0) + 1));
      const remaining = (indegree.get(target) ?? 1) - 1;
      indegree.set(target, remaining);
      if (remaining === 0) queue.push(target);
    }
  }

  // Nodes left by a cycle use shortest distance from the start. This avoids an infinite
  // "longest path" while still placing the loop after the passages that lead to it.
  if (processed.size < reachable.size) {
    const start = sceneIds.find((id) => reachable.has(id) && (incoming.get(id) ?? []).every((p) => !reachable.has(p))) ?? sceneIds[0];
    if (start) {
      const queueByDistance: Array<[string, number]> = [[start, 0]];
      const seen = new Set<string>();
      while (queueByDistance.length > 0) {
        const [id, distance] = queueByDistance.shift()!;
        if (seen.has(id)) continue;
        seen.add(id);
        if (!processed.has(id)) depth.set(id, distance);
        for (const target of outgoing.get(id) ?? []) queueByDistance.push([target, distance + 1]);
      }
    }
  }
  return depth;
}

function parentScore(id: string, incoming: Map<string, string[]>, positions: Map<string, number>): number {
  const scores = (incoming.get(id) ?? []).flatMap((parent) => {
    const position = positions.get(parent);
    return position === undefined ? [] : [position];
  });
  return scores.length === 0 ? Number.MAX_SAFE_INTEGER : scores.reduce((sum, value) => sum + value, 0) / scores.length;
}
