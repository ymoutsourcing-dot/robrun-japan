import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Info, Search } from "lucide-react";
import json from "../../data/source/collections.source.json";
import { money, RARITY_COLOR, RARITY_JA } from "../lib/format";
import { displayNameJa, getItem } from "../lib/data";
import { Section } from "../components/ui";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

interface Ingredient {
  id: string;
  nameEn: string;
  nameJa: string | null;
  rarity: string;
  qty: number;
  sale: number | null;
}
interface Collection {
  id: string;
  crateId: string;
  crateEn: string;
  crateRarity: string;
  crateValue: number;
  requires: string[];
  ingredients: Ingredient[];
}

const data = json as unknown as { source: { name: string; url: string; retrievedAt: string }; collections: Collection[] };
const cap = (r: string) => r.charAt(0).toUpperCase() + r.slice(1);
const CRATE_JA: Record<string, string> = {
  "Collection Crate": "コレクションの木箱",
  "Rare Collection Crate": "レアコレクションの木箱",
  "Unique Collection Crate": "ユニークコレクションの木箱",
};

function Rarity({ r }: { r: string }) {
  const k = cap(r);
  return <span className={`shrink-0 rounded border px-1 text-[11px] ${RARITY_COLOR[k] ?? ""}`}>{RARITY_JA[k] ?? r}</span>;
}

function Card({ c }: { c: Collection }) {
  const known = c.ingredients.every((x) => x.sale != null);
  const cost = c.ingredients.reduce((s, x) => s + (x.sale ?? 0) * x.qty, 0);
  return (
    <li className="rounded-lg border border-line bg-bg-card p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Rarity r={c.crateRarity} />
        <span className="font-bold">{CRATE_JA[c.crateEn] ?? c.crateEn}</span>
        <span className="font-mono text-[11px] text-gray-400">{c.crateEn}・{c.id}</span>
        <span className="ml-auto font-mono text-money">{money(c.crateValue)}</span>
      </div>
      {c.requires.length > 0 && (
        <p className="mb-2 text-xs text-danger">
          必要な研究：
          {c.requires.map((r) => {
            const it = getItem(r);
            return (
              <Link key={r} to={`/shipments/${r}`} className="ml-1 underline">
                {it ? displayNameJa(it) : r}
              </Link>
            );
          })}
        </p>
      )}
      <ul className="space-y-0.5 text-sm">
        {c.ingredients.map((x) => (
          <li key={x.id} className="flex items-center gap-2">
            <Rarity r={x.rarity} />
            <span className="min-w-0 flex-1 truncate">
              {x.nameJa ? (
                <>
                  {x.nameJa} <span className="font-mono text-[11px] text-gray-400">{x.nameEn}</span>
                </>
              ) : (
                <span className="font-mono">{x.nameEn}</span>
              )}
            </span>
            <span className="font-mono">×{x.qty}</span>
            <span className="w-16 text-right font-mono text-xs text-muted">{x.sale != null ? money(x.sale) : "未確認"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-right text-xs text-muted">
        材料をそのまま売った場合：{known ? <span className="font-mono text-white">{money(cost)}</span> : "一部未確認"}
      </p>
    </li>
  );
}

export default function CollectionsPage() {
  useDocumentTitle("コレクション レシピ一覧", "ROB RUN のコレクションテーブルで作れるコレクション箱 全34レシピ。必要な材料と個数、箱の価値、必要な研究。");
  const [q, setQ] = useState("");
  const [crate, setCrate] = useState("all");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...data.collections].sort((a, b) => Number(a.id.split("_")[1]) - Number(b.id.split("_")[1])).filter(
      (c) =>
        (crate === "all" || c.crateEn === crate) &&
        (!s || c.ingredients.some((x) => x.nameEn.toLowerCase().includes(s) || (x.nameJa ?? "").includes(q.trim()))),
    );
  }, [q, crate]);
  const crates = [...new Set(data.collections.map((c) => c.crateEn))];

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-3 py-4 sm:px-4">
      <div>
        <h1 className="text-2xl font-bold">コレクション レシピ一覧</h1>
        <div className="mt-2 flex gap-2 rounded-lg border border-sky-700/60 bg-sky-900/20 p-3 text-sm">
          <Info size={18} className="mt-0.5 shrink-0 text-sky-300" />
          <div className="space-y-1">
            <p>
              <Link to="/shipments/collection_table" className="underline">コレクションテーブル</Link>
              に指定の品物を集めて入れると、コレクション箱（積荷）になる。箱は材料をばらで売るよりずっと高い。
            </p>
            <p className="text-xs text-muted">
              どのレシピが出るかは、空いているスロットと進行状況で決まる（ゲームデータの注記）。日本語名がない品物は英語名のみ表示。材料の売値は小ネタページの強盗スポット表にある品物だけ表示（悪名ボーナス前）。
            </p>
            <a href={data.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-300 hover:underline">
              出典：{data.source.name}（ゲームファイル由来・{data.source.retrievedAt}取得） <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="flex flex-1 items-center gap-2 rounded-md border border-line bg-bg-card px-2">
          <Search size={14} className="text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="材料で検索（例：Bottle、酒）" className="w-full bg-transparent py-1.5 text-sm outline-none" />
        </label>
        <select value={crate} onChange={(e) => setCrate(e.target.value)} className="rounded-md border border-line bg-bg-card px-2 text-sm">
          <option value="all">すべての箱（{data.collections.length}）</option>
          {crates.map((c) => (
            <option key={c} value={c}>
              {CRATE_JA[c] ?? c}（{data.collections.filter((x) => x.crateEn === c).length}）
            </option>
          ))}
        </select>
      </div>

      <Section title={`レシピ（${list.length}件）`}>
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((c) => (
            <Card key={c.id} c={c} />
          ))}
        </ul>
      </Section>
    </div>
  );
}
