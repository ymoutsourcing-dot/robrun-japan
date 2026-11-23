import { Link } from "react-router-dom";
import { BookOpen, Map as MapIcon } from "lucide-react";
import { ALL_GUIDES, mapGuideById, type Guide } from "../lib/guides";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

function GuideCard({ g, map }: { g: Guide; map?: boolean }) {
  const Icon = map ? MapIcon : BookOpen;
  return (
    <Link to={`/guides/${g.id}`} className="group rounded-xl border border-line bg-bg-panel p-4 hover:border-neon">
      <Icon size={20} className="text-neon" />
      <h2 className="mt-2 font-bold group-hover:text-neon">{g.title}</h2>
      <p className="font-mono text-xs text-gray-300">{g.titleEn}</p>
      <p className="mt-1 text-sm text-muted">{g.summary}</p>
    </Link>
  );
}

export default function GuidesPage() {
  useDocumentTitle("攻略ガイド", "ROB RUN の日本語攻略ガイド。金策の比較、ワイプまでの動き方、服役年数、警察・賄賂、マップ（Looty Bay・モーテル・刑務所・販売センター・集落）を出典付きで解説。");
  const topics = ALL_GUIDES.filter((g) => !mapGuideById.has(g.id));
  const maps = ALL_GUIDES.filter((g) => mapGuideById.has(g.id));
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:px-4">
      <h1 className="text-2xl font-bold">攻略ガイド</h1>
      <p className="text-sm text-muted">
        各項目に出典を付けています。<span className="text-neon">公式</span>＝Kefirの公式情報、<span className="text-sky-300">ファン情報</span>
        ＝攻略サイト・ゲーム設定値など（公式未確認）、<span className="text-money">算出</span>＝出典をもとに本サイトが計算したもの。
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {topics.map((g) => (
          <GuideCard key={g.id} g={g} />
        ))}
      </div>
      <h2 className="pt-2 text-xl font-bold">マップ解説</h2>
      <p className="text-sm text-muted">場所ごとに、できること・行き方・危険・コツをまとめています。</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {maps.map((g) => (
          <GuideCard key={g.id} g={g} map />
        ))}
      </div>
    </div>
  );
}
