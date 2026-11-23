import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpDown, ChevronDown, Zap } from "lucide-react";
import { KIND, SourceLegend, SourceTag } from "../components/GuideBody";
import { Section } from "../components/ui";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { money, RARITY_COLOR, RARITY_JA } from "../lib/format";
import {
  cargoSmugglerPrice,
  itemJa,
  locationStats,
  rarityKey,
  tipSources,
  tipsData,
  type HeistLocation,
  type LocationStats,
  type Range,
  type Room,
  type TipFact,
} from "../lib/tips";

/** 出典キーを出現順・重複なしで集める */
function collect(facts: { sources: string[] }[]): string[] {
  return [...new Set(facts.flatMap((f) => f.sources))];
}

/** 本文の行に付ける出典番号（色は出典の種類） */
function Refs({ keys, order, derived }: { keys: string[]; order: string[]; derived?: boolean }) {
  return (
    <span className="ml-1 inline-flex flex-wrap gap-0.5 align-middle">
      {derived && <span className={`rounded border px-1 text-[10px] leading-4 ${KIND.derived.cls}`}>算出</span>}
      {keys.map((k) => {
        const s = tipSources[k];
        const n = order.indexOf(k) + 1;
        return (
          <span
            key={k}
            title={s?.label ?? k}
            className={`rounded border px-1 font-mono text-[10px] leading-4 ${s ? KIND[s.kind].cls : "border-danger text-danger"}`}
          >
            {n || "?"}
          </span>
        );
      })}
    </span>
  );
}

function FactText({ f, order }: { f: TipFact; order: string[] }) {
  return (
    <>
      {f.text}
      <Refs keys={f.sources} order={order} derived={f.derived} />
      {f.link && (
        <Link to={f.link} className="ml-1 inline-flex items-center text-sky-300 hover:underline" aria-label="関連ページ">
          <ArrowRight size={13} />
        </Link>
      )}
    </>
  );
}

function FactList({ facts, order }: { facts: TipFact[]; order: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
      {facts.map((f) => (
        <li key={f.text}>
          <FactText f={f} order={order} />
        </li>
      ))}
    </ul>
  );
}

function SourceList({ order }: { order: string[] }) {
  return (
    <details className="mt-3 rounded-lg border border-line bg-bg-card px-3 py-2 text-xs">
      <summary className="cursor-pointer text-muted">出典一覧（{order.length}件）</summary>
      <ol className="mt-2 space-y-1">
        {order.map((k, i) => (
          <li key={k} className="flex gap-1.5">
            <span className="font-mono text-muted">{i + 1}.</span>
            {tipSources[k] ? <SourceTag source={tipSources[k]} /> : <span className="text-danger">出典不明: {k}</span>}
          </li>
        ))}
      </ol>
    </details>
  );
}

function Unknowns({ items }: { items: string[] }) {
  return (
    <div className="mt-3 rounded-lg border border-dashed border-line p-3">
      <p className="mb-1 text-xs font-bold text-muted">まだ分かっていないこと（未確認）</p>
      <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted">
        {items.map((u) => (
          <li key={u}>{u}</li>
        ))}
      </ul>
    </div>
  );
}

function Rarity({ r }: { r: string | null | undefined }) {
  const k = rarityKey(r);
  if (!k) return null;
  return <span className={`rounded border px-1 text-[10px] leading-4 ${RARITY_COLOR[k] ?? ""}`}>{RARITY_JA[k] ?? k}</span>;
}

function rangeText(r: Range): string {
  if (r.max === 0) return "—";
  return r.min === r.max ? money(r.min) : `${money(r.min)}〜${money(r.max)}`;
}

/* ───────── イベント ───────── */

function EventsSection() {
  const { events, eventRules, eventUnknowns } = tipsData;
  const order = collect([...eventRules, ...events.flatMap((e) => e.rows)]);
  const [open, setOpen] = useState<string | null>(events[0]?.id ?? null);
  return (
    <Section title="イベント・イベントカーゴ">
      <h3 className="mb-1.5 text-xs font-bold text-neon">街のイベントの共通ルール</h3>
      <FactList facts={eventRules} order={order} />
      <div className="mt-4 space-y-2">
        {events.map((e) => {
          const isOpen = open === e.id;
          return (
            <div key={e.id} className={`rounded-lg border ${isOpen ? "border-neon/60" : "border-line"} bg-bg-card`}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : e.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className={`font-bold ${isOpen ? "text-neon" : ""}`}>{e.nameJa}</span>
                    <span className="rounded border border-line px-1 text-[10px] leading-4 text-muted">{e.kind}</span>
                  </span>
                  <span className="block font-mono text-[11px] text-gray-300">{e.nameEn}</span>
                </span>
                <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180 text-neon" : ""}`} />
              </button>
              {isOpen && (
                <dl className="space-y-2 border-t border-line px-3 py-3 text-sm">
                  {e.rows.map((r) => (
                    <div key={r.label + r.text} className="grid gap-0.5 sm:grid-cols-[7rem_1fr] sm:gap-3">
                      <dt className="text-xs text-muted sm:pt-0.5">{r.label}</dt>
                      <dd className="leading-relaxed">
                        <FactText f={r} order={order} />
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </div>
      <Unknowns items={eventUnknowns} />
      <SourceList order={order} />
    </Section>
  );
}

/* ───────── 店舗・強盗スポット ───────── */

type SortKey = "free" | "total" | "best" | "points" | "tools" | "name";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "total", label: "決まった品の合計" },
  { key: "free", label: "鍵なしで取れる額" },
  { key: "best", label: "最高額の戦利品" },
  { key: "points", label: "ルートポイント数" },
  { key: "tools", label: "必要な道具が少ない順" },
  { key: "name", label: "名前" },
];

function sortValue(l: HeistLocation, s: LocationStats, k: SortKey): number | string {
  switch (k) {
    case "free":
      return -s.free.max;
    case "total":
      return -(s.free.max + s.locked.max + s.cargo);
    case "best":
      return -(s.best?.price ?? 0);
    case "points":
      return -s.lootPoints;
    case "tools":
      return s.tools.reduce((a, t) => a + t.count, 0);
    case "name":
      return l.nameJa;
  }
}

function ToolChips({ s }: { s: LocationStats }) {
  if (s.tools.length === 0) return <span className="text-xs text-muted">不要</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {s.tools.map((t) => {
        const it = tipsData.items[t.id];
        return (
          <span key={t.id} title={it?.en ?? t.id} className="rounded border border-line bg-bg px-1 text-[11px] leading-5">
            {it?.ja.replace(/（.*）$/, "") ?? t.id}
            {t.count > 1 && <span className="font-mono text-money"> ×{t.count}</span>}
          </span>
        );
      })}
    </span>
  );
}

function RoomDetail({ r, order }: { r: Room; order: string[] }) {
  const v = r.nodes.length + r.fixed.length + r.cargo.length;
  return (
    <div className="rounded-lg border border-line bg-bg p-2.5">
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-bold">
        {r.nameJa}
        <span className="font-mono text-[11px] font-normal text-gray-300">{r.nameEn}</span>
      </p>
      <p className="mt-0.5 text-xs text-muted">
        入るのに必要：{r.access.length ? r.access.map(itemJa).join(" ＋ ") : "なし"}
        {r.cabinets > 0 && ` ／ 棚 ${r.cabinets}`}
        {r.depositBoxes > 0 && ` ／ 貸金庫 ${r.depositBoxes}`}
        {r.computers.length > 0 && ` ／ PC ${r.computers.map((c) => `${c.count}台（${c.points}pt）`).join("・")}`}
        {r.safes.length > 0 && ` ／ 金庫 ${r.safes.map((s) => (s.opener ? itemJa(s.opener) : "開け方未確認")).join("・")}`}
      </p>
      {v > 0 ? (
        <ul className="mt-1.5 space-y-0.5 text-xs">
          {r.nodes.map((n) => {
            const it = tipsData.items[n.item];
            const amount = n.min === n.max ? `${n.min}` : `${n.min}〜${n.max}`;
            const isCash = n.item === "cash_1";
            return (
              <li key={n.item} className="flex flex-wrap items-center gap-1">
                <span>{it?.ja ?? n.item}</span>
                <span className="text-muted">
                  {n.spots}か所 × {isCash ? `$${amount.replace(/(\d+)/g, (d) => Number(d).toLocaleString("en-US"))}` : `${amount}個`}
                </span>
                {!isCash && <span className="font-mono text-money">@{money(it?.price)}</span>}
              </li>
            );
          })}
          {r.fixed.map((f) => {
            const it = tipsData.items[f.item];
            const isCash = f.item === "cash_1";
            return (
              <li key={f.item} className="flex flex-wrap items-center gap-1">
                <span>{it?.ja ?? f.item}</span>
                <span className="text-muted">{isCash ? `${money(f.count)}（置いてある）` : `${f.count}個（置いてある）`}</span>
                {!isCash && <span className="font-mono text-money">@{money(it?.price)}</span>}
              </li>
            );
          })}
          {r.cargo.map((c) => (
            <li key={c.item} className="flex flex-wrap items-center gap-1">
              <span className="font-bold">{itemJa(c.item)}</span>
              <span className="text-muted">{c.count}個</span>
              <span className="font-mono text-money">密輸業者 @{money(cargoSmugglerPrice(c.item))}</span>
              <Refs keys={["rri-cargo"]} order={order} />
            </li>
          ))}
          {r.reported && <li className="text-muted">プレイヤー報告：{r.reported.join(", ")}</li>}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-muted">床・棚に決まった品の記載なし（棚・金庫の中身はランダムで未確認）</p>
      )}
    </div>
  );
}

function LocationPanel({ l, order }: { l: HeistLocation; order: string[] }) {
  const ch = l.charge;
  return (
    <div className="space-y-3 border-l-2 border-neon/60 bg-bg-panel px-3 py-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {l.rooms.map((r) => (
          <RoomDetail key={r.id} r={r} order={order} />
        ))}
      </div>
      <div>
        <p className="mb-1 text-xs font-bold text-neon">
          主な戦利品（候補）
          <Refs keys={["rrg-map"]} order={order} />
        </p>
        <div className="flex flex-wrap gap-1.5">
          {l.notable.map((id) => {
            const it = tipsData.items[id];
            return (
              <span key={id} className="inline-flex items-center gap-1 rounded border border-line bg-bg-card px-1.5 py-0.5 text-xs" title={it?.en}>
                <Rarity r={it?.rarity} />
                {it?.ja ?? id}
                <span className="font-mono text-money">{money(it?.price)}</span>
              </span>
            );
          })}
        </div>
        <p className="mt-1 text-[11px] text-muted">金庫・棚から出る可能性がある品の例。どこから・どの確率で出るかは未確認。</p>
      </div>
      <p className="text-xs text-muted">
        たまるポイント：
        {ch.tablet > 0 && `コードタブレット（金庫）${ch.tablet} ／ `}
        {ch.usb > 0 && `USBハッキングツール（PC）${ch.usb} ／ `}
        {ch.depositBox > 0 && `貸金庫キー ${ch.depositBox} ／ `}
        アクションカメラ（犯罪行動）{ch.camera}
        <Refs keys={["rrg-map"]} order={order} />
      </p>
      {l.notes && (
        <div>
          <p className="mb-1 text-xs font-bold text-neon">補足</p>
          <FactList facts={l.notes} order={order} />
        </div>
      )}
      <p className="text-[11px] text-muted">
        地区：{l.districtJa}
        {l.districtNote && `（${l.districtNote}）`}
        <Refs keys={l.districtSources} order={order} /> ／ robrun.fyi のルートスポット数：{l.fyiSpots ?? "—"}
        <Refs keys={["fyi-heists"]} order={order} /> ／ Rob Run Guide ID: <span className="font-mono">{l.rrgId}</span>
      </p>
    </div>
  );
}

function LocationsSection() {
  const { locations, locationNotes, locationUnknowns, priceNote } = tipsData;
  const order = useMemo(
    () =>
      collect([
        ...locationNotes,
        { sources: ["rrg-map", "rri-cargo", "fyi-heists"] },
        ...locations.flatMap((l) => [{ sources: l.districtSources }, ...(l.notes ?? [])]),
      ]),
    [locations, locationNotes],
  );
  const [sort, setSort] = useState<SortKey>("total");
  const [district, setDistrict] = useState("all");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const districts = [...new Set(locations.map((l) => l.districtJa))];
  const rows = useMemo(() => {
    const list = locations.filter((l) => district === "all" || l.districtJa === district).map((l) => ({ l, s: locationStats(l) }));
    return list.sort((a, b) => {
      const va = sortValue(a.l, a.s, sort);
      const vb = sortValue(b.l, b.s, sort);
      if (typeof va === "string" || typeof vb === "string") return String(va).localeCompare(String(vb), "ja");
      return va - vb || a.l.nameJa.localeCompare(b.l.nameJa, "ja");
    });
  }, [locations, sort, district]);

  return (
    <Section title="店舗・強盗スポット別の難易度とうまさ">
      <FactList facts={locationNotes} order={order} />

      <div className="mt-4 rounded-lg border border-money/40 bg-money/5 p-3 text-xs leading-relaxed">
        <p className="font-bold text-money">
          表の見方（<span className={`rounded border px-1 ${KIND.derived.cls}`}>算出</span>）
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-gray-200">
          <li>
            「鍵なし」「鍵の先」は、Rob Run Guide に載っている<strong>床・棚の決まった置き場所の品</strong>（置き場所の数 × 個数 × 故買屋の売値）を本サイトが合計したもの。全ポイントに出た場合の値で、
            <strong>金庫・棚・貸金庫の中身は含まない</strong>（中身は未確認）。
          </li>
          <li>「積荷」は銀行・武器庫の積荷を密輸業者に売った場合の合計（robrun.info の売値）。</li>
          <li>「道具」は建物の全部の部屋と金庫を開けるのに必要なアイテム。ミニドリルは金庫の数で数えている（1回で消費されるかは未確認）。</li>
          <li>難易度の★評価は付けていない。比べるときは「道具」「配電盤（警報を止められるか）」を目安に。</li>
          <li>{priceNote}</li>
        </ul>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <label className="inline-flex items-center gap-1.5">
          <ArrowUpDown size={14} className="text-muted" />
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-md border border-line bg-bg px-2 py-1 text-sm" aria-label="並び替え">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-1">
          {["all", ...districts].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDistrict(d)}
              className={`rounded-full border px-2.5 py-0.5 text-xs ${district === d ? "border-neon bg-neon/10 text-neon" : "border-line text-muted hover:text-white"}`}
            >
              {d === "all" ? `すべて（${locations.length}）` : d}
            </button>
          ))}
        </div>
      </div>

      {/* PC：表 */}
      <div className="mt-3 hidden overflow-x-auto rounded-lg border border-line md:block">
        <table className="w-full text-sm">
          <thead className="bg-bg-card text-xs text-muted">
            <tr>
              <th className="px-2 py-2 text-left font-normal">建物</th>
              <th className="px-2 py-2 text-left font-normal">必要な道具</th>
              <th className="px-2 py-2 text-right font-normal" title="床・棚の決まった置き場所の数">ポイント</th>
              <th className="px-2 py-2 text-right font-normal">棚/金庫/PC</th>
              <th className="px-2 py-2 text-center font-normal" title="配電盤（カメラと警報を止められる）">配電盤</th>
              <th className="px-2 py-2 text-right font-normal">鍵なし</th>
              <th className="px-2 py-2 text-right font-normal">鍵の先</th>
              <th className="px-2 py-2 text-right font-normal">積荷</th>
              <th className="px-2 py-2 text-left font-normal">最高額の戦利品</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ l, s }) => {
              const isOpen = open.has(l.id);
              return (
                <LocationRows key={l.id} l={l} s={s} isOpen={isOpen} onToggle={() => toggle(l.id)} order={order} />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* スマホ：カード */}
      <div className="mt-3 space-y-2 md:hidden">
        {rows.map(({ l, s }) => {
          const isOpen = open.has(l.id);
          return (
            <div key={l.id} className={`overflow-hidden rounded-lg border ${isOpen ? "border-neon/60" : "border-line"} bg-bg-card`}>
              <button type="button" onClick={() => toggle(l.id)} aria-expanded={isOpen} className="w-full px-3 py-2.5 text-left">
                <span className="flex items-start gap-2">
                  <span className="min-w-0 flex-1">
                    <LocName l={l} isOpen={isOpen} />
                  </span>
                  <ChevronDown size={16} className={`mt-1 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180 text-neon" : ""}`} />
                </span>
                <span className="mt-1.5 grid grid-cols-3 gap-1 text-center text-[11px]">
                  <Stat label="鍵なし" value={rangeText(s.free)} />
                  <Stat label="鍵の先" value={rangeText(s.locked)} />
                  <Stat label="積荷" value={s.cargo ? money(s.cargo) : "—"} />
                </span>
                <span className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-muted">
                  道具：<ToolChips s={s} />
                  {l.breaker && (
                    <span className="inline-flex items-center gap-0.5 text-sky-300">
                      <Zap size={11} />
                      配電盤
                    </span>
                  )}
                </span>
              </button>
              {isOpen && <LocationPanel l={l} order={order} />}
            </div>
          );
        })}
      </div>

      <Unknowns items={locationUnknowns} />
      <SourceList order={order} />
    </Section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded border border-line/60 bg-bg px-1 py-0.5">
      <span className="block text-muted">{label}</span>
      <span className="block font-mono text-money">{value}</span>
    </span>
  );
}

function LocName({ l, isOpen }: { l: HeistLocation; isOpen: boolean }) {
  return (
    <>
      <span className={`block font-bold ${isOpen ? "text-neon" : ""}`}>{l.nameJa}</span>
      <span className="block font-mono text-[11px] text-gray-300">
        {l.nameEn}
        {l.aliasEn && <span className="text-muted">（{l.aliasEn}）</span>}
      </span>
      <span className="block text-[11px] text-muted">
        {l.districtJa}・{l.typeJa}
      </span>
    </>
  );
}

function LocationRows({ l, s, isOpen, onToggle, order }: { l: HeistLocation; s: LocationStats; isOpen: boolean; onToggle: () => void; order: string[] }) {
  const best = s.best ? tipsData.items[s.best.id] : null;
  return (
    <>
      <tr className={`cursor-pointer border-t border-line/60 align-top hover:bg-bg-card ${isOpen ? "bg-bg-card" : ""}`} onClick={onToggle}>
        <td className="px-2 py-2">
          <button type="button" aria-expanded={isOpen} className="flex items-start gap-1.5 text-left" onClick={(e) => (e.stopPropagation(), onToggle())}>
            <ChevronDown size={14} className={`mt-1 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180 text-neon" : ""}`} />
            <span>
              <LocName l={l} isOpen={isOpen} />
            </span>
          </button>
        </td>
        <td className="max-w-[14rem] px-2 py-2">
          <ToolChips s={s} />
        </td>
        <td className="px-2 py-2 text-right font-mono">{s.lootPoints}</td>
        <td className="whitespace-nowrap px-2 py-2 text-right font-mono text-xs">
          {s.cabinets + s.depositBoxes}/{s.safes}/{s.computers}
        </td>
        <td className="px-2 py-2 text-center">{l.breaker ? <Zap size={14} className="inline text-sky-300" aria-label="あり" /> : <span className="text-muted">—</span>}</td>
        <td className="whitespace-nowrap px-2 py-2 text-right font-mono text-xs text-money">{rangeText(s.free)}</td>
        <td className="whitespace-nowrap px-2 py-2 text-right font-mono text-xs text-money">{rangeText(s.locked)}</td>
        <td className="whitespace-nowrap px-2 py-2 text-right font-mono text-xs text-money">{s.cargo ? money(s.cargo) : "—"}</td>
        <td className="px-2 py-2 text-xs">
          {best && s.best ? (
            <>
              <span className="block">{best.ja}</span>
              <span className="font-mono text-money">{money(s.best.price)}</span>
            </>
          ) : (
            <span className="text-muted">未確認</span>
          )}
        </td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={9} className="p-0">
            <LocationPanel l={l} order={order} />
          </td>
        </tr>
      )}
    </>
  );
}

/* ───────── 小ネタ ───────── */

function TipsSection() {
  const order = collect(tipsData.tips);
  return (
    <Section title="小ネタ">
      <ul className="divide-y divide-line/60 text-sm leading-relaxed">
        {tipsData.tips.map((t) => (
          <li key={t.text} className="py-2">
            <FactText f={t} order={order} />
          </li>
        ))}
      </ul>
      <SourceList order={order} />
    </Section>
  );
}

const RELATED = [
  { to: "/guides/money", label: "金策の比較" },
  { to: "/guides/police", label: "警察・逮捕・賄賂" },
  { to: "/guides/jail-time", label: "服役年数" },
  { to: "/guides/wipe", label: "ワイプまでの1週間" },
  { to: "/guides/production", label: "生産" },
  { to: "/tools", label: "道具・鍵" },
  { to: "/cargo", label: "積荷図鑑" },
];

export default function TipsPage() {
  useDocumentTitle("小ネタ・攻略メモ", "ROB RUN の街のイベント（貴重な積荷・タレコミ）、Looty Bay の強盗スポット28か所の道具・ルート・売値の比較、出典付きの小ネタ。");
  return (
    <div className="mx-auto max-w-5xl space-y-4 px-3 py-6 sm:px-4">
      <header>
        <h1 className="text-2xl font-bold leading-snug">小ネタ・攻略メモ</h1>
        <p className="font-mono text-sm text-gray-300">Tips, events & heist spots</p>
        <p className="mt-2 text-sm">
          街のイベントとイベントカーゴ、Looty Bay の強盗スポット{tipsData.locations.length}か所の比較、出典付きの小ネタをまとめました。分からないことは「未確認」と書いています。
        </p>
        <p className="mt-1 text-xs text-muted">
          最終更新: {tipsData.updatedAt}（建物データ：Rob Run Guide・ゲーム build {tipsData.gameBuild}）
        </p>
        <nav className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {[
            ["#events", "イベント"],
            ["#locations", "強盗スポット比較"],
            ["#tips", "小ネタ"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-full border border-line px-2.5 py-1 hover:border-neon">
              {label}
            </a>
          ))}
        </nav>
      </header>
      <SourceLegend />
      <div id="events" className="scroll-mt-16">
        <EventsSection />
      </div>
      <div id="locations" className="scroll-mt-16">
        <LocationsSection />
      </div>
      <div id="tips" className="scroll-mt-16">
        <TipsSection />
      </div>
      <Section title="関連ページ">
        <div className="flex flex-wrap gap-1.5">
          {RELATED.map((r) => (
            <Link key={r.to} to={r.to} className="rounded-md border border-line bg-bg-card px-2.5 py-1 text-sm hover:border-neon">
              {r.label}
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}
