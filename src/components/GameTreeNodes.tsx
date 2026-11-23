import { memo } from "react";
import { BaseEdge, Handle, Position, type Edge, type EdgeProps, type Node, type NodeProps } from "@xyflow/react";
import { Bookmark, CheckCircle2, Lock, Star, UserRound } from "lucide-react";
import type { CategoryId } from "../types/shipment";
import { categoryName, displayNameEn, displayNameJa, toRoman, usageHint } from "../lib/data";
import { money } from "../lib/format";
import { useProgress } from "../store/progress";
import { CATEGORY_ACCENT, CategoryIcon, ItemIcon } from "./ui";
import { GAME_BUS, GAME_LENNY_H, GAME_LENNY_W, GAME_NODE_H, GAME_NODE_W, GAME_PHOTO_H, GAME_PHOTO_W, type GameDirection } from "../lib/gameLayout";
import type { ShipmentNodeData } from "./ShipmentNode";

const hiddenHandle = { opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0, border: 0 };

/** 上下どちらにも線をつなげるよう、上下にソース・ターゲットのハンドルを置く（id: st/sb = source top/bottom, tt/tb = target） */
function VerticalHandles({ source = true, target = true }: { source?: boolean; target?: boolean }) {
  return (
    <>
      {source && <Handle id="st" type="source" position={Position.Top} isConnectable={false} style={hiddenHandle} />}
      {source && <Handle id="sb" type="source" position={Position.Bottom} isConnectable={false} style={hiddenHandle} />}
      {target && <Handle id="tt" type="target" position={Position.Top} isConnectable={false} style={hiddenHandle} />}
      {target && <Handle id="tb" type="target" position={Position.Bottom} isConnectable={false} style={hiddenHandle} />}
    </>
  );
}

export type GameItemFlowNode = Node<ShipmentNodeData, "gameItem">;

/** ゲーム風の四角いアイテム（アイコン・地区レベル・名前・研究費） */
function GameItemNodeImpl({ data, selected }: NodeProps<GameItemFlowNode>) {
  const { item, dimmed, highlighted } = data;
  const done = useProgress((s) => s.researched.includes(item.id));
  const fav = useProgress((s) => s.favorite.includes(item.id));
  const planned = useProgress((s) => s.planned.includes(item.id));
  const border = selected
    ? "border-neon shadow-[0_0_0_3px_rgba(92,255,138,0.55)]"
    : highlighted
      ? "border-money shadow-[0_0_0_2px_rgba(255,216,77,0.45)]"
      : done
        ? "border-neon/70"
        : "border-[#4a525c]";
  const title = [
    `${displayNameJa(item)} / ${displayNameEn(item)}`,
    `研究費 ${money(item.researchCost)}`,
    item.requiredSettlementLevel !== null ? `必要地区レベル ${item.requiredSettlementLevel}` : "",
    item.requiredImprisonmentYears > 0 ? `服役${item.requiredImprisonmentYears}年以上` : "",
    usageHint(item.id) ?? "",
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <div
      title={title}
      className={`relative flex flex-col items-center rounded-md border-2 px-1 pb-1 pt-1.5 text-center transition-opacity ${border} ${
        done ? "bg-[#1d2b22]" : "bg-[#2b3036]"
      } ${dimmed ? "opacity-20" : ""}`}
      style={{ width: GAME_NODE_W, height: GAME_NODE_H }}
    >
      <VerticalHandles />
      {item.requiredSettlementLevel !== null && (
        <span className="absolute left-1 top-0.5 font-mono text-[11px] font-bold leading-none text-white/90">
          {toRoman(item.requiredSettlementLevel)}
        </span>
      )}
      <span className="absolute right-1 top-0.5 flex items-center gap-0.5">
        {item.requiredImprisonmentYears > 0 && <Lock size={10} className="text-danger" aria-label="服役条件あり" />}
        {planned && <Bookmark size={10} className="text-sky-300" aria-label="研究予定" />}
        {fav && <Star size={10} className="fill-money text-money" aria-label="お気に入り" />}
        {done && <CheckCircle2 size={11} className="text-neon" aria-label="研究済み" />}
      </span>
      {item.icon ? (
        <img src={item.icon} alt="" loading="lazy" className="h-[50px] w-[50px] shrink-0 rounded object-cover" />
      ) : (
        <span className="flex h-[50px] items-center">
          <ItemIcon item={item} size={24} />
        </span>
      )}
      <span className="mt-0.5 line-clamp-2 text-[11px] font-bold leading-[13px]">{displayNameJa(item)}</span>
      <span className="mt-auto font-mono text-[10px] leading-3 text-money">{money(item.researchCost)}</span>
    </div>
  );
}
export const GameItemNode = memo(GameItemNodeImpl);

export type GamePhotoFlowNode = Node<{ category: CategoryId; direction: GameDirection; count: number }, "gamePhoto">;

/** 中央線上のカテゴリー写真（白枠の写真＋ラベル） */
function GamePhotoNodeImpl({ data }: NodeProps<GamePhotoFlowNode>) {
  const accent = CATEGORY_ACCENT[data.category];
  return (
    <div className="flex flex-col items-center" style={{ width: GAME_PHOTO_W, height: GAME_PHOTO_H }}>
      {data.direction === "up" ? (
        <Handle id="st" type="source" position={Position.Top} isConnectable={false} style={hiddenHandle} />
      ) : (
        <Handle id="sb" type="source" position={Position.Bottom} isConnectable={false} style={hiddenHandle} />
      )}
      <div
        className="flex w-full flex-1 items-center justify-center border-[5px] border-[#e8e8e8] shadow-lg"
        style={{ background: `radial-gradient(circle at 50% 40%, ${accent}55, #1a1d21 75%)` }}
      >
        <CategoryIcon id={data.category} size={60} />
      </div>
      <div className="-mt-0.5 w-[112px] bg-[#e8e8e8] px-1 pb-1 pt-0.5 text-center shadow">
        <div className="truncate text-[13px] font-bold leading-4 text-[#222]">{categoryName(data.category)}</div>
        <div className="mx-auto mt-0.5 h-[2px] w-16 rounded bg-[#c0392b]" />
        <div className="text-[10px] leading-3 text-[#555]">{data.count} 件</div>
      </div>
    </div>
  );
}
export const GamePhotoNode = memo(GamePhotoNodeImpl);

export type LennyFlowNode = Node<{ decorative: true }, "lenny">;

/** 中央の Lenny（装飾） */
function LennyNodeImpl() {
  return (
    <div
      className="flex flex-col border-[6px] border-b-0 border-[#ececec] bg-[#ececec] shadow-xl"
      style={{ width: GAME_LENNY_W, height: GAME_LENNY_H }}
      aria-label="Lenny"
    >
      <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_50%_40%,#7a2a22,#2a1412_75%)]">
        <UserRound size={120} className="text-[#e9c9a8]/80" aria-hidden />
      </div>
      <div className="px-2 pb-2 pt-1 text-[#333]">
        <div className="text-center font-serif text-2xl italic leading-7 text-[#a8231a]">Lenny</div>
        <p className="text-[11px] leading-[14px]">ブラックマーケットの伝説。誰でも買収でき、どんな品物の配達も手配してくれる。</p>
      </div>
    </div>
  );
}
export const LennyNode = memo(LennyNodeImpl);

export type CenterLineFlowNode = Node<{ width: number }, "centerLine">;

function CenterLineNodeImpl({ data }: NodeProps<CenterLineFlowNode>) {
  return <div className="h-[3px] bg-[#d6d9dd]/80" style={{ width: data.width }} />;
}
export const CenterLineNode = memo(CenterLineNodeImpl);

export type GameStepEdgeType = Edge<{ direction: GameDirection }, "gameStep">;

/** ゲームと同じ直角の線: 親から少し進んだ所で横線（バス）に出て、子の真上/真下から入る */
function GameStepEdgeImpl({ id, sourceX, sourceY, targetX, targetY, data, style }: EdgeProps<GameStepEdgeType>) {
  const busY = data?.direction === "down" ? sourceY + GAME_BUS : sourceY - GAME_BUS;
  const path = `M ${sourceX} ${sourceY} L ${sourceX} ${busY} L ${targetX} ${busY} L ${targetX} ${targetY}`;
  return <BaseEdge id={id} path={path} style={style} />;
}
export const GameStepEdge = memo(GameStepEdgeImpl);
