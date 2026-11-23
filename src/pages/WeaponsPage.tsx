import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Info, Lock, Search, X } from "lucide-react";
import { equipment } from "../lib/equipment";
import { normalize } from "../lib/data";
import { money, RARITY_COLOR, RARITY_JA } from "../lib/format";
import { SpecTable, type SpecColumn } from "../components/SpecTable";
import { TierBadge } from "../components/ui";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import type { Armor, Bag, EquipmentCommon, Weapon } from "../types/equipment";

type Tab = "weapons" | "armor" | "bags";

function Rarity({ r }: { r: string | null }) {
  if (!r) return <span className="text-muted">—</span>;
  return <span className={`rounded border px-1 font-sans text-[11px] ${RARITY_COLOR[r] ?? ""}`}>{RARITY_JA[r] ?? r}</span>;
}

/** 研究・価格の共通列 */
function costColumns<T extends EquipmentCommon>(): SpecColumn<T>[] {
  return [
    { key: "rarity", label: "レアリティ", get: (r) => r.rarity, format: (r) => <Rarity r={r.rarity} />, align: "center" },
    {
      key: "research",
      label: "研究費",
      get: (r) => r.researchCost,
      better: "low",
      format: (r) => (r.inShipments ? <span className="text-money">{money(r.researchCost)}</span> : <span className="text-muted">研究不可</span>),
    },
    { key: "purchase", label: "購入価格", get: (r) => r.purchaseCost, better: "low", format: (r) => <span className={r.purchaseCost === null ? "text-muted" : ""}>{money(r.purchaseCost)}</span> },
    { key: "sale", label: "売却価格", get: (r) => r.salePrice, format: (r) => <span className={r.salePrice === null ? "text-muted" : ""}>{money(r.salePrice)}</span> },
    {
      key: "level",
      label: "地区Lv",
      get: (r) => r.requiredSettlementLevel,
      align: "center",
      format: (r) => (r.requiredSettlementLevel === null ? <span className="text-muted">—</span> : <TierBadge level={r.requiredSettlementLevel} />),
    },
    {
      key: "jail",
      label: "服役",
      hint: "年",
      get: (r) => r.requiredImprisonmentYears || null,
      align: "center",
      format: (r) =>
        r.requiredImprisonmentYears > 0 ? (
          <span className="text-danger">
            <Lock size={10} className="inline" />
            {r.requiredImprisonmentYears}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];
}

const weaponColumns: SpecColumn<Weapon>[] = [
  { key: "type", label: "種類", get: (w) => w.typeJa, align: "left", format: (w) => <span className="font-sans">{w.typeJa}</span> },
  { key: "damage", label: "ダメージ", hint: "1発", get: (w) => w.damage, better: "high", format: (w) => (w.pellets > 1 ? `${w.damage}×${w.pellets}` : w.damage) },
  { key: "head", label: "HS倍率", get: (w) => w.headMultiplier, format: (w) => `×${w.headMultiplier}` },
  { key: "rpm", label: "連射速度", hint: "発/分", get: (w) => w.rpm, better: "high", format: (w) => Math.round(w.rpm) },
  { key: "mag", label: "装弾数", get: (w) => w.magazine, better: "high" },
  { key: "reload", label: "リロード", hint: "秒", get: (w) => w.reloadSeconds, better: "low", format: (w) => (w.reloadByRound ? `${w.reloadSeconds}/発` : w.reloadSeconds) },
  { key: "range", label: "減衰なし距離", hint: "m", get: (w) => w.fullDamageRange, better: "high", bar: true },
  { key: "dps", label: "DPS", hint: "胴・理論値", get: (w) => w.dps, better: "high", bar: true, derived: true },
  { key: "hdps", label: "HS DPS", hint: "理論値", get: (w) => w.headDps, better: "high", derived: true },
  { key: "magdmg", label: "1マガジン", hint: "総ダメージ", get: (w) => w.magDamage, better: "high", derived: true },
  { key: "tte", label: "撃ち切り", hint: "秒", get: (w) => w.timeToEmpty, derived: true },
  { key: "ads", label: "ADS", hint: "秒", get: (w) => w.aimInSeconds, better: "low" },
  { key: "draw", label: "持ち替え", hint: "秒", get: (w) => w.drawSeconds, better: "low" },
  { key: "mode", label: "射撃", get: (w) => (w.automatic ? "フルオート" : "セミオート"), align: "center", format: (w) => <span className="font-sans text-xs">{w.automatic ? "フル" : "セミ"}</span> },
  { key: "ammo", label: "弾薬", get: (w) => w.ammoJa, align: "left", format: (w) => <span className="font-sans text-xs">{w.ammoJa}</span> },
  { key: "size", label: "サイズ", get: (w) => w.footprint, align: "center" },
  ...costColumns<Weapon>(),
];

const armorColumns: SpecColumn<Armor>[] = [
  { key: "seg", label: "アーマーセグメント", get: (a) => a.segments, better: "high", bar: true },
  { key: "points", label: "アーマー値", get: (a) => a.armorPoints, better: "high", bar: true },
  { key: "dur", label: "耐久", get: (a) => a.durability, better: "high" },
  { key: "size", label: "サイズ", get: (a) => a.footprint, align: "center" },
  ...costColumns<Armor>(),
];

const bagColumns: SpecColumn<Bag>[] = [
  { key: "kind", label: "種類", get: (b) => b.kindJa, align: "left", format: (b) => <span className="font-sans">{b.kindJa}</span> },
  { key: "rows", label: "追加インベントリ行", get: (b) => b.inventoryRows, better: "high", bar: true },
  { key: "pockets", label: "ポケット数", get: (b) => b.pockets, better: "high", bar: true },
  { key: "size", label: "サイズ", get: (b) => b.footprint, align: "center" },
  ...costColumns<Bag>(),
];

const nameOf = (r: EquipmentCommon) => ({
  ja: r.nameJa,
  en: r.nameEn,
  href: r.inShipments ? `/shipments/${r.id}` : undefined,
  sub: r.inShipments ? undefined : <span className="text-[10px] text-muted">Shipments対象外</span>,
});

export default function WeaponsPage() {
  useDocumentTitle("武器・装備一覧（スペック表）", "ROB RUN の全武器46種・ボディアーマー・バッグのスペック比較表。ダメージ、連射速度、装弾数、リロード、DPS、研究費・購入価格を日本語で。");
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "weapons";
  const setTab = (t: Tab) => {
    const n = new URLSearchParams(params);
    n.set("tab", t);
    setParams(n, { replace: true });
  };
  const [type, setType] = useState<string>("all");
  const [q, setQ] = useState("");
  const [onlyShipments, setOnlyShipments] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else if (n.size < 5) n.add(id);
      return n;
    });

  const filterCommon = <T extends EquipmentCommon>(list: T[]) =>
    list.filter((r) => {
      if (onlyShipments && !r.inShipments) return false;
      if (!q) return true;
      const nq = normalize(q);
      return normalize(`${r.nameJa}${r.nameEn}${r.descriptionJa ?? ""}${"typeJa" in r ? String(r.typeJa) : ""}`).includes(nq);
    });

  const weapons = useMemo(
    () => filterCommon(equipment.weapons).filter((w) => type === "all" || w.typeJa === type),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [type, q, onlyShipments],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const armor = useMemo(() => filterCommon(equipment.armor), [q, onlyShipments]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bags = useMemo(() => filterCommon(equipment.bags), [q, onlyShipments]);

  const tabBtn = (t: Tab, label: string, n: number) => (
    <button
      onClick={() => setTab(t)}
      className={`rounded-md px-3 py-1.5 text-sm ${tab === t ? "bg-neon/15 text-neon" : "text-muted hover:text-white"}`}
    >
      {label} <span className="text-xs opacity-70">{n}</span>
    </button>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-3 px-3 py-4 sm:px-4">
      <div>
        <h1 className="text-2xl font-bold">武器・装備一覧</h1>
        <p className="text-sm text-muted">見出しをクリックで並び替え。各列の最良値は緑。チェックを入れると最大5つまで並べて比較できます。</p>
      </div>

      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-bg-panel p-1">
        {tabBtn("weapons", "武器", equipment.weapons.length)}
        {tabBtn("armor", "ボディアーマー", equipment.armor.length)}
        {tabBtn("bags", "バッグ・ポーチ", equipment.bags.length)}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search size={15} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="名前で検索（例: KL-545, ライフル）"
            className="w-full rounded-md border border-line bg-bg py-1.5 pl-7 pr-7 text-sm outline-none focus:border-neon"
          />
          {q && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted" onClick={() => setQ("")} aria-label="クリア">
              <X size={14} />
            </button>
          )}
        </div>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={onlyShipments} onChange={(e) => setOnlyShipments(e.target.checked)} className="accent-[#5cff8a]" />
          Shipmentsで研究できるものだけ
        </label>
      </div>

      {tab === "weapons" && (
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {["all", ...equipment.weaponTypeOrder].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${type === t ? "border-neon/70 bg-neon/10 text-white" : "border-line text-muted"}`}
            >
              {t === "all" ? "すべて" : t}
              <span className="ml-1 opacity-60">{t === "all" ? equipment.weapons.length : equipment.weapons.filter((w) => w.typeJa === t).length}</span>
            </button>
          ))}
        </div>
      )}

      {selected.size > 0 && (
        <section className="space-y-1.5 rounded-xl border border-neon/40 bg-neon/5 p-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-neon">比較（{selected.size}/5）</h2>
            <button onClick={() => setSelected(new Set())} className="text-xs text-muted hover:text-white">
              クリア
            </button>
          </div>
          {tab === "weapons" && (
            <SpecTable rows={equipment.weapons.filter((w) => selected.has(w.id))} columns={weaponColumns} rowKey={(w) => w.id} name={nameOf} selected={selected} onToggleSelect={toggle} />
          )}
          {tab === "armor" && (
            <SpecTable rows={equipment.armor.filter((w) => selected.has(w.id))} columns={armorColumns} rowKey={(w) => w.id} name={nameOf} selected={selected} onToggleSelect={toggle} />
          )}
          {tab === "bags" && (
            <SpecTable rows={equipment.bags.filter((w) => selected.has(w.id))} columns={bagColumns} rowKey={(w) => w.id} name={nameOf} selected={selected} onToggleSelect={toggle} />
          )}
        </section>
      )}

      {tab === "weapons" && (
        <SpecTable rows={weapons} columns={weaponColumns} rowKey={(w) => w.id} name={nameOf} defaultSort={{ key: "dps", dir: "desc" }} selected={selected} onToggleSelect={toggle} />
      )}
      {tab === "armor" && <SpecTable rows={armor} columns={armorColumns} rowKey={(w) => w.id} name={nameOf} defaultSort={{ key: "seg", dir: "asc" }} selected={selected} onToggleSelect={toggle} />}
      {tab === "bags" && <SpecTable rows={bags} columns={bagColumns} rowKey={(w) => w.id} name={nameOf} selected={selected} onToggleSelect={toggle} />}

      <div className="flex gap-2 rounded-lg border border-line bg-bg-panel p-3 text-xs text-muted">
        <Info size={16} className="mt-0.5 shrink-0 text-sky-300" />
        <div className="space-y-1">
          <p>
            数値はゲームファイル由来のデータ（
            <a href={equipment.source.compareUrl} target="_blank" rel="noreferrer" className="underline">
              Rob Run Guide
            </a>
            、build {equipment.source.build}、取得日 {equipment.source.retrievedAt}）。サーバー設定やアップデートで変わることがあります。
          </p>
          <p>
            ダメージは胴体への1発あたり（アーマー適用前）。<span className="text-money">算出</span>の列は本サイトの理論値：DPS＝ダメージ×弾数×連射速度÷60（ショットガンは全弾命中時）、HS DPS＝DPS×HS倍率、1マガジン＝ダメージ×弾数×装弾数、撃ち切り＝装弾数÷（連射速度÷60）。リロード・距離減衰・命中率は考慮していません。
          </p>
          <p>武器種はゲーム内の説明文から本サイトが分類したものです。「研究不可」はShipmentsのツリーに無いアイテム（入手方法は未確認）。</p>
        </div>
      </div>
    </div>
  );
}
