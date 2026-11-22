/**
 * robrunguide.app から保存した HTML を解析し、Shipments の英語ソースデータを生成する。
 *
 * 使い方:
 *   npx tsx scripts/extract-robrunguide.ts <rawDir>
 *
 * <rawDir> の構成:
 *   <rawDir>/shipments.html          … https://robrunguide.app/en-US/shipments
 *   <rawDir>/items/<itemId>.html     … https://robrunguide.app/en-US/items/<itemId>
 *
 * 出力: data/source/shipments.source.json
 *
 * ネットワークアクセスはこのスクリプトでは行わない（取得は README の手順で別途行う）。
 * 取得する際は robots.txt に従い、1 リクエスト/秒以下に抑えること。
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const rawDir = process.argv[2];
if (!rawDir) {
  console.error("usage: tsx scripts/extract-robrunguide.ts <rawDir>");
  process.exit(1);
}

/** Next.js の RSC ペイロード（self.__next_f.push）を連結して返す */
function readRsc(html: string): string {
  const re = /self\.__next_f\.push\((\[.*?\])\)<\/script>/gs;
  let out = "";
  for (const m of html.matchAll(re)) {
    try {
      const arr = JSON.parse(m[1]);
      if (Array.isArray(arr) && typeof arr[1] === "string") out += arr[1];
    } catch {
      /* 解析できないチャンクは無視 */
    }
  }
  return out;
}

/** 指定位置を含む最小の JSON オブジェクトを取り出す */
function extractEnclosingObject(text: string, anchor: number): unknown {
  let depth = 0;
  let i = anchor;
  for (; i >= 0; i--) {
    const c = text[i];
    if (c === "}") depth++;
    else if (c === "{") {
      if (depth === 0) break;
      depth--;
    }
  }
  // i から対応する閉じ括弧まで走査（文字列リテラルを考慮）
  let d = 0;
  let inStr = false;
  for (let j = i; j < text.length; j++) {
    const c = text[j];
    if (inStr) {
      if (c === "\\") j++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") d++;
    else if (c === "}") {
      d--;
      if (d === 0) return JSON.parse(text.slice(i, j + 1));
    }
  }
  throw new Error("object not closed");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function visibleLines(html: string): string[] {
  const s = html
    .replace(/<script.*?<\/script>/gs, "")
    .replace(/<style.*?<\/style>/gs, "")
    .replace(/<[^>]+>/g, "\n");
  return decodeEntities(s)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function parseMoney(s: string | undefined): number | null {
  if (!s) return null;
  const n = Number(s.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

interface RawNode {
  id: string;
  item: { id: string; name: string; description: string };
  categoryId: string;
  enabled: boolean;
  cost: { coins: number; items: { item: { id: string; name: string }; quantity: number }[] };
  requiredNodeIds: string[];
  requiredTier: number | null;
  requiredImprisonmentYears: number | null;
  layout: { order: number; quadrant: number; selfSlideX: number; selfSlideY: number; childrenSlideX: number };
}

interface RawTree {
  version: number;
  build: string;
  sourceSha256: string;
  costNote: string;
  categories: { id: string; name: string; direction: string }[];
  nodes: RawNode[];
  limitations: string[];
}

// ---- 1. 研究ツリー -------------------------------------------------------
const treeHtml = readFileSync(join(rawDir, "shipments.html"), "utf8");
const treeRsc = readRsc(treeHtml);
const anchor = treeRsc.indexOf('"nodes":[{"id":');
if (anchor < 0) throw new Error("shipment tree payload not found");
const tree = extractEnclosingObject(treeRsc, anchor) as RawTree;

// ---- 2. 個別アイテムページ ------------------------------------------------
/** 採用するステータス名（data/i18n/terms.ja.json の statLabels と一致させる） */
const STAT_LABELS = new Set(
  Object.keys(
    (JSON.parse(readFileSync("data/i18n/terms.ja.json", "utf8")) as { statLabels: Record<string, string> })
      .statLabels,
  ),
);

interface ItemPageData {
  rarity: string | null;
  catalogCategory: string | null;
  purchasePrice: number | null;
  salePrice: number | null;
  unlockCostOnItemPage: number | null;
  itemPageBuilds: string[];
  stats: { label: string; value: string }[];
}

function parseItemPage(id: string): ItemPageData | null {
  const file = join(rawDir, "items", `${id}.html`);
  if (!existsSync(file)) return null;
  const html = readFileSync(file, "utf8");
  const rsc = readRsc(html);
  const price = rsc.match(/\{"price":(\d+(?:\.\d+)?)\}/);
  const base = rsc.match(/\{"basePrice":(\d+(?:\.\d+)?)\}/);
  const lines = visibleLines(html);
  const after = (label: string) => {
    const i = lines.indexOf(label);
    return i >= 0 ? lines[i + 1] : undefined;
  };
  const unlockIdx = lines.indexOf("Unlock cost");
  const builds = (html.match(/builds? ([\d, and]+)\. Servers/)?.[1] ?? "")
    .split(/,|and/)
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));
  const stats: { label: string; value: string }[] = [];
  for (const m of html.matchAll(/<tr[^>]*>\s*<th scope="row"[^>]*>(.*?)<\/th>\s*<td[^>]*>(.*?)<\/td>/gs)) {
    const label = decodeEntities(m[1].replace(/<[^>]+>/g, "")).trim();
    const value = decodeEntities(m[2].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    // 「関連アイテム」等の一覧表を除外し、アイテム自身のステータス行のみ採用する
    if (label && value && STAT_LABELS.has(label) && !stats.some((s) => s.label === label))
      stats.push({ label, value });
  }
  return {
    rarity: after("Rarity") ?? null,
    catalogCategory: after("Category") ?? null,
    purchasePrice: price ? Number(price[1]) : null,
    salePrice: base ? Number(base[1]) : null,
    unlockCostOnItemPage: unlockIdx >= 0 ? parseMoney(lines[unlockIdx + 1]) : null,
    itemPageBuilds: builds,
    stats,
  };
}

// ---- 3. 出力 --------------------------------------------------------------
const out = {
  source: {
    name: "Rob Run Guide",
    url: "https://robrunguide.app/en-US/shipments",
    note: "Community fan guide. States the catalog uses data extracted from game files. Not affiliated with Kefir / ROB RUN.",
    treeBuild: tree.build,
    treeSourceSha256: tree.sourceSha256,
    costNote: tree.costNote,
    limitations: tree.limitations,
    retrievedAt: new Date().toISOString().slice(0, 10),
  },
  categories: tree.categories.map((c) => ({ id: c.id, nameEn: c.name, direction: c.direction })),
  nodes: tree.nodes.map((n) => {
    const cash = n.cost.items.find((i) => i.item.id === "cash_1");
    const otherMaterials = n.cost.items
      .filter((i) => i.item.id !== "cash_1")
      .map((i) => ({ id: i.item.id, nameEn: i.item.name, quantity: i.quantity }));
    const page = parseItemPage(n.item.id);
    return {
      id: n.id,
      itemId: n.item.id,
      nameEn: n.item.name,
      descriptionEn: n.item.description,
      categoryId: n.categoryId,
      enabled: n.enabled,
      unlockCash: cash ? cash.quantity : 0,
      unlockCoins: n.cost.coins,
      unlockMaterials: otherMaterials,
      requiredNodeIds: n.requiredNodeIds,
      requiredTier: n.requiredTier,
      requiredImprisonmentYears: n.requiredImprisonmentYears,
      layout: n.layout,
      itemPage: page
        ? { url: `https://robrunguide.app/en-US/items/${n.item.id}`, ...page }
        : null,
    };
  }),
};

const dest = resolve("data/source/shipments.source.json");
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
const withPage = out.nodes.filter((n) => n.itemPage).length;
console.log(`wrote ${dest}: ${out.nodes.length} nodes, ${withPage} with item page data`);
