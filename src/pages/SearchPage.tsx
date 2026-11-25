import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { KIND_ORDER, search, type SearchDoc } from "../lib/search";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const PER_KIND = 30;

export default function SearchPage() {
  useDocumentTitle("サイト内検索", "ROB RUN JAPAN のすべてのページ（研究・装備・道具・積荷・コレクション・小ネタ・攻略）から検索。");
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const results = useMemo(() => search(q), [q]);
  const groups = useMemo(() => {
    const m = new Map<string, SearchDoc[]>();
    for (const r of results) m.set(r.kind, [...(m.get(r.kind) ?? []), r]);
    return KIND_ORDER.filter((k) => m.has(k)).map((k) => [k, m.get(k)!] as const);
  }, [results]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:px-4">
      <h1 className="text-2xl font-bold">サイト内検索</h1>
      <label className="flex items-center gap-2 rounded-md border border-neon/60 bg-bg-card px-3">
        <Search size={16} className="text-neon" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
          placeholder="例：宝くじ、Lottery、税、ドリル、Highlands"
          className="w-full bg-transparent py-2 text-base outline-none"
        />
      </label>
      <p className="text-xs text-muted">
        研究・装備・道具・積荷・コレクション・小ネタ・攻略のすべてから探します。日本語・英語どちらでも可。スペースで区切ると「すべて含む」で絞り込み。
      </p>
      {q.trim() && (
        <p className="text-sm">
          「{q}」の検索結果：<span className="font-mono text-neon">{results.length}</span> 件{results.length >= 300 && "（上位300件）"}
        </p>
      )}
      {q.trim() && results.length === 0 && <p className="text-sm text-muted">見つかりませんでした。英語名や別の言い方でも試してください。</p>}
      {groups.map(([kind, list]) => (
        <section key={kind} className="rounded-xl border border-line bg-bg-panel p-3">
          <h2 className="mb-2 text-sm font-bold text-neon">
            {kind} <span className="font-mono text-xs text-muted">{list.length}件</span>
          </h2>
          <ul className="divide-y divide-line/60">
            {list.slice(0, PER_KIND).map((r, i) => (
              <li key={i}>
                <Link to={r.to} className="block px-1 py-1.5 hover:bg-bg-hover">
                  <span className="block text-sm font-bold">{r.title}</span>
                  {r.sub && <span className="block text-xs text-muted">{r.sub}</span>}
                </Link>
              </li>
            ))}
          </ul>
          {list.length > PER_KIND && <p className="mt-1 text-xs text-muted">ほか {list.length - PER_KIND} 件。言葉を足して絞り込んでください。</p>}
        </section>
      ))}
    </div>
  );
}
