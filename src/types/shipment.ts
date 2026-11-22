/**
 * Shipments（研究ツリー）データの型定義。
 * 生成元: scripts/build-data.ts → src/generated/shipments.json
 *
 * null は「未確認（データなし）」を意味する。0 は「確認済みで 0」。
 */

export type VerificationStatus = "verified" | "sourced" | "unverified" | "outdated";

export type CategoryId =
  | "documents"
  | "vehicles"
  | "construction"
  | "furniture"
  | "weapons"
  | "production"
  | "equipment"
  | "gadgets";

export type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary" | "Exotic";

export interface ItemStat {
  labelEn: string;
  labelJa: string;
  value: string;
}

export interface ShipmentItem {
  id: string;
  /** 同名アイテムの区別用（例: 3つある「スポーツバッグ」の何番目か）。1始まり。同名がなければ null */
  variant: number | null;

  nameEn: string;
  nameJa: string;
  descriptionEn: string;
  descriptionJa: string;

  category: CategoryId;
  /** サイト独自の補助分類（例: 車両改造パーツ） */
  subcategory: string | null;
  rarity: Rarity | null;
  /** アイコン画像のパス（public/icons/<id>.<ext> があるときのみ）。なければ汎用アイコン */
  icon: string | null;

  /** 研究アンロック費用（汚れた現金）。0 は無料（確認済み） */
  researchCost: number | null;
  /** ノートPCでの購入価格（定価、割引前） */
  purchaseCost: number | null;
  /** 故買屋への売却価格（1個あたり） */
  salePrice: number | null;

  /** 必要地区レベル。null = 条件なし（ソースで明示的に「なし」） */
  requiredSettlementLevel: number | null;
  /** 必要な服役年数（ゲーム内の累計懲役）。0 = 条件なし */
  requiredImprisonmentYears: number;

  prerequisites: string[];
  /** この研究を前提とする研究（自動算出） */
  unlocks: string[];
  additionalRequirements: string[];

  effects: { type: string; description: string; value?: number; unit?: string }[];
  stats: ItemStat[];

  /** 攻略上の優先度。根拠のある評価のみ設定し、未評価は null */
  recommendedPriority: 1 | 2 | 3 | 4 | 5 | null;
  tags: string[];

  verificationStatus: VerificationStatus;
  sourceUrl?: string;
  sourceNote?: string;
  lastVerifiedAt?: string;
  /** データの取得元ビルド番号 */
  gameBuild?: string;
  /** ツリーのレイアウト情報（ゲーム内の並び順） */
  order: number;
}

export interface CategoryInfo {
  id: CategoryId;
  nameJa: string;
  nameEn: string;
}

export interface ShipmentDataset {
  generatedAt: string;
  source: {
    name: string;
    url: string;
    treeBuild: string;
    itemPageBuilds: string[];
    retrievedAt: string;
    limitations: string[];
  };
  categories: CategoryInfo[];
  items: ShipmentItem[];
  warnings: string[];
}
