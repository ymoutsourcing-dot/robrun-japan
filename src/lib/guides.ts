import jailTimeJson from "../../data/guides/jail-time.json";

export type SourceKind = "official" | "fan" | "data";

export interface GuideFact {
  text: string;
  source: string;
  note?: string;
  /** 出典の情報から本サイトが導いた内容 */
  derived?: boolean;
  value?: Record<string, number>;
}

export interface Guide {
  id: string;
  title: string;
  titleEn: string;
  summary: string;
  updatedAt: string;
  sources: Record<string, { label: string; url: string; kind: SourceKind }>;
  sections: { heading: string; facts: GuideFact[] }[];
  unknowns: string[];
}

export const jailTimeGuide = jailTimeJson as Guide;

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

export const GUIDES = [
  { id: "jail-time", title: jailTimeGuide.title, summary: jailTimeGuide.summary, ready: true },
  { id: "money", title: "金策：強盗・貨物・農園・化学研究所の比較", summary: "収益・必要設備・リスクの比較", ready: false },
  { id: "wipe", title: "ワイプ（連邦捜査）までの1週間の動き方", summary: "7日サイクルで何をするか", ready: false },
  { id: "police", title: "警察・逮捕・賄賂のしくみ", summary: "自首と賄賂、警官プレイ", ready: false },
];
