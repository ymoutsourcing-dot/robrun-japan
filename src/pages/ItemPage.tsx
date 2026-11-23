import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, GitBranch, ListChecks } from "lucide-react";
import { displayNameEn, displayNameJa, getItem } from "../lib/data";
import { ItemDetail } from "../components/ItemDetail";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import NotFound from "./NotFound";

export default function ItemPage() {
  const { id = "" } = useParams();
  const item = getItem(id);
  const navigate = useNavigate();
  useDocumentTitle(
    item ? `${displayNameJa(item)}（${displayNameEn(item)}）` : null,
    item ? `${displayNameJa(item)}（${item.nameEn}）の研究費・前提研究・日本語説明。${item.descriptionJa.slice(0, 60)}` : undefined,
  );
  if (!item) return <NotFound />;
  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4">
      <nav className="mb-3 flex items-center justify-between text-sm">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted hover:text-white">
          <ChevronLeft size={16} /> 戻る
        </button>
        <span className="flex items-center gap-3">
          <Link to="/progress" className="flex items-center gap-1 text-muted hover:text-white">
            <ListChecks size={14} /> 研究進捗
          </Link>
          <Link to={`/shipments?item=${item.id}`} className="flex items-center gap-1 text-neon hover:underline">
            <GitBranch size={14} /> ツリーで見る
          </Link>
        </span>
      </nav>
      <div className="rounded-xl border border-line bg-bg-panel p-4">
        <ItemDetail item={item} onSelect={(next) => navigate(`/shipments/${next}`)} />
      </div>
    </div>
  );
}
