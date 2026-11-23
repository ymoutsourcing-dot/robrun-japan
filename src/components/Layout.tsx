import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ListChecks, Menu, X } from "lucide-react";
import { items } from "../lib/data";
import { useProgress } from "../store/progress";
import { ErrorBoundary } from "./ErrorBoundary";

const NAV = [
  { to: "/shipments", label: "研究ツリー" },
  { to: "/items", label: "アイテム" },
  { to: "/weapons", label: "武器" },
  { to: "/vehicles", label: "車両" },
  { to: "/calculator", label: "費用計算" },
  { to: "/recommended", label: "おすすめ" },
  { to: "/guides", label: "攻略" },
  { to: "/progress", label: "進捗" },
  { to: "/about", label: "データについて" },
];

/** どのページからでも研究進捗に戻れるボタン（研究進捗ページ・研究ツリーでは非表示） */
function ProgressButton() {
  const done = useProgress((s) => s.researched.length);
  return (
    <Link
      to="/progress"
      className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-neon/60 bg-bg-panel/95 px-3 py-2 text-sm text-neon shadow-lg shadow-black/40 backdrop-blur hover:bg-neon/10"
    >
      <ListChecks size={16} />
      研究進捗
      <span className="font-mono text-xs text-white">
        {done}/{items.length}
      </span>
    </Link>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const fullBleed = pathname === "/shipments";
  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-2 py-1.5 text-sm ${isActive ? "bg-neon/10 text-neon" : "text-muted hover:text-white"}`;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 h-14 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-3">
          <Link to="/" className="flex items-baseline gap-1.5" onClick={() => setOpen(false)}>
            <span className="font-mono text-lg font-black tracking-tight text-neon">ROB RUN</span>
            <span className="text-sm font-bold">JAPAN</span>
            <span className="hidden rounded border border-line px-1 text-[10px] text-muted sm:inline">非公式</span>
          </Link>
          <nav className="ml-auto hidden gap-0.5 lg:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={link}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <button className="ml-auto p-2 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="メニュー" aria-expanded={open}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open && (
          <nav className="flex flex-col gap-0.5 border-b border-line bg-bg-panel p-2 lg:hidden">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={link} onClick={() => setOpen(false)}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      {pathname !== "/progress" && pathname !== "/shipments" && <ProgressButton />}
      <main className={`flex-1 ${pathname !== "/shipments" ? "pb-16" : ""}`}>
        <ErrorBoundary resetKey={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      {!fullBleed && (
        <footer className="mt-8 border-t border-line px-4 py-6 text-center text-xs text-muted">
          <p>ROB RUN JAPAN は非公式のファンサイトです。ROB RUN の開発・運営元とは関係ありません。</p>
          <p className="mt-1">
            ゲームデータ出典: Rob Run Guide（ゲームファイル抽出データ）・
            <Link to="/about" className="underline">
              詳細
            </Link>
            ・
            <Link to="/changelog" className="underline">
              更新履歴
            </Link>
          </p>
        </footer>
      )}
    </div>
  );
}
