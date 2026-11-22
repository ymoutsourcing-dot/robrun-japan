import {
  Car,
  Crosshair,
  Cpu,
  FileText,
  FlaskConical,
  House,
  Armchair,
  Shield,
  Wrench,
  Star,
  CheckCircle2,
  Circle,
  Bookmark,
  type LucideIcon,
} from "lucide-react";
import type { CategoryId, ShipmentItem } from "../types/shipment";
import { RARITY_COLOR, RARITY_JA, STATUS_JA } from "../lib/format";
import { toRoman } from "../lib/data";
import { useProgress } from "../store/progress";

const CATEGORY_ICON: Record<CategoryId, LucideIcon> = {
  weapons: Crosshair,
  equipment: Shield,
  gadgets: Cpu,
  vehicles: Car,
  construction: House,
  furniture: Armchair,
  production: FlaskConical,
  documents: FileText,
};

export const CATEGORY_ACCENT: Record<CategoryId, string> = {
  weapons: "#ff6b6b",
  equipment: "#6bb6ff",
  gadgets: "#c792ff",
  vehicles: "#ffb347",
  construction: "#5cff8a",
  furniture: "#e0c068",
  production: "#4fe3d0",
  documents: "#d0d0d0",
};

export function ItemIcon({ item, size = 20 }: { item: ShipmentItem; size?: number }) {
  const Icon = item.subcategory === "車両改造" ? Wrench : CATEGORY_ICON[item.category];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md border border-line bg-bg"
      style={{ width: size + 14, height: size + 14, color: CATEGORY_ACCENT[item.category] }}
      aria-hidden
    >
      <Icon size={size} />
    </span>
  );
}

export function CategoryIcon({ id, size = 16 }: { id: CategoryId; size?: number }) {
  const Icon = CATEGORY_ICON[id];
  return <Icon size={size} style={{ color: CATEGORY_ACCENT[id] }} aria-hidden />;
}

export function TierBadge({ level }: { level: number | null }) {
  if (level === null) return null;
  return (
    <span
      title={`必要地区レベル ${level}`}
      className="rounded border border-money/60 px-1 font-mono text-[10px] leading-4 text-money"
    >
      {toRoman(level)}
    </span>
  );
}

export function RarityBadge({ rarity }: { rarity: string | null }) {
  if (!rarity) return <span className="text-xs text-muted">レアリティ未確認</span>;
  return (
    <span className={`rounded border px-1.5 text-xs ${RARITY_COLOR[rarity] ?? ""}`}>
      {RARITY_JA[rarity] ?? rarity}
    </span>
  );
}

export function StatusBadge({ status }: { status: ShipmentItem["verificationStatus"] }) {
  const s = STATUS_JA[status];
  return (
    <span title={s.desc} className={`rounded border px-1.5 text-xs ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function Priority({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted">おすすめ度: 未評価</span>;
  return (
    <span className="inline-flex items-center gap-0.5" title={`おすすめ度 ${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={12} className={n <= value ? "fill-money text-money" : "text-line"} />
      ))}
    </span>
  );
}

/** 研究済み / お気に入り / 予定 の切り替えボタン */
export function ProgressToggles({ id, compact = false }: { id: string; compact?: boolean }) {
  const researched = useProgress((s) => s.researched.includes(id));
  const favorite = useProgress((s) => s.favorite.includes(id));
  const planned = useProgress((s) => s.planned.includes(id));
  const toggle = useProgress((s) => s.toggle);
  const btn = "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors";
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => toggle("researched", id)}
        className={`${btn} ${researched ? "border-neon bg-neon/15 text-neon" : "border-line text-muted hover:text-white"}`}
        aria-pressed={researched}
      >
        {researched ? <CheckCircle2 size={14} /> : <Circle size={14} />}
        {researched ? "研究済み" : "未研究"}
      </button>
      <button
        type="button"
        onClick={() => toggle("planned", id)}
        className={`${btn} ${planned ? "border-sky-500 bg-sky-500/15 text-sky-300" : "border-line text-muted hover:text-white"}`}
        aria-pressed={planned}
      >
        <Bookmark size={14} />
        {compact ? "予定" : "次に研究予定"}
      </button>
      <button
        type="button"
        onClick={() => toggle("favorite", id)}
        className={`${btn} ${favorite ? "border-money bg-money/15 text-money" : "border-line text-muted hover:text-white"}`}
        aria-pressed={favorite}
      >
        <Star size={14} className={favorite ? "fill-money" : ""} />
        {compact ? "" : "お気に入り"}
      </button>
    </div>
  );
}

export function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-bg-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold tracking-wide text-neon">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}
