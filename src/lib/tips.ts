import tipsJson from "../../data/guides/tips.json";
import sharedSources from "../../data/guides/sources.json";
import cargoJson from "../../data/source/cargo.source.json";
import type { Source } from "./guides";

/** 出典つきの1行 */
export interface TipFact {
  text: string;
  sources: string[];
  /** 出典の数値から本サイトが計算したもの */
  derived?: boolean;
  note?: string;
  /** サイト内の関連ページ */
  link?: string;
}

export interface EventRow extends TipFact {
  label: string;
}

export interface TipEvent {
  id: string;
  nameJa: string;
  nameEn: string;
  kind: string;
  rows: EventRow[];
}

export interface LootNode {
  item: string;
  spots: number;
  min: number;
  max: number;
}

export interface Room {
  id: string;
  nameJa: string;
  nameEn: string;
  /** 入るのに必要なアイテム（空＝鍵なし） */
  access: string[];
  cabinets: number;
  depositBoxes: number;
  computers: { points: number; count: number }[];
  /** opener: 金庫を開けるアイテム（null＝記載なし） */
  safes: { opener: string | null }[];
  nodes: LootNode[];
  fixed: { item: string; count: number }[];
  cargo: { item: string; count: number }[];
  reported?: string[];
}

export interface HeistLocation {
  id: string;
  rrgId: string;
  nameJa: string;
  nameEn: string;
  aliasEn?: string;
  typeJa: string;
  districtJa: string;
  districtEn: string;
  districtSources: string[];
  districtNote?: string;
  staff: number;
  breaker: boolean;
  rooms: Room[];
  notable: string[];
  charge: { tablet: number; usb: number; depositBox: number; camera: number };
  fyiSpots: number | null;
  notes?: TipFact[];
  sources: string[];
}

export interface LootItem {
  ja: string;
  en: string;
  rarity: string | null;
  /** 故買屋への売値（1個・悪名レベル1）。現金は 1 */
  price: number | null;
}

export interface TipsData {
  updatedAt: string;
  gameBuild: string;
  priceNote: string;
  eventRules: TipFact[];
  events: TipEvent[];
  eventUnknowns: string[];
  locationNotes: TipFact[];
  locationUnknowns: string[];
  locations: HeistLocation[];
  items: Record<string, LootItem>;
  tips: TipFact[];
}

export const tipsData = tipsJson as unknown as TipsData;
export const tipSources = sharedSources as Record<string, Source>;

const cargoPrice = new Map((cargoJson as { items: { id: string; smugglerPrice: number | null }[] }).items.map((c) => [c.id, c.smugglerPrice]));

export function itemJa(id: string): string {
  return tipsData.items[id]?.ja ?? id;
}

/** レアリティ表記（RARITY_JA のキーに合わせて先頭大文字） */
export function rarityKey(r: string | null | undefined): string | undefined {
  return r ? r[0].toUpperCase() + r.slice(1) : undefined;
}

export interface Range {
  min: number;
  max: number;
}

export interface LocationStats {
  /** 探索ポイント（床・棚の決まった置き場所）の数 */
  lootPoints: number;
  cabinets: number;
  depositBoxes: number;
  computers: number;
  safes: number;
  lockedRooms: number;
  /** 全部を開けるのに必要な道具（アイテムID → 個数） */
  tools: { id: string; count: number }[];
  /** 鍵なしで入れる場所の決まった品の合計（全ポイントに出た場合） */
  free: Range;
  /** 鍵・カードの先の決まった品の合計 */
  locked: Range;
  /** 積荷を密輸業者に売った場合の合計 */
  cargo: number;
  cargoCount: number;
  /** 主な戦利品のうち最も高い売値 */
  best: { id: string; price: number } | null;
}

function roomValue(r: Room): Range {
  let min = 0;
  let max = 0;
  for (const n of r.nodes) {
    const p = tipsData.items[n.item]?.price ?? 0;
    min += n.spots * n.min * p;
    max += n.spots * n.max * p;
  }
  for (const f of r.fixed) {
    const p = tipsData.items[f.item]?.price ?? 0;
    min += f.count * p;
    max += f.count * p;
  }
  return { min, max };
}

const statsCache = new Map<string, LocationStats>();

export function locationStats(l: HeistLocation): LocationStats {
  const hit = statsCache.get(l.id);
  if (hit) return hit;
  const tools = new Map<string, number>();
  const add = (id: string, n = 1) => tools.set(id, (tools.get(id) ?? 0) + n);
  const s: LocationStats = {
    lootPoints: 0,
    cabinets: 0,
    depositBoxes: 0,
    computers: 0,
    safes: 0,
    lockedRooms: 0,
    tools: [],
    free: { min: 0, max: 0 },
    locked: { min: 0, max: 0 },
    cargo: 0,
    cargoCount: 0,
    best: null,
  };
  for (const r of l.rooms) {
    s.lootPoints += r.nodes.reduce((a, n) => a + n.spots, 0) + r.fixed.length;
    s.cabinets += r.cabinets;
    s.depositBoxes += r.depositBoxes;
    s.computers += r.computers.reduce((a, c) => a + c.count, 0);
    s.safes += r.safes.length;
    if (r.access.length) s.lockedRooms++;
    // 金の保管庫のように「部屋の扉＝金庫」の場合は二重に数えない
    for (const a of r.access) if (!tools.has(a)) add(a);
    for (const sf of r.safes) if (sf.opener && !r.access.includes(sf.opener)) add(sf.opener);
    const v = roomValue(r);
    const target = r.access.length ? s.locked : s.free;
    target.min += v.min;
    target.max += v.max;
    for (const c of r.cargo) {
      s.cargoCount += c.count;
      s.cargo += c.count * (cargoPrice.get(c.item) ?? 0);
    }
  }
  s.tools = [...tools].map(([id, count]) => ({ id, count }));
  for (const id of l.notable) {
    const p = tipsData.items[id]?.price;
    if (p && (!s.best || p > s.best.price)) s.best = { id, price: p };
  }
  statsCache.set(l.id, s);
  return s;
}

export function cargoSmugglerPrice(id: string): number | null {
  return cargoPrice.get(id) ?? null;
}
