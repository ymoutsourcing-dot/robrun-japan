/**
 * data/ 以下のソース・翻訳・攻略データを統合し、アプリが読み込む JSON を生成する。
 *
 *   data/source/shipments.source.json  … 英語の事実データ（extract-robrunguide.ts で生成）
 *   data/i18n/shipments.ja.json        … アイテム名・説明の日本語訳
 *   data/i18n/terms.ja.json            … ステータス名などの用語辞書
 *   data/guides/recommendations.json   … 攻略評価（根拠付きのもののみ）
 *
 * 出力: src/generated/shipments.json, public/sitemap.xml
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import type {
  CategoryId,
  CategoryInfo,
  ItemStat,
  Rarity,
  ShipmentDataset,
  ShipmentItem,
} from "../src/types/shipment";
import { buildEquipment } from "./build-equipment";

const SITE_URL = (process.env.SITE_URL ?? "https://robrun-japan.vercel.app").replace(/\/$/, "");

const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;

interface SourceNode {
  id: string;
  itemId: string;
  nameEn: string;
  descriptionEn: string;
  categoryId: string;
  enabled: boolean;
  unlockCash: number;
  unlockCoins: number;
  unlockMaterials: { id: string; nameEn: string; quantity: number }[];
  requiredNodeIds: string[];
  requiredTier: number | null;
  requiredImprisonmentYears: number | null;
  layout: { order: number };
  itemPage: {
    url: string;
    rarity: string | null;
    purchasePrice: number | null;
    salePrice: number | null;
    unlockCostOnItemPage: number | null;
    itemPageBuilds: string[];
    stats: { label: string; value: string }[];
  } | null;
}

interface SourceFile {
  source: {
    name: string;
    url: string;
    treeBuild: string;
    retrievedAt: string;
    limitations: string[];
  };
  nodes: SourceNode[];
}

interface JaFile {
  items: Record<string, { nameJa: string; descriptionJa: string; note?: string }>;
}

interface TermsFile {
  statLabels: Record<string, string>;
  values: Record<string, string>;
  limitations: Record<string, string>;
}

interface RecommendationsFile {
  items: Record<
    string,
    { priority: 1 | 2 | 3 | 4 | 5; reason: string; sourceUrl?: string; tags?: string[] }
  >;
}

const src = readJson<SourceFile>("data/source/shipments.source.json");
const ja = readJson<JaFile>("data/i18n/shipments.ja.json");
const terms = readJson<TermsFile>("data/i18n/terms.ja.json");
const recs = readJson<RecommendationsFile>("data/guides/recommendations.json");

const CATEGORY_MAP: Record<string, CategoryInfo> = {
  custom_node_ammo: { id: "weapons", nameJa: "武器", nameEn: "Weapons" },
  custom_node_gears: { id: "equipment", nameJa: "装備", nameEn: "Equipment" },
  custom_node_gadjets: { id: "gadgets", nameJa: "ガジェット", nameEn: "Gadgets" },
  custom_node_cars: { id: "vehicles", nameJa: "車両", nameEn: "Vehicles" },
  custom_node_houses: { id: "construction", nameJa: "建築", nameEn: "Construction" },
  custom_node_furniture: { id: "furniture", nameJa: "家具・作業台", nameEn: "Furniture" },
  custom_node_farm: { id: "production", nameJa: "生産", nameEn: "Production" },
  custom_node_documents: { id: "documents", nameJa: "書類・権利書", nameEn: "Documents" },
};

const RARITIES: Rarity[] = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Exotic"];

const warnings: string[] = [];

function translateValue(v: string): string {
  let out = v.replace(/([\d.]+) HP every ([\d.]+) sec × (\d+)/g, "$2秒ごとに $1 HP × $3回");
  for (const [en, jp] of Object.entries(terms.values)) {
    out = out.replace(new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), jp);
  }
  return out;
}

function deriveTags(n: SourceNode, cat: CategoryId): string[] {
  const id = n.id.toLowerCase();
  const tags = new Set<string>();
  if (cat === "weapons" || cat === "equipment") tags.add("PvP");
  if (cat === "construction" || cat === "furniture" || cat === "documents") tags.add("拠点");
  if (
    cat === "production" ||
    id.includes("cumulative") ||
    id.includes("cargo") ||
    id.includes("money_workbench") ||
    id.includes("collection")
  )
    tags.add("金策");
  if (cat === "vehicles" && id.startsWith("car_")) tags.add("車両改造");
  if (id.includes("storage") || id.includes("shelving")) tags.add("収納");
  if (id.includes("alarm") || id.includes("defense") || id.includes("wall_")) tags.add("防衛");
  return [...tags];
}

// 同名アイテムの通し番号
const nameCount = new Map<string, number>();
for (const n of src.nodes) nameCount.set(n.nameEn, (nameCount.get(n.nameEn) ?? 0) + 1);
const nameSeen = new Map<string, number>();

const allBuilds = new Set<string>();

/** public/icons/<id>.(webp|png|jpg) があればそのパスを返す */
function findIcon(id: string): string | null {
  for (const ext of ["webp", "png", "jpg"]) if (existsSync(`public/icons/${id}.${ext}`)) return `/icons/${id}.${ext}`;
  return null;
}

const items: ShipmentItem[] = src.nodes.map((n) => {
  const cat = CATEGORY_MAP[n.categoryId];
  if (!cat) throw new Error(`unknown category ${n.categoryId} (${n.id})`);
  const tr = ja.items[n.id];
  if (!tr) warnings.push(`翻訳なし: ${n.id}`);

  let variant: number | null = null;
  if ((nameCount.get(n.nameEn) ?? 0) > 1) {
    variant = (nameSeen.get(n.nameEn) ?? 0) + 1;
    nameSeen.set(n.nameEn, variant);
  }

  const page = n.itemPage;
  page?.itemPageBuilds.forEach((b) => allBuilds.add(b));

  let verificationStatus: ShipmentItem["verificationStatus"] = "sourced";
  const notes: string[] = [];
  if (page && page.unlockCostOnItemPage !== null && page.unlockCostOnItemPage !== n.unlockCash) {
    verificationStatus = "outdated";
    notes.push(
      `研究費がツリー（build ${src.source.treeBuild}: $${n.unlockCash.toLocaleString()}）と個別ページ（$${page.unlockCostOnItemPage.toLocaleString()}）で異なる`,
    );
    warnings.push(`研究費の不一致: ${n.id}`);
  }
  if (!page) notes.push("個別アイテムページが見つからず、購入価格・売却価格・レアリティは未取得");
  if (n.descriptionEn.includes("{0}")) notes.push("説明文中の {0} はゲーム内で数値に置き換わるが、値は未確認");

  const rarity = page?.rarity && RARITIES.includes(page.rarity as Rarity) ? (page.rarity as Rarity) : null;

  const stats: ItemStat[] = (page?.stats ?? []).map((s) => {
    const labelJa = terms.statLabels[s.label];
    if (!labelJa) warnings.push(`ステータス名の訳なし: "${s.label}" (${n.id})`);
    return { labelEn: s.label, labelJa: labelJa ?? s.label, value: translateValue(s.value) };
  });

  const additional: string[] = [];
  if (n.requiredImprisonmentYears && n.requiredImprisonmentYears > 0)
    additional.push(`服役年数 ${n.requiredImprisonmentYears} 年以上`);
  if (n.unlockCoins > 0) additional.push(`コイン ${n.unlockCoins}`);
  for (const m of n.unlockMaterials) additional.push(`${m.nameEn} ×${m.quantity}`);

  const rec = recs.items[n.id];

  return {
    id: n.id,
    variant,
    nameEn: n.nameEn,
    nameJa: tr?.nameJa ?? n.nameEn,
    descriptionEn: n.descriptionEn,
    descriptionJa: tr?.descriptionJa ?? "（未翻訳）",
    category: cat.id,
    subcategory: cat.id === "vehicles" && n.id.startsWith("car_") ? "車両改造" : null,
    rarity,
    icon: findIcon(n.id),
    researchCost: n.unlockCash,
    purchaseCost: page?.purchasePrice ?? null,
    salePrice: page?.salePrice ?? null,
    requiredSettlementLevel: n.requiredTier,
    requiredImprisonmentYears: n.requiredImprisonmentYears ?? 0,
    prerequisites: n.requiredNodeIds,
    unlocks: [],
    additionalRequirements: additional,
    effects: [],
    stats,
    recommendedPriority: rec?.priority ?? null,
    tags: [...deriveTags(n, cat.id), ...(rec?.tags ?? [])],
    verificationStatus,
    sourceUrl: page?.url ?? src.source.url,
    sourceNote: notes.join(" / ") || undefined,
    lastVerifiedAt: src.source.retrievedAt,
    gameBuild: src.source.treeBuild,
    order: n.layout.order,
  };
});

// 派生研究（逆引き）
const byId = new Map(items.map((i) => [i.id, i]));
for (const it of items)
  for (const p of it.prerequisites) {
    const parent = byId.get(p);
    if (parent) parent.unlocks.push(it.id);
    else warnings.push(`存在しない前提研究: ${it.id} -> ${p}`);
  }

const categories = Object.values(CATEGORY_MAP);

const dataset: ShipmentDataset = {
  generatedAt: new Date().toISOString(),
  source: {
    name: src.source.name,
    url: src.source.url,
    treeBuild: src.source.treeBuild,
    itemPageBuilds: [...allBuilds].sort(),
    retrievedAt: src.source.retrievedAt,
    limitations: src.source.limitations.map((l) => terms.limitations[l] ?? l),
  },
  categories,
  items,
  warnings,
};

mkdirSync("src/generated", { recursive: true });
writeFileSync("src/generated/shipments.json", JSON.stringify(dataset, null, 1) + "\n");

// 武器・防具・車両一覧
const equipment = buildEquipment(items, warnings);

// recommendations の根拠文を別ファイルで UI に渡す
writeFileSync("src/generated/recommendations.json", JSON.stringify(recs, null, 1) + "\n");

// sitemap.xml
const urls = ["/", "/shipments", "/items", "/calculator", "/recommended", "/about", "/changelog", "/weapons", "/vehicles", "/guides", "/guides/money", "/guides/wipe", "/guides/jail-time", "/guides/police", ...items.map((i) => `/shipments/${i.id}`)];
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${SITE_URL}${u}</loc></url>`).join("\n") +
  `\n</urlset>\n`;
writeFileSync("public/sitemap.xml", sitemap);

// robots.txt（PUBLIC_INDEXING=true のときのみクロールを許可）
const indexing = process.env.PUBLIC_INDEXING === "true";
writeFileSync(
  "public/robots.txt",
  indexing ? `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n` : "User-agent: *\nDisallow: /\n",
);

console.log(`weapons: ${equipment.weapons.length}, armor: ${equipment.armor.length}, bags: ${equipment.bags.length}, vehicles: ${equipment.vehicles.length}`);
console.log(`items: ${items.length}, icons: ${items.filter((i) => i.icon).length}, warnings: ${warnings.length}`);
for (const w of warnings) console.log("  ⚠ " + w);
