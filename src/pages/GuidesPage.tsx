import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { ALL_GUIDES } from "../lib/guides";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function GuidesPage() {
  useDocumentTitle("攻略ガイド", "ROB RUN の日本語攻略ガイド。金策の比較、ワイプまでの動き方、服役年数、警察・賄賂を出典付きで解説。");
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:px-4">
      <h1 className="text-2xl font-bold">攻略ガイド</h1>
      <p className="text-sm text-muted">
        各項目に出典を付けています。<span className="text-neon">公式</span>＝Kefirの公式情報、<span className="text-sky-300">ファン情報</span>
        ＝攻略サイト・ゲーム設定値など（公式未確認）、<span className="text-money">算出</span>＝出典をもとに本サイトが計算したもの。
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {ALL_GUIDES.map((g) => (
          <Link key={g.id} to={`/guides/${g.id}`} className="group rounded-xl border border-line bg-bg-panel p-4 hover:border-neon">
            <BookOpen size={20} className="text-neon" />
            <h2 className="mt-2 font-bold group-hover:text-neon">{g.title}</h2>
            <p className="font-mono text-xs text-gray-300">{g.titleEn}</p>
            <p className="mt-1 text-sm text-muted">{g.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
