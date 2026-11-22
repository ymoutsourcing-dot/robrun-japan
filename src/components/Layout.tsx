import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

const NAV = [
  { to: "/shipments", label: "研究ツリー" },
  { to: "/items", label: "アイテム" },
  { to: "/calculator", label: "費用計算" },
  { to: "/recommended", label: "おすすめ" },
  { to: "/progress", label: "進捗" },
  { to: "/about", label: "データについて" },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const fullBleed = pathname === "/shipments";
  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-2.5 py-1.5 text-sm ${isActive ? "bg-neon/10 text-neon" : "text-muted hover:text-white"}`;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 h-14 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-3">
          <Link to="/" className="flex items-baseline gap-1.5" onClick={() => setOpen(false)}>
            <span className="font-mono text-lg font-black tracking-tight text-neon">ROB RUN</span>
            <span className="text-sm font-bold">JAPAN</span>
            <span className="hidden rounded border border-line px-1 text-[10px] text-muted sm:inline">非公式</span>
          </Link>
          <nav className="ml-auto hidden gap-0.5 md:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={link}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <button className="ml-auto p-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="メニュー" aria-expanded={open}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open && (
          <nav className="flex flex-col gap-0.5 border-b border-line bg-bg-panel p-2 md:hidden">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={link} onClick={() => setOpen(false)}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className="flex-1">
        <Outlet />
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
