/**
 * robrun.info（ロシア語のファン攻略サイト）から保存したアイテムページ HTML を解析し、
 * 用途・入手方法・性能の生データ（ロシア語のまま）を生成する。
 *
 * 使い方:
 *   npx tsx scripts/extract-robrun-info.ts <rawDir>
 *
 * <rawDir> の構成:
 *   <rawDir>/items/<shipmentId>.html … https://robrun.info/items/<robrunInfoId>/
 *   （ファイル名は Shipments の ID。robrun.info 側の ID が異なるものは RRI_ID を参照）
 *
 * 出力: data/source/robrun-info.source.json
 *
 * ネットワークアクセスはこのスクリプトでは行わない。取得する際は 1 リクエスト/秒以下に抑えること。
 *   for id in $(node -e 'for (const n of require("./data/source/shipments.source.json").nodes) console.log(n.id)'); do
 *     curl -sS -A "Mozilla/5.0 (fan-guide research)" -o "raw/items/$id.html" "https://robrun.info/items/<rriId>/"; sleep 1
 *   done
 */
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const rawDir = process.argv[2];
if (!rawDir) {
  console.error("usage: tsx scripts/extract-robrun-info.ts <rawDir>");
  process.exit(1);
}

/** robrun.info 側で ID が異なるもの（Shipments ID → robrun.info ID） */
const RRI_ID: Record<string, string> = {
  CargoProductionWorkbenchUpgradeConverter1: "cargo_production_workbench_upgrade_converter_1",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** タグを除いたテキスト（空白は1つにまとめる） */
function text(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/[\s\u00a0\u202f]+/g, " ")
    .replace(/ ([,.:;)])/g, "$1")
    .trim();
}

/** "99 $" / "5 000 $" → 99 / 5000 */
function parseMoney(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.replace(/[\s\u00a0\u202f]/g, "").match(/^(\d+)\$$/);
  return m ? Number(m[1]) : null;
}

interface Group {
  heading: string | null;
  rows: { label: string; value: string }[];
  texts: string[];
  items: { id: string; name: string }[];
  spots: { where: string; what: string }[];
}

interface Section {
  id: string;
  title: string;
  groups: Group[];
}

const newGroup = (heading: string | null): Group => ({ heading, rows: [], texts: [], items: [], spots: [] });

/** <section id=...> の中身を見出し（h3）ごとのグループに分ける */
function parseSection(id: string, html: string): Section {
  const title = text(html.match(/<h2[^>]*>(.*?)<\/h2>/s)?.[1] ?? "");
  const groups: Group[] = [];
  let g = newGroup(null);
  const push = () => {
    if (g.heading || g.rows.length || g.texts.length || g.items.length || g.spots.length) groups.push(g);
  };
  const body = html.replace(/<h2[^>]*>.*?<\/h2>/s, "");
  const re =
    /<h3[^>]*>(?<h3>.*?)<\/h3>|<p class="detail-label">(?<ph>.*?)<\/p>|<div class="wstat[^"]*"><span class="wlabel">(?<wl>.*?)<\/span><b class="wvalue[^"]*">(?<wv>.*?)<\/b>(?:<span class="wextra">(?<wx>.*?)<\/span>)?|<div class="gauge"[^>]*><span class="glabel">(?<gl>.*?)<\/span>.*?<b class="gval[^"]*">(?<gv>.*?)<\/b><\/div>|<div class="spot[^"]*">(?<spot>.*?)<a class="btn"|<a class="tile" href="\/items\/(?<tid>[^/]+)\/".*?<strong>(?<tname>.*?)<\/strong>.*?<\/a>(?:<b class="qty[^"]*">(?<tq>.*?)<\/b>)?|<a class="ichip" href="\/items\/(?<iid>[^/]+)\/"[^>]*>(?<iname>.*?)<\/a>|<p[^>]*>(?<p>.*?)<\/p>|<div(?: class="row-[a-z]+")?><span>(?<rl>(?:(?!<\/?div).)*?)<\/span><b[^>]*>(?<rv>.*?)<\/b><\/div>|<li[^>]*>(?<li>.*?)<\/li>|<t[dh][^>]*>(?<cell>.*?)<\/t[dh]>/gs;
  for (const m of body.matchAll(re)) {
    const x = m.groups!;
    if (x.h3 !== undefined || x.ph !== undefined) {
      push();
      g = newGroup(text(x.h3 ?? x.ph));
    } else if (x.wl !== undefined)
      // 「лучший」（全武器中で最高値）のバッジはラベルから外す
      g.rows.push({ label: text(x.wl.replace(/<em class="tag">.*?<\/em>/gs, "")), value: [text(x.wv), x.wx ? `(${text(x.wx)})` : ""].filter(Boolean).join(" ") });
    else if (x.gl !== undefined) g.rows.push({ label: text(x.gl), value: text(x.gv) }); else if (x.spot !== undefined) {
      const where = text(x.spot.match(/<span class="spot-where">(.*?)<\/span>(?:<span|$)/s)?.[1] ?? "");
      const what = text(x.spot.match(/<span class="spot-what">(.*?)<\/span>\s*$/s)?.[1] ?? "");
      g.spots.push({ where, what });
    } else if (x.tid !== undefined)
      g.items.push({ id: x.tid, name: text(x.tname) + (x.tq ? ` ${text(x.tq)}` : "") });
    else if (x.iid !== undefined) g.items.push({ id: x.iid, name: text(x.iname) });
    else if (x.p !== undefined) {
      const t = text(x.p);
      if (t) g.texts.push(t);
    } else if (x.rl !== undefined) g.rows.push({ label: text(x.rl), value: text(x.rv) });
    else if (x.li !== undefined) {
      const t = text(x.li);
      if (t) g.texts.push(t);
    } else if (x.cell !== undefined) {
      const t = text(x.cell);
      if (t) g.texts.push(t);
    }
  }
  push();
  return { id, title, groups };
}

const flat = (g: Group): string[] => [
  ...g.rows.map((r) => `${r.label}: ${r.value}`),
  ...g.texts,
  ...g.items.map((i) => `→ ${i.name} (${i.id})`),
  ...g.spots.map((s) => (s.what ? `@ ${s.where}: ${s.what}` : `@ ${s.where}`)),
];

function parseItem(id: string) {
  const file = join(rawDir, "items", `${id}.html`);
  if (!existsSync(file)) return null;
  const html = readFileSync(file, "utf8").replace(/ data-astro-cid-\w+/g, "");
  const main = html.match(/<main[^>]*>(.*?)<\/main>/s)?.[1];
  if (!main) return null;
  const rriId = RRI_ID[id] ?? id;

  const nameRu = text(main.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1] ?? "");
  const descriptionRu = text(main.match(/<p class="lead"[^>]*>(.*?)<\/p>/s)?.[1] ?? "");
  const tags = [...(main.match(/<div class="head-tags">(.*?)<\/div>/s)?.[1] ?? "").matchAll(/<span[^>]*>(.*?)<\/span>/gs)].map(
    (m) => text(m[1]),
  );

  // 右側のインフォボックス（売却価格のツールチップは除いてから読む）
  const aside = (main.match(/<aside class="infobox"[^>]*>(.*?)<\/aside>/s)?.[1] ?? "").replace(
    /<button.*?<\/button>/gs,
    "",
  );
  const info: Record<string, string> = {};
  for (const m of aside.matchAll(/<div><span>(.*?)<\/span><b[^>]*>(.*?)<\/b><\/div>/gs))
    info[text(m[1].replace(/<button.*?<\/button>/gs, ""))] = text(m[2]);

  const sections: Section[] = [];
  for (const m of main.matchAll(/<section id="([^"]+)"[^>]*>(.*?)<\/section>/gs)) {
    if (m[1] === "recent") continue;
    sections.push(parseSection(m[1], m[2]));
  }

  const stats = sections
    .filter((s) => s.id === "stats")
    .flatMap((s) => s.groups.flatMap((g) => g.rows.map((r) => ({ group: g.heading, labelRu: r.label, value: r.value }))));
  const statTexts = sections
    .filter((s) => s.id === "stats")
    .flatMap((s) => s.groups.flatMap((g) => g.texts.map((t) => (g.heading ? `${g.heading}: ${t}` : t))));
  const toLines = (sid: string) =>
    sections
      .filter((s) => s.id === sid)
      .flatMap((s) => s.groups.map((g) => ({ heading: g.heading, lines: flat(g) })));
  const obtain = toLines("get");
  const uses = sections
    .filter((s) => s.id !== "get" && s.id !== "stats")
    .flatMap((s) => s.groups.map((g) => ({ section: s.title, heading: g.heading, lines: flat(g) })));

  const lenny = obtain.find((g) => g.heading?.startsWith("Дерево Ленни"));
  const lennyRow = (label: string) => lenny?.lines.find((l) => l.startsWith(label + ": "))?.slice(label.length + 2);

  return {
    id,
    rriId,
    url: `https://robrun.info/items/${rriId}/`,
    nameRu,
    nameEn: info["На английском"] ?? null,
    descriptionRu,
    tags,
    type: info["Тип"] ?? null,
    size: info["Размер"] ?? null,
    stackSize: info["В стопке"] ? Number(info["В стопке"].replace(/\s/g, "")) : null,
    purchasePrice: parseMoney(info["Цена покупки"]),
    salePrice: parseMoney(info["Цена продажи"]),
    researchCost: parseMoney(lennyRow("Цена исследования")),
    traderTier: lennyRow("Тир торговца") ?? null,
    requiredYears: lennyRow("Необходимый срок, лет") ? Number(lennyRow("Необходимый срок, лет")) : null,
    prerequisites: lenny?.lines.filter((l) => l.startsWith("→ ")).map((l) => l.match(/\(([^)]+)\)$/)?.[1] ?? l) ?? [],
    infobox: info,
    stats,
    statNotes: statTexts,
    obtain,
    uses,
    retrievedAt: statSync(file).mtime.toISOString().slice(0, 10),
  };
}

const shipments = JSON.parse(readFileSync("data/source/shipments.source.json", "utf8")) as { nodes: { id: string }[] };
const items: Record<string, NonNullable<ReturnType<typeof parseItem>>> = {};
const missing: string[] = [];
for (const n of shipments.nodes) {
  const it = parseItem(n.id);
  if (it) items[n.id] = it;
  else missing.push(n.id);
}

const out = {
  source: {
    name: "robrun.info",
    url: "https://robrun.info/items/",
    note: "Russian community fan site (not affiliated with Kefir / ROB RUN). Raw Russian text as shown on each item page; translate by hand into data/guides/item-usage.json.",
    retrievedAt: Object.values(items)[0]?.retrievedAt ?? null,
  },
  missing,
  items,
};
const dest = resolve("data/source/robrun-info.source.json");
writeFileSync(dest, JSON.stringify(out, null, 1) + "\n");
console.log(`wrote ${dest}: ${Object.keys(items).length} items, missing ${missing.length}`);
