/** 武器・防具・バッグ・車両一覧のデータ型（生成元: scripts/build-data.ts → src/generated/equipment.json） */

export interface EquipmentCommon {
  id: string;
  nameEn: string;
  nameJa: string;
  descriptionJa: string | null;
  rarity: string | null;
  /** Shipments で研究できるか（研究ツリーにリンク） */
  inShipments: boolean;
  researchCost: number | null;
  purchaseCost: number | null;
  salePrice: number | null;
  requiredSettlementLevel: number | null;
  requiredImprisonmentYears: number;
  footprint: string | null;
  sourceUrl: string;
}

export interface Weapon extends EquipmentCommon {
  typeJa: string;
  ammoJa: string;
  damage: number;
  /** 1発あたりの弾数（ショットガンは複数） */
  pellets: number;
  rpm: number;
  headMultiplier: number;
  magazine: number;
  reloadSeconds: number;
  reloadByRound: boolean;
  automatic: boolean;
  /** 全ダメージが入る距離（m） */
  fullDamageRange: number;
  aimInSeconds: number;
  drawSeconds: number;
  durability: number | null;
  /** 以下は本サイトの算出値（理論値） */
  dps: number;
  headDps: number;
  magDamage: number;
  timeToEmpty: number;
}

export interface Armor extends EquipmentCommon {
  segments: number | null;
  armorPoints: number | null;
  durability: number | null;
}

export interface Bag extends EquipmentCommon {
  kindJa: string;
  inventoryRows: number | null;
  pockets: number | null;
}

export interface Vehicle {
  id: string;
  nameEn: string;
  nameJa: string;
  kindJa: string;
  police: boolean;
  noteJa: string | null;
  inShipments: boolean;
  researchCost: number | null;
  purchaseCost: number | null;
  requiredSettlementLevel: number | null;
  requiredImprisonmentYears: number;
  /** 0〜100 の評価値（km/h ではない） */
  speed: number | null;
  acceleration: number | null;
  handling: number | null;
  trunkRows: number | null;
  trunkUpgradeSlots: number | null;
  cargoSlots: number | null;
  cargoUpgradeSlots: number | null;
}

export interface EquipmentDataset {
  source: { name: string; compareUrl: string; vehiclesUrl: string; build: string | null; retrievedAt: string };
  weaponTypeOrder: string[];
  weapons: Weapon[];
  armor: Armor[];
  bags: Bag[];
  vehicles: Vehicle[];
}
