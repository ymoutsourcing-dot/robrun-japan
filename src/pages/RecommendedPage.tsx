import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { AccordionProvider, AccPanel, useAccordion } from "../components/Accordion";
import { Info, Lock } from "lucide-react";
import type { ShipmentItem } from "../types/shipment";
import { ancestorsOf, categories, computeCost, descendantCount, displayNameEn, displayNameJa, getItem, items } from "../lib/data";
import { money } from "../lib/format";
import { CategoryIcon, ItemIcon, Section, TierBadge } from "../components/ui";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

function ItemRow({ it, right }: { it: ShipmentItem; right?: React.ReactNode }) {
  const { isOpen, toggle } = useAccordion();
  const open = isOpen(it.id);
  return (
    <li>
      <button
        type="button"
        onClick={() => toggle(it.id)}
        aria-expanded={open}
        className={`group flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left hover:bg-bg-hover ${open ? "bg-bg-hover" : ""}`}
      >
        <ItemIcon item={it} size={14} />
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm font-bold group-hover:text-neon ${open ? "text-neon" : ""}`}>{displayNameJa(it)}</span>
          <span className="block truncate font-mono text-[11px] text-gray-300">{displayNameEn(it)}</span>
        </span>
        <TierBadge level={it.requiredSettlementLevel} />
        <span className="shrink-0 text-right font-mono text-sm text-money">{right ?? money(it.researchCost)}</span>
        <ChevronDown size={14} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180 text-neon" : ""}`} />
      </button>
      <AccPanel id={it.id} />
    </li>
  );
}

/** 主要な目標：開くと研究ルート（順番と費用）とアイテムの要約 */
function MilestoneRow({ id, label }: { id: string; label: string }) {
  const { isOpen, toggle } = useAccordion();
  const it = getItem(id);
  if (!it) return null;
  const c = computeCost([id], new Set());
  const open = isOpen(`m:${id}`);
  return (
    <li>
      <button
        type="button"
        onClick={() => toggle(`m:${id}`)}
        aria-expanded={open}
        className={`group flex w-full flex-wrap items-center gap-x-3 gap-y-0.5 px-1 py-2 text-left hover:bg-bg-hover ${open ? "bg-bg-hover" : ""}`}
      >
        <ItemIcon item={it} size={14} />
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-bold group-hover:text-neon ${open ? "text-neon" : ""}`}>{label}</span>
          <span className="block text-xs text-muted">
            {displayNameJa(it)}・{c.pending.length} 段階
            {c.maxImprisonmentYears > 0 && (
              <span className="ml-1 text-danger">
                <Lock size={10} className="inline" /> 服役{c.maxImprisonmentYears}年
              </span>
            )}
          </span>
        </span>
        <TierBadge level={c.maxSettlementLevel} />
        <span className="font-mono text-money">{money(c.researchTotal)}</span>
        <ChevronDown size={14} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180 text-neon" : ""}`} />
      </button>
      {open && (
        <div className="my-1 border-l-2 border-neon/60 bg-bg p-3">
          <p className="mb-1 text-xs font-bold text-neon">研究する順番</p>
          <ol className="mb-2 space-y-0.5 text-sm">
            {c.pending.map((p, i) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="w-5 text-right font-mono text-xs text-muted">{i + 1}.</span>
                <span className="flex-1">{displayNameJa(p)}</span>
                <TierBadge level={p.requiredSettlementLevel} />
                <span className="w-24 text-right font-mono text-money">{money(p.researchCost)}</span>
              </li>
            ))}
          </ol>
          <Link to={`/calculator?targets=${id}`} className="text-xs text-sky-300 hover:underline">
            費用計算機で開く（研究済みを除いて計算）→
          </Link>
        </div>
      )}
    </li>
  );
}

/** 生産・金策系の主要な目標（ゲームデータ上の到達コストを表示） */
const MILESTONES: { id: string; label: string }[] = [
  { id: "cargo_workbench_1", label: "貨物を開封する（貨物作業台）" },
  { id: "cargo_exchange_workbench_1", label: "密輸貨物を詰め直して売る（密輸品作業台）" },
  { id: "narco_farm_1", label: "栽培を始める（栽培室）" },
  { id: "meth_lab_1", label: "化学研究所を手に入れる" },
  { id: "cargo_production_workbench_3", label: "化学反応炉を最大強化" },
  { id: "CargoProductionWorkbenchUpgradeConverter1", label: "化学コンバーターまで" },
  { id: "settlement_sale_1", label: "集落を購入する（レベル1地区）" },
  { id: "romanov_r8", label: "ヘリコプターを手に入れる" },
];

export default function RecommendedPage() {
  useDocumentTitle("おすすめ研究・研究ルート", "ROB RUN の Shipments を進める順番の目安。無料・低コストで始められる研究、派生の多い研究、主要目標までの総研究費をデータから算出。");

  const starters = items
    .filter((i) => i.prerequisites.length === 0)
    .sort((a, b) => (a.researchCost ?? Infinity) - (b.researchCost ?? Infinity));
  const hubs = [...items]
    .map((i) => ({ i, n: descendantCount(i.id) }))
    .filter((x) => x.n >= 4)
    .sort((a, b) => b.n - a.n)
    .slice(0, 12);
  const gated = items.filter((i) => i.requiredImprisonmentYears > 0).sort((a, b) => a.requiredImprisonmentYears - b.requiredImprisonmentYears);

  return (
    <AccordionProvider>
    <div className="mx-auto max-w-5xl space-y-4 px-3 py-4 sm:px-4">
      <div>
        <h1 className="text-2xl font-bold">おすすめ研究・研究ルート</h1>
        <div className="mt-2 flex gap-2 rounded-lg border border-sky-700/60 bg-sky-900/20 p-3 text-sm">
          <Info size={18} className="mt-0.5 shrink-0 text-sky-300" />
          <p>
            このページの一覧は、すべて<strong>ゲームデータ（研究費・前提関係・解放条件）から機械的に算出</strong>したものです。
            「強い」「稼げる」といった主観的なおすすめ度（★評価）は、実際の検証データが揃った項目から順次追加します。根拠のない評価は付けていません。
          </p>
        </div>
      </div>

      <Section title="主要な目標までの総研究費（ゼロから・前提込み）">
        <ul className="divide-y divide-line/60">
          {MILESTONES.map((m) => (
            <MilestoneRow key={m.id} id={m.id} label={m.label} />
          ))}
        </ul>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title={`最初から研究できる項目（${starters.length}件・安い順）`}>
          <ul>
            {starters.map((it) => (
              <ItemRow key={it.id} it={it} />
            ))}
          </ul>
        </Section>
        <div className="space-y-4">
          <Section title="派生研究が多い研究（解放価値が高い）">
            <p className="mb-2 text-xs text-muted">その研究の先に続く研究の数。ツリーを進める上での要所です。</p>
            <ul>
              {hubs.map(({ i, n }) => (
                <ItemRow key={i.id} it={i} right={<span className="text-white">{n} 件先</span>} />
              ))}
            </ul>
          </Section>
          <Section title="服役年数が必要な研究">
            <p className="mb-2 text-xs text-muted">研究費とは別に、ゲーム内の累計服役年数が条件になっている研究です。</p>
            <ul>
              {gated.map((it) => (
                <ItemRow
                  key={it.id}
                  it={it}
                  right={
                    <span className="text-danger">
                      <Lock size={11} className="inline" /> {it.requiredImprisonmentYears}年
                    </span>
                  }
                />
              ))}
            </ul>
          </Section>
        </div>
      </div>

      <Section title="カテゴリー別：全研究の合計費用">
        <ul className="grid gap-2 sm:grid-cols-2">
          {categories.map((c) => {
            const list = items.filter((i) => i.category === c.id);
            const total = list.reduce((s, i) => s + (i.researchCost ?? 0), 0);
            const deepest = list.reduce((m, i) => Math.max(m, ancestorsOf(i.id).length + 1), 0);
            return (
              <li key={c.id} className="flex items-center gap-2 rounded-md border border-line bg-bg-card px-3 py-2 text-sm">
                <CategoryIcon id={c.id} />
                <span className="flex-1">
                  {c.nameJa} <span className="text-xs text-muted">{list.length}件・最大{deepest}段階</span>
                </span>
                <span className="font-mono text-money">{money(total)}</span>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
    </AccordionProvider>
  );
}
