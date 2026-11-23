import { Link } from "react-router-dom";
import { items } from "../lib/data";
import { useProgress } from "../store/progress";

/** 研究進捗バー。link=true なら研究進捗ページへのリンクになる */
export function ProgressBar({ className = "", link = true }: { className?: string; link?: boolean }) {
  const done = useProgress((s) => s.researched.filter((id) => items.some((i) => i.id === id)).length);
  const total = items.length;
  const pct = Math.round((done / total) * 100);
  const body = (
    <>
      <div className="mb-0.5 flex justify-between text-muted">
        <span>研究進捗{link && " ›"}</span>
        <span className="font-mono text-white">
          {done} / {total}（{pct}%）
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-bg">
        <div className="h-full bg-neon transition-all" style={{ width: `${pct}%` }} />
      </div>
    </>
  );
  return link ? (
    <Link to="/progress" className={`block text-xs hover:opacity-80 ${className}`} title="研究進捗の管理へ">
      {body}
    </Link>
  ) : (
    <div className={`text-xs ${className}`} title="研究済み / 総研究数">
      {body}
    </div>
  );
}
