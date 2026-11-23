import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { GUIDES } from "../lib/guides";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function GuidesPage() {
  useDocumentTitle("攻略ガイド", "ROB RUN の日本語攻略ガイド。服役年数（ジェイルタイム）の貯め方など、出典付きで解説。");
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:px-4">
      <h1 className="text-2xl font-bold">攻略ガイド</h1>
      <p className="text-sm text-muted">
        各項目に出典を付けています。<span className="text-neon">公式</span>＝Kefirの公式情報、<span className="text-sky-300">ファン情報</span>
        ＝攻略サイト・ゲーム設定値など（公式未確認）、<span className="text-money">算出</span>＝出典をもとに本サイトが計算したもの。
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {GUIDES.map((g) =>
          g.ready ? (
            <Link key={g.id} to={`/guides/${g.id}`} className="group rounded-xl border border-line bg-bg-panel p-4 hover:border-neon">
              <BookOpen size={20} className="text-neon" />
              <h2 className="mt-2 font-bold group-hover:text-neon">{g.title}</h2>
              <p className="mt-1 text-sm text-muted">{g.summary}</p>
            </Link>
          ) : (
            <div key={g.id} className="rounded-xl border border-dashed border-line p-4 opacity-70">
              <BookOpen size={20} className="text-muted" />
              <h2 className="mt-2 font-bold">{g.title}</h2>
              <p className="mt-1 text-sm text-muted">{g.summary}</p>
              <span className="mt-2 inline-block rounded bg-bg-card px-1.5 text-[10px] text-muted">準備中</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
