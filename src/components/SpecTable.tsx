import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export interface SpecColumn<T> {
  key: string;
  label: string;
  /** 見出しの補足（単位・説明） */
  hint?: string;
  get: (row: T) => number | string | null;
  format?: (row: T) => React.ReactNode;
  /** 大きい方が良い / 小さい方が良い（最良値をハイライト・バー表示） */
  better?: "high" | "low";
  /** 数値をバーで表示する（0〜max） */
  bar?: boolean;
  /** 本サイトの算出値 */
  derived?: boolean;
  align?: "left" | "right" | "center";
}

interface Props<T> {
  rows: T[];
  columns: SpecColumn<T>[];
  rowKey: (row: T) => string;
  name: (row: T) => { ja: string; en: string; href?: string; sub?: React.ReactNode };
  defaultSort?: { key: string; dir: "asc" | "desc" };
  selected?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

/** 並び替え・最良値ハイライト付きのスペック表（名前列は横スクロール時も固定） */
export function SpecTable<T>({ rows, columns, rowKey, name, defaultSort, selected, onToggleSelect }: Props<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(defaultSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    return [...rows].sort((a, b) => {
      const va = col.get(a);
      const vb = col.get(b);
      if (va === null) return 1;
      if (vb === null) return -1;
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "ja");
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, columns, sort]);

  // 列ごとの最良値と最大値
  const stats = useMemo(() => {
    const m = new Map<string, { best: number | null; max: number }>();
    for (const c of columns) {
      const nums = rows.map((r) => c.get(r)).filter((v): v is number => typeof v === "number");
      m.set(c.key, {
        best: !c.better || !nums.length ? null : c.better === "high" ? Math.max(...nums) : Math.min(...nums),
        max: nums.length ? Math.max(...nums) : 0,
      });
    }
    return m;
  }, [rows, columns]);

  const clickSort = (key: string, better?: "high" | "low") =>
    setSort((cur) =>
      cur?.key === key ? { key, dir: cur.dir === "asc" ? "desc" : "asc" } : { key, dir: better === "low" ? "asc" : "desc" },
    );

  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead className="bg-bg-panel text-xs text-muted">
          <tr>
            <th className="sticky left-0 z-10 bg-bg-panel p-2 text-left">
              <button className="flex items-center gap-1 hover:text-white" onClick={() => setSort(null)}>
                名前
              </button>
            </th>
            {columns.map((c) => (
              <th key={c.key} className={`p-2 ${c.align === "left" ? "text-left" : c.align === "center" ? "text-center" : "text-right"}`}>
                <button
                  className={`inline-flex items-center gap-0.5 whitespace-nowrap hover:text-white ${sort?.key === c.key ? "text-neon" : ""}`}
                  onClick={() => clickSort(c.key, c.better)}
                  title={c.hint}
                >
                  {c.label}
                  {c.derived && <span className="text-[9px] text-money">算出</span>}
                  {sort?.key === c.key ? sort.dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} /> : <ArrowUpDown size={11} className="opacity-40" />}
                </button>
                {c.hint && <span className="block text-[10px] font-normal opacity-70">{c.hint}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60 bg-bg-card">
          {sorted.map((r) => {
            const id = rowKey(r);
            const n = name(r);
            const isSel = selected?.has(id);
            return (
              <tr key={id} className={`hover:bg-bg-hover ${isSel ? "bg-neon/5" : ""}`}>
                <td className={`sticky left-0 z-10 p-2 ${isSel ? "bg-[#1d2b22]" : "bg-bg-card"}`}>
                  <div className="flex items-center gap-2">
                    {onToggleSelect && (
                      <input
                        type="checkbox"
                        checked={!!isSel}
                        onChange={() => onToggleSelect(id)}
                        aria-label={`${n.ja}を比較に追加`}
                        className="accent-[#5cff8a]"
                      />
                    )}
                    <div className="min-w-[8.5rem] max-w-[11rem]">
                      {n.href ? (
                        <Link to={n.href} className="block truncate font-bold hover:underline">
                          {n.ja}
                        </Link>
                      ) : (
                        <span className="block truncate font-bold">{n.ja}</span>
                      )}
                      {n.en !== n.ja && <span className="block truncate font-mono text-[11px] text-gray-300">{n.en}</span>}
                      {n.sub}
                    </div>
                  </div>
                </td>
                {columns.map((c) => {
                  const v = c.get(r);
                  const st = stats.get(c.key)!;
                  const isBest = st.best !== null && v === st.best;
                  return (
                    <td
                      key={c.key}
                      className={`whitespace-nowrap p-2 font-mono ${c.align === "left" ? "text-left" : c.align === "center" ? "text-center" : "text-right"} ${
                        isBest ? "text-neon" : ""
                      }`}
                    >
                      {c.format ? c.format(r) : v === null ? <span className="text-muted">未確認</span> : v}
                      {c.bar && typeof v === "number" && st.max > 0 && (
                        <span className="mt-0.5 block h-1 w-16 overflow-hidden rounded bg-bg sm:ml-auto">
                          <span className={`block h-full ${isBest ? "bg-neon" : "bg-gray-500"}`} style={{ width: `${(v / st.max) * 100}%` }} />
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && <p className="p-6 text-center text-muted">該当なし</p>}
    </div>
  );
}
