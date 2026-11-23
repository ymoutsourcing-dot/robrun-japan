import { useState } from "react";
import { Link } from "react-router-dom";
import { Lock, CheckCircle2, AlertTriangle } from "lucide-react";
import { items, displayNameEn, displayNameJa } from "../../lib/data";
import { JAIL, assetsForYears, minDaysFor, yearsFromAssets } from "../../lib/guides";
import { money } from "../../lib/format";
import { useProgress } from "../../store/progress";
import { ItemIcon, Section, TierBadge } from "../ui";

const gated = items.filter((i) => i.requiredImprisonmentYears > 0).sort((a, b) => a.requiredImprisonmentYears - b.requiredImprisonmentYears);

/** 服役年数ガイド：注意書き・解放一覧・資産→年数の計算機 */
export default function JailExtras() {
  const jailYears = useProgress((s) => s.jailYears);
  const setJailYears = useProgress((s) => s.setJailYears);
  const researched = useProgress((s) => s.researched);
  const [assets, setAssets] = useState("5000000");
  const assetsNum = Number(assets.replace(/[^\d]/g, "")) || 0;
  const cur = jailYears ?? 0;
  return (
    <>
      <div className="flex gap-2 rounded-lg border border-money/50 bg-money/5 p-3 text-sm">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-money" />
        <p>
          年数の計算式と上限（1日{JAIL.perDay}年・累計{JAIL.total.toLocaleString()}年・1州{JAIL.perState}年）は<strong>Kefir未発表</strong>で、ゲーム設定値を掲載しているファンサイト（robrun.info）の数値です。
          上限が「ある」ことは公式パッチノートで確認済みです。アップデートで変わる可能性があります。
        </p>
      </div>

      {/* 計算機 */}
      <Section title="あなたの服役年数で解放できるShipments">
        <label className="flex flex-wrap items-center gap-2 text-sm">
          現在の累計服役年数:
          <input
            type="number"
            min={0}
            max={JAIL.total}
            inputMode="numeric"
            value={jailYears ?? ""}
            onChange={(e) => setJailYears(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
            placeholder="例: 41"
            className="w-24 rounded-md border border-line bg-bg px-2 py-1 font-mono outline-none focus:border-neon"
          />
          年
          <span className="text-xs text-muted">（刑務所の画面上部に表示。ブラウザに保存されます）</span>
        </label>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="p-1.5">Shipments</th>
                <th className="p-1.5 text-right">必要年数</th>
                <th className="p-1.5 text-right">あと</th>
                <th className="p-1.5 text-right">最短日数*</th>
                <th className="p-1.5 text-center">地区Lv</th>
                <th className="p-1.5 text-right">研究費</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {gated.map((it) => {
                const missing = Math.max(0, it.requiredImprisonmentYears - cur);
                const ok = jailYears !== null && missing === 0;
                const done = researched.includes(it.id);
                return (
                  <tr key={it.id} className={ok ? "bg-neon/5" : ""}>
                    <td className="p-1.5">
                      <Link to={`/shipments/${it.id}`} className="flex items-center gap-2 hover:underline">
                        <ItemIcon item={it} size={13} />
                        <span>
                          <span className={`block font-bold ${done ? "text-neon" : ""}`}>
                            {displayNameJa(it)} {done && <CheckCircle2 size={12} className="inline" />}
                          </span>
                          <span className="block font-mono text-[11px] text-gray-300">{displayNameEn(it)}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="p-1.5 text-right font-mono text-danger">
                      <Lock size={11} className="inline" /> {it.requiredImprisonmentYears}
                    </td>
                    <td className="p-1.5 text-right font-mono">
                      {jailYears === null ? "—" : ok ? <span className="text-neon">達成</span> : `${missing}年`}
                    </td>
                    <td className="p-1.5 text-right font-mono">{jailYears === null ? `${minDaysFor(it.requiredImprisonmentYears)}日` : ok ? "—" : `${minDaysFor(missing)}日`}</td>
                    <td className="p-1.5 text-center">
                      <TierBadge level={it.requiredSettlementLevel} />
                    </td>
                    <td className="p-1.5 text-right font-mono text-money">{money(it.researchCost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          必要年数はゲームデータ（Shipmentsの解放条件）。*最短日数＝不足年数 ÷ 1日上限{JAIL.perDay}年（ファン情報に基づく算出値）。実際は1州{JAIL.perState}年の上限とワイプ周期（7日）も関係します。
        </p>
      </Section>

      <Section title="資産額 → 獲得年数（1回のワイプ・1州あたり）">
        <label className="flex flex-wrap items-center gap-2 text-sm">
          ワイプ時の資産額 $
          <input
            value={assets}
            inputMode="numeric"
            onChange={(e) => setAssets(e.target.value)}
            className="w-40 rounded-md border border-line bg-bg px-2 py-1 font-mono outline-none focus:border-neon"
          />
          → <span className="font-mono text-xl text-money">{yearsFromAssets(assetsNum)}年</span>
        </label>
        <p className="mt-2 text-xs text-muted">
          計算式: {JAIL.base}年 ＋ 資産 ${JAIL.perAmount.toLocaleString()} ごとに1年（最大{JAIL.perState}年）。ファン情報に基づく目安です。
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {[10, 20, 30, 40].map((y) => (
            <div key={y} className="rounded-md border border-line bg-bg-card p-2">
              <p className="text-xs text-muted">{y}年に必要な資産</p>
              <p className="font-mono text-money">{money(assetsForYears(y))}</p>
            </div>
          ))}
        </div>
      </Section>

    </>
  );
}
