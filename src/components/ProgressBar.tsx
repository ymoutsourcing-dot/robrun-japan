import { items } from "../lib/data";
import { useProgress } from "../store/progress";

export function ProgressBar({ className = "" }: { className?: string }) {
  const done = useProgress((s) => s.researched.filter((id) => items.some((i) => i.id === id)).length);
  const total = items.length;
  const pct = Math.round((done / total) * 100);
  return (
    <div className={`text-xs ${className}`} title="研究済み / 総研究数">
      <div className="mb-0.5 flex justify-between text-muted">
        <span>研究進捗</span>
        <span className="font-mono text-white">
          {done} / {total}（{pct}%）
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-bg">
        <div className="h-full bg-neon transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
