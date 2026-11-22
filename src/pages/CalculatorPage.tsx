import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search, Trash2, CheckCircle2, Circle, Bookmark } from "lucide-react";
import { computeCost, displayNameEn, displayNameJa, getItem, items, matchesQuery } from "../lib/data";
import { money, settlementLevel } from "../lib/format";
import { useProgress } from "../store/progress";
import { ItemIcon, Section, TierBadge } from "../components/ui";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function CalculatorPage() {
  useDocumentTitle("研究費用計算機", "ROB RUN の Shipments で目標の研究までに必要な研究費を自動計算。研究済みの前提研究は除外し、共通の前提は重複計算しません。");
  const [params, setParams] = useSearchParams();
  const targets = (params.get("targets") ?? "").split(",").filter((id) => getItem(id));
  const setTargets = (ids: string[]) => {
    const next = new URLSearchParams(params);
    if (ids.length) next.set("targets", ids.join(","));
    else next.delete("targets");
    setParams(next, { replace: true });
  };
  const [q, setQ] = useState("");
  const researched = useProgress((s) => s.researched);
  const planned = useProgress((s) => s.planned);
  const toggle = useProgress((s) => s.toggle);
  const markAll = useProgress((s) => s.markResearchedWithAncestors);
  const researchedSet = useMemo(() => new Set(researched), [researched]);
  const cost = useMemo(() => computeCost(targets, researchedSet), [targets, researchedSet]);

  const suggestions = q ? items.filter((i) => matchesQuery(i, q) && !targets.includes(i.id)).slice(0, 8) : [];
  const add = (id: string) => {
    setTargets([...targets, id]);
    setQ("");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:px-4">
      <div>
        <h1 className="text-2xl font-bold">研究費用計算機</h1>
        <p className="text-sm text-muted">
          目標の研究を選ぶと、そこまでに必要な研究費を計算します。研究済みの項目は除外し、複数の目標で共通する前提研究は1回だけ数えます。
        </p>
      </div>

      <Section title="目標の研究">
        <div className="relative">
          <Search size={15} className="absolute left-2 top-2.5 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="研究を検索して追加（例: 産業用温度計, thermometer）"
            className="w-full rounded-md border border-line bg-bg py-1.5 pl-7 pr-2 text-sm outline-none focus:border-neon"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-line bg-bg-card shadow-xl">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button onClick={() => add(s.id)} className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-bg-hover">
                    <ItemIcon item={s} size={14} />
                    <span className="flex-1">
                      {displayNameJa(s)} <span className="font-mono text-xs text-muted">{displayNameEn(s)}</span>
                    </span>
                    <span className="font-mono text-xs text-money">{money(s.researchCost)}</span>
                    <Plus size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {planned.length > 0 && (
          <button
            onClick={() => setTargets([...new Set([...targets, ...planned])])}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-sky-600 px-2 py-1 text-xs text-sky-300"
          >
            <Bookmark size={13} /> 「次に研究予定」の {planned.length} 件を目標に追加
          </button>
        )}
        {targets.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {targets.map((id) => {
              const it = getItem(id)!;
              return (
                <li key={id} className="flex items-center gap-2 rounded-md border border-line bg-bg-card px-2 py-1.5">
                  <ItemIcon item={it} size={14} />
                  <Link to={`/shipments/${id}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                    {displayNameJa(it)} <span className="font-mono text-xs text-muted">{displayNameEn(it)}</span>
                  </Link>
                  <button onClick={() => setTargets(targets.filter((t) => t !== id))} aria-label="目標から削除" className="text-muted hover:text-danger">
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">まだ目標がありません。上の検索欄から追加してください。</p>
        )}
      </Section>

      {targets.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-neon/40 bg-neon/5 p-4">
              <p className="text-xs text-muted">追加で必要な研究費</p>
              <p className="font-mono text-2xl text-money">${cost.researchTotal.toLocaleString("en-US")}</p>
              <p className="text-xs text-muted">
                未研究 {cost.pending.length} 件（研究済み {cost.alreadyDone.length} 件は除外）
              </p>
            </div>
            <div className="rounded-xl border border-line bg-bg-panel p-4">
              <p className="text-xs text-muted">目標アイテムの購入費（定価）</p>
              <p className="font-mono text-2xl text-money">${cost.purchaseTotal.toLocaleString("en-US")}</p>
              {cost.unknownPurchase.length > 0 && (
                <p className="text-xs text-danger">
                  ＋未確認 {cost.unknownPurchase.length} 件（{cost.unknownPurchase.map((i) => displayNameJa(i)).join("、")}）
                </p>
              )}
            </div>
            <div className="rounded-xl border border-line bg-bg-panel p-4">
              <p className="text-xs text-muted">必要な条件</p>
              <p className="text-sm">
                地区: <span className="font-bold">{settlementLevel(cost.maxSettlementLevel)}</span>
              </p>
              <p className="text-sm">
                服役年数: <span className="font-bold">{cost.maxImprisonmentYears > 0 ? `${cost.maxImprisonmentYears}年以上` : "条件なし"}</span>
              </p>
            </div>
          </div>
          <p className="text-sm">
            合計:{" "}
            <span className="font-mono text-money">
              ${cost.researchTotal.toLocaleString("en-US")}（研究費）＋ ${cost.purchaseTotal.toLocaleString("en-US")}（購入費）
            </span>
            {cost.unknownPurchase.length > 0 && <span className="text-danger"> ＋ 未確認の購入費</span>}
            <span className="block text-xs text-muted">※ 注文・配送費は別途かかります（数値未確認）。</span>
          </p>

          <Section
            title="研究する順番"
            right={
              cost.pending.length > 0 && (
                <button onClick={() => markAll(cost.pending.map((p) => p.id))} className="rounded-md border border-neon px-2 py-1 text-xs text-neon hover:bg-neon/10">
                  すべて研究済みにする
                </button>
              )
            }
          >
            <ol className="space-y-1">
              {[...cost.alreadyDone, ...cost.pending]
                .sort((a, b) => (researchedSet.has(a.id) ? 0 : 1) - (researchedSet.has(b.id) ? 0 : 1))
                .map((it) => {
                  const done = researchedSet.has(it.id);
                  return (
                    <li key={it.id} className={`flex items-center gap-2 rounded-md px-1 py-1 ${done ? "opacity-50" : ""}`}>
                      <button onClick={() => toggle("researched", it.id)} aria-label={done ? "研究済みを解除" : "研究済みにする"}>
                        {done ? <CheckCircle2 size={18} className="text-neon" /> : <Circle size={18} className="text-muted" />}
                      </button>
                      <Link to={`/shipments/${it.id}`} className={`min-w-0 flex-1 truncate text-sm hover:underline ${done ? "line-through" : ""}`}>
                        {displayNameJa(it)} <span className="font-mono text-xs text-muted">{displayNameEn(it)}</span>
                      </Link>
                      <TierBadge level={it.requiredSettlementLevel} />
                      <span className="w-24 text-right font-mono text-sm text-money">{money(it.researchCost)}</span>
                    </li>
                  );
                })}
            </ol>
          </Section>
        </>
      )}
    </div>
  );
}
