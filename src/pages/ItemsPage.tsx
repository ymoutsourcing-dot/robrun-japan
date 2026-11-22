import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X, CheckCircle2, Circle } from "lucide-react";
import type { CategoryId, ShipmentItem } from "../types/shipment";
import { categories, categoryName, descendantCount, displayNameEn, displayNameJa, items, matchesQuery } from "../lib/data";
import { money, RARITY_JA } from "../lib/format";
import { useProgress } from "../store/progress";
import { CategoryIcon, ItemIcon, RarityBadge, TierBadge } from "../components/ui";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

type Sort = "cost-asc" | "cost-desc" | "recommended" | "level" | "name" | "unlocks";
const TAGS = ["金策", "PvP", "拠点", "車両改造", "収納", "防衛"];
const RARITIES = Object.keys(RARITY_JA);

export default function ItemsPage() {
  useDocumentTitle("アイテムデータベース", "ROB RUN の Shipments アイテムを日本語・英語で検索。研究費・購入価格・売却価格・性能を一覧比較。");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategoryId | "all">("all");
  const [level, setLevel] = useState<"all" | "none" | "1" | "2" | "3">("all");
  const [status, setStatus] = useState<"all" | "todo" | "done">("all");
  const [tag, setTag] = useState<string>("all");
  const [rarity, setRarity] = useState<string>("all");
  const [maxCost, setMaxCost] = useState<string>("");
  const [sort, setSort] = useState<Sort>("cost-asc");
  const researched = useProgress((s) => s.researched);
  const toggle = useProgress((s) => s.toggle);

  const list = useMemo(() => {
    const set = new Set(researched);
    const max = maxCost ? Number(maxCost) : null;
    const filtered = items.filter((it) => {
      if (!matchesQuery(it, q)) return false;
      if (cat !== "all" && it.category !== cat) return false;
      if (level === "none" && it.requiredSettlementLevel !== null) return false;
      if (["1", "2", "3"].includes(level) && it.requiredSettlementLevel !== Number(level)) return false;
      if (status === "todo" && set.has(it.id)) return false;
      if (status === "done" && !set.has(it.id)) return false;
      if (tag !== "all" && !it.tags.includes(tag)) return false;
      if (rarity !== "all" && it.rarity !== rarity) return false;
      if (max !== null && (it.researchCost === null || it.researchCost > max)) return false;
      return true;
    });
    const nullsLast = (v: number | null, dir: 1 | -1) => (v === null ? Number.POSITIVE_INFINITY : v * dir);
    const cmp: Record<Sort, (a: ShipmentItem, b: ShipmentItem) => number> = {
      "cost-asc": (a, b) => nullsLast(a.researchCost, 1) - nullsLast(b.researchCost, 1),
      "cost-desc": (a, b) => nullsLast(a.researchCost, -1) - nullsLast(b.researchCost, -1),
      recommended: (a, b) => (b.recommendedPriority ?? 0) - (a.recommendedPriority ?? 0),
      level: (a, b) => (a.requiredSettlementLevel ?? 0) - (b.requiredSettlementLevel ?? 0),
      name: (a, b) => a.nameJa.localeCompare(b.nameJa, "ja"),
      unlocks: (a, b) => descendantCount(b.id) - descendantCount(a.id),
    };
    return [...filtered].sort((a, b) => cmp[sort](a, b) || a.nameJa.localeCompare(b.nameJa, "ja"));
  }, [q, cat, level, status, tag, rarity, maxCost, sort, researched]);

  const sel = "rounded-md border border-line bg-bg px-2 py-1.5 text-sm";

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4">
      <h1 className="mb-1 text-2xl font-bold">アイテムデータベース</h1>
      <p className="mb-4 text-sm text-muted">Shipments で解放できる全 {items.length} 項目を検索できます。</p>

      <div className="mb-3 grid gap-2 rounded-xl border border-line bg-bg-panel p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search size={15} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="名前・効果・用途で検索（日本語/英語）"
            className="w-full rounded-md border border-line bg-bg py-1.5 pl-7 pr-7 text-sm outline-none focus:border-neon"
          />
          {q && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted" onClick={() => setQ("")} aria-label="クリア">
              <X size={14} />
            </button>
          )}
        </div>
        <select className={sel} value={cat} onChange={(e) => setCat(e.target.value as CategoryId | "all")} aria-label="カテゴリー">
          <option value="all">全カテゴリー</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameJa}
            </option>
          ))}
        </select>
        <select className={sel} value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="並び替え">
          <option value="cost-asc">研究費が安い順</option>
          <option value="cost-desc">研究費が高い順</option>
          <option value="recommended">おすすめ順</option>
          <option value="level">地区レベル順</option>
          <option value="name">名前順</option>
          <option value="unlocks">派生研究が多い順</option>
        </select>
        <select className={sel} value={level} onChange={(e) => setLevel(e.target.value as typeof level)} aria-label="必要地区レベル">
          <option value="all">地区レベル: すべて</option>
          <option value="none">条件なし</option>
          <option value="1">レベル1</option>
          <option value="2">レベル2</option>
          <option value="3">レベル3</option>
        </select>
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="研究状態">
          <option value="all">研究状態: すべて</option>
          <option value="todo">未研究</option>
          <option value="done">研究済み</option>
        </select>
        <select className={sel} value={tag} onChange={(e) => setTag(e.target.value)} aria-label="用途">
          <option value="all">用途: すべて</option>
          {TAGS.map((t) => (
            <option key={t} value={t}>
              {t}向け
            </option>
          ))}
        </select>
        <select className={sel} value={rarity} onChange={(e) => setRarity(e.target.value)} aria-label="レアリティ">
          <option value="all">レアリティ: すべて</option>
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {RARITY_JA[r]}
            </option>
          ))}
        </select>
        <select className={sel} value={maxCost} onChange={(e) => setMaxCost(e.target.value)} aria-label="研究費の上限">
          <option value="">研究費: 上限なし</option>
          {[10000, 50000, 100000, 250000, 500000, 1000000].map((v) => (
            <option key={v} value={v}>
              {money(v)} 以下
            </option>
          ))}
        </select>
      </div>

      <p className="mb-2 text-sm text-muted">{list.length} 件</p>

      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="hidden bg-bg-panel text-left text-xs text-muted md:table-header-group">
            <tr>
              <th className="w-10 p-2"></th>
              <th className="p-2">アイテム</th>
              <th className="p-2">カテゴリー</th>
              <th className="p-2 text-right">研究費</th>
              <th className="p-2 text-right">購入価格</th>
              <th className="p-2 text-center">地区Lv</th>
              <th className="p-2">レアリティ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60 bg-bg-card">
            {list.map((it) => {
              const done = researched.includes(it.id);
              return (
                <tr key={it.id} className="hover:bg-bg-hover">
                  <td className="p-2 align-middle">
                    <button onClick={() => toggle("researched", it.id)} aria-label={done ? "研究済みを解除" : "研究済みにする"}>
                      {done ? <CheckCircle2 size={18} className="text-neon" /> : <Circle size={18} className="text-muted" />}
                    </button>
                  </td>
                  <td className="p-2">
                    <Link to={`/shipments/${it.id}`} className="flex items-center gap-2">
                      <ItemIcon item={it} size={16} />
                      <span className="min-w-0">
                        <span className={`block font-bold ${done ? "text-neon" : ""}`}>{displayNameJa(it)}</span>
                        <span className="block font-mono text-[11px] text-muted">{displayNameEn(it)}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs md:hidden">
                          <span className="font-mono text-money">{money(it.researchCost)}</span>
                          <TierBadge level={it.requiredSettlementLevel} />
                          <span className="text-muted">{categoryName(it.category)}</span>
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="hidden p-2 md:table-cell">
                    <span className="inline-flex items-center gap-1">
                      <CategoryIcon id={it.category} size={13} />
                      {categoryName(it.category)}
                    </span>
                  </td>
                  <td className="hidden p-2 text-right font-mono text-money md:table-cell">{money(it.researchCost)}</td>
                  <td className="hidden p-2 text-right font-mono md:table-cell">
                    <span className={it.purchaseCost === null ? "text-muted" : ""}>{money(it.purchaseCost)}</span>
                  </td>
                  <td className="hidden p-2 text-center md:table-cell">
                    {it.requiredSettlementLevel === null ? <span className="text-xs text-muted">—</span> : <TierBadge level={it.requiredSettlementLevel} />}
                  </td>
                  <td className="hidden p-2 md:table-cell">
                    <RarityBadge rarity={it.rarity} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && <p className="p-6 text-center text-muted">条件に一致するアイテムがありません。</p>}
      </div>
    </div>
  );
}
