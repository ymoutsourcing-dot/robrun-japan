import { Link } from "react-router-dom";
import { ExternalLink, GitBranch, Lock } from "lucide-react";
import type { ShipmentItem } from "../types/shipment";
import { computeCost, displayNameJa, getItem } from "../lib/data";
import { money, settlementLevel } from "../lib/format";
import { useProgress } from "../store/progress";
import { ProgressToggles, RarityBadge, StatusBadge } from "./ui";
import { ItemUsageSummary, PurchasePrice } from "./ItemUsage";

/** 一覧の行の中で開く、アイテムの要約（アコーディオンの中身） */
export function ItemSummary({ item }: { item: ShipmentItem }) {
  const researched = useProgress((s) => s.researched);
  const cost = computeCost([item.id], new Set(researched));
  return (
    <div className="grid gap-3 p-3 text-sm md:grid-cols-[1.3fr_1fr]">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <RarityBadge rarity={item.rarity} />
          <StatusBadge status={item.verificationStatus} />
        </div>
        <p className="whitespace-pre-line leading-relaxed">{item.descriptionJa}</p>
        <p className="whitespace-pre-line text-xs leading-relaxed text-gray-300">
          <span className="mr-1 text-[10px] font-bold text-muted">英語原文</span>
          {item.descriptionEn}
        </p>
        <ItemUsageSummary item={item} />
        <ProgressToggles id={item.id} compact />
        {item.stats.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-3">
            {item.stats.map((s) => (
              <div key={s.labelEn} className="flex justify-between gap-2 border-b border-line/40 py-0.5">
                <dt className="text-muted">{s.labelJa}</dt>
                <dd className="font-mono">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div className="space-y-1.5">
        <dl className="space-y-0.5">
          {[
            ["研究費", <span className="font-mono text-money">{money(item.researchCost)}</span>],
            ["購入価格", <PurchasePrice item={item} />],
            ["売却価格", <span className="font-mono">{money(item.salePrice)}</span>],
            ["必要地区レベル", settlementLevel(item.requiredSettlementLevel)],
            ...(item.requiredImprisonmentYears > 0
              ? [[
                  "必要服役年数",
                  <span className="text-danger">
                    <Lock size={11} className="inline" /> {item.requiredImprisonmentYears}年以上
                  </span>,
                ] as const]
              : []),
            [
              "前提研究",
              item.prerequisites.length
                ? item.prerequisites.map((p) => (getItem(p) ? displayNameJa(getItem(p)!) : p)).join("・")
                : "なし",
            ],
            ["ここまでの研究費", <span className="font-mono text-money">{money(cost.researchTotal) === "無料" ? "$0" : money(cost.researchTotal)}<span className="ml-1 text-[11px] text-muted">（未研究{cost.pending.length}件）</span></span>],
          ].map(([k, v]) => (
            <div key={k as string} className="flex justify-between gap-3 border-b border-line/40 py-0.5">
              <dt className="shrink-0 text-muted">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2 pt-1 text-xs">
          <Link to={`/shipments?item=${item.id}`} className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 hover:border-neon">
            <GitBranch size={12} /> ツリーで見る
          </Link>
          <Link to={`/shipments/${item.id}`} className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 hover:border-neon">
            <ExternalLink size={12} /> 詳細ページ
          </Link>
          <Link to={`/calculator?targets=${item.id}`} className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 hover:border-neon">
            費用計算
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Shipments に無いアイテム用の簡易表示 */
export function PlainSummary({ descriptionJa, note, sourceUrl }: { descriptionJa: string | null; note?: string; sourceUrl?: string }) {
  return (
    <div className="space-y-1 p-3 text-sm">
      {descriptionJa && <p>{descriptionJa}</p>}
      <p className="text-xs text-muted">{note ?? "Shipmentsの研究ツリーには無いアイテムです（入手方法は未確認）。"}</p>
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-300 underline">
          出典 <ExternalLink size={11} />
        </a>
      )}
    </div>
  );
}
