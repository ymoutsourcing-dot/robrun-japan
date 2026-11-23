import sharedSources from "../../data/guides/sources.json";
import jailTimeJson from "../../data/guides/jail-time.json";
import moneyJson from "../../data/guides/money.json";
import wipeJson from "../../data/guides/wipe.json";
import policeJson from "../../data/guides/police.json";
import productionJson from "../../data/guides/production.json";

export type SourceKind = "official" | "fan" | "data";
export interface Source {
  label: string;
  url: string;
  kind: SourceKind;
}

export interface GuideFact {
  text: string;
  source: string;
  note?: string;
  /** 出典の情報から本サイトが導いた内容 */
  derived?: boolean;
  /** サイト内の関連ページ */
  link?: string;
  value?: Record<string, number>;
}

export interface Guide {
  id: string;
  title: string;
  titleEn: string;
  summary: string;
  updatedAt: string;
  sources: Record<string, Source>;
  sections: { heading: string; facts: GuideFact[] }[];
  unknowns: string[];
}

export interface MoneyMethod {
  key: string;
  name: string;
  nameEn: string;
  setup: string[];
  setupNote: string;
  income: string;
  examples: { label: string; value: number; valueMax?: number; derived?: boolean }[];
  risk: string;
  needsBase: boolean;
  offline: boolean;
  source: string;
  note?: string;
  /** 時給を計算できる場合のモデル名（src/lib/production.ts） */
  hourly?: string;
  /** 時給を出せない理由 */
  hourlyNote?: string;
}
export type MoneyGuide = Guide & { methods: MoneyMethod[]; notoriety: { level: number; loot: number; cargo: number }[] };

export type WipeGuide = Guide & {
  schedule: { cycleDays: number; regions: { name: string; openUtc: string; openLocal: string; jst: string }[] };
  days: { day: string; title: string; items: string[]; source: string; derived?: boolean }[];
};

export type PoliceGuide = Guide & {
  copRewards: { label: string; value: string }[];
  copBonuses: { name: string; how: string; effect: string; duration: string }[];
  deathRules: { role: string; lose: string; source: string }[];
};

const shared = sharedSources as Record<string, Source>;
function withShared<T extends Guide>(g: T): T {
  return { ...g, sources: { ...shared, ...g.sources } };
}

export const jailTimeGuide = withShared(jailTimeJson as Guide);
export const moneyGuide = withShared(moneyJson as unknown as MoneyGuide);
export const wipeGuide = withShared(wipeJson as unknown as WipeGuide);
export const policeGuide = withShared(policeJson as unknown as PoliceGuide);

type Rates = Record<"Uncommon" | "Epic" | "Legendary", number>;
export type ProductionGuide = Guide & {
  model: {
    plantation: {
      growthPoints: number;
      tickSeconds: number;
      harvestMin: number;
      harvestMax: number;
      bushesPerTable: number;
      tablesPerRoom: number;
      bagPrice: Rates;
      upgrades: { id: string; speed: number }[];
    };
    freezer: {
      points: number;
      tickSeconds: number;
      levels: { id: string; slots: number }[];
      upgrades: { id: string; speed: number }[];
      concentratePrice: Rates;
      crystalPrice: Rates;
      powderPrice: Rates;
      /** 固形クリスタル1個を粉末にしたときの袋数（プレイヤー実測。未確認のレアリティは無し） */
      powderPerCrystal: Partial<Rates>;
    };
    reactor: {
      levels: { id: string; cycleSeconds: number; cycles: number }[];
      reagentPrice: { Uncommon: number; Epic: number };
      qualityUpgrades: { id: string; effectJa: string; purchaseFallback?: number; purchaseFallbackSource?: string }[];
    };
  };
};
export const productionGuide = withShared(productionJson as unknown as ProductionGuide);

export const ALL_GUIDES: Guide[] = [moneyGuide, productionGuide, wipeGuide, jailTimeGuide, policeGuide];
export const guideById = new Map(ALL_GUIDES.map((g) => [g.id, g]));

/** 計算に使う数値（robrun.info 掲載のファン情報。公式未発表） */
function factValue(key: string): number {
  for (const s of jailTimeGuide.sections)
    for (const f of s.facts) if (f.value && key in f.value) return f.value[key];
  throw new Error(`jail-time value not found: ${key}`);
}

export const JAIL = {
  base: factValue("base"),
  perAmount: factValue("perAmount"),
  perState: factValue("perState"),
  perDay: factValue("perDay"),
  total: factValue("total"),
};

/** 1回のワイプ（1つの州）で得られる年数の目安 */
export function yearsFromAssets(assets: number): number {
  if (assets <= 0) return JAIL.base;
  return Math.min(JAIL.perState, JAIL.base + Math.floor(assets / JAIL.perAmount));
}

/** 指定年数に必要な資産額（1州あたりの上限を超える場合は null） */
export function assetsForYears(years: number): number | null {
  if (years > JAIL.perState) return null;
  return Math.max(0, (years - JAIL.base) * JAIL.perAmount);
}

/** 不足年数を貯めるのに最短で何日かかるか（1日上限ベース） */
export function minDaysFor(missingYears: number): number {
  return missingYears <= 0 ? 0 : Math.ceil(missingYears / JAIL.perDay);
}
