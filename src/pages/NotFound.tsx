import { Link } from "react-router-dom";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("ページが見つかりません");
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="font-mono text-5xl text-neon">404</p>
      <p className="mt-2 text-muted">ページが見つかりませんでした。</p>
      <Link to="/" className="mt-6 inline-block rounded-md border border-neon px-4 py-2 text-neon">
        ホームへ戻る
      </Link>
    </div>
  );
}
