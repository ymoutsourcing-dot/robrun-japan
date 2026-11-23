import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Home, Moon, Trophy } from "lucide-react";
import { HOURLY } from "../../lib/production";
import { computeCost, displayNameJa, getItem } from "../../lib/data";
import { moneyGuide as g } from "../../lib/guides";
import { money } from "../../lib/format";
import { Section } from "../ui";
import { SourceTag } from "../GuideBody";

function range(v: number, max?: number) {
  return max ? `${money(v)}〜${money(max)}` : money(v);
}

/** 金策ガイド：稼ぎ方の比較カード＋悪名レベル表 */
export default function MoneyExtras() {
  const empty = useMemo(() => new Set<string>(), []);
  // 時給を計算できるものだけ順位を付ける（最大構成の時給の高い順）
  const ranked = useMemo(() => {
    const list = g.methods
      .filter((m) => m.hourly && HOURLY[m.hourly])
      .map((m) => ({ key: m.key, h: HOURLY[m.hourly!]() }))
      .sort((a, b) => b.h.max - a.h.max);
    return new Map(list.map((x, i) => [x.key, { rank: i + 1, h: x.h }]));
  }, []);
  const methods = useMemo(
    () => [...g.methods].sort((a, b) => (ranked.get(a.key)?.rank ?? 99) - (ranked.get(b.key)?.rank ?? 99)),
    [ranked],
  );
  return (
    <>
      <Section title="時間効率ランキング（時給）">
        <ol className="space-y-2">
          {[...ranked.entries()].map(([key, { rank, h }]) => {
            const m = g.methods.find((x) => x.key === key)!;
            return (
              <li key={key} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-neon/40 bg-neon/5 p-2">
                <span className="flex items-center gap-1 font-mono text-xl font-black text-neon">
                  <Trophy size={18} />#{rank}
                </span>
                <span className="font-bold">{m.name}</span>
                <span className="ml-auto text-right">
                  <span className="block font-mono text-lg text-money">最大 {money(Math.round(h.max))}/時</span>
                  <span className="block text-xs text-muted">最小構成 {money(Math.round(h.min))}/時</span>
                </span>
              </li>
            );
          })}
          <li className="rounded-lg border border-dashed border-line p-2 text-sm text-muted">
            順位なし（時間のデータが不足）：{g.methods.filter((m) => !ranked.has(m.key)).map((m) => m.name).join("・")}
          </li>
        </ol>
        <p className="mt-2 text-xs text-muted">
          時給は「化学研究所・栽培室の改造パーツ 費用対効果」ガイドと同じ前提（1回60分・パーツの%は時間短縮・アンコモン・悪名ボーナス前）で計算した<span className="text-money">算出値</span>。
          順位は「設備を最大まで揃えた場合」の時給で決めています。成長株・試薬を集める手間は含みません。{" "}
          <Link to="/guides/production" className="text-sky-300 hover:underline">
            条件を変えて計算する →
          </Link>
        </p>
      </Section>

      <Section title="稼ぎ方の比較">
        <p className="mb-3 text-xs text-muted">
          初期費用は本サイトのShipmentsデータから「必要な設備の研究費（前提研究込み）＋購入価格」を自動計算しています（区画の賃料は含みません）。単価は積荷・生産物の売値の例です。
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {methods.map((m) => {
            const r = ranked.get(m.key);
            const cost = m.setup.length ? computeCost(m.setup, empty) : null;
            return (
              <article key={m.key} className={`flex flex-col rounded-lg border bg-bg-card p-3 ${r ? "border-neon/50" : "border-line"}`}>
                <header className="flex flex-wrap items-baseline gap-x-2">
                  {r && <span className="rounded bg-neon px-1.5 font-mono text-sm font-black text-black">#{r.rank}</span>}
                  <h3 className="font-bold">{m.name}</h3>
                  <span className="font-mono text-xs text-gray-300">{m.nameEn}</span>
                </header>
                <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                  <span className={`inline-flex items-center gap-0.5 rounded border px-1 ${m.needsBase ? "border-money/60 text-money" : "border-line text-muted"}`}>
                    <Home size={11} /> {m.needsBase ? "拠点が必要" : "拠点不要"}
                  </span>
                  {m.offline && (
                    <span className="inline-flex items-center gap-0.5 rounded border border-sky-600 px-1 text-sky-300">
                      <Moon size={11} /> 放置で進む
                    </span>
                  )}
                </div>
                <dl className="mt-2 space-y-1.5 text-sm">
                  <div>
                    <dt className="text-xs text-muted">初期費用</dt>
                    <dd>
                      {cost ? (
                        <>
                          <span className="font-mono text-money">{money(cost.researchTotal + cost.purchaseTotal)}</span>
                          <span className="text-xs text-muted">
                            （研究 {money(cost.researchTotal)} ＋ 購入 {money(cost.purchaseTotal)}
                            {cost.unknownPurchase.length > 0 && " ＋購入価格未確認あり"}）
                          </span>
                          <span className="mt-0.5 block text-xs">
                            {m.setup.map((id, i) => (
                              <span key={id}>
                                {i > 0 && "・"}
                                <Link to={`/shipments/${id}`} className="text-sky-300 hover:underline">
                                  {getItem(id) ? displayNameJa(getItem(id)!) : id}
                                </Link>
                              </span>
                            ))}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted">設備なし</span>
                      )}
                      <span className="block text-xs text-muted">{m.setupNote}</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">時給（算出）</dt>
                    <dd>
                      {r ? (
                        <>
                          <span className="font-mono text-money">
                            {money(Math.round(r.h.min))}〜{money(Math.round(r.h.max))}/時
                          </span>
                          <span className="block text-xs text-muted">
                            最小：{r.h.minLabel}／最大：{r.h.maxLabel}。{r.h.note}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted">算出不可：{m.hourlyNote ?? "データ不足"}</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">収入</dt>
                    <dd>{m.income}</dd>
                  </div>
                  {m.examples.length > 0 && (
                    <div>
                      <dt className="text-xs text-muted">単価の例</dt>
                      <dd>
                        <ul className="space-y-0.5">
                          {m.examples.map((e) => (
                            <li key={e.label} className="flex justify-between gap-2">
                              <span className="text-gray-300">
                                {e.label}
                                {e.derived && <span className="ml-1 text-[10px] text-money">算出</span>}
                              </span>
                              <span className="shrink-0 font-mono text-money">{range(e.value, e.valueMax)}</span>
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-muted">リスク</dt>
                    <dd>{m.risk}</dd>
                  </div>
                  {m.note && <p className="text-xs text-muted">※{m.note}</p>}
                  {(m.key === "plantation" || m.key === "lab") && (
                    <Link to="/guides/production" className="text-xs text-sky-300 hover:underline">
                      改造パーツの費用対効果を計算 →
                    </Link>
                  )}
                </dl>
                <div className="mt-auto pt-2">
                  <SourceTag source={g.sources[m.source]} />
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      <Section title="悪名レベルによる売値ボーナス">
        <table className="w-full max-w-md text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="p-1.5">悪名レベル</th>
              <th className="p-1.5 text-right">略奪品（故買屋）</th>
              <th className="p-1.5 text-right">積荷（密輸業者）</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {g.notoriety.map((n) => (
              <tr key={n.level}>
                <td className="p-1.5 font-mono">Lv{n.level}</td>
                <td className="p-1.5 text-right font-mono text-money">+{n.loot}%</td>
                <td className="p-1.5 text-right font-mono text-money">+{n.cargo}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2">
          <SourceTag source={g.sources["rri-fame"]} />
        </p>
      </Section>
    </>
  );
}
