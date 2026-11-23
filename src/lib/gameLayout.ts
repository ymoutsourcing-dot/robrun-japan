/**
 * 「ゲーム風」レイアウト: ゲーム内の研究ツリー画面と同じく、横一本の中央線に
 * カテゴリーの写真を並べ、各カテゴリーの木を上（up）または下（down）に伸ばす。
 * 位置データは data/layout/game-layout.json（列・段のマス目）。ここでピクセル座標に変換する。
 */
import layoutJson from "../../data/layout/game-layout.json";
import type { CategoryId, ShipmentItem } from "../types/shipment";
import { categories, items } from "./data";

export type GameDirection = "up" | "down";

interface GameLayoutFile {
  lenny: { col: number };
  categories: Record<CategoryId, { order: number; direction: GameDirection; col: number }>;
  nodes: Record<string, { col: number; row: number; hidden?: boolean }>;
}
const layoutFile = layoutJson as unknown as GameLayoutFile;

/** アイテムの四角いマス */
export const GAME_NODE_W = 108;
export const GAME_NODE_H = 112;
/** 列・段の間隔（ゲーム内はマス 100 に対して 列 120 / 段 180） */
export const GAME_COL = 124;
export const GAME_ROW = 172;
/** 親から横線（バス）までの距離 */
export const GAME_BUS = (GAME_ROW - GAME_NODE_H) / 2;

/** カテゴリー写真 */
export const GAME_PHOTO_W = 140;
export const GAME_PHOTO_H = 160;
/** 中央の Lenny */
export const GAME_LENNY_W = 250;
export const GAME_LENNY_H = 340;

export interface GameNodePos {
  item: ShipmentItem;
  x: number;
  y: number;
  direction: GameDirection;
}
export interface GamePhotoPos {
  category: CategoryId;
  x: number;
  y: number;
  direction: GameDirection;
  count: number;
}
export interface GameLayout {
  nodes: GameNodePos[];
  photos: GamePhotoPos[];
  lenny: { x: number; y: number };
  /** 中央線の左右端 */
  line: { x1: number; x2: number };
}

export function gameDirection(cat: CategoryId): GameDirection {
  return layoutFile.categories[cat].direction;
}

/** ゲームでは表示されない項目（例: スモークグレネード）か */
export function isHiddenInGame(id: string): boolean {
  return layoutFile.nodes[id]?.hidden === true;
}

/**
 * 中央線を y = 0 とし、Lenny の中心を x = 0 とするピクセル座標（各ノードの左上）を返す。
 * 段 r のマスの中心は中央線から (r + 1) × GAME_ROW 離れる（ゲームの全体図に合わせた比率）。
 */
export function layoutGame(visibleCategories: CategoryId[]): GameLayout {
  const visible = new Set(visibleCategories);
  const catX = (cat: CategoryId) => layoutFile.categories[cat].col * GAME_COL;

  const nodes: GameNodePos[] = [];
  for (const it of items) {
    if (!visible.has(it.category)) continue;
    const p = layoutFile.nodes[it.id];
    if (!p || p.hidden) continue;
    const direction = gameDirection(it.category);
    const cx = catX(it.category) + p.col * GAME_COL;
    const dist = (p.row + 1) * GAME_ROW;
    const cy = direction === "up" ? -dist : dist;
    nodes.push({ item: it, x: cx - GAME_NODE_W / 2, y: cy - GAME_NODE_H / 2, direction });
  }

  const photos: GamePhotoPos[] = categories
    .filter((c) => visible.has(c.id))
    .sort((a, b) => layoutFile.categories[a.id].order - layoutFile.categories[b.id].order)
    .map((c) => {
      const direction = gameDirection(c.id);
      return {
        category: c.id,
        x: catX(c.id) - GAME_PHOTO_W / 2,
        // 上向きは写真の大半が線の上、下向きは線のすぐ下（ゲームと同じ）
        y: direction === "up" ? -GAME_PHOTO_H + 30 : -10,
        direction,
        count: items.filter((i) => i.category === c.id && !isHiddenInGame(i.id)).length,
      };
    });

  const lenny = { x: layoutFile.lenny.col * GAME_COL - GAME_LENNY_W / 2, y: -150 };

  const xs = [...nodes.map((n) => n.x), ...photos.map((p) => p.x), lenny.x];
  const xe = [...nodes.map((n) => n.x + GAME_NODE_W), ...photos.map((p) => p.x + GAME_PHOTO_W), lenny.x + GAME_LENNY_W];
  const line = { x1: Math.min(...xs) - GAME_COL * 2, x2: Math.max(...xe) + GAME_COL * 2 };

  return { nodes, photos, lenny, line };
}
