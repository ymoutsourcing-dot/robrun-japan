import { productionGuide } from "./guides";

/**
 * 生産設備の時給計算（費用対効果ガイドと同じ前提）。
 * - 改造パーツの+%は「時間が%だけ短くなる」方式（プレイヤー報告で確認）
 * - 反応炉は1サイクル＝濃縮液1個（反応炉Iはプレイヤー確認済み：試薬1つで4個・60分）
 * - 品質パーツのレア度アップ確率は25%（プレイヤー実測）
 * - 売値は悪名ボーナス前、アンコモン基準
 */
const M = productionGuide.model;
const reduce = (base: number, pct: number) => base * Math.max(0.05, 1 - pct);

export interface HourlyEstimate {
  minLabel: string;
  min: number;
  maxLabel: string;
  max: number;
  note: string;
}

export function plantationHourly(): HourlyEstimate {
  const P = M.plantation;
  const base = P.growthPoints * P.tickSeconds;
  const avg = (P.harvestMin + P.harvestMax) / 2;
  const price = P.bagPrice.Uncommon;
  const allSpeed = P.upgrades.reduce((a, u) => a + u.speed, 0);
  const perHour = (bushes: number, sec: number) => (bushes * avg * price * 3600) / sec;
  return {
    minLabel: `テーブル1台・${P.bushesPerTable}株・パーツなし`,
    min: perHour(P.bushesPerTable, base),
    maxLabel: `テーブル${P.tablesPerRoom}台・${P.bushesPerTable * P.tablesPerRoom}株・パーツ全部`,
    max: perHour(P.bushesPerTable * P.tablesPerRoom, reduce(base, allSpeed)),
    note: "株は消費されず自動で再成長（最初に成長株を集める必要あり）",
  };
}

export function labHourly(): HourlyEstimate {
  const R = M.reactor;
  const F = M.freezer;
  const freezeBase = F.points * F.tickSeconds;
  const crystalsPerHour = (reactor: number, freezer: number, freezeSpeed: number) => {
    const r = R.levels[reactor];
    const conc = (r.cycles * 3600) / (r.cycles * r.cycleSeconds);
    const cap = (F.levels[freezer].slots * 3600) / reduce(freezeBase, freezeSpeed);
    return Math.min(conc, cap);
  };
  const price = F.crystalPrice.Uncommon;
  const engineBonus = 0.25 * (F.crystalPrice.Epic - F.crystalPrice.Uncommon);
  const allFreeze = F.upgrades.reduce((a, u) => a + u.speed, 0);
  return {
    minLabel: "反応炉I・冷凍庫I・パーツなし",
    min: crystalsPerHour(0, 0, 0) * price,
    maxLabel: "反応炉III・冷凍庫III・冷凍庫パーツ＋産業用エンジン（確率25%）",
    max: crystalsPerHour(2, 2, allFreeze) * (price + engineBonus),
    note: "試薬を消費する（反応炉1回につき試薬1つで濃縮液4個以上）",
  };
}

export const HOURLY: Record<string, () => HourlyEstimate> = {
  plantation: plantationHourly,
  lab: labHourly,
};
