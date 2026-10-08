export const LAYOUT_JS = String.raw`
function layoutGraph(items, edges, options) {
  const o = Object.assign({ boxW: 224, boxH: 84, gapX: 56, gapY: 14, pad: 16, groupGap: 0.5, groupPad: 8, groupHead: 22, looseMin: 4, looseGap: 44 }, options || {});
  const ids = new Set(items.map((i) => i.id));
  const parents = new Map(items.map((i) => [i.id, []]));
  const kids = new Map(items.map((i) => [i.id, []]));
  for (const [p, c] of edges) {
    if (p === c || !ids.has(p) || !ids.has(c) || parents.get(c).includes(p)) continue;
    parents.get(c).push(p);
    kids.get(p).push(c);
  }
  const linked = items.filter((i) => parents.get(i.id).length || kids.get(i.id).length);
  const loose = items.filter((i) => !parents.get(i.id).length && !kids.get(i.id).length);

  const col = new Map();
  const visiting = new Set();
  const depth = (id) => {
    if (col.has(id)) return col.get(id);
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const ps = parents.get(id);
    const d = ps.length ? 1 + Math.max(...ps.map(depth)) : 0;
    visiting.delete(id);
    col.set(id, d);
    return d;
  };
  linked.forEach((i) => depth(i.id));

  const byId = new Map(items.map((i) => [i.id, i]));
  const rootsRaw = linked.filter((i) => !parents.get(i.id).length);
  const roots = [];
  const seenKey = new Set();
  for (const r of rootsRaw) {
    if (!r.compare) roots.push(r);
    else if (!seenKey.has(r.compare)) {
      seenKey.add(r.compare);
      roots.push(...rootsRaw.filter((x) => x.compare === r.compare));
    }
  }

  const rowOf = new Map();
  let row = 0;
  const visit = (id) => {
    if (rowOf.has(id)) return;
    rowOf.set(id, -1);
    const own = kids.get(id).filter((c) => parents.get(c)[0] === id && !rowOf.has(c));
    if (!own.length) {
      rowOf.set(id, row++);
      return;
    }
    own.forEach(visit);
    const first = own.map((c) => rowOf.get(c)).find((r) => r >= 0);
    rowOf.set(id, first === undefined ? row++ : first);
  };
  let prevKey;
  let started = false;
  const start = (r) => {
    if (started && (r.compare || prevKey)) row += r.compare === prevKey ? 0 : o.groupGap;
    started = true;
    prevKey = r.compare || undefined;
    visit(r.id);
  };
  roots.forEach(start);
  linked.filter((i) => !rowOf.has(i.id)).forEach(start);

  const hasGroups = linked.some((i) => i.compare);
  const top = o.pad + (hasGroups ? o.groupHead : 0);
  const pitchX = o.boxW + o.gapX;
  const pitchY = o.boxH + o.gapY;
  const pos = {};
  let maxCol = -1;
  for (const i of linked) {
    const c = col.get(i.id);
    maxCol = Math.max(maxCol, c);
    pos[i.id] = { col: c, row: rowOf.get(i.id), x: o.pad + c * pitchX, y: top + rowOf.get(i.id) * pitchY };
  }
  const perRow = loose.length ? Math.max(maxCol + 1, o.looseMin) : maxCol + 1;
  const dagBottom = linked.length ? top + Math.max(0, row - 1) * pitchY + o.boxH : o.pad;
  const looseY = linked.length ? dagBottom + o.looseGap : o.pad;
  loose.forEach((i, n) => {
    const c = n % perRow;
    const r = Math.floor(n / perRow);
    pos[i.id] = { col: c, row: -1 - r, x: o.pad + c * pitchX, y: looseY + (linked.length ? 24 : 0) + r * pitchY };
  });

  const groups = [];
  const members = new Map();
  for (const i of linked) if (i.compare) members.set(i.compare, [...(members.get(i.compare) || []), i.id]);
  for (const [key, list] of members) {
    const ps = list.map((id) => pos[id]);
    const x0 = Math.min(...ps.map((p) => p.x)) - o.groupPad;
    const y0 = Math.min(...ps.map((p) => p.y)) - o.groupHead;
    groups.push({ key, ids: list, x: x0, y: y0, w: Math.max(...ps.map((p) => p.x)) + o.boxW + o.groupPad - x0, h: Math.max(...ps.map((p) => p.y)) + o.boxH + o.groupPad - y0 });
  }

  const looseRows = loose.length ? Math.ceil(loose.length / perRow) : 0;
  const cols = Math.max(1, perRow);
  const w = o.pad * 2 + cols * pitchX - o.gapX;
  const h = loose.length ? looseY + (linked.length ? 24 : 0) + looseRows * pitchY - o.gapY + o.pad : dagBottom + o.pad;
  return { pos, groups, w, h, cols: maxCol + 1, looseY: loose.length && linked.length ? looseY : null, order: items.map((i) => i.id).filter((id) => byId.has(id)) };
}

function bridgeEdges(items, edges, hidden) {
  const parents = new Map(items.map((i) => [i.id, []]));
  for (const [p, c] of edges) if (parents.has(c)) parents.get(c).push(p);
  const out = [];
  const seen = new Set();
  for (const i of items) {
    if (hidden.has(i.id)) continue;
    const stack = [...parents.get(i.id)];
    const visited = new Set();
    while (stack.length) {
      const p = stack.pop();
      if (visited.has(p)) continue;
      visited.add(p);
      if (hidden.has(p)) stack.push(...(parents.get(p) || []));
      else if (!seen.has(p + ">" + i.id)) {
        seen.add(p + ">" + i.id);
        out.push([p, i.id]);
      }
    }
  }
  return out;
}
`;

type Pos = { col: number; row: number; x: number; y: number };
export interface GraphLayout {
  pos: Record<string, Pos>;
  groups: { key: string; ids: string[]; x: number; y: number; w: number; h: number }[];
  w: number;
  h: number;
  cols: number;
  looseY: number | null;
}

export const layoutGraph = new Function(`${LAYOUT_JS}; return layoutGraph;`)() as (
  items: { id: string; compare?: string | null }[],
  edges: [string, string][],
  options?: Record<string, number>,
) => GraphLayout;

export const bridgeEdges = new Function(`${LAYOUT_JS}; return bridgeEdges;`)() as (
  items: { id: string }[],
  edges: [string, string][],
  hidden: Set<string>,
) => [string, string][];
