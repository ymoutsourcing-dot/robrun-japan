import { Link } from "react-router-dom";
import { ExternalLink, Lock, ArrowRight, Calculator } from "lucide-react";
import type { ShipmentItem } from "../types/shipment";
import {
  categoryName,
  computeCost,
  descendantCount,
  displayNameEn,
  displayNameJa,
  getItem,
  recommendations,
} from "../lib/data";
import { money, settlementLevel, UNKNOWN } from "../lib/format";
import { useProgress } from "../store/progress";
import { ItemIcon, Priority, ProgressToggles, RarityBadge, StatusBadge, TierBadge } from "./ui";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line/60 py-1.5 text-sm last:border-0">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function ItemLink({ id, onSelect }: { id: string; onSelect?: (id: string) => void }) {
  const it = getItem(id);
  const done = useProgress((s) => s.researched.includes(id));
  if (!it) return <span className="text-danger">{id}（不明）</span>;
  const inner = (
    <>
      <span className={done ? "text-neon" : ""}>{displayNameJa(it)}</span>
      <span className="ml-1 text-xs text-muted">{money(it.researchCost)}</span>
    </>
  );
  return onSelect ? (
    <button type="button" className="text-left hover:underline" onClick={() => onSelect(id)}>
      {inner}
    </button>
  ) : (
    <Link className="hover:underline" to={`/shipments/${id}`}>
      {inner}
    </Link>
  );
}

export function ItemDetail({ item, onSelect }: { item: ShipmentItem; onSelect?: (id: string) => void }) {
  const researchedArr = useProgress((s) => s.researched);
  const markAll = useProgress((s) => s.markResearchedWithAncestors);
  const cost = computeCost([item.id], new Set(researchedArr));
  const rec = recommendations[item.id];
  const desc = descendantCount(item.id);

  return (
    <article className="space-y-4">
      <header className="flex items-start gap-3">
        <ItemIcon item={item} size={26} />
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight">{displayNameJa(item)}</h1>
          <p className="font-mono text-sm text-muted">{displayNameEn(item)}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded border border-line px-1.5 text-xs">{categoryName(item.category)}</span>
            {item.subcategory && <span className="rounded border border-line px-1.5 text-xs">{item.subcategory}</span>}
            <RarityBadge rarity={item.rarity} />
            <StatusBadge status={item.verificationStatus} />
          </div>
        </div>
      </header>

      <ProgressToggles id={item.id} />

      <div className="rounded-lg border border-line bg-bg p-3">
        <p className="whitespace-pre-line text-[15px] leading-relaxed">{item.descriptionJa}</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted">英語原文</summary>
          <p className="mt-1 whitespace-pre-line font-mono text-xs leading-relaxed text-muted">{item.descriptionEn}</p>
        </details>
      </div>

      <section>
        <h2 className="mb-1 text-xs font-bold text-neon">研究情報</h2>
        <dl>
          <Row label="研究費">
            <span className="font-mono text-money">{money(item.researchCost)}</span>
          </Row>
          <Row label="購入価格（ノートPC・定価）">
            <span className="font-mono text-money">{money(item.purchaseCost)}</span>
          </Row>
          <Row label="売却価格（故買屋・1個）">
            <span className="font-mono">{money(item.salePrice)}</span>
          </Row>
          <Row label="必要地区レベル">
            <span className="inline-flex items-center gap-1">
              {settlementLevel(item.requiredSettlementLevel)} <TierBadge level={item.requiredSettlementLevel} />
            </span>
          </Row>
          {item.requiredImprisonmentYears > 0 && (
            <Row label="必要服役年数">
              <span className="inline-flex items-center gap-1 text-danger">
                <Lock size={13} />
                {item.requiredImprisonmentYears} 年以上
              </span>
            </Row>
          )}
          <Row label="前提研究">
            {item.prerequisites.length ? (
              <div className="flex flex-col items-end">
                {item.prerequisites.map((p) => (
                  <ItemLink key={p} id={p} onSelect={onSelect} />
                ))}
              </div>
            ) : (
              "なし（最初から研究可能）"
            )}
          </Row>
          <Row label="派生研究">
            {item.unlocks.length ? (
              <div className="flex flex-col items-end">
                {item.unlocks.map((p) => (
                  <ItemLink key={p} id={p} onSelect={onSelect} />
                ))}
              </div>
            ) : (
              "なし"
            )}
          </Row>
          {item.additionalRequirements.length > 0 && (
            <Row label="その他の条件">{item.additionalRequirements.join(" / ")}</Row>
          )}
        </dl>
      </section>

      <section className="rounded-lg border border-neon/30 bg-neon/5 p-3">
        <h2 className="mb-2 flex items-center gap-1 text-xs font-bold text-neon">
          <Calculator size={14} /> ここまでの必要研究費（研究済みを除く）
        </h2>
        <p className="font-mono text-2xl text-money">{money(cost.researchTotal) === "無料" ? "$0" : money(cost.researchTotal)}</p>
        <p className="mt-1 text-xs text-muted">
          未研究 {cost.pending.length} 件 / 研究済み {cost.alreadyDone.length} 件
          {cost.maxImprisonmentYears > 0 && ` / 経路上の服役条件 最大${cost.maxImprisonmentYears}年`}
        </p>
        {cost.pending.length > 0 && (
          <ol className="mt-2 space-y-0.5 text-sm">
            {cost.pending.map((p, i) => (
              <li key={p.id} className="flex items-center gap-1">
                <span className="w-5 text-right font-mono text-xs text-muted">{i + 1}.</span>
                <ArrowRight size={12} className="text-muted" />
                <ItemLink id={p.id} onSelect={onSelect} />
              </li>
            ))}
          </ol>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {cost.pending.length > 0 && (
            <button
              type="button"
              onClick={() => markAll(cost.pending.map((p) => p.id))}
              className="rounded-md border border-neon px-2 py-1 text-xs text-neon hover:bg-neon/10"
            >
              経路をまとめて研究済みにする
            </button>
          )}
          <Link
            to={`/calculator?targets=${item.id}`}
            className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-white"
          >
            費用計算機で開く
          </Link>
        </div>
      </section>

      {item.stats.length > 0 && (
        <section>
          <h2 className="mb-1 text-xs font-bold text-neon">アイテム性能</h2>
          <dl>
            {item.stats.map((s) => (
              <Row key={s.labelEn} label={s.labelJa}>
                <span className="font-mono">{s.value}</span>
              </Row>
            ))}
          </dl>
        </section>
      )}

      <section>
        <h2 className="mb-1 text-xs font-bold text-neon">攻略情報</h2>
        <dl>
          <Row label="おすすめ度">
            <Priority value={rec ? (rec.priority as number) : item.recommendedPriority} />
          </Row>
          {rec && <Row label="評価の根拠">{rec.reason}</Row>}
          <Row label="解放価値（この先の派生研究数）">{desc} 件</Row>
          <Row label="用途タグ">{item.tags.length ? item.tags.join("・") : "—"}</Row>
          <Row label="メリット / デメリット / 初心者・3人PT評価">
            <span className="text-muted">{UNKNOWN}（検証データ収集中）</span>
          </Row>
        </dl>
      </section>

      <footer className="space-y-1 border-t border-line pt-3 text-xs text-muted">
        <p>
          情報源:{" "}
          <a className="inline-flex items-center gap-0.5 underline" href={item.sourceUrl} target="_blank" rel="noreferrer">
            Rob Run Guide <ExternalLink size={11} />
          </a>
          （ゲームファイル抽出データ / ツリー build {item.gameBuild}）・取得日 {item.lastVerifiedAt}
        </p>
        {item.sourceNote && <p className="text-danger/90">注記: {item.sourceNote}</p>}
        <p>
          ID: <code>{item.id}</code>
        </p>
      </footer>
    </article>
  );
}
