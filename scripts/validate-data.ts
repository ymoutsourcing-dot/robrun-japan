/**
 * 生成済みデータ（src/generated/shipments.json）の整合性チェック。
 * エラーがあれば exit code 1 で終了する（CI / ビルド前に実行）。
 *
 *   npm run validate
 */
import { readFileSync } from "node:fs";
import type { ShipmentDataset } from "../src/types/shipment";

const ds = JSON.parse(readFileSync("src/generated/shipments.json", "utf8")) as ShipmentDataset;
const errors: string[] = [];
const notes: string[] = [];

const ids = new Set<string>();
for (const it of ds.items) {
  if (ids.has(it.id)) errors.push(`ID重複: ${it.id}`);
  ids.add(it.id);
}

for (const it of ds.items) {
  const where = `${it.id} (${it.nameEn})`;
  if (!it.nameEn) errors.push(`英語名なし: ${where}`);
  if (!it.nameJa) errors.push(`日本語名なし: ${where}`);
  if (!it.descriptionJa || it.descriptionJa === "（未翻訳）") errors.push(`未翻訳: ${where}`);
  if (/[a-z]{4,}\s[a-z]{4,}\s[a-z]{4,}/.test(it.descriptionJa) && !it.descriptionJa.includes("原文"))
    notes.push(`日本語説明に英文が残っている可能性: ${where}`);
  for (const p of it.prerequisites) if (!ids.has(p)) errors.push(`前提研究が存在しない: ${where} -> ${p}`);
  if (it.prerequisites.includes(it.id)) errors.push(`自己参照: ${where}`);
  if (it.researchCost !== null && (it.researchCost < 0 || !Number.isInteger(it.researchCost)))
    errors.push(`研究費が不正: ${where} = ${it.researchCost}`);
  if (it.purchaseCost !== null && it.purchaseCost < 0) errors.push(`購入価格が不正: ${where}`);
  if (it.requiredSettlementLevel !== null && ![1, 2, 3].includes(it.requiredSettlementLevel))
    errors.push(`地区レベルが範囲外: ${where} = ${it.requiredSettlementLevel}`);
  if (it.recommendedPriority !== null && ![1, 2, 3, 4, 5].includes(it.recommendedPriority))
    errors.push(`おすすめ度が範囲外: ${where}`);
  if (!["verified", "sourced", "unverified", "outdated"].includes(it.verificationStatus))
    errors.push(`ステータス不正: ${where}`);
  if (!it.sourceUrl) errors.push(`情報源URLなし: ${where}`);
  if (it.purchaseCost === null) notes.push(`購入価格 未確認: ${where}`);
  if (it.rarity === null) notes.push(`レアリティ 未確認: ${where}`);
}

// 循環参照チェック
const byId = new Map(ds.items.map((i) => [i.id, i]));
const state = new Map<string, 0 | 1 | 2>();
function visit(id: string, path: string[]): void {
  const s = state.get(id);
  if (s === 2) return;
  if (s === 1) {
    errors.push(`循環参照: ${[...path, id].join(" -> ")}`);
    return;
  }
  state.set(id, 1);
  for (const p of byId.get(id)?.prerequisites ?? []) visit(p, [...path, id]);
  state.set(id, 2);
}
for (const it of ds.items) visit(it.id, []);

// 前提研究の地区レベルが子より高くないか（データ矛盾の検出）
for (const it of ds.items)
  for (const p of it.prerequisites) {
    const parent = byId.get(p);
    if (
      parent &&
      parent.requiredSettlementLevel !== null &&
      it.requiredSettlementLevel !== null &&
      parent.requiredSettlementLevel > it.requiredSettlementLevel
    )
      notes.push(`前提研究の方が必要地区レベルが高い: ${p}(${parent.requiredSettlementLevel}) -> ${it.id}(${it.requiredSettlementLevel})`);
  }

// 攻略ガイド：出典キーの存在チェック
{
  const shared = JSON.parse(readFileSync("data/guides/sources.json", "utf8")) as Record<string, unknown>;
  // マップ解説（data/guides/maps/*.json）は maps/sources.json の出典も使える
  const mapShared = JSON.parse(readFileSync("data/guides/maps/sources.json", "utf8")) as Record<string, unknown>;
  const MAP_FILES = ["maps/looty-bay", "maps/motel", "maps/prison", "maps/sales-center", "maps/settlements"];
  const guideIds = new Set<string>();
  const guides = ["jail-time", "money", "wipe", "police", "production", ...MAP_FILES].map((f) => ({
    f,
    g: JSON.parse(readFileSync(`data/guides/${f}.json`, "utf8")) as {
      id: string;
      sources: Record<string, unknown>;
      sections: { facts: { source: string; link?: string }[] }[];
      unknowns: string[];
      methods?: { source: string; setup: string[] }[];
      days?: { source: string }[];
      deathRules?: { source: string }[];
      places?: { source: string; link?: string }[];
      districtsSources?: string[];
    },
  }));
  for (const { f, g } of guides) {
    if (guideIds.has(g.id)) errors.push(`ガイド ${f}: id重複: ${g.id}`);
    guideIds.add(g.id);
  }
  // サイト内リンク：存在するページ（/shipments/:id はアイテム、/guides/:id はガイドの存在も確認）
  const PAGES = new Set(["/", "/shipments", "/items", "/calculator", "/calc", "/recommended", "/progress", "/about", "/changelog", "/guides", "/weapons", "/vehicles", "/cargo", "/tools", "/tips"]);
  const linkOk = (link: string) => {
    const path = link.split(/[?#]/)[0];
    const m = /^\/(shipments|guides)\/([^/]+)$/.exec(path);
    if (m) return m[1] === "shipments" ? ids.has(m[2]) : guideIds.has(m[2]);
    return PAGES.has(path);
  };
  for (const { f, g } of guides) {
    const isMap = f.startsWith("maps/");
    const has = (k: string) => k in g.sources || k in shared || (isMap && k in mapShared);
    const refs = [
      ...g.sections.flatMap((s) => s.facts.map((x) => x.source)),
      ...(g.methods ?? []).map((m) => m.source),
      ...(g.days ?? []).map((d) => d.source),
      ...(g.deathRules ?? []).map((d) => d.source),
      ...(g.places ?? []).map((p) => p.source),
      ...(g.districtsSources ?? []),
    ];
    for (const r of refs) if (!has(r)) errors.push(`ガイド ${f}: 出典キーが存在しない: ${r}`);
    for (const m of g.methods ?? []) for (const id of m.setup) if (!ids.has(id)) errors.push(`ガイド ${f}: 存在しないアイテム: ${id}`);
    if (isMap) {
      const links = [...g.sections.flatMap((s) => s.facts.map((x) => x.link)), ...(g.places ?? []).map((p) => p.link)];
      for (const l of links) if (l !== undefined && !linkOk(l)) errors.push(`ガイド ${f}: リンク先が存在しない: ${l}`);
      if (!g.unknowns.length) errors.push(`ガイド ${f}: 「まだ分かっていないこと」が空`);
    }
  }
}

// 使い方・入手方法（data/guides/item-usage.json）：ID・出典キー・リンク先アイテムの存在チェックと収録数
{
  const shared = JSON.parse(readFileSync("data/guides/sources.json", "utf8")) as Record<string, unknown>;
  type Line = string | { text: string; items?: string[]; source?: string };
  const usage = JSON.parse(readFileSync("data/guides/item-usage.json", "utf8")) as {
    items: Record<
      string,
      {
        effectsJa?: { label: string; value: string; source?: string; detail?: string; detailSource?: string }[];
        enablesJa?: Line[];
        requiresJa?: Line[];
        usageJa?: Line[];
        statsJa?: { label: string; value: string }[];
        obtainJa?: Line[];
        usedForJa?: Line[];
        sources: string[];
        notes?: string;
      }
    >;
  };
  const count = { effects: 0, usage: 0, enables: 0, requires: 0, stats: 0, obtain: 0, usedFor: 0, any: 0 };
  for (const [id, u] of Object.entries(usage.items)) {
    const where = `item-usage ${id}`;
    if (!ids.has(id)) errors.push(`${where}: 存在しないアイテム`);
    if (!Array.isArray(u.sources) || u.sources.length === 0) errors.push(`${where}: sources が空`);
    for (const k of u.sources ?? []) if (!(k in shared)) errors.push(`${where}: 出典キーが存在しない: ${k}`);
    const lines = [u.enablesJa, u.requiresJa, u.usageJa, u.obtainJa, u.usedForJa].flatMap((x) => x ?? []);
    for (const l of lines) {
      if (typeof l === "string") {
        if (!l.trim()) errors.push(`${where}: 空の行`);
        continue;
      }
      if (!l.text?.trim()) errors.push(`${where}: 空の行`);
      if (l.source && !(l.source in shared)) errors.push(`${where}: 出典キーが存在しない: ${l.source}`);
      for (const ref of l.items ?? []) if (!ids.has(ref)) errors.push(`${where}: リンク先アイテムが存在しない: ${ref}`);
    }
    for (const s of u.statsJa ?? []) if (!s.label || !s.value) errors.push(`${where}: statsJa に空の項目`);
    for (const f of u.effectsJa ?? []) {
      if (!f.label || !f.value) errors.push(`${where}: effectsJa に空の項目`);
      for (const k of [f.source, f.detailSource]) if (k && !(k in shared)) errors.push(`${where}: 出典キーが存在しない: ${k}`);
    }
    if (u.effectsJa?.length) count.effects++;
    if (u.usageJa?.length) count.usage++;
    if (u.enablesJa?.length) count.enables++;
    if (u.requiresJa?.length) count.requires++;
    if (u.statsJa?.length) count.stats++;
    if (u.obtainJa?.length) count.obtain++;
    if (u.usedForJa?.length) count.usedFor++;
    if (lines.length || u.statsJa?.length || u.effectsJa?.length) count.any++;
  }
  const alt = ds.items.filter((i) => i.purchaseCost === null && i.purchaseCostAlt != null).length;
  console.log(
    `使い方・入手方法: ${count.any}/${ds.items.length} 件（効果 ${count.effects} / 使い方 ${count.usage} / できること ${count.enables} / 必要なもの ${count.requires} / 性能 ${count.stats} / 入手 ${count.obtain} / 使い道 ${count.usedFor}）、購入価格の別出典 ${alt} 件`,
  );
  for (const it of ds.items) if (!usage.items[it.id]) notes.push(`使い方・入手方法 未収録: ${it.id}`);
}

// ゲーム風レイアウト（data/layout/game-layout.json）：全項目に位置があり、同じマスに2つ置かれていないか
{
  const gl = JSON.parse(readFileSync("data/layout/game-layout.json", "utf8")) as {
    categories: Record<string, { order: number; direction: "up" | "down"; col: number }>;
    nodes: Record<string, { col: number; row: number; hidden?: boolean }>;
  };
  for (const c of ds.categories) {
    const gc = gl.categories[c.id];
    if (!gc) errors.push(`ゲーム風レイアウト: カテゴリーの位置なし: ${c.id}`);
    else if (gc.direction !== "up" && gc.direction !== "down") errors.push(`ゲーム風レイアウト: direction が不正: ${c.id}`);
  }
  for (const id of Object.keys(gl.nodes)) if (!ids.has(id)) errors.push(`ゲーム風レイアウト: 存在しないアイテム: ${id}`);
  // 絶対位置（向き・段・列）で重なりをチェック。カテゴリー内だけでなく隣のカテゴリーとの重なりも検出する
  const cells: { id: string; dir: string; row: number; x: number }[] = [];
  for (const it of ds.items) {
    const p = gl.nodes[it.id];
    const gc = gl.categories[it.category];
    if (!p) {
      errors.push(`ゲーム風レイアウト: 位置なし: ${it.id}`);
      continue;
    }
    if (!Number.isInteger(p.row) || p.row < 1) errors.push(`ゲーム風レイアウト: row が不正: ${it.id} = ${p.row}`);
    if (!Number.isInteger(p.col * 2)) errors.push(`ゲーム風レイアウト: col は 0.5 刻み: ${it.id} = ${p.col}`);
    if (!gc) continue;
    for (const o of cells) {
      if (o.dir !== gc.direction || o.row !== p.row) continue;
      if (Math.abs(o.x - (gc.col + p.col)) < 1)
        errors.push(`ゲーム風レイアウト: 同じマス: ${o.id} と ${it.id}（${it.category} row ${p.row}）`);
    }
    cells.push({ id: it.id, dir: gc.direction, row: p.row, x: gc.col + p.col });
  }
}

const total = ds.items.reduce((s, i) => s + (i.researchCost ?? 0), 0);
console.log(`items: ${ds.items.length}`);
console.log(`研究費合計: $${total.toLocaleString()}`);
console.log(
  `status: ${JSON.stringify(
    ds.items.reduce<Record<string, number>>((a, i) => ((a[i.verificationStatus] = (a[i.verificationStatus] ?? 0) + 1), a), {}),
  )}`,
);
for (const n of notes) console.log("  note: " + n);
for (const w of ds.warnings) console.log("  build warning: " + w);
if (errors.length) {
  for (const e of errors) console.error("  ERROR: " + e);
  console.error(`${errors.length} error(s)`);
  process.exit(1);
}
console.log("OK");
