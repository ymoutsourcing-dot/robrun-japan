import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { CheckCircle2, Lock, Star, Bookmark } from "lucide-react";
import type { ShipmentItem } from "../types/shipment";
import { displayNameJa, displayNameEn } from "../lib/data";
import { money } from "../lib/format";
import { useProgress } from "../store/progress";
import { ItemIcon, TierBadge } from "./ui";
import { NODE_H, NODE_W } from "../lib/treeLayout";

export type ShipmentNodeData = { item: ShipmentItem; dimmed: boolean; highlighted: boolean };
export type ShipmentFlowNode = Node<ShipmentNodeData, "shipment">;

function ShipmentNodeImpl({ data, selected }: NodeProps<ShipmentFlowNode>) {
  const { item, dimmed, highlighted } = data;
  const done = useProgress((s) => s.researched.includes(item.id));
  const fav = useProgress((s) => s.favorite.includes(item.id));
  const planned = useProgress((s) => s.planned.includes(item.id));
  const border = selected
    ? "border-neon shadow-[0_0_0_2px_rgba(92,255,138,0.5)]"
    : highlighted
      ? "border-money"
      : done
        ? "border-neon/60"
        : "border-line";
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border bg-bg-card px-2 text-left transition-opacity ${border} ${
        dimmed ? "opacity-25" : ""
      } ${done ? "bg-[#1d2b22]" : ""}`}
      style={{ width: NODE_W, height: NODE_H }}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <ItemIcon item={item} size={18} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate text-[13px] font-bold leading-tight">{displayNameJa(item)}</span>
        </div>
        <div className="truncate font-mono text-[11px] leading-tight text-gray-300">{displayNameEn(item)}</div>
        <div className="mt-0.5 flex items-center gap-1">
          <span className="font-mono text-[11px] text-money">{money(item.researchCost)}</span>
          <TierBadge level={item.requiredSettlementLevel} />
          {item.requiredImprisonmentYears > 0 && (
            <span className="inline-flex items-center text-[10px] text-danger" title={`服役${item.requiredImprisonmentYears}年以上`}>
              <Lock size={10} />
              {item.requiredImprisonmentYears}y
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        {done && <CheckCircle2 size={14} className="text-neon" aria-label="研究済み" />}
        {planned && <Bookmark size={12} className="text-sky-300" aria-label="研究予定" />}
        {fav && <Star size={12} className="fill-money text-money" aria-label="お気に入り" />}
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}

export const ShipmentNode = memo(ShipmentNodeImpl);
