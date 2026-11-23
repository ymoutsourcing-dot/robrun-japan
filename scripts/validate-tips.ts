/**
 * data/guides/tips.json（小ネタ・攻略メモ）の整合性チェック。
 *   - すべての出典キーが data/guides/sources.json にあるか（出典なしの行は不可）
 *   - サイト内リンク（link）が存在するページか
 *   - 建物データのアイテムIDが items にあるか・積荷が積荷データにあるか・ID重複が無いか
 *
 *   npx tsx scripts/validate-tips.ts
 */
import { existsSync, readFileSync } from "node:fs";

const read = <T>(p: string) => JSON.parse(readFileSync(p, "utf8")) as T;
const sources = read<Record<string, unknown>>("data/guides/sources.json");
const cargoIds = new Set(read<{ items: { id: string }[] }>("data/source/cargo.source.json").items.map((c) => c.id));
const shipments = new Set(read<{ nodes: { id: string }[] }>("data/source/shipments.source.json").nodes.map((n) => n.id));

interface Fact {
  text: string;
  sources: string[];
  link?: string;
}
interface Room {
  id: string;
  access: string[];
  safes: { opener: string | null }[];
  nodes: { item: string; spots: number; min: number; max: number }[];
  fixed: { item: string; count: number }[];
  cargo: { item: string; count: number }[];
}
interface Loc {
  id: string;
  nameJa: string;
  nameEn: string;
  districtJa: string;
  districtSources: string[];
  rooms: Room[];
  notable: string[];
  notes?: Fact[];
  sources: string[];
}
const data = read<{
  eventRules: Fact[];
  events: { id: string; nameJa: string; nameEn: string; rows: (Fact & { label: string })[] }[];
  eventUnknowns: string[];
  locationNotes: Fact[];
  locationUnknowns: string[];
  locations: Loc[];
  items: Record<string, { ja: string; en: string; price: number | null }>;
  tips: Fact[];
}>("data/guides/tips.json");

// サイト内のページ（App.tsx のルート）
const app = readFileSync("src/App.tsx", "utf8");
const routes = new Set([...app.matchAll(/path="([^"]+)"/g)].map((m) => "/" + m[1]));
function linkOk(link: string): boolean {
  const path = link.split("#")[0];
  if (path === "/") return true;
  if (routes.has(path)) return true;
  const g = path.match(/^\/guides\/([\w-]+)$/);
  if (g) return existsSync(`data/guides/${g[1]}.json`);
  const s = path.match(/^\/shipments\/([\w-]+)$/);
  if (s) return shipments.has(s[1]);
  return false;
}

const errors: string[] = [];
const checkSrc = (where: string, keys: string[] | undefined) => {
  if (!keys?.length) errors.push(`${where}: 出典なし`);
  for (const k of keys ?? []) if (!(k in sources)) errors.push(`${where}: 出典キーが存在しない: ${k}`);
};
const checkFact = (where: string, f: Fact) => {
  if (!f.text?.trim()) errors.push(`${where}: 本文なし`);
  checkSrc(`${where}「${f.text.slice(0, 14)}…」`, f.sources);
  if (f.link !== undefined && !linkOk(f.link)) errors.push(`${where}: 存在しないリンク: ${f.link}`);
};
const checkItem = (where: string, id: string) => {
  const it = data.items[id];
  if (!it) errors.push(`${where}: items に無いアイテム: ${id}`);
  else if (!it.ja || !it.en) errors.push(`${where}: アイテム名なし: ${id}`);
};

data.eventRules.forEach((f, i) => checkFact(`eventRules[${i}]`, f));
const eventIds = new Set<string>();
for (const e of data.events) {
  if (eventIds.has(e.id)) errors.push(`events: ID重複: ${e.id}`);
  eventIds.add(e.id);
  if (!e.nameJa || !e.nameEn) errors.push(`events ${e.id}: 名前なし`);
  if (!e.rows.length) errors.push(`events ${e.id}: 行なし`);
  for (const r of e.rows) {
    if (!r.label) errors.push(`events ${e.id}: ラベルなし`);
    checkFact(`events ${e.id} ${r.label}`, r);
  }
}
data.locationNotes.forEach((f, i) => checkFact(`locationNotes[${i}]`, f));
data.tips.forEach((f, i) => checkFact(`tips[${i}]`, f));
for (const u of [...data.eventUnknowns, ...data.locationUnknowns]) if (!u.trim()) errors.push("unknowns: 空の行");

const locIds = new Set<string>();
for (const l of data.locations) {
  const w = `locations ${l.id}`;
  if (locIds.has(l.id)) errors.push(`${w}: ID重複`);
  locIds.add(l.id);
  if (!l.nameJa || !l.nameEn || !l.districtJa) errors.push(`${w}: 名前・地区なし`);
  checkSrc(w, l.sources);
  checkSrc(`${w} 地区`, l.districtSources);
  for (const f of l.notes ?? []) checkFact(w, f);
  for (const id of l.notable) checkItem(w, id);
  for (const r of l.rooms) {
    for (const id of r.access) checkItem(`${w} ${r.id}`, id);
    for (const s of r.safes) if (s.opener) checkItem(`${w} ${r.id} 金庫`, s.opener);
    for (const n of r.nodes) {
      checkItem(`${w} ${r.id}`, n.item);
      if (!(n.spots > 0 && n.min > 0 && n.max >= n.min)) errors.push(`${w} ${r.id}: 数値が不正: ${n.item}`);
    }
    for (const f of r.fixed) checkItem(`${w} ${r.id}`, f.item);
    for (const c of r.cargo) {
      checkItem(`${w} ${r.id}`, c.item);
      if (!cargoIds.has(c.item)) errors.push(`${w} ${r.id}: 積荷データ（cargo.source.json）に無い: ${c.item}`);
    }
  }
}
for (const [id, it] of Object.entries(data.items)) if (it.price !== null && !(it.price >= 0)) errors.push(`items ${id}: 価格が不正`);

console.log(`tips: ${data.events.length} events, ${data.locations.length} locations, ${data.tips.length} tips`);
if (errors.length) {
  for (const e of errors) console.error("  ERROR: " + e);
  console.error(`${errors.length} error(s)`);
  process.exit(1);
}
