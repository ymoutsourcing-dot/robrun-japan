import { Link } from "react-router-dom";
import { CheckCircle2, ExternalLink, KeyRound } from "lucide-react";
import type { ItemUsage, ShipmentItem, UsageLine, UsageSource } from "../types/shipment";
import { displayNameJa, getItem, getUsage } from "../lib/data";
import { money } from "../lib/format";
import { KIND, SourceTag } from "./GuideBody";

/** 行ごとの出典の短い表記 */
function shortLabel(s: UsageSource): string {
  if (s.key === "game-text") return "ゲーム内説明";
  if (s.url.includes("robrun.info")) return "robrun.info";
  if (s.url.includes("robrunguide.app")) return "Rob Run Guide";
  return s.label;
}

function LineSource({ usage, line }: { usage: ItemUsage; line: { source: string | null } }) {
  if (!line.source) return null;
  const s = usage.sources.find((x) => x.key === line.source);
  if (!s) return null;
  const cls = `ml-1 whitespace-nowrap rounded border px-1 align-middle text-[10px] leading-none ${KIND[s.kind].cls}`;
  // 自分自身のページへのリンク（ゲーム内説明）は表示だけにする
  return s.url.startsWith("/") ? (
    <span className={cls} title={s.label}>
      {shortLabel(s)}
    </span>
  ) : (
    <a href={s.url} target="_blank" rel="noreferrer" className={`${cls} hover:underline`} title={s.label}>
      {shortLabel(s)}
    </a>
  );
}

function ItemChips({ ids, onSelect }: { ids: string[]; onSelect?: (id: string) => void }) {
  if (!ids.length) return null;
  return (
    <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
      {ids.map((id) => {
        const it = getItem(id);
        const label = it ? displayNameJa(it) : id;
        const cls = "rounded border border-sky-700 px-1 text-[11px] leading-tight text-sky-300 hover:border-sky-400";
        return onSelect ? (
          <button key={id} type="button" className={cls} onClick={() => onSelect(id)}>
            {label}
          </button>
        ) : (
          <Link key={id} to={`/shipments/${id}`} className={cls}>
            {label}
          </Link>
        );
      })}
    </span>
  );
}

function Lines({
  usage,
  lines,
  onSelect,
  marker = "•",
}: {
  usage: ItemUsage;
  lines: UsageLine[];
  onSelect?: (id: string) => void;
  marker?: string;
}) {
  return (
    <ul className="space-y-1">
      {lines.map((l, i) => (
        <li key={i} className="flex gap-1.5 text-sm leading-relaxed">
          <span className="select-none text-muted">{marker}</span>
          <span>
            {l.text}
            <ItemChips ids={l.items} onSelect={onSelect} />
            <LineSource usage={usage} line={l} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function SubHead({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1 mt-3 text-[11px] font-bold tracking-wider text-muted">{children}</h3>;
}

/** 「これがあるとできること」「使うのに必要なもの」の囲み */
function KeyFacts({ usage, onSelect, compact }: { usage: ItemUsage; onSelect?: (id: string) => void; compact?: boolean }) {
  if (!usage.enables.length && !usage.requires.length) return null;
  const pick = (ls: UsageLine[]) => (compact ? ls.slice(0, 2) : ls);
  return (
    <div className={`grid gap-2 ${usage.enables.length && usage.requires.length && !compact ? "sm:grid-cols-2" : ""}`}>
      {usage.enables.length > 0 && (
        <div className="rounded-md border border-neon/40 bg-neon/5 p-2">
          <p className="mb-1 flex items-center gap-1 text-xs font-bold text-neon">
            <CheckCircle2 size={13} /> これがあるとできること
          </p>
          <Lines usage={usage} lines={pick(usage.enables)} onSelect={onSelect} />
        </div>
      )}
      {usage.requires.length > 0 && (
        <div className="rounded-md border border-money/40 bg-money/5 p-2">
          <p className="mb-1 flex items-center gap-1 text-xs font-bold text-money">
            <KeyRound size={13} /> 使うのに必要なもの
          </p>
          <Lines usage={usage} lines={pick(usage.requires)} onSelect={onSelect} />
        </div>
      )}
    </div>
  );
}

/** 主要な効果の数値（説明文のすぐ下に出すバッジ） */
export function EffectBadges({ item, compact }: { item: ShipmentItem; compact?: boolean }) {
  const usage = getUsage(item.id);
  if (!usage?.effects.length) return null;
  const details = compact ? [] : usage.effects.filter((f) => f.detail);
  return (
    <div className={compact ? "" : "rounded-lg border border-money/40 bg-money/5 p-2.5"}>
      {!compact && <p className="mb-1.5 text-[11px] font-bold tracking-wider text-money">効果</p>}
      <div className="flex flex-wrap gap-1.5">
        {usage.effects.map((f) => (
          <span
            key={f.label}
            className="inline-flex items-baseline gap-1 rounded-md border border-money/50 bg-bg px-2 py-0.5 text-sm"
            title={usage.sources.find((s) => s.key === f.source)?.label}
          >
            <span className="text-xs text-muted">{f.label}</span>
            <span className="font-mono font-bold text-money">{f.value}</span>
          </span>
        ))}
      </div>
      {details.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {details.map((f) => (
            <li key={f.label} className="text-xs text-gray-300">
              {f.label}: {f.detail}
              <LineSource usage={usage} line={{ source: f.detailSource }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** アイテム詳細（個別ページ・ツリーのサイドパネル）用 */
export function ItemUsageSection({ item, onSelect }: { item: ShipmentItem; onSelect?: (id: string) => void }) {
  const usage = getUsage(item.id);
  if (!usage) return null;
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold text-neon">使い方・入手方法</h2>
      <KeyFacts usage={usage} onSelect={onSelect} />
      {usage.usage.length > 0 && (
        <>
          <SubHead>使い方</SubHead>
          <Lines usage={usage} lines={usage.usage} onSelect={onSelect} />
        </>
      )}
      {usage.stats.length > 0 && (
        <>
          <SubHead>性能（robrun.info）</SubHead>
          <dl className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            {usage.stats.map((s) => (
              <div key={s.label} className="flex justify-between gap-3 border-b border-line/60 py-1 text-sm">
                <dt className="text-muted">{s.label}</dt>
                <dd className="text-right font-mono">{s.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
      {usage.obtain.length > 0 && (
        <>
          <SubHead>入手方法</SubHead>
          <Lines usage={usage} lines={usage.obtain} onSelect={onSelect} />
        </>
      )}
      {usage.usedFor.length > 0 && (
        <>
          <SubHead>使い道（物々交換など）</SubHead>
          <Lines usage={usage} lines={usage.usedFor} onSelect={onSelect} />
        </>
      )}
      {usage.notes && <p className="mt-2 text-xs text-danger/90">注記: {usage.notes}</p>}
      <div className="mt-2 space-y-0.5 border-t border-line/60 pt-2">
        <p className="text-[10px] font-bold tracking-wider text-muted">出典（行末に表示がない行は robrun.info のアイテムページ）</p>
        {usage.sources.map((s) =>
          s.url.startsWith("/") && s.key === "game-text" ? (
            <p key={s.key} className="flex items-center gap-1.5 text-xs text-muted">
              <span className={`rounded border px-1 ${KIND[s.kind].cls}`}>{KIND[s.kind].label}</span>
              {s.label}（上の英語原文）
            </p>
          ) : (
            <SourceTag key={s.key} source={s} />
          ),
        )}
      </div>
    </section>
  );
}

/** 一覧のアコーディオン用（要点だけ） */
export function ItemUsageSummary({ item }: { item: ShipmentItem }) {
  const usage = getUsage(item.id);
  if (!usage) return null;
  const head = usage.usage.slice(0, 2);
  return (
    <div className="space-y-1.5">
      <EffectBadges item={item} compact />
      <KeyFacts usage={usage} compact />
      {head.length > 0 && (
        <div>
          <p className="mb-0.5 text-[10px] font-bold tracking-wider text-muted">使い方</p>
          <Lines usage={usage} lines={head} />
        </div>
      )}
    </div>
  );
}

/** 購入価格。未確認のときは別出典（robrun.info）の値を添える */
export function PurchasePrice({ item, className = "" }: { item: ShipmentItem; className?: string }) {
  if (item.purchaseCost === null && item.purchaseCostAlt != null)
    return (
      <span className={`inline-flex flex-wrap items-center justify-end gap-x-1 ${className}`}>
        <span className="font-mono text-money">{money(item.purchaseCostAlt)}</span>
        {item.purchaseCostAltSource ? (
          <a href={item.purchaseCostAltSource} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-xs text-sky-300 underline">
            （robrun.info）
            <ExternalLink size={10} />
          </a>
        ) : (
          <span className="text-xs text-muted">（robrun.info）</span>
        )}
      </span>
    );
  return <span className={`font-mono ${className}`}>{money(item.purchaseCost)}</span>;
}
