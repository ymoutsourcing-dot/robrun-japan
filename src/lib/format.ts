export const UNKNOWN = "未確認";

export function money(v: number | null | undefined): string {
  if (v === null || v === undefined) return UNKNOWN;
  if (v === 0) return "無料";
  return "$" + v.toLocaleString("en-US");
}

export function settlementLevel(v: number | null): string {
  return v === null ? "条件なし" : `レベル${v}以上`;
}

export const RARITY_JA: Record<string, string> = {
  Common: "コモン",
  Uncommon: "アンコモン",
  Rare: "レア",
  Epic: "エピック",
  Legendary: "レジェンダリー",
  Exotic: "エキゾチック",
};

export const RARITY_COLOR: Record<string, string> = {
  Common: "text-gray-300 border-gray-500",
  Uncommon: "text-green-300 border-green-600",
  Rare: "text-sky-300 border-sky-600",
  Epic: "text-rare border-rare",
  Legendary: "text-yellow-300 border-yellow-400",
  Exotic: "text-pink-300 border-pink-500",
};

export const STATUS_JA: Record<string, { label: string; desc: string; cls: string }> = {
  verified: { label: "検証済み", desc: "ゲーム内で確認済み", cls: "text-neon border-neon" },
  sourced: { label: "出典あり", desc: "ゲームファイル由来の外部データ（ゲーム内での個別確認は未実施）", cls: "text-sky-300 border-sky-600" },
  unverified: { label: "未確認", desc: "出典・検証なし", cls: "text-muted border-line" },
  outdated: { label: "旧情報の可能性", desc: "情報源間で値が食い違う、または旧バージョンの可能性", cls: "text-danger border-danger" },
};
