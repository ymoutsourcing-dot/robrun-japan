import datasetJson from "../generated/shipments.json";
import recommendationsJson from "../generated/recommendations.json";
import type { CategoryId, CategoryInfo, ShipmentDataset, ShipmentItem } from "../types/shipment";

export const dataset = datasetJson as unknown as ShipmentDataset;
export const items: ShipmentItem[] = dataset.items;
export const categories: CategoryInfo[] = dataset.categories;

export const recommendations = (recommendationsJson as unknown as {
  items: Record<string, { priority: number; reason: string; sourceUrl?: string }>;
}).items;

export const itemById = new Map(items.map((i) => [i.id, i]));
export const categoryById = new Map(categories.map((c) => [c.id, c]));

export function getItem(id: string): ShipmentItem | undefined {
  return itemById.get(id);
}

export function categoryName(id: CategoryId): string {
  return categoryById.get(id)?.nameJa ?? id;
}

/** 表示名（同名アイテムには番号を付ける） */
export function displayNameJa(it: ShipmentItem): string {
  return it.variant ? `${it.nameJa} ${toRoman(it.variant)}` : it.nameJa;
}
export function displayNameEn(it: ShipmentItem): string {
  return it.variant ? `${it.nameEn} (#${it.variant})` : it.nameEn;
}

export function toRoman(n: number): string {
  return ["", "I", "II", "III", "IV", "V", "VI"][n] ?? String(n);
}

/** 前提研究を全てたどる（自身は含まない）。ルート側から順に並べる */
export function ancestorsOf(id: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const walk = (cur: string) => {
    const it = itemById.get(cur);
    if (!it) return;
    for (const p of it.prerequisites) {
      if (seen.has(p)) continue;
      seen.add(p);
      walk(p);
      out.push(p);
    }
  };
  walk(id);
  return out;
}

/** この研究から派生する全研究（子孫）の数 */
export function descendantCount(id: string): number {
  const seen = new Set<string>();
  const stack = [...(itemById.get(id)?.unlocks ?? [])];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    stack.push(...(itemById.get(cur)?.unlocks ?? []));
  }
  return seen.size;
}

export interface CostBreakdown {
  /** 解放が必要な研究（研究済みを除く、重複なし、前提→目標の順） */
  pending: ShipmentItem[];
  /** 既に研究済みで計算から除外したもの */
  alreadyDone: ShipmentItem[];
  researchTotal: number;
  /** 研究費が未確認の項目（null） */
  unknownResearch: ShipmentItem[];
  purchaseTotal: number;
  unknownPurchase: ShipmentItem[];
  maxSettlementLevel: number | null;
  maxImprisonmentYears: number;
}

/**
 * 目標研究（複数可）までに必要な費用を計算する。
 * - 研究済みは除外
 * - 共通の前提研究は 1 回だけ数える
 * - 研究費と購入費は分けて集計（購入費は目標アイテムのみ）
 */
export function computeCost(targetIds: string[], researched: ReadonlySet<string>): CostBreakdown {
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const t of targetIds) {
    for (const a of [...ancestorsOf(t), t]) {
      if (!seen.has(a)) {
        seen.add(a);
        ordered.push(a);
      }
    }
  }
  const all = ordered.map((id) => itemById.get(id)!).filter(Boolean);
  const pending = all.filter((i) => !researched.has(i.id));
  const alreadyDone = all.filter((i) => researched.has(i.id));
  const targets = targetIds.map((id) => itemById.get(id)!).filter(Boolean);

  let researchTotal = 0;
  const unknownResearch: ShipmentItem[] = [];
  for (const i of pending) {
    if (i.researchCost === null) unknownResearch.push(i);
    else researchTotal += i.researchCost;
  }
  let purchaseTotal = 0;
  const unknownPurchase: ShipmentItem[] = [];
  for (const t of targets) {
    if (t.purchaseCost === null) unknownPurchase.push(t);
    else purchaseTotal += t.purchaseCost;
  }
  const levels = all.map((i) => i.requiredSettlementLevel).filter((l): l is number => l !== null);
  return {
    pending,
    alreadyDone,
    researchTotal,
    unknownResearch,
    purchaseTotal,
    unknownPurchase,
    maxSettlementLevel: levels.length ? Math.max(...levels) : null,
    maxImprisonmentYears: Math.max(0, ...all.map((i) => i.requiredImprisonmentYears)),
  };
}

/** 検索用の正規化（全角半角・大文字小文字・カタカナ/ひらがなを吸収） */
export function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .replace(/[\s・\-_.()（）]/g, "");
}

const searchIndex = new Map(
  items.map((i) => [
    i.id,
    normalize(
      [i.nameJa, i.nameEn, i.descriptionJa, i.descriptionEn, categoryName(i.category), i.subcategory ?? "", ...i.tags].join(
        " ",
      ),
    ),
  ]),
);

export function matchesQuery(it: ShipmentItem, q: string): boolean {
  const n = normalize(q);
  if (!n) return true;
  return searchIndex.get(it.id)!.includes(n);
}
