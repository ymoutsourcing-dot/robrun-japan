import { createContext, useCallback, useContext, useState } from "react";
import { ChevronDown } from "lucide-react";
import { displayNameEn, displayNameJa, getItem } from "../lib/data";
import { ItemSummary } from "./ItemSummary";
import { ItemIcon } from "./ui";

/** 一覧の中でアイテムの詳細をその場で開くための共有状態 */
interface AccState {
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
}
const AccContext = createContext<AccState | null>(null);

export function AccordionProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = useCallback(
    (id: string) =>
      setOpen((cur) => {
        const n = new Set(cur);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      }),
    [],
  );
  return <AccContext.Provider value={{ isOpen: (id) => open.has(id), toggle }}>{children}</AccContext.Provider>;
}

export function useAccordion(): AccState {
  const ctx = useContext(AccContext);
  if (!ctx) throw new Error("AccordionProvider がありません");
  return ctx;
}

/** 名前のボタン（クリックで開閉） */
export function AccName({ id, showEn = true, icon = false, className = "" }: { id: string; showEn?: boolean; icon?: boolean; className?: string }) {
  const { isOpen, toggle } = useAccordion();
  const it = getItem(id);
  const open = isOpen(id);
  return (
    <button type="button" onClick={() => toggle(id)} aria-expanded={open} className={`group flex min-w-0 items-center gap-2 text-left ${className}`}>
      {icon && it && <ItemIcon item={it} size={13} />}
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-bold group-hover:text-neon ${open ? "text-neon" : ""}`}>{it ? displayNameJa(it) : id}</span>
        {showEn && it && <span className="block truncate font-mono text-[11px] text-gray-300">{displayNameEn(it)}</span>}
      </span>
      <ChevronDown size={14} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180 text-neon" : ""}`} />
    </button>
  );
}

/** 開いたときの中身。colSpan を渡すと表の行（tr）として出す */
export function AccPanel({ id, colSpan }: { id: string; colSpan?: number }) {
  const { isOpen } = useAccordion();
  const it = getItem(id);
  if (!isOpen(id) || !it) return null;
  const body = (
    <div className="border-l-2 border-neon/60 bg-bg">
      <ItemSummary item={it} />
    </div>
  );
  if (colSpan)
    return (
      <tr>
        <td colSpan={colSpan} className="p-0">
          {body}
        </td>
      </tr>
    );
  return <div className="my-1">{body}</div>;
}
