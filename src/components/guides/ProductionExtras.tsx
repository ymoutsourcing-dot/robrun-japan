import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { AccName, AccordionProvider, AccPanel } from "../Accordion";
import { AlertTriangle, Clock } from "lucide-react";
import { getItem } from "../../lib/data";
import { productionGuide as g } from "../../lib/guides";
import { money, RARITY_JA } from "../../lib/format";
import { Section } from "../ui";

type Rarity = "Uncommon" | "Epic" | "Legendary";
const RARITIES: Rarity[] = ["Uncommon", "Epic", "Legendary"];
const M = g.model;

/** 研究費のうち、この1つ分だけ（前提研究を含まない） */
function ownResearch(id: string) {
  return getItem(id)?.researchCost ?? 0;
}

/** 速度%の解釈：rate＝速さが(1+%)倍、reduce＝時間が(1−%)倍 */
export type SpeedMode = "rate" | "reduce";
const timeWith = (base: number, pct: number, mode: SpeedMode) => (mode === "rate" ? base / (1 + pct) : base * Math.max(0.05, 1 - pct));

const min = (sec: number) => `${Math.floor(sec / 60)}分${Math.round(sec % 60) ? `${Math.round(sec % 60)}秒` : ""}`;
const hours = (h: number) => (h < 1 ? `${Math.ceil(h * 60)}分` : `${Math.round(h * 10) / 10}時間`);

function Name({ id }: { id: string }) {
  return <AccName id={id} showEn={false} />;
}

function RarityPicker({ value, onChange }: { value: Rarity; onChange: (r: Rarity) => void }) {
  return (
    <div className="flex overflow-hidden rounded-md border border-line text-xs">
      {RARITIES.map((r) => (
        <button key={r} onClick={() => onChange(r)} className={`px-2 py-1 ${value === r ? "bg-neon/15 text-neon" : "text-muted"}`}>
          {RARITY_JA[r]}
        </button>
      ))}
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

/* ------------------------------------------------------------------ 栽培 */
function Plantation({ mode }: { mode: SpeedMode }) {
  const P = M.plantation;
  const [rarity, setRarity] = useState<Rarity>("Uncommon");
  const [tables, setTables] = useState(1);
  const [bushes, setBushes] = useState(6);
  const [on, setOn] = useState<Record<string, boolean>>({});
  const baseSec = P.growthPoints * P.tickSeconds;
  const speedSum = P.upgrades.reduce((s, u) => s + (on[u.id] ? u.speed : 0), 0);
  const sec = timeWith(baseSec, speedSum, mode);
  const avgBags = (P.harvestMin + P.harvestMax) / 2;
  const perHarvest = bushes * tables * avgBags * P.bagPrice[rarity];
  const perHour = (perHarvest * 3600) / sec;
  const basePerHour = (perHarvest * 3600) / baseSec;

  return (
    <Section title="栽培室（グロウルーム）">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted">株のレアリティ</span>
        <RarityPicker value={rarity} onChange={setRarity} />
        <label className="flex items-center gap-1">
          テーブル
          <select value={tables} onChange={(e) => setTables(Number(e.target.value))} className="rounded border border-line bg-bg px-1 py-0.5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          台
        </label>
        <label className="flex items-center gap-1">
          1台あたり
          <select value={bushes} onChange={(e) => setBushes(Number(e.target.value))} className="rounded border border-line bg-bg px-1 py-0.5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          株
        </label>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <Stat label="1サイクルの時間" value={min(sec)} sub={speedSum ? `基本 ${min(baseSec)}` : undefined} />
        <Stat label="1回の収穫（平均3袋/株）" value={money(perHarvest)} sub={`${P.harvestMin}〜${P.harvestMax}袋：${money(bushes * tables * P.harvestMin * P.bagPrice[rarity])}〜${money(bushes * tables * P.harvestMax * P.bagPrice[rarity])}`} />
        <Stat label="1時間あたり" value={money(Math.round(perHour))} accent />
        <Stat label="24時間あたり" value={money(Math.round(perHour * 24))} sub="放置で回し続けた場合" />
      </div>

      <h3 className="mb-1 mt-4 text-xs font-bold text-neon">強化パーツ（テーブル{tables}台すべてに装着）</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="p-1.5">装着</th>
              <th className="p-1.5">パーツ</th>
              <th className="p-1.5 text-right">速度</th>
              <th className="p-1.5 text-right">費用（研究＋購入×{tables}）</th>
              <th className="p-1.5 text-right">収益の増加/時</th>
              <th className="p-1.5 text-right">元が取れるまで</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {P.upgrades.map((u) => {
              const research = ownResearch(u.id);
              const unit = getItem(u.id)?.purchaseCost ?? 0;
              const cost = research + unit * tables;
              const gain = perHarvest * 3600 * (1 / timeWith(baseSec, u.speed, mode) - 1 / baseSec); // 単体で付けた場合の増加
              return (
                <Fragment key={u.id}>
                <tr>
                  <td className="p-1.5">
                    <input type="checkbox" checked={!!on[u.id]} onChange={(e) => setOn({ ...on, [u.id]: e.target.checked })} className="accent-[#5cff8a]" />
                  </td>
                  <td className="p-1.5">
                    <Name id={u.id} />
                  </td>
                  <td className="p-1.5 text-right font-mono">+{Math.round(u.speed * 100)}%</td>
                  <td className="p-1.5 text-right font-mono">
                    {money(cost)}
                    <span className="block text-[11px] text-muted">
                      {money(research)}＋{money(unit)}×{tables}
                    </span>
                  </td>
                  <td className="p-1.5 text-right font-mono text-money">+{money(Math.round(gain))}</td>
                  <td className="p-1.5 text-right font-mono">{gain > 0 ? hours(cost / gain) : "—"}</td>
                </tr>
                <AccPanel id={u.id} colSpan={6} />
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">
        「収益の増加/時」は、そのパーツだけを付けた場合の増加額。全部付けると速度 +{Math.round(P.upgrades.reduce((s, u) => s + u.speed, 0) * 100)}%（合計）で、
        1時間あたり {money(Math.round(basePerHour))} → {money(Math.round((perHarvest * 3600) / timeWith(baseSec, P.upgrades.reduce((s, u) => s + u.speed, 0), mode)))}（{min(timeWith(baseSec, P.upgrades.reduce((s, u) => s + u.speed, 0), mode))}）。
        研究費はパーツ単体の額（前提研究は栽培室・栽培テーブルのみで、すでに持っている前提）。
      </p>
    </Section>
  );
}

/* ------------------------------------------------------------------ 冷凍庫 */
function Freezer({ mode }: { mode: SpeedMode }) {
  const F = M.freezer;
  const [rarity, setRarity] = useState<Rarity>("Uncommon");
  const [level, setLevel] = useState(0);
  const [on, setOn] = useState<Record<string, boolean>>({});
  const baseSec = F.points * F.tickSeconds;
  const speedSum = F.upgrades.reduce((s, u) => s + (on[u.id] ? u.speed : 0), 0);
  const sec = timeWith(baseSec, speedSum, mode);
  const add = F.crystalPrice[rarity] - F.concentratePrice[rarity];
  const slots = F.levels[level].slots;
  const perBatch = add * slots;
  const perHour = (perBatch * 3600) / sec;

  return (
    <Section title="化学研究所：産業用冷凍庫（濃縮液 → 固形クリスタル）">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted">濃縮液のレアリティ</span>
        <RarityPicker value={rarity} onChange={setRarity} />
        <div className="flex overflow-hidden rounded-md border border-line text-xs">
          {F.levels.map((l, i) => (
            <button key={l.id} onClick={() => setLevel(i)} className={`px-2 py-1 ${level === i ? "bg-neon/15 text-neon" : "text-muted"}`}>
              冷凍庫 {["I", "II", "III"][i]}（{l.slots}枠）
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <Stat label="1回の時間" value={min(sec)} sub={speedSum ? `基本 ${min(baseSec)}` : undefined} />
        <Stat label="1個あたりの価値の増加" value={`+${money(add)}`} sub={`${money(F.concentratePrice[rarity])} → ${money(F.crystalPrice[rarity])}`} />
        <Stat label={`1回（${slots}個）の増加`} value={`+${money(perBatch)}`} />
        <Stat label="1時間あたりの増加" value={`+${money(Math.round(perHour))}`} accent />
      </div>

      <h3 className="mb-1 mt-4 text-xs font-bold text-neon">強化パーツ・上位の冷凍庫</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="p-1.5">装着</th>
              <th className="p-1.5">パーツ</th>
              <th className="p-1.5 text-right">効果</th>
              <th className="p-1.5 text-right">費用（研究＋購入）</th>
              <th className="p-1.5 text-right">増加/時</th>
              <th className="p-1.5 text-right">元が取れるまで</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {F.upgrades.map((u) => {
              const c = ownResearch(u.id) + (getItem(u.id)?.purchaseCost ?? 0);
              const gain = perBatch * 3600 * (1 / timeWith(baseSec, u.speed, mode) - 1 / baseSec);
              return (
                <Fragment key={u.id}>
                <tr>
                  <td className="p-1.5">
                    <input type="checkbox" checked={!!on[u.id]} onChange={(e) => setOn({ ...on, [u.id]: e.target.checked })} className="accent-[#5cff8a]" />
                  </td>
                  <td className="p-1.5">
                    <Name id={u.id} />
                  </td>
                  <td className="p-1.5 text-right font-mono">速度 +{Math.round(u.speed * 1000) / 10}%</td>
                  <td className="p-1.5 text-right font-mono">{money(c)}</td>
                  <td className="p-1.5 text-right font-mono text-money">+{money(Math.round(gain))}</td>
                  <td className="p-1.5 text-right font-mono">{hours(c / gain)}</td>
                </tr>
                <AccPanel id={u.id} colSpan={6} />
                </Fragment>
              );
            })}
            {F.levels.slice(1).map((l, i) => {
              const c = ownResearch(l.id) + (getItem(l.id)?.purchaseCost ?? 0);
              const prev = F.levels[i].slots;
              const gain = (add * (l.slots - F.levels[0].slots) * 3600) / baseSec;
              return (
                <Fragment key={l.id}>
                <tr>
                  <td className="p-1.5 text-xs text-muted">—</td>
                  <td className="p-1.5">
                    <Name id={l.id} />
                  </td>
                  <td className="p-1.5 text-right font-mono">
                    {prev}→{l.slots}枠
                  </td>
                  <td className="p-1.5 text-right font-mono">{money(c)}</td>
                  <td className="p-1.5 text-right font-mono text-money">+{money(Math.round(gain))}</td>
                  <td className="p-1.5 text-right font-mono">{hours(c / gain)}</td>
                </tr>
                <AccPanel id={l.id} colSpan={6} />
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">
        上位の冷凍庫の「増加/時」は冷凍庫I（4枠）と比べた値。費用は単体の研究費＋購入価格（下位の冷凍庫の研究が前提）。濃縮液をそのまま売る代わりにクリスタルにした場合の差額で計算しています。
      </p>
    </Section>
  );
}

/* ------------------------------------------------------------------ 反応炉 */
function Reactor() {
  const R = M.reactor;
  const [rarity, setRarity] = useState<Rarity>("Uncommon");
  const [chance, setChance] = useState(25);
  const conc = M.freezer.concentratePrice[rarity];
  return (
    <Section title="化学研究所：化学反応炉（試薬 → 濃縮液）">
      <div className="mb-2 flex gap-2 rounded-md border border-money/50 bg-money/5 p-2 text-xs">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-money" />
        <p>反応炉Iは「試薬1つで濃縮液4個・15分ごとに1個・60分」とプレイヤーが確認済み。II・IIIも「1サイクル＝1個」として計算しています（II・IIIは未確認）。</p>
      </div>
      <div className="mb-2 flex items-center gap-2 text-sm">
        <span className="text-muted">濃縮液のレアリティ</span>
        <RarityPicker value={rarity} onChange={setRarity} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="p-1.5">反応炉</th>
              <th className="p-1.5 text-right">1サイクル</th>
              <th className="p-1.5 text-right">サイクル数</th>
              <th className="p-1.5 text-right">1回の稼働</th>
              <th className="p-1.5 text-right">濃縮液/時</th>
              <th className="p-1.5 text-right">価値/時</th>
              <th className="p-1.5 text-right">費用（研究＋購入）</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {R.levels.map((l) => {
              const total = l.cycleSeconds * l.cycles;
              const perHour = (l.cycles * 3600) / total;
              const c = ownResearch(l.id) + (getItem(l.id)?.purchaseCost ?? 0);
              return (
                <Fragment key={l.id}>
                <tr>
                  <td className="p-1.5">
                    <Name id={l.id} />
                  </td>
                  <td className="p-1.5 text-right font-mono">{min(l.cycleSeconds)}</td>
                  <td className="p-1.5 text-right font-mono">{l.cycles}</td>
                  <td className="p-1.5 text-right font-mono">
                    <Clock size={11} className="inline text-muted" /> {min(total)}
                  </td>
                  <td className="p-1.5 text-right font-mono">{Math.round(perHour * 10) / 10}個</td>
                  <td className="p-1.5 text-right font-mono text-money">{money(Math.round(perHour * conc))}</td>
                  <td className="p-1.5 text-right font-mono">{money(c)}</td>
                </tr>
                <AccPanel id={l.id} colSpan={7} />
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="mb-1 mt-4 text-xs font-bold text-neon">品質パーツ（高品質クリスタルの確率アップ）の元が取れるまで</h3>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-1">
          パーツで1段階上のレアリティになる確率
          <input
            type="number"
            min={1}
            max={100}
            value={chance}
            onChange={(e) => setChance(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
            className="w-16 rounded border border-line bg-bg px-1 py-0.5 font-mono outline-none focus:border-neon"
          />
          %
        </label>
        <span className="text-xs text-muted">初期値25%はプレイヤーの実測（公式の数値は非公開）。</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="p-1.5">パーツ</th>
              <th className="p-1.5">効果（ゲーム内）</th>
              <th className="p-1.5 text-right">費用（研究＋購入）</th>
              <th className="p-1.5 text-right">1個あたりの期待増加</th>
              <th className="p-1.5 text-right">元が取れるクリスタル数</th>
              <th className="p-1.5 text-right">冷凍庫Iで（4個/時）</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {R.qualityUpgrades.map((q) => {
              const own = ownResearch(q.id);
              const purchase = getItem(q.id)?.purchaseCost ?? q.purchaseFallback ?? null;
              const c = purchase === null ? null : own + purchase;
              // アンコモン→エピック（+$15,000）が1段階上がる場合の期待値
              const diff = M.freezer.crystalPrice.Epic - M.freezer.crystalPrice.Uncommon;
              const ev = (chance / 100) * diff;
              const n = c === null ? null : Math.ceil(c / ev);
              return (
                <Fragment key={q.id}>
                <tr>
                  <td className="p-1.5">
                    <Name id={q.id} />
                  </td>
                  <td className="p-1.5">高品質の確率が{q.effectJa}</td>
                  <td className="p-1.5 text-right font-mono">
                    {money(c)}
                    {getItem(q.id)?.purchaseCost == null && q.purchaseFallback && <span className="block text-[10px] text-sky-300">購入価格はrobrun.infoの値</span>}
                  </td>
                  <td className="p-1.5 text-right font-mono text-money">+{money(Math.round(ev))}</td>
                  <td className="p-1.5 text-right font-mono">{n === null ? "—" : `${n}個`}</td>
                  <td className="p-1.5 text-right font-mono">{n === null ? "—" : hours(n / M.freezer.levels[0].slots)}</td>
                </tr>
                <AccPanel id={q.id} colSpan={6} />
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">
        期待増加＝確率×（エピックのクリスタル $45,000 − アンコモン $30,000）。エピック→レジェンダリーに上がる場合は差額が $30,000 なので、元が取れる個数は半分になります。
        パーツごとに確率が違う（エンジン＜温度計＜コンバーター）はずですが、数値が不明なので同じ確率で計算しています。
      </p>
      <p className="mt-2 text-xs text-muted">参考：試薬キャニスターはそのまま密輸業者に売ると {money(R.reagentPrice.Uncommon)}（アンコモン）。</p>
    </Section>
  );
}

/* ------------------------------------------------------------------ 化学研究所の合計 */
function LabTotal({ mode }: { mode: SpeedMode }) {
  const R = M.reactor;
  const F = M.freezer;
  const [base, setBase] = useState<"Uncommon" | "Epic">("Uncommon");
  const [reactor, setReactor] = useState(0);
  const [freezer, setFreezer] = useState(0);
  const [fUp, setFUp] = useState<Record<string, boolean>>({});
  const [engine, setEngine] = useState(true);
  const [chance, setChance] = useState(25);
  const [powder, setPowder] = useState(false);

  const rl = R.levels[reactor];
  const reactorSec = rl.cycleSeconds * rl.cycles;
  const concPerHour = (rl.cycles * 3600) / reactorSec; // 1サイクル＝濃縮液1個（反応炉Iはプレイヤー確認済み）
  const fSpeed = F.upgrades.reduce((a, u) => a + (fUp[u.id] ? u.speed : 0), 0);
  const freezeSec = timeWith(F.points * F.tickSeconds, fSpeed, mode);
  const freezeCap = (F.levels[freezer].slots * 3600) / freezeSec;
  const crystalsPerHour = Math.min(concPerHour, freezeCap);
  const bottleneck = concPerHour < freezeCap ? "反応炉" : concPerHour > freezeCap ? "冷凍庫" : null;

  const next = base === "Uncommon" ? "Epic" : "Legendary";
  // 売り方：クリスタルのまま（密輸業者）／粉末にして（故買屋）。粉末の袋数が未確認のレアリティは計算不可
  const valueOf = (r: "Uncommon" | "Epic" | "Legendary"): number | null => {
    if (!powder) return F.crystalPrice[r];
    const xs = F.powderSamples[r];
    return xs && xs.length ? xs.reduce((a, x) => a + x.value, 0) / xs.length : null;
  };
  const vBase = valueOf(base);
  const vNext = valueOf(next);
  const p = engine ? chance / 100 : 0;
  const unknownValue = vBase === null || (p > 0 && vNext === null);
  const diff = vBase !== null && vNext !== null ? vNext - vBase : 0;
  const valueEach = vBase === null ? 0 : vBase + p * diff;
  const gross = crystalsPerHour * valueEach;
  const grossNoEngine = crystalsPerHour * (vBase ?? 0);
  const reagentsPerHour = crystalsPerHour / rl.cycles;
  const reagentValue = reagentsPerHour * R.reagentPrice[base];

  return (
    <Section title="化学研究所の合計時給（反応炉 → 冷凍庫 → 固形クリスタル）">
      <div className="mb-2 flex gap-2 rounded-md border border-money/50 bg-money/5 p-2 text-xs">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-money" />
        <p>
          反応炉は1サイクルで濃縮液1個（試薬1つで{rl.cycles}個）。反応炉Iの「4個・60分」はプレイヤーが確認済みで、II・IIIは同じ仕組みとして計算しています（未確認）。レア度アップ確率の初期値25%はプレイヤーの実測。
        </p>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted">試薬</span>
          <div className="flex overflow-hidden rounded-md border border-line text-xs">
            {(["Uncommon", "Epic"] as const).map((r) => (
              <button key={r} onClick={() => setBase(r)} className={`px-2 py-1 ${base === r ? "bg-neon/15 text-neon" : "text-muted"}`}>
                {r === "Uncommon" ? "試薬キャニスター（アンコモン）" : "高品質試薬（エピック）"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted">反応炉</span>
          {R.levels.map((l, i) => (
            <button key={l.id} onClick={() => setReactor(i)} className={`rounded border px-2 py-0.5 text-xs ${reactor === i ? "border-neon text-neon" : "border-line text-muted"}`}>
              {["I", "II", "III"][i]}
            </button>
          ))}
          <span className="text-muted">冷凍庫</span>
          {F.levels.map((l, i) => (
            <button key={l.id} onClick={() => setFreezer(i)} className={`rounded border px-2 py-0.5 text-xs ${freezer === i ? "border-neon text-neon" : "border-line text-muted"}`}>
              {["I", "II", "III"][i]}（{l.slots}枠）
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={engine} onChange={(e) => setEngine(e.target.checked)} className="accent-[#5cff8a]" />
            <Name id="cargo_production_workbench_upgrade_engine_1" />
          </label>
          <label className="flex items-center gap-1 text-xs">
            レア度アップ確率
            <input
              type="number"
              min={1}
              max={100}
              value={chance}
              onChange={(e) => setChance(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
              className="w-14 rounded border border-line bg-bg px-1 py-0.5 font-mono"
            />
            %
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm sm:col-span-2">
          <span className="text-muted">売り方</span>
          <div className="flex overflow-hidden rounded-md border border-line text-xs">
            <button onClick={() => setPowder(false)} className={`px-2 py-1 ${!powder ? "bg-neon/15 text-neon" : "text-muted"}`}>
              クリスタルのまま（密輸業者）
            </button>
            <button onClick={() => setPowder(true)} className={`px-2 py-1 ${powder ? "bg-neon/15 text-neon" : "text-muted"}`}>
              ラボテーブルで粉末にして（故買屋）
            </button>
          </div>
          <span className="text-[11px] text-muted">粉末の価値は実測の推定価格の平均：エピック $63,333（3回・$54,000〜$74,000）、レジェンダリー $100,000（1回）。アンコモンは未確認。加工は1個10秒</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {F.upgrades.map((u) => (
            <label key={u.id} className="flex items-center gap-1">
              <input type="checkbox" checked={!!fUp[u.id]} onChange={(e) => setFUp({ ...fUp, [u.id]: e.target.checked })} className="accent-[#5cff8a]" />
              <Name id={u.id} />
            </label>
          ))}
        </div>
      </div>

      {["cargo_production_workbench_upgrade_engine_1", ...F.upgrades.map((u) => u.id)].map((id) => (
        <AccPanel key={id} id={id} />
      ))}
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <Stat label="反応炉：濃縮液/時" value={`${Math.round(concPerHour * 10) / 10}個`} sub={`1回 ${min(reactorSec)}・試薬1つで${rl.cycles}個`} />
        <Stat label="冷凍庫：処理できる数/時" value={`${Math.round(freezeCap * 10) / 10}個`} sub={`1回 ${min(freezeSec)}・${F.levels[freezer].slots}枠`} />
        <Stat
          label="クリスタル/時"
          value={`${Math.round(crystalsPerHour * 10) / 10}個`}
          sub={bottleneck ? `${bottleneck}がボトルネック` : "反応炉と冷凍庫が釣り合っている"}
        />
        <Stat
          label={powder ? "クリスタル1個の期待値（粉末）" : "クリスタル1個の期待値"}
          value={unknownValue ? "未確認" : money(Math.round(valueEach))}
          sub={unknownValue ? "粉末の袋数が未確認のレアリティを含む" : engine ? `${money(Math.round(vBase ?? 0))}＋${chance}%×${money(Math.round(diff))}` : "品質パーツなし"}
        />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <Stat
          label={`合計の時給${engine ? "（エンジンあり）" : ""}${powder ? "・粉末" : ""}`}
          value={unknownValue ? "未確認" : money(Math.round(gross))}
          sub={unknownValue ? "高品質試薬（エピック）を選ぶと計算できます" : `24時間で ${money(Math.round(gross * 24))}`}
          accent
        />
        <Stat label="エンジンによる上乗せ/時" value={unknownValue ? "未確認" : engine ? `+${money(Math.round(gross - grossNoEngine))}` : "—"} sub={unknownValue ? undefined : `エンジンなしの時給 ${money(Math.round(grossNoEngine))}`} />
        <Stat
          label="試薬をそのまま売る場合との差/時"
          value={unknownValue ? "未確認" : `+${money(Math.round(gross - reagentValue))}`}
          sub={`試薬 ${Math.round(reagentsPerHour * 100) / 100}個/時（売ると${money(Math.round(reagentValue))}）`}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        売値は悪名ボーナス前の密輸業者への価格。反応炉が1台・冷凍庫が1台の場合。試薬を集める手間・時間、粉末に加工する場合は含みません。
      </p>
    </Section>
  );
}

/** 生産設備ガイド：栽培・冷凍・反応炉の計算機 */
export default function ProductionExtras() {
  const [mode, setMode] = useState<SpeedMode>("reduce");
  return (
    <AccordionProvider>
      <div className="flex gap-2 rounded-lg border border-money/50 bg-money/5 p-3 text-sm">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-money" />
        <p>
          栽培テーブル・冷凍庫の1回60分はプレイヤー報告と一致（「1ティック1ポイント」の計算とも一致）。反応炉の時間と収量は未検証です。
          成長株・試薬の入手コスト、悪名ボーナス、集落ボーナスは含みません。前提と出典は下にまとめています。
        </p>
      </div>
      <Section title="強化パーツの「+%」の計算方式">
        <div className="flex flex-wrap gap-2 text-sm">
          {(
            [
              ["reduce", "時間が%だけ短くなる", "例：60分・+20% → 48分"],
              ["rate", "速さが%だけ上がる", "例：60分・+20% → 50分"],
            ] as const
          ).map(([k, label, ex]) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              className={`rounded-md border px-3 py-1.5 text-left ${mode === k ? "border-neon bg-neon/10 text-neon" : "border-line text-muted"}`}
            >
              {label}
              <span className="block text-[11px] opacity-80">{ex}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          プレイヤー報告：貨物作業台（基本ちょうど30分）に錠前工具セット（+20%）を付けたら24分。「時間が短くなる」方式（30×0.8＝24）で確定としています。複数パーツの効果は合計%として計算（2つ目のパーツでの確認は未実施）。
        </p>
      </Section>
      <LabTotal mode={mode} />
      <Plantation mode={mode} />
      <Freezer mode={mode} />
      <Reactor />
      <p className="text-xs text-muted">
        設備一式の初期費用は「<Link to="/guides/money" className="underline">金策の比較</Link>」ガイドを参照。
      </p>
    </AccordionProvider>
  );
}
