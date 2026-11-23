import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Ban, ChevronDown, Clock, ExternalLink, Search } from "lucide-react";
import { AccordionProvider, useAccordion } from "../components/Accordion";
import { KIND, SourceLegend, SourceTag } from "../components/GuideBody";
import { Section } from "../components/ui";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { displayNameEn, displayNameJa, getItem, normalize } from "../lib/data";
import { money, RARITY_COLOR, RARITY_JA } from "../lib/format";
import {
  DECODER_POWER,
  MAX_FUSE,
  TOOL_CATEGORIES,
  toolSources,
  toolsData,
  type BarterRecipe,
  type ToolCategory,
  type ToolEntry,
  type ToolFact,
} from "../lib/tools";

const CAT_CLS: Record<ToolCategory, string> = {
  デコーダー: "border-rare/70 text-rare",
  ドリル: "border-orange-500/70 text-orange-300",
  鍵: "border-money/70 text-money",
  カード: "border-sky-500/70 text-sky-300",
  その他: "border-line text-gray-300",
};

/** エントリー内で使われた出典キー（出現順・重複なし） */
function entrySources(e: ToolEntry): string[] {
  const keys = [
    ...e.usageJa.flatMap((f) => f.sources),
    ...(e.time?.sources ?? []),
    ...(e.timeSources ?? []),
    ...(e.statsJa ?? []).flatMap((s) => s.sources),
    ...(e.table?.sources ?? []),
    ...e.obtainJa.flatMap((f) => f.sources),
    ...(e.barter ?? []).flatMap((b) => b.sources),
    ...(e.notes ?? []).flatMap((f) => f.sources),
    ...e.sources,
  ];
  return [...new Set(keys)];
}

const searchText = new Map(
  toolsData.entries.map((e) => [
    e.id,
    normalize(
      [
        e.nameJa,
        e.nameEn,
        e.categoryJa,
        ...e.gameIds,
        ...e.usageJa.map((f) => f.text),
        ...e.obtainJa.map((f) => f.text),
        ...(e.table?.rows.flat() ?? []),
        ...(e.barter ?? []).flatMap((b) => b.inputs.map((i) => `${i.nameJa} ${i.nameEn}`)),
      ].join(" "),
    ),
  ]),
);

/** 本文の行に付ける出典番号（色は出典の種類） */
function Refs({ keys, order, derived }: { keys: string[]; order: string[]; derived?: boolean }) {
  return (
    <span className="ml-1 inline-flex flex-wrap gap-0.5 align-middle">
      {derived && <span className={`rounded border px-1 text-[10px] leading-4 ${KIND.derived.cls}`}>算出</span>}
      {keys.map((k) => {
        const s = toolSources[k];
        const n = order.indexOf(k) + 1;
        return (
          <span
            key={k}
            title={s?.label ?? k}
            className={`rounded border px-1 font-mono text-[10px] leading-4 ${s ? KIND[s.kind].cls : "border-danger text-danger"}`}
          >
            {n || "?"}
          </span>
        );
      })}
    </span>
  );
}

function FactList({ facts, order }: { facts: ToolFact[]; order: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
      {facts.map((f) => (
        <li key={f.text}>
          {f.text}
          <Refs keys={f.sources} order={order} derived={f.derived} />
        </li>
      ))}
    </ul>
  );
}

function Rarity({ rarity }: { rarity?: string }) {
  if (!rarity) return null;
  return <span className={`rounded border px-1 text-[10px] leading-4 ${RARITY_COLOR[rarity] ?? ""}`}>{RARITY_JA[rarity] ?? rarity}</span>;
}

function TimeBadge({ e }: { e: ToolEntry }) {
  if (e.time)
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-neon/60 bg-neon/10 px-2 py-0.5 text-xs text-neon">
        <Clock size={12} />
        {e.time.text.replace(/（.*）$/, "")}
      </span>
    );
  if (e.timeNote)
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs text-muted">
        <Clock size={12} />
        時間 未確認
      </span>
    );
  return null;
}

function openTool(id: string, isOpen: (id: string) => boolean, toggle: (id: string) => void) {
  if (!isOpen(id)) toggle(id);
  requestAnimationFrame(() => document.getElementById(`tool-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
}

function Barter({ recipe, order }: { recipe: BarterRecipe; order: string[] }) {
  const { isOpen, toggle } = useAccordion();
  return (
    <div className={`rounded-lg border p-2.5 ${recipe.disabled ? "border-danger/50 bg-danger/5" : "border-line bg-bg-card"}`}>
      {recipe.disabled && (
        <p className="mb-1.5 inline-flex items-center gap-1 text-xs font-bold text-danger">
          <Ban size={12} /> 現在は交換できません
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        {recipe.inputs.map((i, idx) => {
          const label = i.cash ? (
            <span className="font-mono text-money">{money(i.qty)}</span>
          ) : (
            <>
              <span className="font-bold">{i.nameJa}</span>
              <span className="font-mono text-money">×{i.qty}</span>
            </>
          );
          return (
            <span key={idx} className="inline-flex items-center gap-1.5">
              {idx > 0 && <span className="text-muted">＋</span>}
              {i.shipmentId ? (
                <Link to={`/shipments/${i.shipmentId}`} className="rounded border border-line bg-bg px-1.5 py-0.5 hover:border-neon" title={`${i.nameEn}（Shipmentsの項目）`}>
                  {label}
                </Link>
              ) : i.toolId ? (
                <button
                  type="button"
                  onClick={() => openTool(i.toolId!, isOpen, toggle)}
                  className="rounded border border-line bg-bg px-1.5 py-0.5 hover:border-neon"
                  title={i.nameEn}
                >
                  {label}
                </button>
              ) : (
                <span className="rounded border border-line bg-bg px-1.5 py-0.5" title={i.nameEn}>
                  {label}
                </span>
              )}
            </span>
          );
        })}
        <ArrowRight size={16} className="text-neon" />
        <span className="rounded border border-neon/60 bg-neon/10 px-1.5 py-0.5 font-bold text-neon">
          {recipe.outputJa}
          {recipe.qty > 1 && <span className="font-mono"> ×{recipe.qty}</span>}
        </span>
        <Refs keys={recipe.sources} order={order} />
      </div>
      {recipe.noteJa && <p className="mt-1.5 text-xs text-muted">※{recipe.noteJa}</p>}
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1.5 text-xs font-bold tracking-wide text-neon">{children}</h3>;
}

function ToolPanel({ e }: { e: ToolEntry }) {
  const order = entrySources(e);
  const pages = e.gameIds.length <= 3 ? e.gameIds : [];
  return (
    <div className="space-y-4 border-t border-line px-3 py-3 sm:px-4">
      <div>
        <H>使用用途</H>
        <FactList facts={e.usageJa} order={order} />
      </div>

      {(e.time || e.timeNote) && (
        <div className={`flex gap-2 rounded-lg border p-2.5 ${e.time ? "border-neon/50 bg-neon/5" : "border-line bg-bg-card"}`}>
          <Clock size={18} className={`mt-0.5 shrink-0 ${e.time ? "text-neon" : "text-muted"}`} />
          <div>
            <p className="text-xs text-muted">かかる時間</p>
            {e.time ? (
              <p className="text-lg font-bold text-neon">
                {e.time.text}
                <Refs keys={e.time.sources} order={order} />
              </p>
            ) : (
              <p className="text-sm">
                {e.timeNote}
                {e.timeSources && <Refs keys={e.timeSources} order={order} />}
              </p>
            )}
          </div>
        </div>
      )}

      {e.barter && (
        <div>
          <H>物々交換（レニーのモーテルの怪しいドア）</H>
          <div className="space-y-2">
            {e.barter.map((b, i) => (
              <Barter key={i} recipe={b} order={order} />
            ))}
          </div>
        </div>
      )}

      <div>
        <H>入手方法</H>
        <FactList facts={e.obtainJa} order={order} />
      </div>

      {e.statsJa && (
        <div>
          <H>数値</H>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            {e.statsJa.map((s) => (
              <div key={s.label} className="flex items-baseline justify-between gap-2 border-b border-line/60 py-1">
                <dt className="text-muted">{s.label}</dt>
                <dd className="text-right font-mono">
                  {s.value}
                  <Refs keys={s.sources} order={order} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {e.table && (
        <div>
          <H>
            {e.table.title}
            <Refs keys={e.table.sources} order={order} />
          </H>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead className="bg-bg-card text-xs text-muted">
                <tr>
                  {e.table.columns.map((c) => (
                    <th key={c} className="px-2 py-1.5 text-left font-normal">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {e.table.rows.map((r, i) => (
                  <tr key={i} className="border-t border-line/60">
                    {r.map((c, j) => (
                      <td key={j} className={`px-2 py-1 ${c.startsWith("$") ? "font-mono text-money" : ""}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {e.notes && (
        <div>
          <H>補足・食い違い</H>
          <FactList facts={e.notes} order={order} />
        </div>
      )}

      {e.relatedShipments && (
        <div>
          <H>関連するShipmentsの項目</H>
          <div className="flex flex-wrap gap-1.5">
            {e.relatedShipments.map((id) => {
              const it = getItem(id);
              return (
                <Link key={id} to={`/shipments/${id}`} className="rounded-md border border-line bg-bg-card px-2 py-1 text-xs hover:border-neon">
                  {it ? displayNameJa(it) : id}
                  {it && <span className="ml-1 font-mono text-[10px] text-muted">{displayNameEn(it)}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-1.5 border-t border-line pt-3">
        <H>出典</H>
        <ol className="space-y-1">
          {order.map((k, i) => (
            <li key={k} className="flex gap-1.5">
              <span className="font-mono text-xs text-muted">{i + 1}.</span>
              {toolSources[k] ? <SourceTag source={toolSources[k]} /> : <span className="text-xs text-danger">出典不明: {k}</span>}
            </li>
          ))}
        </ol>
        {pages.length > 0 && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-muted">
            個別ページ：
            {pages.map((id) => (
              <span key={id} className="inline-flex gap-2">
                <a href={`https://robrun.info/items/${id}/`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline">
                  robrun.info <ExternalLink size={10} />
                </a>
                <a href={`https://robrunguide.app/en-US/items/${id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline">
                  Rob Run Guide <ExternalLink size={10} />
                </a>
                {pages.length > 1 && <span className="font-mono">({id})</span>}
              </span>
            ))}
          </p>
        )}
      </div>
    </div>
  );
}

function ToolRow({ e }: { e: ToolEntry }) {
  const { isOpen, toggle } = useAccordion();
  const open = isOpen(e.id);
  return (
    <article id={`tool-${e.id}`} className={`scroll-mt-16 rounded-xl border bg-bg-panel ${open ? "border-neon/60" : "border-line"}`}>
      <button type="button" onClick={() => toggle(e.id)} aria-expanded={open} className="group flex w-full items-center gap-2 px-3 py-2.5 text-left sm:px-4">
        <span className={`shrink-0 rounded border px-1.5 text-[11px] leading-5 ${CAT_CLS[e.categoryJa]}`}>{e.categoryJa}</span>
        <span className="min-w-0 flex-1">
          <span className={`block font-bold group-hover:text-neon ${open ? "text-neon" : ""}`}>{e.nameJa}</span>
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] text-gray-300">{e.nameEn}</span>
            <Rarity rarity={e.rarity} />
          </span>
        </span>
        <span className="hidden sm:inline-flex">
          <TimeBadge e={e} />
        </span>
        <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180 text-neon" : ""}`} />
      </button>
      <div className="px-3 pb-2 sm:hidden">
        <TimeBadge e={e} />
      </div>
      {!open && (
        <div className="px-3 pb-2.5 sm:px-4">
          <p className="line-clamp-2 text-xs text-muted">{e.usageJa[0]?.text}</p>
        </div>
      )}
      {open && <ToolPanel e={e} />}
    </article>
  );
}

function DecoderTable() {
  const b = toolsData.buildings;
  const need = (def: number, p: number) => Math.ceil(def / p);
  return (
    <Section title={b.title}>
      <p className="mb-2 text-xs text-muted">{b.noteJa}</p>
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-bg-card text-xs text-muted">
            <tr>
              <th rowSpan={2} className="px-2 py-1.5 text-left font-normal">
                建物
              </th>
              <th rowSpan={2} className="px-2 py-1.5 text-right font-normal">
                基本防御
              </th>
              <th rowSpan={2} className="px-2 py-1.5 text-right font-normal">
                ヒューズ枠
              </th>
              <th colSpan={3} className="border-l border-line px-2 py-1 text-center font-normal">
                ヒューズなし：必要数
              </th>
              <th colSpan={3} className="border-l border-line px-2 py-1 text-center font-normal">
                全枠レジェンダリー：必要数
              </th>
            </tr>
            <tr>
              {[0, 1].flatMap((g) =>
                DECODER_POWER.map((p, i) => (
                  <th key={`${g}-${p}`} className={`px-2 py-1 text-right font-normal ${i === 0 ? "border-l border-line" : ""}`}>
                    −{p}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((r) => {
              const it = r.shipmentId ? getItem(r.shipmentId) : undefined;
              const max = r.base + r.slots * MAX_FUSE;
              return (
                <tr key={r.shipmentId ?? r.nameEn} className="border-t border-line/60">
                  <td className="px-2 py-1">
                    {it ? (
                      <Link to={`/shipments/${it.id}`} className="hover:text-neon hover:underline">
                        {displayNameJa(it)}
                      </Link>
                    ) : (
                      <>
                        {r.nameJa}
                        {r.sources && (
                          <span className="ml-1 text-[10px] text-muted" title={r.sources.map((k) => toolSources[k]?.label).join(" / ")}>
                            ※robrunwiki.app のみ
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-2 py-1 text-right font-mono">{r.base}</td>
                  <td className="px-2 py-1 text-right font-mono">{r.slots}</td>
                  {DECODER_POWER.map((p, i) => (
                    <td key={`a${p}`} className={`px-2 py-1 text-right font-mono ${i === 0 ? "border-l border-line" : ""}`}>
                      {need(r.base, p)}
                    </td>
                  ))}
                  {DECODER_POWER.map((p, i) => (
                    <td key={`b${p}`} className={`px-2 py-1 text-right font-mono text-money ${i === 0 ? "border-l border-line" : ""}`} title={`最大防御 ${max}`}>
                      {need(max, p)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 space-y-1">
        {b.sources.map((k) => toolSources[k] && <SourceTag key={k} source={toolSources[k]} />)}
        <SourceTag source={toolSources["shipments-data"]} derived note="必要数は防御÷デコーダーの値を切り上げて本サイトが計算" />
      </div>
    </Section>
  );
}

function RelatedShipments() {
  return (
    <Section title="Shipmentsで研究・購入できる関連アイテム">
      <p className="mb-2 text-xs text-muted">以下はShipments（研究ツリー）の項目です。詳しい説明・研究費は各項目のページへ。</p>
      <ul className="space-y-2">
        {toolsData.relatedShipmentNotes.map((n) => {
          const it = getItem(n.id);
          return (
            <li key={n.id} className="text-sm">
              <Link to={`/shipments/${n.id}`} className="font-bold hover:text-neon hover:underline">
                {it ? displayNameJa(it) : n.id}
              </Link>
              {it && <span className="ml-1 font-mono text-[11px] text-gray-300">{displayNameEn(it)}</span>}
              <p className="text-muted">
                {n.noteJa}
                <span className="ml-1 inline-flex flex-wrap gap-0.5 align-middle">
                  {n.sources.map((k) => {
                    const s = toolSources[k];
                    const cls = `rounded border px-1 text-[10px] leading-4 ${s ? KIND[s.kind].cls : "border-danger text-danger"}`;
                    const short = s ? s.label.split(/[「（]/)[0].trim() : k;
                    return s && s.url.startsWith("/") ? (
                      <Link key={k} to={s.url} title={s.label} className={cls}>
                        {short}
                      </Link>
                    ) : (
                      <a key={k} href={s?.url} target="_blank" rel="noreferrer" title={s?.label} className={cls}>
                        {short}
                      </a>
                    );
                  })}
                </span>
              </p>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export default function ToolsPage() {
  useDocumentTitle(
    "道具・鍵（デコーダー・ドリル・鍵・IDカード）",
    "ROB RUN のShipments以外の道具・鍵の使い道と入手方法。デコーダーの設置時間、ドリル・ガラスカッター・IDカードの物々交換レシピ、金庫の鍵・部屋の鍵の場所（出典付き）。",
  );
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<ToolCategory | null>(null);
  const counts = useMemo(() => {
    const c = new Map<ToolCategory, number>();
    for (const e of toolsData.entries) c.set(e.categoryJa, (c.get(e.categoryJa) ?? 0) + 1);
    return c;
  }, []);
  const nq = normalize(q);
  const rows = toolsData.entries.filter((e) => (!cat || e.categoryJa === cat) && (!nq || searchText.get(e.id)!.includes(nq)));
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition-colors ${active ? "border-neon bg-neon/15 text-neon" : "border-line text-muted hover:text-white"}`;

  return (
    <AccordionProvider>
      <div className="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:px-4">
        <header>
          <h1 className="text-2xl font-bold">道具・鍵</h1>
          <p className="mt-1 text-sm text-muted">
            Shipments（研究ツリー）に無い道具・鍵・カードの使い道、かかる時間、入手方法（物々交換レシピ）のまとめ。行をタップで詳細を開きます。
            ロックピック・マスターキー・ミニドリルなどShipmentsの項目は
            <a href="#related-shipments" className="text-sky-300 hover:underline">
              ページ下部
            </a>
            から各項目へ。
          </p>
          <p className="mt-1 text-xs text-muted">最終更新: {toolsData.updatedAt}</p>
        </header>

        <div className="space-y-2">
          <label className="flex items-center gap-2 rounded-lg border border-line bg-bg-panel px-3 py-2 focus-within:border-neon">
            <Search size={16} className="text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="名前・用途・場所で検索（例：銀行、drill、ホテル）"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
              aria-label="道具を検索"
            />
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="カテゴリー">
            <button type="button" className={chip(cat === null)} onClick={() => setCat(null)} aria-pressed={cat === null}>
              すべて <span className="font-mono">{toolsData.entries.length}</span>
            </button>
            {TOOL_CATEGORIES.map((c) => (
              <button key={c} type="button" className={chip(cat === c)} onClick={() => setCat(cat === c ? null : c)} aria-pressed={cat === c}>
                {c} <span className="font-mono">{counts.get(c) ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {rows.map((e) => (
            <ToolRow key={e.id} e={e} />
          ))}
          {rows.length === 0 && <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">該当する道具がありません。</p>}
        </div>

        <SourceLegend />

        <DecoderTable />

        <div id="related-shipments" className="scroll-mt-16">
          <RelatedShipments />
        </div>

        <p className="text-xs text-muted">
          「未確認」は出典で確認できなかった項目です。数値はファンサイト（ゲームファイル抽出を含む）の情報で、サーバーやアップデートで変わることがあります。
        </p>
      </div>
    </AccordionProvider>
  );
}
