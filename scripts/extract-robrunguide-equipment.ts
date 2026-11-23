/**
 * robrunguide.app の比較ページ（武器・防具・バッグ）と車両比較ページを解析し、
 * 装備・車両の英語ソースデータを生成する。
 *
 * 使い方:
 *   npx tsx scripts/extract-robrunguide-equipment.ts <rawDir>
 *
 * <rawDir> の構成:
 *   <rawDir>/compare.html          … https://robrunguide.app/en-US/compare
 *   <rawDir>/vehicles.html         … https://robrunguide.app/en-US/vehicles
 *   <rawDir>/items/<itemId>.html   … Shipments に無いアイテムの個別ページ（説明・売値・レアリティ）
 *
 * 出力: data/source/equipment.source.json
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const rawDir = process.argv[2];
if (!rawDir) {
  console.error("usage: tsx scripts/extract-robrunguide-equipment.ts <rawDir>");
  process.exit(1);
}

function readRsc(html: string): string {
  let out = "";
  for (const m of html.matchAll(/self\.__next_f\.push\((\[.*?\])\)<\/script>/gs)) {
    try {
      const arr = JSON.parse(m[1]);
      if (Array.isArray(arr) && typeof arr[1] === "string") out += arr[1];
    } catch {
      /* skip */
    }
  }
  return out;
}

/** text の pos から始まる JSON 値を1つ読む */
function readJsonAt(text: string, pos: number): unknown {
  let depth = 0;
  let inStr = false;
  for (let j = pos; j < text.length; j++) {
    const c = text[j];
    if (inStr) {
      if (c === "\\") j++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(pos, j + 1));
    }
  }
  throw new Error("unterminated JSON");
}

const undef = <T>(v: T | "$undefined"): T | null => (v === "$undefined" || v === undefined ? null : v);

// ---- 比較ページ（武器・防具・バッグ） -----------------------------------------
interface RawCompareItem {
  id: string;
  name: string;
  rarity: string;
  family: "weapons" | "armor" | "bags";
  weapon:
    | {
        damage: number;
        shotCooldownSeconds: number;
        fullDamageRange: number;
        projectilesPerShot: number;
        hipProjectilesPerShot: number;
        roundsPerMinute: number;
        headDamageMultiplier: number;
        magazineSize: number;
        reloadCastSeconds: number;
        minReloadCastSeconds: number;
        aimingInSeconds: number;
        aimingOutSeconds: number;
        drawSeconds: number;
        reloadByRound: boolean;
        automatic: boolean;
        ammoItemId: string;
      }
    | "$undefined";
  metrics: Record<string, unknown>;
}

const compareRsc = readRsc(readFileSync(join(rawDir, "compare.html"), "utf8"));
const cmpPos = compareRsc.indexOf('{"items":[{"id":');
if (cmpPos < 0) throw new Error("compare payload not found");
const compare = readJsonAt(compareRsc, cmpPos) as { items: RawCompareItem[]; build?: unknown };

function itemPage(id: string) {
  const f = join(rawDir, "items", `${id}.html`);
  if (!existsSync(f)) return null;
  const html = readFileSync(f, "utf8");
  const lines = html
    .replace(/<script.*?<\/script>/gs, "")
    .replace(/<style.*?<\/style>/gs, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const i = lines.indexOf("Category");
  const rsc = readRsc(html);
  const price = rsc.match(/\{"price":(\d+(?:\.\d+)?)\}/);
  const base = rsc.match(/\{"basePrice":(\d+(?:\.\d+)?)\}/);
  return {
    url: `https://robrunguide.app/en-US/items/${id}`,
    nameEn: i > 0 ? lines[i - 1] : null,
    // 並び: 名前 / Category / カテゴリ名 / Rarity / レアリティ / 説明
    descriptionEn: i > 0 && lines[i + 2] === "Rarity" ? lines[i + 4] : null,
    purchasePrice: price ? Number(price[1]) : null,
    salePrice: base ? Number(base[1]) : null,
  };
}

const gear = compare.items.map((x) => {
  const w = undef(x.weapon);
  const m = x.metrics;
  return {
    id: x.id,
    nameEn: x.name,
    family: x.family,
    rarity: x.rarity,
    weapon: w
      ? {
          damage: w.damage,
          projectilesPerShot: w.projectilesPerShot,
          hipProjectilesPerShot: w.hipProjectilesPerShot,
          roundsPerMinute: Math.round(w.roundsPerMinute * 10) / 10,
          headMultiplier: w.headDamageMultiplier,
          magazine: w.magazineSize,
          reloadSeconds: w.reloadCastSeconds,
          minReloadSeconds: w.minReloadCastSeconds,
          reloadByRound: w.reloadByRound,
          automatic: w.automatic,
          fullDamageRange: w.fullDamageRange,
          aimInSeconds: w.aimingInSeconds,
          drawSeconds: w.drawSeconds,
          ammoItemId: w.ammoItemId,
          ammoEn: (m.ammo as string) ?? null,
        }
      : null,
    footprint: undef(m.footprint as string),
    durability: undef(m.durability as number),
    armorSegments: undef(m.segments as number),
    armorPoints: undef(m.armorPoints as number),
    inventoryRows: undef(m.inventoryRows as number),
    pockets: undef(m.pockets as number),
    page: itemPage(x.id),
  };
});

// ---- 車両比較ページ ----------------------------------------------------------
const vehRsc = readRsc(readFileSync(join(rawDir, "vehicles.html"), "utf8"));
const vehAnchor = vehRsc.indexOf('{"vehicles":[');
if (vehAnchor < 0) throw new Error("vehicles payload not found");
const vehicles = (
  readJsonAt(vehRsc, vehAnchor) as {
    vehicles: {
      id: string;
      kind: "car" | "helicopter";
      name: string;
      ratings: { speed: number | null; acceleration: number | null; handling: number | null };
      trunk: { inventoryRows: number; inventoryUpgradeSlots: number; cargoSlots: number; cargoUpgradeSlots: number } | null;
      catalogItemId: string | null;
      police: boolean;
    }[];
  }
).vehicles.map((v) => ({
  id: v.id,
  nameEn: v.name,
  kind: v.kind,
  police: v.police,
  catalogItemId: v.catalogItemId,
  speed: v.ratings.speed,
  acceleration: v.ratings.acceleration,
  handling: v.ratings.handling,
  trunkRows: v.trunk?.inventoryRows ?? null,
  trunkUpgradeSlots: v.trunk?.inventoryUpgradeSlots ?? null,
  cargoSlots: v.trunk?.cargoSlots ?? null,
  cargoUpgradeSlots: v.trunk?.cargoUpgradeSlots ?? null,
}));

const out = {
  source: {
    name: "Rob Run Guide",
    compareUrl: "https://robrunguide.app/en-US/compare",
    vehiclesUrl: "https://robrunguide.app/en-US/vehicles",
    note: "Weapon/armor/bag stats and vehicle ratings from the guide's game-file data. Vehicle ratings are 0-100 (not km/h), default configuration without upgrades.",
    build: compare.build ?? null,
    retrievedAt: new Date().toISOString().slice(0, 10),
  },
  gear,
  vehicles,
};
const dest = resolve("data/source/equipment.source.json");
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log(`wrote ${dest}: gear ${gear.length} (weapons ${gear.filter((g) => g.weapon).length}), vehicles ${vehicles.length}`);
