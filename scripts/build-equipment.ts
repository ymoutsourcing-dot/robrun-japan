/**
 * 武器・防具・バッグ・車両一覧のデータを生成する（build-data.ts から呼ばれる）。
 *   入力: data/source/equipment.source.json, data/i18n/equipment.ja.json, Shipments の生成済みアイテム
 *   出力: src/generated/equipment.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { ShipmentItem } from "../src/types/shipment";
import type { Armor, Bag, EquipmentDataset, Vehicle, Weapon } from "../src/types/equipment";

interface SourceGear {
  id: string;
  nameEn: string;
  family: "weapons" | "armor" | "bags";
  rarity: string;
  weapon: {
    damage: number;
    projectilesPerShot: number;
    roundsPerMinute: number;
    headMultiplier: number;
    magazine: number;
    reloadSeconds: number;
    reloadByRound: boolean;
    automatic: boolean;
    fullDamageRange: number;
    aimInSeconds: number;
    drawSeconds: number;
    ammoItemId: string;
  } | null;
  footprint: string | null;
  durability: number | null;
  armorSegments: number | null;
  armorPoints: number | null;
  inventoryRows: number | null;
  pockets: number | null;
  page: { url: string; descriptionEn: string | null; purchasePrice: number | null; salePrice: number | null } | null;
}

interface SourceVehicle {
  id: string;
  nameEn: string;
  kind: "car" | "helicopter";
  police: boolean;
  catalogItemId: string | null;
  speed: number | null;
  acceleration: number | null;
  handling: number | null;
  trunkRows: number | null;
  trunkUpgradeSlots: number | null;
  cargoSlots: number | null;
  cargoUpgradeSlots: number | null;
}

const RARITY: Record<string, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  exotic: "Exotic",
};

const r1 = (n: number) => Math.round(n * 10) / 10;

export function buildEquipment(items: ShipmentItem[], warnings: string[]): EquipmentDataset {
  const src = JSON.parse(readFileSync("data/source/equipment.source.json", "utf8")) as {
    source: EquipmentDataset["source"] & { retrievedAt: string };
    gear: SourceGear[];
    vehicles: SourceVehicle[];
  };
  const ja = JSON.parse(readFileSync("data/i18n/equipment.ja.json", "utf8")) as {
    weaponTypes: Record<string, string>;
    weaponTypeOrder: string[];
    ammo: Record<string, string>;
    extras: Record<string, { nameJa: string; descriptionJa: string }>;
    vehicles: Record<string, { nameJa: string; noteJa: string }>;
  };
  const byId = new Map(items.map((i) => [i.id, i]));

  const common = (g: SourceGear) => {
    const s = byId.get(g.id);
    const extra = ja.extras[g.id];
    if (!s && !extra) warnings.push(`装備の日本語名なし: ${g.id}`);
    return {
      id: g.id,
      nameEn: g.nameEn,
      nameJa: s ? (s.variant ? `${s.nameJa} ${["", "I", "II", "III", "IV"][s.variant]}` : s.nameJa) : (extra?.nameJa ?? g.nameEn),
      descriptionJa: s?.descriptionJa ?? extra?.descriptionJa ?? null,
      rarity: RARITY[g.rarity] ?? null,
      inShipments: !!s,
      researchCost: s?.researchCost ?? null,
      purchaseCost: s ? s.purchaseCost : (g.page?.purchasePrice ?? null),
      salePrice: s ? s.salePrice : (g.page?.salePrice ?? null),
      requiredSettlementLevel: s?.requiredSettlementLevel ?? null,
      requiredImprisonmentYears: s?.requiredImprisonmentYears ?? 0,
      footprint: g.footprint,
      sourceUrl: g.page?.url ?? s?.sourceUrl ?? src.source.compareUrl,
    };
  };

  const weapons: Weapon[] = src.gear
    .filter((g) => g.weapon)
    .map((g) => {
      const w = g.weapon!;
      const prefix = g.id.replace(/_m\d+$/, "");
      const typeJa = ja.weaponTypes[prefix];
      if (!typeJa) warnings.push(`武器種の分類なし: ${g.id}`);
      const perShot = w.damage * w.projectilesPerShot;
      const shotsPerSec = w.roundsPerMinute / 60;
      return {
        ...common(g),
        typeJa: typeJa ?? "その他",
        ammoJa: ja.ammo[w.ammoItemId] ?? w.ammoItemId,
        damage: w.damage,
        pellets: w.projectilesPerShot,
        rpm: w.roundsPerMinute,
        headMultiplier: w.headMultiplier,
        magazine: w.magazine,
        reloadSeconds: w.reloadSeconds,
        reloadByRound: w.reloadByRound,
        automatic: w.automatic,
        fullDamageRange: w.fullDamageRange,
        aimInSeconds: w.aimInSeconds,
        drawSeconds: w.drawSeconds,
        durability: g.durability,
        dps: r1(perShot * shotsPerSec),
        headDps: r1(perShot * w.headMultiplier * shotsPerSec),
        magDamage: perShot * w.magazine,
        timeToEmpty: r1(w.magazine / shotsPerSec),
      };
    });

  const armor: Armor[] = src.gear
    .filter((g) => g.family === "armor")
    .map((g) => ({ ...common(g), segments: g.armorSegments, armorPoints: g.armorPoints, durability: g.durability }));

  const bags: Bag[] = src.gear
    .filter((g) => g.family === "bags")
    .map((g) => ({
      ...common(g),
      kindJa: g.id.startsWith("belt") ? "ポーチ" : "バッグ",
      inventoryRows: g.inventoryRows,
      pockets: g.pockets,
    }));

  const vehicles: Vehicle[] = src.vehicles.map((v) => {
    const s = v.catalogItemId ? byId.get(v.catalogItemId) : undefined;
    const vj = ja.vehicles[v.id];
    if (!s && !vj) warnings.push(`車両の日本語名なし: ${v.id}`);
    return {
      id: s?.id ?? v.id,
      nameEn: v.nameEn,
      nameJa: s?.nameJa ?? vj?.nameJa ?? v.nameEn,
      kindJa: v.kind === "helicopter" ? "ヘリコプター" : v.police ? "警察車両" : "車",
      police: v.police,
      noteJa: vj?.noteJa ?? null,
      inShipments: !!s,
      researchCost: s?.researchCost ?? null,
      purchaseCost: s?.purchaseCost ?? null,
      requiredSettlementLevel: s?.requiredSettlementLevel ?? null,
      requiredImprisonmentYears: s?.requiredImprisonmentYears ?? 0,
      speed: v.speed,
      acceleration: v.acceleration,
      handling: v.handling,
      trunkRows: v.trunkRows,
      trunkUpgradeSlots: v.trunkUpgradeSlots,
      cargoSlots: v.cargoSlots,
      cargoUpgradeSlots: v.cargoUpgradeSlots,
    };
  });

  const ds: EquipmentDataset = {
    source: { ...src.source, build: src.source.build ? String(src.source.build) : null },
    weaponTypeOrder: ja.weaponTypeOrder,
    weapons,
    armor,
    bags,
    vehicles,
  };
  writeFileSync("src/generated/equipment.json", JSON.stringify(ds, null, 1) + "\n");
  return ds;
}
