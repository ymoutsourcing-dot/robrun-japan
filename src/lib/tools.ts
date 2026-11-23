import toolsJson from "../../data/guides/tools.json";
import sharedSources from "../../data/guides/sources.json";
import type { Source } from "./guides";

export const TOOL_CATEGORIES = ["デコーダー", "ドリル", "鍵", "カード", "その他"] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

/** 出典つきの1行 */
export interface ToolFact {
  text: string;
  sources: string[];
  /** 出典の数値から本サイトが計算したもの */
  derived?: boolean;
}

export interface BarterInput {
  nameJa: string;
  nameEn: string;
  qty: number;
  cash?: boolean;
  /** Shipments の項目（/shipments/:id へリンク） */
  shipmentId?: string;
  /** このページ内の別の道具 */
  toolId?: string;
}

export interface BarterRecipe {
  inputs: BarterInput[];
  outputJa: string;
  qty: number;
  sources: string[];
  noteJa?: string;
  /** 現在は交換できない */
  disabled?: boolean;
}

export interface ToolEntry {
  id: string;
  nameJa: string;
  nameEn: string;
  categoryJa: ToolCategory;
  rarity?: string;
  /** ゲーム内アイテムID（外部サイトの個別ページ） */
  gameIds: string[];
  usageJa: ToolFact[];
  time?: ToolFact;
  timeNote?: string;
  timeSources?: string[];
  statsJa?: { label: string; value: string; sources: string[] }[];
  table?: { title: string; columns: string[]; rows: string[][]; sources: string[] };
  obtainJa: ToolFact[];
  barter?: BarterRecipe[];
  relatedShipments?: string[];
  sources: string[];
  notes?: ToolFact[];
}

export interface BuildingDefense {
  shipmentId?: string;
  nameJa?: string;
  nameEn?: string;
  base: number;
  slots: number;
  sources?: string[];
}

interface ToolsData {
  updatedAt: string;
  entries: ToolEntry[];
  buildings: { title: string; sources: string[]; noteJa: string; rows: BuildingDefense[] };
  relatedShipmentNotes: { id: string; noteJa: string; sources: string[] }[];
}

export const toolsData = toolsJson as unknown as ToolsData;
export const toolSources = sharedSources as Record<string, Source>;
export const toolById = new Map(toolsData.entries.map((e) => [e.id, e]));

/** ヒューズ1個あたりの最大防御（レジェンダリー） */
export const MAX_FUSE = 5;
/** デコーダー1個で下げる防御（アンコモン／エピック／レジェンダリー） */
export const DECODER_POWER = [1, 3, 5] as const;
