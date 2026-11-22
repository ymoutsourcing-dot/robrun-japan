import type { CategoryId, ShipmentItem } from "../types/shipment";
import { categories, items } from "./data";

export const NODE_W = 200;
export const NODE_H = 64;
const GAP_X = 48;
const GAP_Y = 14;
const BAND_GAP_Y = 80;
const COL_GAP_X = 140;
const HEADER_H = 44;

export interface LaidOutNode {
  item: ShipmentItem;
  x: number;
  y: number;
}
export interface LaidOutHeader {
  category: CategoryId;
  x: number;
  y: number;
  count: number;
}

interface Band {
  category: CategoryId;
  count: number;
  width: number;
  height: number;
  nodes: { item: ShipmentItem; x: number; y: number }[];
}

/** 1カテゴリー分を左→右の木構造で配置（座標はバンド内の相対値） */
function layoutBand(cat: CategoryId): Band {
  const catItems = items.filter((i) => i.category === cat);
  const inCat = new Set(catItems.map((i) => i.id));
  const children = new Map<string, ShipmentItem[]>();
  const roots: ShipmentItem[] = [];
  for (const it of catItems) {
    const parent = it.prerequisites.find((p) => inCat.has(p));
    if (parent) {
      const list = children.get(parent) ?? [];
      list.push(it);
      children.set(parent, list);
    } else roots.push(it);
  }
  // 兄弟の並びはゲーム内のレイアウト順（order）
  const byOrder = (a: ShipmentItem, b: ShipmentItem) => a.order - b.order;
  roots.sort(byOrder);
  children.forEach((l) => l.sort(byOrder));

  let leaf = 0;
  let maxDepth = 0;
  const pos = new Map<string, { depth: number; row: number }>();
  const place = (it: ShipmentItem, depth: number): number => {
    maxDepth = Math.max(maxDepth, depth);
    const kids = children.get(it.id) ?? [];
    let row: number;
    if (!kids.length) row = leaf++;
    else {
      const rows = kids.map((k) => place(k, depth + 1));
      row = (rows[0] + rows[rows.length - 1]) / 2;
    }
    pos.set(it.id, { depth, row });
    return row;
  };
  roots.forEach((r) => place(r, 0));

  return {
    category: cat,
    count: catItems.length,
    width: (maxDepth + 1) * (NODE_W + GAP_X) - GAP_X,
    height: HEADER_H + leaf * (NODE_H + GAP_Y),
    nodes: catItems.map((it) => {
      const p = pos.get(it.id)!;
      return { item: it, x: p.depth * (NODE_W + GAP_X), y: HEADER_H + p.row * (NODE_H + GAP_Y) };
    }),
  };
}

/**
 * カテゴリーごとの木を、画面の縦横比に近づくよう複数列に詰めて配置する。
 * 各カテゴリーは「最も低い列」に順番に追加する。
 */
export function layoutTree(visibleCategories: CategoryId[], columns = 3): { nodes: LaidOutNode[]; headers: LaidOutHeader[] } {
  const bands = categories.filter((c) => visibleCategories.includes(c.id)).map((c) => layoutBand(c.id));
  const colCount = Math.max(1, Math.min(columns, bands.length));
  const cols: { bands: Band[]; height: number }[] = Array.from({ length: colCount }, () => ({ bands: [], height: 0 }));
  for (const b of bands) {
    const target = cols.reduce((min, c) => (c.height < min.height ? c : min), cols[0]);
    target.bands.push(b);
    target.height += b.height + BAND_GAP_Y;
  }
  const nodes: LaidOutNode[] = [];
  const headers: LaidOutHeader[] = [];
  let colX = 0;
  for (const col of cols) {
    let y = 0;
    let colW = 0;
    for (const b of col.bands) {
      headers.push({ category: b.category, x: colX, y, count: b.count });
      for (const n of b.nodes) nodes.push({ item: n.item, x: colX + n.x, y: y + n.y });
      y += b.height + BAND_GAP_Y;
      colW = Math.max(colW, b.width);
    }
    colX += colW + COL_GAP_X;
  }
  return { nodes, headers };
}

/** リスト表示用: 親→子の深さ優先順に並べ、各項目の深さ（インデント）を返す */
export function treeOrder(cat: CategoryId): { item: ShipmentItem; depth: number }[] {
  const catItems = items.filter((i) => i.category === cat);
  const inCat = new Set(catItems.map((i) => i.id));
  const byOrder = (a: ShipmentItem, b: ShipmentItem) => a.order - b.order;
  const kids = (id: string) => catItems.filter((i) => i.prerequisites.includes(id)).sort(byOrder);
  const out: { item: ShipmentItem; depth: number }[] = [];
  const walk = (it: ShipmentItem, depth: number) => {
    out.push({ item: it, depth });
    kids(it.id).forEach((k) => walk(k, depth + 1));
  };
  catItems.filter((i) => !i.prerequisites.some((p) => inCat.has(p))).sort(byOrder).forEach((r) => walk(r, 0));
  return out;
}
