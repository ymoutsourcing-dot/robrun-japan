import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ReactFlow, Background, Controls, MiniMap, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GitBranch, List, Search, X, CheckCircle2, Circle, Gamepad2, LayoutGrid, Lock } from "lucide-react";
import type { CategoryId, ShipmentItem } from "../types/shipment";
import { ancestorsOf, categories, categoryName, displayNameEn, displayNameJa, getItem, items, matchesQuery } from "../lib/data";
import { layoutTree, NODE_W, treeOrder } from "../lib/treeLayout";
import { GAME_NODE_H, GAME_NODE_W, layoutGame } from "../lib/gameLayout";
import { money } from "../lib/format";
import { useProgress } from "../store/progress";
import { ShipmentNode, type ShipmentFlowNode } from "../components/ShipmentNode";
import {
  CenterLineNode,
  GameItemNode,
  GamePhotoNode,
  GameStepEdge,
  LennyNode,
  type CenterLineFlowNode,
  type GameItemFlowNode,
  type GamePhotoFlowNode,
  type GameStepEdgeType,
  type LennyFlowNode,
} from "../components/GameTreeNodes";
import { ItemDetail } from "../components/ItemDetail";
import { CategoryIcon, ItemIcon, TierBadge } from "../components/ui";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { ProgressBar } from "../components/ProgressBar";

type HeaderNode = Node<{ category: CategoryId; count: number }, "header">;

function HeaderNodeView({ data }: NodeProps<HeaderNode>) {
  return (
    <div className="flex items-center gap-2 text-lg font-bold" style={{ width: NODE_W * 2 }}>
      <CategoryIcon id={data.category} size={20} />
      {categoryName(data.category)}
      <span className="text-sm font-normal text-muted">{data.count} 件</span>
    </div>
  );
}

const nodeTypes = {
  shipment: ShipmentNode,
  header: HeaderNodeView,
  gameItem: GameItemNode,
  gamePhoto: GamePhotoNode,
  lenny: LennyNode,
  centerLine: CenterLineNode,
};
const edgeTypes = { gameStep: GameStepEdge };

type TreeLayoutMode = "standard" | "game";
type AnyFlowNode = ShipmentFlowNode | HeaderNode | GameItemFlowNode | GamePhotoFlowNode | LennyFlowNode | CenterLineFlowNode;

type StatusFilter = "all" | "todo" | "done";

const isNarrow = () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

export default function TreePage() {
  useDocumentTitle("Shipments研究ツリー（日本語）", "ROB RUN の Shipments（研究ツリー）全172項目を日本語で表示。研究費・必要地区レベル・前提研究を確認できます。");
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("item");
  const selected = selectedId ? getItem(selectedId) : undefined;
  // ゲーム風レイアウトが既定。?layout=standard で標準レイアウト
  const mode: TreeLayoutMode = params.get("layout") === "standard" ? "standard" : "game";
  // スマホはリスト表示が既定（レイアウトを明示した場合はツリー）
  const [view, setView] = useState<"tree" | "list">(() =>
    params.get("view") === "list" || (isNarrow() && !params.get("layout")) ? "list" : "tree",
  );
  const setMode = (m: TreeLayoutMode) => {
    const next = new URLSearchParams(params);
    if (m === "standard") next.set("layout", "standard");
    else next.delete("layout");
    setParams(next, { replace: true });
    setView("tree");
  };
  const [cats, setCats] = useState<CategoryId[]>(() => {
    const c = params.get("cat");
    return c ? (c.split(",") as CategoryId[]) : categories.map((c) => c.id);
  });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const researched = useProgress((s) => s.researched);
  const researchedSet = useMemo(() => new Set(researched), [researched]);

  const select = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(params);
      if (id) next.set("item", id);
      else next.delete("item");
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const pathSet = useMemo(() => new Set(selected ? [...ancestorsOf(selected.id), selected.id] : []), [selected]);

  const isMatch = useCallback(
    (it: ShipmentItem) => {
      if (!matchesQuery(it, query)) return false;
      if (status === "todo" && researchedSet.has(it.id)) return false;
      if (status === "done" && !researchedSet.has(it.id)) return false;
      return true;
    },
    [query, status, researchedSet],
  );

  const layout = useMemo(() => layoutTree(cats), [cats]);
  const game = useMemo(() => (mode === "game" ? layoutGame(cats) : null), [mode, cats]);

  const flowNodes = useMemo<AnyFlowNode[]>(() => {
    const filtering = query !== "" || status !== "all";
    const itemData = (item: ShipmentItem) => ({
      item,
      dimmed: filtering && !isMatch(item),
      highlighted: pathSet.has(item.id) && item.id !== selectedId,
    });
    if (game) {
      const decor = { selectable: false, draggable: false, focusable: false } as const;
      return [
        {
          id: "center-line",
          type: "centerLine",
          position: { x: game.line.x1, y: -1.5 },
          data: { width: game.line.x2 - game.line.x1 },
          zIndex: -1,
          ...decor,
        } satisfies CenterLineFlowNode,
        { id: "lenny", type: "lenny", position: game.lenny, data: { decorative: true }, ...decor } satisfies LennyFlowNode,
        ...game.photos.map<GamePhotoFlowNode>((p) => ({
          id: `photo-${p.category}`,
          type: "gamePhoto",
          position: { x: p.x, y: p.y },
          data: { category: p.category, direction: p.direction, count: p.count },
          ...decor,
        })),
        ...game.nodes.map<GameItemFlowNode>((n) => ({
          id: n.item.id,
          type: "gameItem",
          position: { x: n.x, y: n.y },
          data: itemData(n.item),
          selected: n.item.id === selectedId,
          draggable: false,
        })),
      ];
    }
    return [
      ...layout.headers.map<HeaderNode>((h) => ({
        id: `header-${h.category}`,
        type: "header",
        position: { x: h.x, y: h.y },
        data: { category: h.category, count: h.count },
        selectable: false,
        draggable: false,
      })),
      ...layout.nodes.map<ShipmentFlowNode>((n) => ({
        id: n.item.id,
        type: "shipment",
        position: { x: n.x, y: n.y },
        data: itemData(n.item),
        selected: n.item.id === selectedId,
        draggable: false,
      })),
    ];
  }, [layout, game, isMatch, pathSet, selectedId, query, status]);

  const edges = useMemo<Edge[]>(() => {
    const edgeStyle = (onPath: boolean, done: boolean, base: string) => ({
      stroke: onPath ? "#ffd84d" : done ? "#5cff8a" : base,
      strokeWidth: onPath ? 3 : 1.5,
    });
    if (game) {
      // ゲーム風: カテゴリー写真 → ルート、親 → 子 を直角の線で結ぶ
      const visible = new Set(game.nodes.map((n) => n.item.id));
      const out: GameStepEdgeType[] = [];
      for (const n of game.nodes) {
        const up = n.direction === "up";
        const parents = n.item.prerequisites.filter((p) => visible.has(p));
        const sameCat = n.item.prerequisites.some((p) => getItem(p)?.category === n.item.category);
        const sources = sameCat ? parents : [`photo-${n.item.category}`];
        for (const p of sources) {
          const onPath = pathSet.has(n.item.id) && (pathSet.has(p) || p.startsWith("photo-"));
          const done = researchedSet.has(p) && researchedSet.has(n.item.id);
          out.push({
            id: `${p}->${n.item.id}`,
            source: p,
            target: n.item.id,
            sourceHandle: up ? "st" : "sb",
            targetHandle: up ? "tb" : "tt",
            type: "gameStep",
            data: { direction: n.direction },
            zIndex: onPath ? 1 : 0,
            style: edgeStyle(onPath, done, "#8c949e"),
          });
        }
      }
      return out;
    }
    const visible = new Set(layout.nodes.map((n) => n.item.id));
    const out: Edge[] = [];
    for (const n of layout.nodes)
      for (const p of n.item.prerequisites) {
        if (!visible.has(p)) continue;
        const onPath = pathSet.has(p) && pathSet.has(n.item.id);
        const done = researchedSet.has(p) && researchedSet.has(n.item.id);
        out.push({
          id: `${p}->${n.item.id}`,
          source: p,
          target: n.item.id,
          type: "smoothstep",
          animated: onPath,
          style: edgeStyle(onPath, done, "#4a525c"),
        });
      }
    return out;
  }, [layout, game, pathSet, researchedSet]);

  const toggleCat = (id: CategoryId) =>
    setCats((cur) => (cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]));

  // Esc で詳細を閉じる
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && select(null);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [select]);

  return (
    <div className="flex h-[calc(100dvh-56px)] flex-col">
      {/* ツールバー */}
      <div className="space-y-2 border-b border-line bg-bg-panel px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={15} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="日本語・英語で検索（例: ターボ, turbo）"
              className="w-full rounded-md border border-line bg-bg py-1.5 pl-7 pr-7 text-sm outline-none focus:border-neon"
            />
            {query && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted" onClick={() => setQuery("")} aria-label="クリア">
                <X size={14} />
              </button>
            )}
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="rounded-md border border-line bg-bg px-2 py-1.5 text-sm"
            aria-label="研究状態"
          >
            <option value="all">すべて</option>
            <option value="todo">未研究のみ</option>
            <option value="done">研究済みのみ</option>
          </select>
          <div className="flex overflow-hidden rounded-md border border-line text-sm">
            <button
              className={`flex items-center gap-1 px-2 py-1.5 ${view === "tree" ? "bg-neon/15 text-neon" : "text-muted"}`}
              onClick={() => setView("tree")}
            >
              <GitBranch size={14} />
              ツリー
            </button>
            <button
              className={`flex items-center gap-1 px-2 py-1.5 ${view === "list" ? "bg-neon/15 text-neon" : "text-muted"}`}
              onClick={() => setView("list")}
            >
              <List size={14} />
              リスト
            </button>
          </div>
          <div className="flex overflow-hidden rounded-md border border-line text-sm" role="group" aria-label="ツリーの配置">
            <button
              className={`flex items-center gap-1 px-2 py-1.5 ${view === "tree" && mode === "standard" ? "bg-neon/15 text-neon" : "text-muted"}`}
              onClick={() => setMode("standard")}
              aria-pressed={mode === "standard"}
              title="カテゴリーごとに左→右で並べた標準の配置"
            >
              <LayoutGrid size={14} />
              標準
            </button>
            <button
              className={`flex items-center gap-1 px-2 py-1.5 ${view === "tree" && mode === "game" ? "bg-neon/15 text-neon" : "text-muted"}`}
              onClick={() => setMode("game")}
              aria-pressed={mode === "game"}
              title="ゲーム内の研究ツリーに近い配置"
            >
              <Gamepad2 size={14} />
              ゲーム風
            </button>
          </div>
          <ProgressBar className="w-full sm:w-56" />
        </div>
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
          <button
            className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-xs text-muted"
            onClick={() => setCats(cats.length === categories.length ? [] : categories.map((c) => c.id))}
          >
            {cats.length === categories.length ? "全解除" : "全選択"}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleCat(c.id)}
              className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${
                cats.includes(c.id) ? "border-neon/70 bg-neon/10 text-white" : "border-line text-muted"
              }`}
            >
              <CategoryIcon id={c.id} size={12} />
              {c.nameJa}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          {view === "tree" ? (
            <ReactFlow
              nodes={flowNodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodeClick={(_, n) => (n.type === "shipment" || n.type === "gameItem") && select(n.id)}
              onPaneClick={() => select(null)}
              nodesDraggable={false}
              nodesConnectable={false}
              key={`${mode}:${cats.join(",")}`}
              onInit={(inst) => {
                if (game) {
                  // ゲーム風: 選択中のアイテム、なければツリー全体を表示
                  const target = selectedId ? game.nodes.find((n) => n.item.id === selectedId) : undefined;
                  if (target) inst.setCenter(target.x + GAME_NODE_W / 2, target.y + GAME_NODE_H / 2, { zoom: 0.9 });
                  else {
                    // 一部のカテゴリーだけ表示中は装飾（中央線・Lenny）を除いて表示中の木に合わせる
                    const all = cats.length === categories.length;
                    const fit = flowNodes.filter((n) => n.type !== "centerLine" && (all || n.type !== "lenny"));
                    inst.fitView({ padding: { top: "16px", bottom: "16px", left: "56px", right: "16px" }, nodes: fit.map((n) => ({ id: n.id })) });
                  }
                  return;
                }
                // 初期表示: 選択中のアイテム、なければ先頭カテゴリーにズーム（全体は左下の ⛶ ボタン）
                const target = selectedId ? layout.nodes.find((n) => n.item.id === selectedId) : undefined;
                if (target) {
                  inst.setCenter(target.x + NODE_W / 2, target.y, { zoom: 0.9 });
                } else {
                  const first = layout.headers[0];
                  const ids = layout.nodes.filter((n) => n.item.category === first?.category).map((n) => ({ id: n.item.id }));
                  inst.fitView({ nodes: ids, padding: 0.08, maxZoom: 0.9, minZoom: 0.45 });
                }
              }}
              minZoom={0.08}
              maxZoom={2}
              forceColorMode="dark"
              proOptions={{ hideAttribution: false }}
            >
              <Background color="#2a2f36" gap={24} />
              <Controls showInteractive={false} />
              {/* ゲーム風は全体表示が既定なのでミニマップは出さない（右下の項目に重なるため） */}
              {!game && <MiniMap pannable zoomable className="!hidden md:!block" nodeColor={(n) => (researchedSet.has(n.id) ? "#5cff8a" : "#4a525c")} maskColor="rgba(18,20,22,0.7)" />}
            </ReactFlow>
          ) : (
            <ListView cats={cats} isMatch={isMatch} onSelect={select} selectedId={selectedId} />
          )}
        </div>

        {selected && (
          <aside
            className="absolute inset-0 z-20 overflow-y-auto border-l border-line bg-bg-panel p-4 md:static md:w-[420px] md:shrink-0"
            aria-label="アイテム詳細"
          >
            <div className="mb-2 flex justify-end">
              <button onClick={() => select(null)} className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-white">
                <X size={14} /> 閉じる
              </button>
            </div>
            <ItemDetail item={selected} onSelect={select} />
          </aside>
        )}
      </div>
    </div>
  );
}

function ListView({
  cats,
  isMatch,
  onSelect,
  selectedId,
}: {
  cats: CategoryId[];
  isMatch: (it: ShipmentItem) => boolean;
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const researched = useProgress((s) => s.researched);
  const toggle = useProgress((s) => s.toggle);
  const jailYears = useProgress((s) => s.jailYears);
  return (
    <div className="h-full overflow-y-auto px-2 py-3 sm:px-4">
      {categories
        .filter((c) => cats.includes(c.id))
        .map((c) => {
          // 親→子の順（インデントで階層を表現）
          const list = treeOrder(c.id).filter((n) => isMatch(n.item));
          if (!list.length) return null;
          return (
            <section key={c.id} className="mb-5">
              <h2 className="mb-1.5 flex items-center gap-2 px-1 font-bold">
                <CategoryIcon id={c.id} />
                {c.nameJa}
                <span className="text-xs font-normal text-muted">{list.length} 件</span>
              </h2>
              <ul className="divide-y divide-line/60 rounded-lg border border-line bg-bg-card">
                {list.map(({ item: it, depth }) => {
                  const done = researched.includes(it.id);
                  return (
                    <li key={it.id} className={`flex items-center gap-2 py-2 pr-2 ${selectedId === it.id ? "bg-neon/10" : ""}`} style={{ paddingLeft: 8 + Math.min(depth, 6) * 14 }}>
                      <button
                        onClick={() => toggle("researched", it.id)}
                        aria-label={done ? "研究済みを解除" : "研究済みにする"}
                        className="p-1"
                      >
                        {done ? <CheckCircle2 size={20} className="text-neon" /> : <Circle size={20} className="text-muted" />}
                      </button>
                      <button onClick={() => onSelect(it.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                        <ItemIcon item={it} size={16} />
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-sm font-bold ${done ? "text-neon" : ""}`}>{displayNameJa(it)}</span>
                          <span className="block truncate font-mono text-[11px] text-gray-300">{displayNameEn(it)}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-0.5">
                          <span className="font-mono text-xs text-money">{money(it.researchCost)}</span>
                          <span className="flex items-center gap-1">
                            {it.requiredImprisonmentYears > 0 && (
                              <span
                                className={`inline-flex items-center gap-0.5 rounded border px-1 font-mono text-[10px] leading-4 ${
                                  jailYears !== null && jailYears >= it.requiredImprisonmentYears ? "border-neon/60 text-neon" : "border-danger/60 text-danger"
                                }`}
                                title={`服役${it.requiredImprisonmentYears}年以上でアンロック`}
                              >
                                <Lock size={10} />
                                服役{it.requiredImprisonmentYears}年
                              </span>
                            )}
                            <TierBadge level={it.requiredSettlementLevel} />
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      {items.filter(isMatch).length === 0 && <p className="p-6 text-center text-muted">該当する研究がありません。</p>}
    </div>
  );
}
