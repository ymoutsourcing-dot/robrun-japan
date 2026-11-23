import { Fragment, useState } from "react";
import { Info, Lock, Siren } from "lucide-react";
import { equipment } from "../lib/equipment";
import { getItem, items } from "../lib/data";
import { money } from "../lib/format";
import { SpecTable, type SpecColumn } from "../components/SpecTable";
import { ItemIcon, Section, TierBadge } from "../components/ui";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ItemSummary, PlainSummary } from "../components/ItemSummary";
import { AccName, AccordionProvider, AccPanel } from "../components/Accordion";
import type { Vehicle } from "../types/equipment";

const columns: SpecColumn<Vehicle>[] = [
  { key: "kind", label: "種類", get: (v) => v.kindJa, align: "left", format: (v) => <span className="font-sans">{v.kindJa}</span> },
  { key: "speed", label: "最高速度", hint: "0〜100", get: (v) => v.speed, better: "high", bar: true },
  { key: "acc", label: "加速", hint: "0〜100", get: (v) => v.acceleration, better: "high", bar: true },
  { key: "handling", label: "ハンドリング", hint: "0〜100", get: (v) => v.handling, better: "high", bar: true },
  { key: "trunk", label: "トランク行数", get: (v) => v.trunkRows, better: "high" },
  { key: "cargo", label: "貨物スロット", get: (v) => v.cargoSlots, better: "high" },
  { key: "trunkUp", label: "トランク改造枠", get: (v) => v.trunkUpgradeSlots, better: "high" },
  { key: "cargoUp", label: "貨物改造枠", get: (v) => v.cargoUpgradeSlots, better: "high" },
  {
    key: "research",
    label: "研究費",
    get: (v) => v.researchCost,
    better: "low",
    format: (v) => (v.inShipments ? <span className="text-money">{money(v.researchCost)}</span> : <span className="font-sans text-xs text-muted">{v.noteJa ?? "研究不可"}</span>),
  },
  { key: "purchase", label: "購入価格", get: (v) => v.purchaseCost, better: "low", format: (v) => (v.inShipments ? money(v.purchaseCost) : <span className="text-muted">—</span>) },
  {
    key: "level",
    label: "地区Lv",
    get: (v) => v.requiredSettlementLevel,
    align: "center",
    format: (v) => (v.requiredSettlementLevel === null ? <span className="text-muted">—</span> : <TierBadge level={v.requiredSettlementLevel} />),
  },
];

/** 車両改造パーツ（Shipments の車両カテゴリーで car_ から始まるもの） */
const mods = items.filter((i) => i.category === "vehicles" && i.subcategory === "車両改造");
const stat = (id: string, key: string) => getItem(id)?.stats.find((s) => s.labelEn === key)?.value ?? null;
const RELATED = ["car_garage_1", "car_garage_2", "car_lift_1", "helicopter_garage_1"];

export default function VehiclesPage() {
  useDocumentTitle("車両一覧（スペック表）", "ROB RUN の全車両・ヘリコプター・パトカーの性能比較表（最高速度・加速・ハンドリング・トランク・貨物スロット）と改造パーツ一覧。");
  const [showPolice, setShowPolice] = useState(true);
  const rows = equipment.vehicles.filter((v) => showPolice || !v.police);
  return (
    <AccordionProvider>
    <div className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:px-4">
      <div>
        <h1 className="text-2xl font-bold">車両一覧</h1>
        <p className="text-sm text-muted">見出しをクリックで並び替え。各列の最良値は緑。性能は改造なしの初期状態です。</p>
      </div>

      <label className="flex items-center gap-1.5 text-sm">
        <input type="checkbox" checked={showPolice} onChange={(e) => setShowPolice(e.target.checked)} className="accent-[#5cff8a]" />
        警察車両も表示
      </label>

      <SpecTable
        rows={rows}
        columns={columns}
        rowKey={(v) => v.id}
        name={(v) => {
          const it = v.inShipments ? getItem(v.id) : undefined;
          return {
            ja: v.nameJa,
            en: v.nameEn,
            href: v.inShipments ? `/shipments/${v.id}` : undefined,
            icon: it ? (
              <ItemIcon item={it} size={30} />
            ) : (
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-line bg-bg text-sky-300" aria-hidden>
                <Siren size={22} />
              </span>
            ),
          };
        }}
        defaultSort={{ key: "speed", dir: "desc" }}
        expand={(v) => {
          const it = v.inShipments ? getItem(v.id) : undefined;
          return it ? <ItemSummary item={it} /> : <PlainSummary descriptionJa={null} note={`${v.noteJa ?? ""}。Shipmentsでは研究できません（警官として勤務中に使用）。`} />;
        }}
      />

      <div className="flex gap-2 rounded-lg border border-line bg-bg-panel p-3 text-xs text-muted">
        <Info size={16} className="mt-0.5 shrink-0 text-sky-300" />
        <div className="space-y-1">
          <p>
            最高速度・加速・ハンドリングは <strong>0〜100の評価値</strong>で、km/h や秒ではありません（出典：
            <a href={equipment.source.vehiclesUrl} target="_blank" rel="noreferrer" className="underline">
              Rob Run Guide の車両比較
            </a>
            ・ゲームファイル由来）。ヘリコプターの未確認項目は出典に記載がないものです。
          </p>
          <p>自分の車を持つには拠点（家）が必要。拠点がないうちはパーキングメーターでのレンタルのみで、レンタル車には改造パーツを付けられない（ファン情報：robrun.info）。</p>
        </div>
      </div>

      <Section title={`改造パーツ（${mods.length}件）`}>
        <p className="mb-2 text-xs text-muted">装着した改造パーツは死亡しても失われない（ゲーム内説明）。強化幅「小・中・大」はゲーム内の表記で、具体的な数値は未確認です。</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="p-1.5">パーツ</th>
                <th className="p-1.5">強化される項目</th>
                <th className="p-1.5">強化幅</th>
                <th className="p-1.5 text-right">研究費</th>
                <th className="p-1.5 text-right">購入価格</th>
                <th className="p-1.5 text-center">地区Lv</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {mods.map((m) => (
                <Fragment key={m.id}>
                <tr>
                  <td className="p-1.5">
                    <AccName id={m.id} icon className="w-full max-w-[16rem]" />
                  </td>
                  <td className="p-1.5">{stat(m.id, "Attribute") ?? <span className="text-muted">—</span>}</td>
                  <td className="p-1.5">{stat(m.id, "Strength") ?? <span className="text-muted">—</span>}</td>
                  <td className="p-1.5 text-right font-mono text-money">{money(m.researchCost)}</td>
                  <td className="p-1.5 text-right font-mono">{money(m.purchaseCost)}</td>
                  <td className="p-1.5 text-center">
                    <TierBadge level={m.requiredSettlementLevel} />
                    {m.requiredImprisonmentYears > 0 && (
                      <span className="ml-1 text-xs text-danger">
                        <Lock size={10} className="inline" />
                        {m.requiredImprisonmentYears}
                      </span>
                    )}
                  </td>
                </tr>
                <AccPanel id={m.id} colSpan={6} />
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="車両まわりの建築">
        <ul className="grid gap-2 sm:grid-cols-2">
          {RELATED.map((id) => {
            const it = getItem(id);
            if (!it) return null;
            return (
              <li key={id} className="rounded-md border border-line bg-bg-card p-2">
                <div className="flex items-center gap-2">
                  <AccName id={id} icon className="flex-1" />
                  <span className="font-mono text-xs text-money">{money(it.researchCost)}</span>
                </div>
                <AccPanel id={id} />
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
    </AccordionProvider>
  );
}
