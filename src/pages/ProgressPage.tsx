import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Upload, RotateCcw } from "lucide-react";
import { categories, displayNameJa, getItem, items } from "../lib/data";
import { exportProgress, useProgress } from "../store/progress";
import { CategoryIcon, Section } from "../components/ui";
import { ProgressBar } from "../components/ProgressBar";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function ProgressPage() {
  useDocumentTitle("研究進捗の管理");
  const researched = useProgress((s) => s.researched);
  const favorite = useProgress((s) => s.favorite);
  const planned = useProgress((s) => s.planned);
  const importData = useProgress((s) => s.importData);
  const reset = useProgress((s) => s.reset);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([exportProgress()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `robrun-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const r = importData(JSON.parse(await f.text()));
      setMsg(r.ok ? `読み込みました（研究済み ${r.count} 件）` : r.error);
    } catch {
      setMsg("JSONの読み込みに失敗しました");
    }
  };

  const List = ({ ids, empty }: { ids: string[]; empty: string }) =>
    ids.length ? (
      <ul className="flex flex-wrap gap-1.5">
        {ids.map((id) => {
          const it = getItem(id);
          return it ? (
            <li key={id}>
              <Link to={`/shipments/${id}`} className="inline-block rounded border border-line px-2 py-0.5 text-sm hover:border-neon">
                {displayNameJa(it)}
              </Link>
            </li>
          ) : null;
        })}
      </ul>
    ) : (
      <p className="text-sm text-muted">{empty}</p>
    );

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:px-4">
      <h1 className="text-2xl font-bold">研究進捗の管理</h1>
      <p className="text-sm text-muted">進捗はこのブラウザ（LocalStorage）にのみ保存されます。別の端末へ移すにはエクスポート／インポートを使ってください。</p>

      <Section title="全体の進捗">
        <ProgressBar />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {categories.map((c) => {
            const catItems = items.filter((i) => i.category === c.id);
            const done = catItems.filter((i) => researched.includes(i.id)).length;
            return (
              <div key={c.id} className="flex items-center gap-2 text-sm">
                <CategoryIcon id={c.id} />
                <span className="flex-1">{c.nameJa}</span>
                <span className="font-mono text-muted">
                  {done} / {catItems.length}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="次に研究予定">
        <List ids={planned} empty="まだありません。各アイテムの「次に研究予定」から追加できます。" />
        {planned.length > 0 && (
          <Link to={`/calculator?targets=${planned.join(",")}`} className="mt-3 inline-block text-sm text-neon hover:underline">
            予定の研究に必要な費用を計算 →
          </Link>
        )}
      </Section>
      <Section title="お気に入り">
        <List ids={favorite} empty="まだありません。" />
      </Section>

      <Section title="バックアップ">
        <div className="flex flex-wrap gap-2">
          <button onClick={download} className="inline-flex items-center gap-1 rounded-md border border-neon px-3 py-1.5 text-sm text-neon hover:bg-neon/10">
            <Download size={15} /> JSONでエクスポート
          </button>
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm hover:border-neon">
            <Upload size={15} /> JSONをインポート
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <button
            onClick={() => {
              if (confirm("研究済み・お気に入り・予定をすべてリセットします。よろしいですか？")) reset();
            }}
            className="inline-flex items-center gap-1 rounded-md border border-danger/60 px-3 py-1.5 text-sm text-danger hover:bg-danger/10"
          >
            <RotateCcw size={15} /> リセット
          </button>
        </div>
        {msg && <p className="mt-2 text-sm text-neon">{msg}</p>}
      </Section>
    </div>
  );
}
