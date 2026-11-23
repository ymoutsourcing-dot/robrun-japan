/**
 * data/guides/tools.json（道具・鍵ページ）の整合性チェック。
 *   - すべての出典キーが data/guides/sources.json にあるか
 *   - relatedShipments / shipmentId が Shipments に存在するか
 *   - toolId が tools.json 内に存在するか・ID重複が無いか
 *
 *   npx tsx scripts/validate-tools.ts
 */
import { readFileSync } from "node:fs";

const read = <T>(p: string) => JSON.parse(readFileSync(p, "utf8")) as T;
const sources = read<Record<string, unknown>>("data/guides/sources.json");
const shipments = new Set(read<{ nodes: { id: string }[] }>("data/source/shipments.source.json").nodes.map((n) => n.id));

interface Fact {
  text: string;
  sources: string[];
}
interface Entry {
  id: string;
  nameJa: string;
  nameEn: string;
  categoryJa: string;
  usageJa: Fact[];
  obtainJa: Fact[];
  notes?: Fact[];
  time?: Fact;
  timeSources?: string[];
  statsJa?: { label: string; value: string; sources: string[] }[];
  table?: { sources: string[] };
  barter?: { inputs: { shipmentId?: string; toolId?: string }[]; sources: string[] }[];
  relatedShipments?: string[];
  sources: string[];
}
const data = read<{
  entries: Entry[];
  buildings: { sources: string[]; rows: { shipmentId?: string; sources?: string[] }[] };
  relatedShipmentNotes: { id: string; sources: string[] }[];
}>("data/guides/tools.json");

const CATEGORIES = ["デコーダー", "ドリル", "鍵", "カード", "その他"];
const errors: string[] = [];
const toolIds = new Set<string>();
for (const e of data.entries) {
  if (toolIds.has(e.id)) errors.push(`ID重複: ${e.id}`);
  toolIds.add(e.id);
}

const checkSrc = (where: string, keys: string[] | undefined) => {
  if (!keys?.length) errors.push(`${where}: 出典なし`);
  for (const k of keys ?? []) if (!(k in sources)) errors.push(`${where}: 出典キーが存在しない: ${k}`);
};
const checkShip = (where: string, id: string) => {
  if (!shipments.has(id)) errors.push(`${where}: Shipments に存在しない: ${id}`);
};

for (const e of data.entries) {
  const w = `tools ${e.id}`;
  if (!e.nameJa || !e.nameEn) errors.push(`${w}: 名前なし`);
  if (!CATEGORIES.includes(e.categoryJa)) errors.push(`${w}: カテゴリー不正: ${e.categoryJa}`);
  checkSrc(w, e.sources);
  for (const f of [...e.usageJa, ...e.obtainJa, ...(e.notes ?? []), ...(e.time ? [e.time] : [])]) checkSrc(`${w}「${f.text.slice(0, 12)}…」`, f.sources);
  if (e.timeSources) checkSrc(`${w} time`, e.timeSources);
  for (const s of e.statsJa ?? []) checkSrc(`${w} ${s.label}`, s.sources);
  if (e.table) checkSrc(`${w} table`, e.table.sources);
  for (const b of e.barter ?? []) {
    checkSrc(`${w} barter`, b.sources);
    for (const i of b.inputs) {
      if (i.shipmentId) checkShip(`${w} barter`, i.shipmentId);
      if (i.toolId && !toolIds.has(i.toolId)) errors.push(`${w} barter: 存在しない toolId: ${i.toolId}`);
    }
  }
  for (const id of e.relatedShipments ?? []) checkShip(w, id);
}
checkSrc("buildings", data.buildings.sources);
for (const r of data.buildings.rows) {
  if (r.shipmentId) checkShip("buildings", r.shipmentId);
  if (r.sources) checkSrc("buildings", r.sources);
}
for (const n of data.relatedShipmentNotes) {
  checkShip("relatedShipmentNotes", n.id);
  checkSrc(`relatedShipmentNotes ${n.id}`, n.sources);
}

console.log(`tools: ${data.entries.length} entries`);
if (errors.length) {
  for (const e of errors) console.error("  ERROR: " + e);
  console.error(`${errors.length} error(s)`);
  process.exit(1);
}
