import { dataset } from "../lib/data";
import { Section } from "../components/ui";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import changelog from "../../data/changelog.json";

interface Entry {
  date: string;
  type: "site" | "data" | "game";
  title: string;
  details?: string[];
}

const TYPE: Record<Entry["type"], { label: string; cls: string }> = {
  site: { label: "サイト", cls: "border-neon text-neon" },
  data: { label: "データ", cls: "border-sky-500 text-sky-300" },
  game: { label: "ゲーム", cls: "border-money text-money" },
};

export default function ChangelogPage() {
  useDocumentTitle("更新履歴");
  const entries = changelog as Entry[];
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-3 py-4 sm:px-4">
      <h1 className="text-2xl font-bold">更新履歴</h1>
      <p className="text-sm text-muted">
        現在のデータ: ツリー build {dataset.source.treeBuild}（取得日 {dataset.source.retrievedAt}）。ゲーム側のアップデートによる仕様変更は、確認でき次第ここに記録します。
      </p>
      <Section title="履歴">
        <ol className="space-y-4">
          {entries.map((e, i) => (
            <li key={i} className="border-l-2 border-line pl-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <time className="font-mono text-muted">{e.date}</time>
                <span className={`rounded border px-1.5 text-xs ${TYPE[e.type].cls}`}>{TYPE[e.type].label}</span>
                <span className="font-bold">{e.title}</span>
              </div>
              {e.details && (
                <ul className="mt-1 list-disc pl-5 text-sm text-muted">
                  {e.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
