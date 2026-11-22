import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { dataset, displayNameJa, items } from "../lib/data";
import { STATUS_JA } from "../lib/format";
import { Section } from "../components/ui";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function AboutPage() {
  useDocumentTitle("このサイトについて・データの収録範囲");
  const noPrice = items.filter((i) => i.purchaseCost === null);
  const noSale = items.filter((i) => i.salePrice === null);
  const noRarity = items.filter((i) => i.rarity === null);
  const statusCount = items.reduce<Record<string, number>>((a, i) => ((a[i.verificationStatus] = (a[i.verificationStatus] ?? 0) + 1), a), {});

  const Missing = ({ list }: { list: typeof items }) => (
    <details className="mt-1">
      <summary className="cursor-pointer text-sm text-muted">{list.length} 件を表示</summary>
      <ul className="mt-1 flex flex-wrap gap-1">
        {list.map((i) => (
          <li key={i.id}>
            <Link to={`/shipments/${i.id}`} className="inline-block rounded border border-line px-1.5 text-xs hover:border-neon">
              {displayNameJa(i)}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-3 py-4 sm:px-4">
      <h1 className="text-2xl font-bold">このサイトについて</h1>

      <Section title="非公式ファンサイトです">
        <p className="text-sm leading-relaxed">
          ROB RUN JAPAN は有志による<strong>非公式</strong>の日本語攻略サイトです。ゲーム開発・運営元（Kefir）や Steam とは一切関係ありません。
          ゲーム名・アイテム名・商標などの権利は各権利者に帰属します。ゲーム画像は掲載していません（アイコンは汎用アイコンで代用）。
        </p>
      </Section>

      <Section title="データの出典">
        <ul className="space-y-1 text-sm">
          <li>
            研究ツリー・研究費・前提研究・地区レベル・服役条件・英語原文:{" "}
            <a className="inline-flex items-center gap-0.5 text-neon underline" href={dataset.source.url} target="_blank" rel="noreferrer">
              {dataset.source.name} <ExternalLink size={11} />
            </a>
            （ゲームファイルからの抽出データ / ツリー build {dataset.source.treeBuild}）
          </li>
          <li>購入価格・売却価格・レアリティ・性能: 同サイトの個別アイテムページ（build {dataset.source.itemPageBuilds.join(", ")}）</li>
          <li>取得日: {dataset.source.retrievedAt}</li>
          <li>
            照合: 全研究費の合計 $36,182,000・総数172件は、別の攻略サイト（metaforge.app）の記載として検索結果に表示される値と一致しています（同サイトはアクセス制限のため本文は未確認）。
          </li>
        </ul>
        <h3 className="mt-3 text-xs font-bold text-muted">出典元が示している注意事項</h3>
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">
          {dataset.source.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </Section>

      <Section title="収録範囲（Shipments）">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-bold">収録数</dt>
            <dd>
              {items.length} / {items.length} 項目（日本語名・日本語説明・英語原文・研究費・前提研究・必要地区レベル・服役条件は全項目収録）
            </dd>
          </div>
          <div>
            <dt className="font-bold">検証ステータス</dt>
            <dd className="space-y-0.5">
              {Object.entries(statusCount).map(([k, v]) => (
                <p key={k}>
                  {STATUS_JA[k].label}: {v} 件 <span className="text-muted">— {STATUS_JA[k].desc}</span>
                </p>
              ))}
            </dd>
          </div>
          <div>
            <dt className="font-bold text-danger">購入価格が未確認</dt>
            <dd className="text-muted">出典に購入価格の記載がない項目（主に Mk2/Mk3 の武器など）。ノートPCで購入できない可能性もありますが、未確認です。</dd>
            <Missing list={noPrice} />
          </div>
          <div>
            <dt className="font-bold text-danger">売却価格が未確認</dt>
            <Missing list={noSale} />
          </div>
          <div>
            <dt className="font-bold text-danger">レアリティが未確認</dt>
            <Missing list={noRarity} />
          </div>
          <div>
            <dt className="font-bold text-danger">その他の未確認事項</dt>
            <dd className="text-muted">
              注文・配送費、メリット/デメリット・初心者向け評価などの攻略評価、アクションカメラの説明文中の悪名レベル（{"{0}"}）の値。
            </dd>
          </div>
        </dl>
      </Section>

      <Section title="翻訳について">
        <ul className="list-disc space-y-0.5 pl-5 text-sm">
          <li>英語原文はすべて保存し、各アイテムで確認できます。</li>
          <li>銃器・車両などの固有名詞は、ゲーム内表記と照合しやすいよう英語のまま表記しています。</li>
          <li>原文にない効果や数値は追加していません。不明な数値は「未確認」と表記します。</li>
          <li>同名のアイテム（例: スポーツバッグ×3）は I / II / III の番号で区別しています（サイト独自の表記）。</li>
        </ul>
      </Section>

      <Section title="誤りの報告">
        <p className="text-sm">
          ゲーム内の表示と異なる点があれば、アイテム名・ゲーム内のスクリーンショット・確認日をお知らせください。確認後に「検証済み」として反映します。
        </p>
      </Section>
    </div>
  );
}
