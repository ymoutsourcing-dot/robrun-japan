/**
 * サイト内検索。各ページのデータ（研究・攻略・道具・小ネタ・積荷・コレクション・装備）から
 * 1つの索引を作り、ブラウザ内で部分一致検索する。
 */
import { displayNameEn, displayNameJa, items } from "./data";
import { ALL_GUIDES, MAP_GUIDES } from "./guides";
import { toolsData } from "./tools";
import { tipsData } from "./tips";
import { equipment } from "./equipment";
import cargoJson from "../../data/source/cargo.source.json";
import collectionsJson from "../../data/source/collections.source.json";

export type SearchKind = "研究" | "攻略" | "道具" | "小ネタ" | "積荷" | "コレクション" | "装備" | "ページ";
export const KIND_ORDER: SearchKind[] = ["ページ", "研究", "装備", "道具", "積荷", "コレクション", "小ネタ", "攻略"];

export interface SearchDoc {
  kind: SearchKind;
  title: string;
  sub?: string;
  text: string;
  to: string;
}

/** 全角/半角・大文字/小文字・カタカナ/ひらがなの違いを無視する */
export function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[・･\s]+/g, " ");
}

const PAGES: [string, string, string][] = [
  ["研究ツリー", "/shipments", "Shipments 研究 ツリー"],
  ["アイテム一覧", "/items", "アイテム 研究 一覧"],
  ["武器", "/weapons", "武器 weapon 防具 バッグ"],
  ["車両", "/vehicles", "車両 車 vehicle ヘリ"],
  ["積荷（カーゴ）図鑑", "/cargo", "積荷 カーゴ cargo 密輸 詰め直し"],
  ["コレクション レシピ一覧", "/collections", "コレクション collection レシピ"],
  ["道具・鍵", "/tools", "道具 鍵 デコーダー ドリル 物々交換"],
  ["研究費用計算機", "/calculator", "費用 計算"],
  ["計算機（売値・防御・研究プラン）", "/calc", "計算機 売値 防御 悪名"],
  ["おすすめ研究", "/recommended", "おすすめ ルート"],
  ["攻略ガイド一覧", "/guides", "攻略 ガイド"],
  ["小ネタ・強盗スポット", "/tips", "小ネタ イベント 強盗"],
  ["研究進捗", "/progress", "進捗 エクスポート インポート"],
  ["データについて", "/about", "出典 データ"],
  ["更新履歴", "/changelog", "更新 履歴"],
];

let cache: { doc: SearchDoc; key: string }[] | null = null;

function build(): { doc: SearchDoc; key: string }[] {
  const docs: SearchDoc[] = [];
  for (const [title, to, words] of PAGES) docs.push({ kind: "ページ", title, text: words, to });

  for (const it of items)
    docs.push({ kind: "研究", title: displayNameJa(it), sub: displayNameEn(it), text: `${it.id} ${it.descriptionJa ?? ""} ${it.descriptionEn ?? ""}`, to: `/shipments/${it.id}` });

  const eq = equipment as unknown as Record<string, { id: string; nameJa: string; nameEn: string; descriptionJa?: string }[]>;
  for (const k of ["weapons", "armor", "bags"])
    for (const w of eq[k] ?? []) docs.push({ kind: "装備", title: w.nameJa, sub: w.nameEn, text: `${w.id} ${w.descriptionJa ?? ""}`, to: `/weapons?tab=${k}&q=${encodeURIComponent(w.nameEn)}` });

  for (const t of toolsData.entries) {
    const facts = [...t.usageJa, ...t.obtainJa, ...(t.notes ?? [])].map((f) => f.text).join(" ");
    const table = t.table ? t.table.rows.map((r) => r.join(" ")).join(" ") : "";
    docs.push({ kind: "道具", title: t.nameJa, sub: t.nameEn, text: `${t.gameIds.join(" ")} ${facts} ${table}`, to: `/tools#tool-${t.id}` });
  }

  for (const c of (cargoJson as { items: { id: string; nameJa: string; nameEn: string }[] }).items)
    docs.push({ kind: "積荷", title: c.nameJa, sub: c.nameEn, text: c.id, to: "/cargo" });

  const seen = new Set<string>();
  for (const c of (collectionsJson as unknown as { collections: { ingredients: { id: string; nameEn: string; nameJa: string | null }[] }[] }).collections)
    for (const x of c.ingredients) {
      if (seen.has(x.id)) continue;
      seen.add(x.id);
      docs.push({ kind: "コレクション", title: x.nameJa ?? x.nameEn, sub: x.nameJa ? x.nameEn : "コレクションの材料", text: x.id, to: `/collections?q=${encodeURIComponent(x.nameEn)}` });
    }

  for (const e of tipsData.events)
    docs.push({ kind: "小ネタ", title: e.nameJa, sub: e.nameEn, text: e.rows.map((r) => r.text).join(" "), to: "/tips#events" });
  for (const l of tipsData.locations)
    docs.push({ kind: "小ネタ", title: l.nameJa, sub: `${l.nameEn}・強盗スポット`, text: `${l.aliasEn ?? ""} ${l.typeJa} ${l.districtJa} ${l.districtEn}`, to: "/tips#locations" });
  for (const [id, it] of Object.entries(tipsData.items))
    if (!seen.has(id)) docs.push({ kind: "小ネタ", title: it.ja, sub: `${it.en}・拾える品${it.price != null ? `・売値$${it.price.toLocaleString()}` : ""}`, text: id, to: "/tips#locations" });
  for (const t of [...tipsData.tips, ...tipsData.eventRules, ...tipsData.locationNotes])
    docs.push({ kind: "小ネタ", title: t.text.length > 40 ? `${t.text.slice(0, 40)}…` : t.text, text: t.text, to: "/tips#tips" });

  for (const g of ALL_GUIDES) {
    docs.push({ kind: "攻略", title: g.title, sub: g.titleEn, text: g.summary, to: `/guides/${g.id}` });
    for (const s of g.sections)
      for (const f of s.facts) docs.push({ kind: "攻略", title: f.text.length > 40 ? `${f.text.slice(0, 40)}…` : f.text, sub: `${g.title} › ${s.heading}`, text: f.text, to: `/guides/${g.id}` });
  }
  for (const g of MAP_GUIDES)
    for (const p of g.places ?? []) docs.push({ kind: "攻略", title: p.nameJa, sub: `${p.nameEn ?? ""}・${g.title}`, text: p.whatJa, to: `/guides/${g.id}` });

  return docs.map((doc) => ({ doc, key: normalize(`${doc.title} ${doc.sub ?? ""} ${doc.text}`) }));
}

export function search(q: string, limit = 300): SearchDoc[] {
  const terms = normalize(q).split(" ").filter(Boolean);
  if (!terms.length) return [];
  cache ??= build();
  const scored: { doc: SearchDoc; score: number }[] = [];
  for (const { doc, key } of cache) {
    if (!terms.every((t) => key.includes(t))) continue;
    const head = normalize(`${doc.title} ${doc.sub ?? ""}`);
    let score = 0;
    for (const t of terms) {
      if (normalize(doc.title) === t) score += 10;
      else if (head.includes(t)) score += 5;
    }
    scored.push({ doc, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.doc);
}
