import { Link } from "react-router-dom";
import { GitBranch, Database, Calculator, Sparkles, ListChecks, Coins, Car, House, Crosshair, Info, Lock } from "lucide-react";
import { dataset, items } from "../lib/data";
import { money } from "../lib/format";
import { ProgressBar } from "../components/ProgressBar";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const total = items.reduce((s, i) => s + (i.researchCost ?? 0), 0);

const MAIN = [
  { to: "/shipments", icon: GitBranch, title: "Shipments研究ツリー", desc: `全${items.length}項目を日本語で。前提研究を線でつないで表示` },
  { to: "/items", icon: Database, title: "アイテムデータベース", desc: "日本語・英語で検索。研究費・購入価格・性能を比較" },
  { to: "/calculator", icon: Calculator, title: "研究費用計算機", desc: "目標までの必要研究費を自動計算（研究済みは除外）" },
  { to: "/recommended", icon: Sparkles, title: "おすすめ研究・ルート", desc: "最初に研究できる項目、主要目標までの総額" },
  { to: "/guides/jail-time", icon: Lock, title: "服役年数の貯め方", desc: "計算式・上限・必要年数のShipments一覧と計算機" },
  { to: "/progress", icon: ListChecks, title: "研究進捗の管理", desc: "研究済み・予定・お気に入り。JSONでバックアップ" },
];

const COMING = [
  { icon: Coins, title: "金策攻略", desc: "強盗・貨物・農園・化学研究所の収益比較" },
  { icon: Crosshair, title: "武器・装備一覧", desc: "ダメージ・連射速度などの比較" },
  { icon: Car, title: "車両・カスタマイズ", desc: "車両性能と改造パーツ" },
  { icon: House, title: "拠点・生産設備", desc: "土地・建築・防衛・生産設備" },
];

export default function HomePage() {
  useDocumentTitle(null, "ROB RUN の非公式日本語攻略サイト。Shipments（研究ツリー）全172項目を日本語化し、研究費の計算や進捗管理ができます。");
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-3 py-6 sm:px-4">
      <section className="rounded-2xl border border-line bg-gradient-to-br from-bg-panel to-[#0f1a13] p-5 sm:p-8">
        <p className="font-mono text-xs tracking-widest text-neon">ROB RUN 非公式 日本語攻略</p>
        <h1 className="mt-1 text-2xl font-bold leading-snug sm:text-3xl">
          Shipments（研究ツリー）を
          <br className="sm:hidden" />
          完全日本語化
        </h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          全 <strong className="text-white">{items.length}</strong> 項目の研究費・前提研究・必要地区レベル・日本語説明を収録。全研究の合計は{" "}
          <strong className="font-mono text-money">{money(total)}</strong>。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/shipments" className="rounded-md bg-neon px-4 py-2 text-sm font-bold text-black hover:bg-neon-dim">
            研究ツリーを開く
          </Link>
          <Link to="/calculator" className="rounded-md border border-line px-4 py-2 text-sm hover:border-neon">
            費用を計算する
          </Link>
        </div>
        <ProgressBar className="mt-5 max-w-sm" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MAIN.map((m) => (
          <Link key={m.to} to={m.to} className="group rounded-xl border border-line bg-bg-panel p-4 transition-colors hover:border-neon">
            <m.icon className="text-neon" size={22} />
            <h2 className="mt-2 font-bold group-hover:text-neon">{m.title}</h2>
            <p className="mt-0.5 text-sm text-muted">{m.desc}</p>
          </Link>
        ))}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-muted">準備中のコンテンツ</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {COMING.map((c) => (
            <div key={c.title} className="rounded-xl border border-dashed border-line p-4 opacity-70">
              <c.icon size={20} className="text-muted" />
              <h3 className="mt-2 font-bold">{c.title}</h3>
              <p className="text-xs text-muted">{c.desc}</p>
              <span className="mt-2 inline-block rounded bg-bg-card px-1.5 text-[10px] text-muted">準備中</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex gap-3 rounded-xl border border-line bg-bg-panel p-4 text-sm">
        <Info size={18} className="mt-0.5 shrink-0 text-sky-300" />
        <div className="space-y-1">
          <p>
            <strong>データについて：</strong>研究データはゲームファイルから抽出された外部データ（{dataset.source.name}、ツリー build {dataset.source.treeBuild}）を元にしています。
            ゲーム内での個別確認は未実施のため、全項目のステータスは「出典あり」です。購入価格が載っていない項目は「未確認」と表示しています。
          </p>
          <Link to="/about" className="text-neon hover:underline">
            収録範囲と未確認データの一覧 →
          </Link>
        </div>
      </section>
    </div>
  );
}
