import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ChevronDown, ListChecks, Menu, Search, X } from "lucide-react";
import { items } from "../lib/data";
import { useProgress } from "../store/progress";
import { ErrorBoundary } from "./ErrorBoundary";

const NAV = [
  { to: "/shipments", label: "研究ツリー" },
  { to: "/items", label: "アイテム" },
  { to: "/weapons", label: "武器" },
  { to: "/vehicles", label: "車両" },
  { to: "/cargo", label: "積荷" },
  { to: "/collections", label: "コレクション" },
  { to: "/tools", label: "道具" },
  { to: "/calculator", label: "費用計算" },
  { to: "/recommended", label: "おすすめ" },
  { to: "/guides", label: "攻略" },
  { to: "/tips", label: "小ネタ" },
];
/** PCでは「その他」ドロップダウンにまとめる項目 */
const MORE = [
  { to: "/calc", label: "計算機" },
  { to: "/guides/jail-time", label: "服役解除" },
  { to: "/progress", label: "進捗" },
  { to: "/about", label: "データについて" },
];

/** 「その他 ▾」：PCはホバーで開き、タップ／クリックでも開閉。外側を押すと閉じる */
function MoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const active = MORE.some((m) => pathname === m.to);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div
      ref={ref}
      className="relative shrink-0"
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-0.5 whitespace-nowrap rounded-md px-2 py-1.5 text-sm ${active || open ? "text-neon" : "text-muted hover:text-white"} ${active ? "bg-neon/10" : ""}`}
      >
        その他
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        // pt-1 の透明な余白でボタンとメニューの間を埋め、ホバーが途切れないようにする
        <div className="absolute right-0 top-full z-50 pt-1">
          <ul role="menu" className="min-w-40 rounded-lg border border-line bg-bg-panel p-1 shadow-xl shadow-black/50">
            {MORE.map((m) => (
              <li key={m.to} role="none">
                <NavLink
                  role="menuitem"
                  to={m.to}
                  end
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block whitespace-nowrap rounded-md px-3 py-2 text-sm ${isActive ? "bg-neon/10 text-neon" : "text-muted hover:bg-bg-hover hover:text-white"}`
                  }
                >
                  {m.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

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
  const { pathname, hash } = useLocation();
  // ページ内リンク（#id）で開いたとき、その位置までスクロールする
  useEffect(() => {
    if (!hash) return;
    const t = setTimeout(() => document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: "start" }), 150);
    return () => clearTimeout(t);
  }, [pathname, hash]);
  const fullBleed = pathname === "/shipments";
  const link = ({ isActive }: { isActive: boolean }) =>
    `shrink-0 whitespace-nowrap rounded-md px-2 py-1.5 text-sm ${isActive ? "bg-neon/10 text-neon" : "text-muted hover:text-white"}`;
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 h-14 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-3">
          <Link to="/" className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap" onClick={() => setOpen(false)}>
            <span className="font-mono text-lg font-black tracking-tight text-neon">ROB RUN</span>
            <span className="text-sm font-bold">JAPAN</span>
            <span className="hidden shrink-0 whitespace-nowrap rounded border border-line px-1 text-[10px] text-muted sm:inline">非公式</span>
          </Link>
          <nav className="ml-auto hidden items-center gap-0.5 xl:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === "/guides"} className={link}>
                {n.label}
              </NavLink>
            ))}
            <MoreMenu />
          </nav>
          <Link
            to="/search"
            onClick={() => setOpen(false)}
            aria-label="サイト内検索"
            className="ml-auto flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-line px-2 py-1.5 text-sm text-muted hover:border-neon hover:text-neon xl:ml-1"
          >
            <Search size={16} />
            <span className="hidden sm:inline">検索</span>
          </Link>
          <button className="shrink-0 p-2 xl:hidden" onClick={() => setOpen((o) => !o)} aria-label="メニュー" aria-expanded={open}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {open && (
          <nav className="flex flex-col gap-0.5 border-b border-line bg-bg-panel p-2 xl:hidden">
            {[...NAV, ...MORE].map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === "/guides" || n.to === "/calc"} className={link} onClick={() => setOpen(false)}>
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
