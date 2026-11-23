import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Calculator, Shield, Route, Minus, Plus, Lock, CheckCircle2, Circle } from "lucide-react";
import cargoJson from "../../data/source/cargo.source.json";
import plansJson from "../../data/guides/plans.json";
import sharedSources from "../../data/guides/sources.json";
import { moneyGuide, productionGuide } from "../lib/guides";
import { toolsData } from "../lib/tools";
import { computeCost, displayNameJa, getItem } from "../lib/data";
import { money, RARITY_COLOR, RARITY_JA } from "../lib/format";
import { useProgress } from "../store/progress";
import { ItemIcon, Section, TierBadge } from "../components/ui";
import { SourceTag } from "../components/GuideBody";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

type Tab = "sell" | "defense" | "plans";
const NOTO = moneyGuide.notoriety; // [{level, loot, cargo}]

/* ============================================================ 1. 売値計算機 */
interface SellRow {
  key: string;
  nameJa: string;
  nameEn?: string;
  rarity?: string;
  base: number;
  kind: "cargo" | "loot";
  note?: string;
}

const cargoRows: SellRow[] = (cargoJson as { items: { id: string; nameJa: string; nameEn: string; rarity: string; smugglerPrice: number | null }[] }).items
  .filter((c) => c.smugglerPrice !== null)
  .map((c) => ({ key: c.id, nameJa: c.nameJa, nameEn: c.nameEn, rarity: c.rarity, base: c.smugglerPrice!, kind: "cargo" as const }));

const F = productionGuide.model.freezer;
const P = productionGuide.model.plantation;
const prodRows: SellRow[] = [
  ...(["Uncommon", "Epic", "Legendary"] as const).map((r) => ({
    key: `crystal-${r}`,
    nameJa: `固形クリスタル（${RARITY_JA[r]}）`,
    nameEn: "Hard Crystals",
    rarity: r,
    base: F.crystalPrice[r],
    kind: "cargo" as const,
  })),
  ...(["Uncommon", "Epic", "Legendary"] as const).map((r) => ({
    key: `powder-${r}`,
    nameJa: `クリスタル粉末 1袋（${RARITY_JA[r]}）`,
    nameEn: "Crystal Powder",
    rarity: r,
    base: F.powderPrice[r],
    kind: "loot" as const,
  })),
  ...(["Uncommon", "Epic", "Legendary"] as const).map((r) => ({
    key: `harvest-${r}`,
    nameJa: `収穫袋（${RARITY_JA[r]}）`,
    nameEn: "Harvest Bag",
    rarity: r,
    base: P.bagPrice[r],
    kind: "loot" as const,
  })),
];

function SellCalc() {
  const [level, setLevel] = useState(1);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [custom, setCustom] = useState({ loot: "", cargo: "" });
  const rows = [...prodRows, ...cargoRows];
  const bonus = (kind: "cargo" | "loot", lv: number) => (NOTO.find((n) => n.level === lv)?.[kind] ?? 0) / 100;
  const priceAt = (r: SellRow, lv: number) => Math.round(r.base * (1 + bonus(r.kind, lv)));
  const customLoot = Number(custom.loot.replace(/[^\d]/g, "")) || 0;
  const customCargo = Number(custom.cargo.replace(/[^\d]/g, "")) || 0;
  const total = (lv: number) =>
    rows.reduce((s, r) => s + priceAt(r, lv) * (qty[r.key] ?? 0), 0) +
    Math.round(customLoot * (1 + bonus("loot", lv))) +
    Math.round(customCargo * (1 + bonus("cargo", lv)));
  const set = (k: string, d: number) => setQty((q) => ({ ...q, [k]: Math.max(0, (q[k] ?? 0) + d) }));
  const picked = rows.filter((r) => (qty[r.key] ?? 0) > 0);

  return (
    <div className="space-y-4">
      <Section title="悪名レベル">
        <div className="flex flex-wrap gap-1.5">
          {NOTO.map((n) => (
            <button
              key={n.level}
              onClick={() => setLevel(n.level)}
              className={`rounded-md border px-3 py-1.5 text-sm ${level === n.level ? "border-neon bg-neon/10 text-neon" : "border-line text-muted"}`}
            >
              Lv{n.level}
              <span className="block text-[10px] opacity-80">
                略奪品+{n.loot}%・積荷+{n.cargo}%
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">ソロは悪名レベル4、デュオはレベル2から始まる。略奪品は故買屋、積荷は密輸業者に売った場合のボーナス。</p>
        <p className="mt-1">
          <SourceTag source={moneyGuide.sources["rri-fame"]} />
        </p>
      </Section>

      <Section title={`合計（悪名Lv${level}）`}>
        <p className="font-mono text-3xl text-money">{money(total(level))}</p>
        <div className="mt-2 grid grid-cols-5 gap-1 text-center text-xs">
          {NOTO.map((n) => (
            <div key={n.level} className={`rounded border p-1 ${n.level === level ? "border-neon text-neon" : "border-line text-muted"}`}>
              Lv{n.level}
              <span className="block font-mono text-[11px] text-white">{money(total(n.level))}</span>
            </div>
          ))}
        </div>
        {picked.length > 0 && (
          <ul className="mt-3 space-y-0.5 text-sm">
            {picked.map((r) => (
              <li key={r.key} className="flex justify-between gap-2 border-b border-line/40 py-0.5">
                <span>
                  {r.nameJa} ×{qty[r.key]}
                </span>
                <span className="font-mono text-money">{money(priceAt(r, level) * (qty[r.key] ?? 0))}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-sm">
            その他の略奪品（故買屋・Lv1の金額の合計）
            <input
              value={custom.loot}
              onChange={(e) => setCustom({ ...custom, loot: e.target.value })}
              inputMode="numeric"
              placeholder="例: 120000"
              className="mt-1 w-full rounded-md border border-line bg-bg px-2 py-1 font-mono outline-none focus:border-neon"
            />
          </label>
          <label className="text-sm">
            その他の積荷（密輸業者・Lv1の金額の合計）
            <input
              value={custom.cargo}
              onChange={(e) => setCustom({ ...custom, cargo: e.target.value })}
              inputMode="numeric"
              placeholder="例: 60000"
              className="mt-1 w-full rounded-md border border-line bg-bg px-2 py-1 font-mono outline-none focus:border-neon"
            />
          </label>
        </div>
        <button onClick={() => (setQty({}), setCustom({ loot: "", cargo: "" }))} className="mt-2 text-xs text-muted hover:text-white">
          リセット
        </button>
      </Section>

      <Section title="品目を選ぶ">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="p-1.5">品目</th>
                <th className="p-1.5">売り先</th>
                <th className="p-1.5 text-right">Lv1</th>
                <th className="p-1.5 text-right">Lv{level}</th>
                <th className="p-1.5 text-center">個数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="p-1.5">
                    <span className="block font-bold">{r.nameJa}</span>
                    <span className="flex items-center gap-1 text-[11px] text-gray-300">
                      {r.nameEn}
                      {r.rarity && <span className={`rounded border px-1 ${RARITY_COLOR[r.rarity] ?? ""}`}>{RARITY_JA[r.rarity]}</span>}
                    </span>
                  </td>
                  <td className="p-1.5 text-xs">{r.kind === "cargo" ? "密輸業者" : "故買屋"}</td>
                  <td className="p-1.5 text-right font-mono text-muted">{money(r.base)}</td>
                  <td className="p-1.5 text-right font-mono text-money">{money(priceAt(r, level))}</td>
                  <td className="p-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => set(r.key, -1)} className="rounded border border-line p-0.5" aria-label="減らす">
                        <Minus size={13} />
                      </button>
                      <input
                        value={qty[r.key] ?? 0}
                        onChange={(e) => setQty((q) => ({ ...q, [r.key]: Math.max(0, Number(e.target.value) || 0) }))}
                        inputMode="numeric"
                        className="w-12 rounded border border-line bg-bg px-1 text-center font-mono"
                        aria-label={`${r.nameJa}の個数`}
                      />
                      <button onClick={() => set(r.key, 1)} className="rounded border border-line p-0.5" aria-label="増やす">
                        <Plus size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          積荷の値段は robrun.info（積荷図鑑と同じ）、生産物は費用対効果ガイドの値。計算式：値段 ×（1＋悪名ボーナス）。ゲーム内での計算方法は未検証です。販売センターの地区ボーナスは含みません。
        </p>
      </Section>
    </div>
  );
}

/* ============================================================ 2. 拠点防衛 */
const FUSES = [
  { id: "defense_module_1", points: 1 },
  { id: "defense_module_2", points: 3 },
  { id: "defense_module_3", points: 5 },
];
const DECODERS = [
  { nameJa: "アンコモン", points: 1, price: 1000 },
  { nameJa: "エピック", points: 3, price: 5000 },
  { nameJa: "レジェンダリー", points: 5, price: 40000 },
];
const SECONDS_PER_DECODER = 12;

function DefenseCalc() {
  const rows = toolsData.buildings.rows;
  const [bi, setBi] = useState(1);
  const b = rows[bi];
  const [fuse, setFuse] = useState([0, 0, 0]);
  const used = fuse.reduce((a, x) => a + x, 0);
  const free = b.slots - used;
  const defense = b.base + fuse.reduce((a, x, i) => a + x * FUSES[i].points, 0);
  const setF = (i: number, v: number) =>
    setFuse((f) => {
      const n = [...f];
      const others = used - f[i];
      n[i] = Math.max(0, Math.min(v, b.slots - others));
      return n;
    });
  const nameOf = (r: (typeof rows)[number]) => (r.shipmentId && getItem(r.shipmentId) ? displayNameJa(getItem(r.shipmentId)!) : (r.nameJa ?? "?"));
  const fuseCost = fuse.reduce((a, x, i) => a + x * (getItem(FUSES[i].id)?.purchaseCost ?? 0), 0);

  return (
    <div className="space-y-4">
      <Section title="建物を選ぶ">
        <div className="flex flex-wrap gap-1.5">
          {rows.map((r, i) => (
            <button
              key={i}
              onClick={() => (setBi(i), setFuse([0, 0, 0]))}
              className={`rounded-md border px-2.5 py-1 text-sm ${bi === i ? "border-neon bg-neon/10 text-neon" : "border-line text-muted"}`}
            >
              {nameOf(r)}
              <span className="ml-1 text-[10px] opacity-70">
                防御{r.base}・{r.slots}枠
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="ヒューズを入れる">
        <div className="grid gap-2 sm:grid-cols-3">
          {FUSES.map((f, i) => {
            const it = getItem(f.id);
            return (
              <div key={f.id} className="rounded-md border border-line bg-bg-card p-2">
                <p className="flex items-center gap-2 text-sm">
                  {it && <ItemIcon item={it} size={14} />}
                  <span className="font-bold">{it ? displayNameJa(it) : f.id}</span>
                  <span className="ml-auto text-money">+{f.points}</span>
                </p>
                <div className="mt-1.5 flex items-center gap-1">
                  <button onClick={() => setF(i, fuse[i] - 1)} className="rounded border border-line p-1" aria-label="減らす">
                    <Minus size={13} />
                  </button>
                  <input
                    value={fuse[i]}
                    onChange={(e) => setF(i, Number(e.target.value) || 0)}
                    inputMode="numeric"
                    className="w-14 rounded border border-line bg-bg px-1 text-center font-mono"
                  />
                  <button onClick={() => setF(i, fuse[i] + 1)} className="rounded border border-line p-1" aria-label="増やす">
                    <Plus size={13} />
                  </button>
                  <button onClick={() => setF(i, fuse[i] + free)} className="ml-auto rounded border border-line px-1.5 text-xs text-muted hover:text-white">
                    残り全部
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-muted">購入 {money(it?.purchaseCost ?? null)}／個</p>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-sm">
          使用スロット <span className="font-mono">{used}</span> / {b.slots}（空き {free}）・ヒューズ購入費 <span className="font-mono text-money">{money(fuseCost)}</span>
        </p>
      </Section>

      <Section title="結果">
        <p className="text-sm text-muted">{nameOf(b)}の防御</p>
        <p className="font-mono text-3xl text-neon">{defense}</p>
        <p className="text-xs text-muted">基本 {b.base} ＋ ヒューズ {defense - b.base}（最大 {b.base + b.slots * 5}）</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="p-1.5">襲撃側のデコーダー</th>
                <th className="p-1.5 text-right">必要な数</th>
                <th className="p-1.5 text-right">かかる時間</th>
                <th className="p-1.5 text-right">デコーダーの売値換算</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {DECODERS.map((d) => {
                const n = Math.ceil(defense / d.points);
                return (
                  <tr key={d.nameJa}>
                    <td className="p-1.5">
                      {d.nameJa}（−{d.points}）
                    </td>
                    <td className="p-1.5 text-right font-mono text-money">{n}個</td>
                    <td className="p-1.5 text-right font-mono">
                      {Math.floor((n * SECONDS_PER_DECODER) / 60)}分{(n * SECONDS_PER_DECODER) % 60}秒
                    </td>
                    <td className="p-1.5 text-right font-mono text-muted">{money(n * d.price)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted">
          <li>{toolsData.buildings.noteJa}</li>
          <li>時間は「デコーダー1個あたり約12秒」から計算（ファン情報）。複数人で同時に差せるかは未確認。</li>
          <li>フェンス（メッシュ・金属・コンクリート）にも別にセキュリティシステムがあり、襲撃者は建物とは別に破る必要がある。</li>
        </ul>
        <p className="mt-2 flex flex-wrap gap-2">
          {toolsData.buildings.sources.map((s) => (
            <SourceTag key={s} source={toolsSource(s)} />
          ))}
          <Link to="/tools" className="text-xs text-sky-300 hover:underline">
            デコーダーの入手方法 →
          </Link>
        </p>
      </Section>
    </div>
  );
}

const toolsSource = (k: string) => (sharedSources as Record<string, { label: string; url: string; kind: "official" | "fan" | "data" }>)[k];

/* ============================================================ 3. 研究プラン */
interface Plan {
  id: string;
  title: string;
  goalJa: string;
  targets: string[];
  link?: string;
}
const plans = (plansJson as { plans: Plan[] }).plans;

function Plans() {
  const researched = useProgress((s) => s.researched);
  const toggle = useProgress((s) => s.toggle);
  const markAll = useProgress((s) => s.markResearchedWithAncestors);
  const set = useMemo(() => new Set(researched), [researched]);
  const [open, setOpen] = useState<string | null>(plans[0].id);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        目標を選ぶと、必要な研究を前提研究から順に並べ、研究費と設備の購入費を計算します（研究済みは除外）。プランは目標ごとのまとめで、強さの評価ではありません。
      </p>
      {plans.map((p) => {
        const all = computeCost(p.targets, new Set());
        const c = computeCost(p.targets, set);
        // 購入費はプランに出てくる設備すべて（目標だけでなく途中の設備も含む）
        const items = all.pending;
        const buy = items.reduce((a, i) => a + (i.purchaseCost ?? 0), 0);
        const done = all.pending.length - c.pending.length;
        const isOpen = open === p.id;
        return (
          <section key={p.id} className={`rounded-xl border ${isOpen ? "border-neon/50" : "border-line"} bg-bg-panel`}>
            <button onClick={() => setOpen(isOpen ? null : p.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 p-3 text-left" aria-expanded={isOpen}>
              <Route size={18} className="text-neon" />
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{p.title}</span>
                <span className="block text-xs text-muted">{p.goalJa}</span>
              </span>
              <span className="text-right">
                <span className="block font-mono text-money">研究 {money(c.researchTotal) === "無料" ? "$0" : money(c.researchTotal)}</span>
                <span className="block text-[11px] text-muted">
                  {done}/{all.pending.length} 研究済み・全{all.pending.length}段階
                </span>
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-line p-3">
                <div className="mb-2 grid gap-2 sm:grid-cols-4">
                  <Stat label="残りの研究費" value={money(c.researchTotal) === "無料" ? "$0" : money(c.researchTotal)} accent />
                  <Stat label="研究費（ゼロから）" value={money(all.researchTotal)} />
                  <Stat label="設備をすべて1つずつ買う費用" value={money(buy)} sub="購入価格が未確認のものは含まない" />
                  <Stat
                    label="必要な条件"
                    value={all.maxSettlementLevel === null ? "地区条件なし" : `地区Lv${all.maxSettlementLevel}`}
                    sub={all.maxImprisonmentYears > 0 ? `服役${all.maxImprisonmentYears}年` : "服役条件なし"}
                  />
                </div>
                <ol className="space-y-0.5">
                  {all.pending.map((it, i) => {
                    const d = set.has(it.id);
                    return (
                      <li key={it.id} className={`flex items-center gap-2 rounded px-1 py-1 text-sm ${d ? "opacity-50" : ""}`}>
                        <span className="w-5 text-right font-mono text-xs text-muted">{i + 1}.</span>
                        <button onClick={() => toggle("researched", it.id)} aria-label={d ? "研究済みを解除" : "研究済みにする"}>
                          {d ? <CheckCircle2 size={17} className="text-neon" /> : <Circle size={17} className="text-muted" />}
                        </button>
                        <ItemIcon item={it} size={13} />
                        <Link to={`/shipments/${it.id}`} className={`min-w-0 flex-1 truncate hover:underline ${d ? "line-through" : ""}`}>
                          {displayNameJa(it)}
                          {p.targets.includes(it.id) && <span className="ml-1 rounded bg-neon/15 px-1 text-[10px] text-neon">目標</span>}
                        </Link>
                        <TierBadge level={it.requiredSettlementLevel} />
                        {it.requiredImprisonmentYears > 0 && (
                          <span className="text-xs text-danger">
                            <Lock size={10} className="inline" />
                            {it.requiredImprisonmentYears}
                          </span>
                        )}
                        <span className="w-20 text-right font-mono text-money">{money(it.researchCost)}</span>
                        <span className="hidden w-20 text-right font-mono text-xs text-muted sm:inline">買 {money(it.purchaseCost)}</span>
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {c.pending.length > 0 && (
                    <button onClick={() => markAll(c.pending.map((x) => x.id))} className="rounded-md border border-neon px-2 py-1 text-neon hover:bg-neon/10">
                      すべて研究済みにする
                    </button>
                  )}
                  <Link to={`/calculator?targets=${p.targets.join(",")}`} className="rounded-md border border-line px-2 py-1 text-muted hover:text-white">
                    費用計算機で開く
                  </Link>
                  {p.link && (
                    <Link to={p.link} className="rounded-md border border-line px-2 py-1 text-muted hover:text-white">
                      関連ガイド →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-md border p-2 ${accent ? "border-neon/40 bg-neon/5" : "border-line bg-bg-card"}`}>
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`font-mono text-lg ${accent ? "text-money" : ""}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

/* ============================================================ ページ */
export default function CalcPage() {
  useDocumentTitle("計算機（売値・拠点防衛・研究プラン）", "ROB RUN の悪名レベル込みの売値計算、拠点の防御と必要デコーダー数の計算、目標別の研究プラン。");
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "sell";
  const TABS: { id: Tab; label: string; icon: typeof Calculator }[] = [
    { id: "sell", label: "売値（悪名レベル）", icon: Calculator },
    { id: "defense", label: "拠点防衛", icon: Shield },
    { id: "plans", label: "研究プラン", icon: Route },
  ];
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:px-4">
      <h1 className="text-2xl font-bold">計算機</h1>
      <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-bg-panel p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm ${tab === t.id ? "bg-neon/15 text-neon" : "text-muted hover:text-white"}`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>
      {tab === "sell" && <SellCalc />}
      {tab === "defense" && <DefenseCalc />}
      {tab === "plans" && <Plans />}
    </div>
  );
}
