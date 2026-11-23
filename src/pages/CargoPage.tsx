import { useMemo, useState } from "react";
import { ExternalLink, Info, PackageOpen } from "lucide-react";
import cargoJson from "../../data/source/cargo.source.json";
import openingsJson from "../../data/observed/cargo-openings.json";
import { money, RARITY_COLOR, RARITY_JA } from "../lib/format";
import { Section } from "../components/ui";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

interface Cargo {
  id: string;
  nameEn: string;
  nameJa: string;
  rarity: string;
  smugglerPrice: number | null;
  copSeizure: number | null;
  url: string;
}
interface Opening {
  cargo: string;
  date: string;
  estimatedValue: number;
  station: string;
  contentsJa: string;
  source: string;
}

const cargo = (cargoJson as { items: Cargo[] }).items;
const openings = (openingsJson as { openings: Opening[] }).openings;
const RARITY_ORDER = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Exotic"];

function Rarity({ r }: { r: string }) {
  return <span className={`rounded border px-1 text-[11px] ${RARITY_COLOR[r] ?? ""}`}>{RARITY_JA[r] ?? r}</span>;
}

export default function CargoPage() {
  useDocumentTitle("積荷（カーゴ）図鑑", "ROB RUN の積荷（カーゴ）全34種のレアリティ・密輸業者への売値・警官の没収額と、開けた場合の推定価値（プレイヤー実測）。");
  const [sort, setSort] = useState<"price" | "rarity" | "name">("price");
  const rows = useMemo(() => {
    const opened = new Map<string, number[]>();
    for (const o of openings) opened.set(o.cargo, [...(opened.get(o.cargo) ?? []), o.estimatedValue]);
    return cargo
      .map((c) => {
        const vals = opened.get(c.id) ?? [];
        const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        return { ...c, openedAvg: avg, openedN: vals.length, ratio: avg && c.smugglerPrice ? avg / c.smugglerPrice : null };
      })
      .sort((a, b) =>
        sort === "price"
          ? (b.smugglerPrice ?? 0) - (a.smugglerPrice ?? 0)
          : sort === "rarity"
            ? RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity)
            : a.nameJa.localeCompare(b.nameJa, "ja"),
      );
  }, [sort]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-3 py-4 sm:px-4">
      <div>
        <h1 className="text-2xl font-bold">積荷（カーゴ）図鑑</h1>
        <p className="text-sm"><a href="/collections" className="text-sky-300 hover:underline">コレクション箱のレシピ一覧 →</a></p>
        <p className="text-sm text-muted">
          積荷はそのまま密輸業者に売るか、貨物作業台で開けて中身を売るかを選べます。開けた場合の価値はプレイヤーの実測を集めています。
        </p>
      </div>

      <div className="flex gap-2 rounded-lg border border-neon/40 bg-neon/5 p-3 text-sm">
        <PackageOpen size={18} className="mt-0.5 shrink-0 text-neon" />
        <p>
          実測では、<strong>パウダーバッグ系は開けた方が2.6〜3倍の価値</strong>になりました（パーフェクト：そのまま $60,000 → 開けると推定 $155,652）。
          他の積荷も開けたら、中身の推定価格を教えてください。
        </p>
      </div>

      <Section
        title={`積荷一覧（${cargo.length}種）`}
        right={
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-md border border-line bg-bg px-2 py-1 text-xs" aria-label="並び替え">
            <option value="price">売値が高い順</option>
            <option value="rarity">レアリティ順</option>
            <option value="name">名前順</option>
          </select>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="p-1.5">積荷</th>
                <th className="p-1.5 text-center">レアリティ</th>
                <th className="p-1.5 text-right">
                  そのまま売る
                  <span className="block text-[10px] font-normal">密輸業者・悪名Lv1〜5</span>
                </th>
                <th className="p-1.5 text-right">警官の没収額</th>
                <th className="p-1.5 text-right">
                  開けた場合
                  <span className="block text-[10px] font-normal">推定価格・実測</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="p-1.5">
                    <span className="block font-bold">{c.nameJa}</span>
                    <span className="block font-mono text-[11px] text-gray-300">{c.nameEn}</span>
                  </td>
                  <td className="p-1.5 text-center">
                    <Rarity r={c.rarity} />
                  </td>
                  <td className="p-1.5 text-right font-mono text-money">
                    {money(c.smugglerPrice)}
                    {c.smugglerPrice !== null && <span className="block text-[11px] text-muted">〜{money(Math.round(c.smugglerPrice * 1.25))}</span>}
                  </td>
                  <td className="p-1.5 text-right font-mono">{money(c.copSeizure)}</td>
                  <td className="p-1.5 text-right font-mono">
                    {c.openedAvg !== null ? (
                      <>
                        <span className="text-neon">{money(Math.round(c.openedAvg))}</span>
                        <span className="block text-[11px] text-muted">
                          {c.ratio ? `×${(Math.round(c.ratio * 10) / 10).toFixed(1)}` : ""}・{c.openedN}回
                        </span>
                      </>
                    ) : (
                      <span className="text-muted">未確認</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="密輸品作業台：詰め直し（Repack Cargo）">
        <ul className="space-y-1.5 text-sm">
          <li className="flex flex-wrap items-center gap-2">
            <Rarity r="Uncommon" /> 密輸貨物 <span className="font-mono text-xs text-gray-400">Contraband Cargo</span>
            <span className="font-mono text-money">{money(10000)}</span>
            <span>→</span>
            <Rarity r="Epic" /> プレミアム貨物 <span className="font-mono text-xs text-gray-400">Premium Cargo</span>
            <span className="font-mono text-money">{money(35000)}</span>
            <span className="text-xs text-muted">（通常・確定）</span>
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <Rarity r="Uncommon" /> 密輸貨物 <span className="font-mono text-money">{money(10000)}</span>
            <span>→</span>
            <Rarity r="Legendary" /> レアリティ貨物 <span className="font-mono text-xs text-gray-400">Rarity Cargo</span>
            <span className="font-mono text-money">{money(40000)}</span>
            <span className="text-xs text-muted">（集落ボーナスあり・「可能性あり」）</span>
          </li>
        </ul>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted">
          <li>1個入れて1個出てくる。モーテルで$10,000で買って詰め直すと、売値（悪名ボーナス前）は$35,000（差額+$25,000）。</li>
          <li>集落の「改良結果」ボーナスが効いていると、通常の結果の代わりにレアリティ貨物になる（ゲームデータの注記。確率は未記載）。このボーナスはブラックマーケット（Highlands）に隣接する集落のものと考えられる（<a href="/guides/map-settlements" className="underline">集落と地区</a>）。</li>
          <li>作業台の「Modification」で強化パーツを付ける：ラベルプリンター（詰め直しが速くなる）、工具箱（枠を増やす）。詰め直しにかかる時間はデータに無く未確認。</li>
          <li>
            出典：
            <a href="https://robrunguide.app/en-US/production" target="_blank" rel="noreferrer" className="underline">Rob Run Guide（ゲームファイル由来）</a>
            ・売値は上の表と同じ robrun.info
          </li>
        </ul>
      </Section>

      <Section title="開封の記録（プレイヤー実測）">
        <ul className="space-y-2 text-sm">
          {openings.map((o, i) => {
            const c = cargo.find((x) => x.id === o.cargo);
            return (
              <li key={i} className="rounded-md border border-line bg-bg-card p-2">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{c?.nameJa ?? o.cargo}</span>
                  {c && <Rarity r={c.rarity} />}
                  <span className="font-mono text-neon">推定 {money(o.estimatedValue)}</span>
                  {c?.smugglerPrice && <span className="text-xs text-muted">（そのまま売ると {money(c.smugglerPrice)}）</span>}
                </p>
                <p className="mt-0.5 text-xs text-gray-300">中身：{o.contentsJa}</p>
                <p className="text-[11px] text-muted">
                  {o.date}・{o.station}・{o.source}
                </p>
              </li>
            );
          })}
        </ul>
      </Section>

      <div className="flex gap-2 rounded-lg border border-line bg-bg-panel p-3 text-xs text-muted">
        <Info size={16} className="mt-0.5 shrink-0 text-sky-300" />
        <div className="space-y-1">
          <p>
            売値・没収額は
            <a href="https://robrun.info/mechanics/cargo/" target="_blank" rel="noreferrer" className="mx-0.5 inline-flex items-center gap-0.5 underline">
              robrun.info <ExternalLink size={10} />
            </a>
            の値（ゲーム設定値として公開されているファン情報）。悪名レベルで売値は最大+25%。
          </p>
          <p>「開けた場合」はゲーム内の「推定価格」（住居や売却場所で変わる目安）。中身はランダムなので、記録が増えるほど平均が正確になります。</p>
          <p>積荷を運ぶ途中で武器を出すと落とす。警官は積荷を没収できる。貨物作業台の開封は基本30分（錠前工具セット+20%で24分・プレイヤー報告）。</p>
        </div>
      </div>
    </div>
  );
}
