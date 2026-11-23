import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Home, Moon } from "lucide-react";
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
  return (
    <>
      <Section title="稼ぎ方の比較">
        <p className="mb-3 text-xs text-muted">
          初期費用は本サイトのShipmentsデータから「必要な設備の研究費（前提研究込み）＋購入価格」を自動計算しています（区画の賃料は含みません）。単価は積荷・生産物の売値の例です。
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {g.methods.map((m) => {
            const cost = m.setup.length ? computeCost(m.setup, empty) : null;
            return (
              <article key={m.key} className="flex flex-col rounded-lg border border-line bg-bg-card p-3">
                <header className="flex flex-wrap items-baseline gap-x-2">
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
