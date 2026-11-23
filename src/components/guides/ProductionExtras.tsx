import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock } from "lucide-react";
import { displayNameJa, getItem } from "../../lib/data";
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
  const it = getItem(id);
  return (
    <Link to={`/shipments/${id}`} className="font-bold hover:underline">
      {it ? displayNameJa(it) : id}
    </Link>
  );
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
        <Stat label="1サイクルの時間（推定）" value={min(sec)} sub={speedSum ? `基本 ${min(baseSec)}` : undefined} />
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
                <tr key={u.id}>
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
        <Stat label="1回の時間（推定）" value={min(sec)} sub={speedSum ? `基本 ${min(baseSec)}` : undefined} />
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
                <tr key={u.id}>
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
              );
            })}
            {F.levels.slice(1).map((l, i) => {
              const c = ownResearch(l.id) + (getItem(l.id)?.purchaseCost ?? 0);
              const prev = F.levels[i].slots;
              const gain = (add * (l.slots - F.levels[0].slots) * 3600) / baseSec;
              return (
                <tr key={l.id}>
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
  const conc = M.freezer.concentratePrice[rarity];
  return (
    <Section title="化学研究所：化学反応炉（試薬 → 濃縮液）">
      <div className="mb-2 flex gap-2 rounded-md border border-money/50 bg-money/5 p-2 text-xs">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-money" />
        <p>反応炉の収量（1サイクルで何個できるか）は出典に記載がありません。下の「1時間あたり」は「1サイクル＝濃縮液1個」と仮定した参考値です。</p>
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
              <th className="p-1.5 text-right">濃縮液/時（仮定）</th>
              <th className="p-1.5 text-right">価値/時（仮定）</th>
              <th className="p-1.5 text-right">費用（研究＋購入）</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {R.levels.map((l) => {
              const total = l.cycleSeconds * l.cycles;
              const perHour = (l.cycles * 3600) / total;
              const c = ownResearch(l.id) + (getItem(l.id)?.purchaseCost ?? 0);
              return (
                <tr key={l.id}>
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
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="mb-1 mt-4 text-xs font-bold text-neon">品質パーツ（高品質クリスタルの確率アップ）の損益分岐</h3>
      <p className="mb-2 text-xs text-muted">確率の数値は非公開のため、「固形クリスタルが1段階上のレアリティになる回数」で元が取れるかを示します（クリスタルの差額：アンコモン→エピック +$15,000、エピック→レジェンダリー +$30,000）。</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="p-1.5">パーツ</th>
              <th className="p-1.5">効果（ゲーム内）</th>
              <th className="p-1.5 text-right">費用（研究＋購入）</th>
              <th className="p-1.5 text-right">元が取れる回数</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {R.qualityUpgrades.map((q) => {
              const own = ownResearch(q.id);
              const purchase = getItem(q.id)?.purchaseCost ?? q.purchaseFallback ?? null;
              const c = purchase === null ? null : own + purchase;
              const up1 = M.freezer.crystalPrice.Epic - M.freezer.crystalPrice.Uncommon;
              const up2 = M.freezer.crystalPrice.Legendary - M.freezer.crystalPrice.Epic;
              return (
                <tr key={q.id}>
                  <td className="p-1.5">
                    <Name id={q.id} />
                  </td>
                  <td className="p-1.5">高品質の確率が{q.effectJa}</td>
                  <td className="p-1.5 text-right font-mono">
                    {money(c)}
                    {getItem(q.id)?.purchaseCost == null && q.purchaseFallback && <span className="block text-[10px] text-sky-300">購入価格はrobrun.infoの値</span>}
                  </td>
                  <td className="p-1.5 text-right font-mono">
                    {c === null ? (
                      "—"
                    ) : (
                      <>
                        <span className="block">エピック化 {Math.ceil(c / up1)}回</span>
                        <span className="block text-xs text-muted">レジェンダリー化なら {Math.ceil(c / up2)}回</span>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">参考：試薬キャニスターはそのまま密輸業者に売ると {money(R.reagentPrice.Uncommon)}（アンコモン）。</p>
    </Section>
  );
}

/** 生産設備ガイド：栽培・冷凍・反応炉の計算機 */
export default function ProductionExtras() {
  const [mode, setMode] = useState<SpeedMode>("reduce");
  return (
    <>
      <div className="flex gap-2 rounded-lg border border-money/50 bg-money/5 p-3 text-sm">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-money" />
        <p>
          時間は「1ティックで1ポイント進む」という<strong>推定</strong>です（栽培・冷凍・反応炉Iがすべて60分に揃うため妥当と見ていますが、ゲーム内では未検証）。
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
          プレイヤー報告：貨物作業台に錠前工具セット（+20%）を付けたら30分→24分。「時間が短くなる」方式（30×0.8＝24）と一致するため、こちらを初期設定にしています。複数パーツの効果は合計%として計算（未検証）。
        </p>
      </Section>
      <Plantation mode={mode} />
      <Freezer mode={mode} />
      <Reactor />
      <p className="text-xs text-muted">
        設備一式の初期費用は「<Link to="/guides/money" className="underline">金策の比較</Link>」ガイドを参照。
      </p>
    </>
  );
}
