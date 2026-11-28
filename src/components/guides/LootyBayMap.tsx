import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Car, ExternalLink, Minus, Plus, RotateCcw } from "lucide-react";
import mapJson from "../../../data/source/looty-bay-map.source.json";
import { tipsData } from "../../lib/tips";

interface Place {
  id: string;
  nameEn: string;
  kind: "building" | "car" | "heli";
  landmark: boolean;
  x: number;
  y: number;
}
type Box = { minX: number; minY: number; width: number; height: number };
const data = mapJson as unknown as {
  source: { name: string; url: string; note: string; retrievedAt: string };
  bounds: Box;
  initialBounds: Box;
  labels: { nameEn: string; x: number; y: number }[];
  places: Place[];
  images?: { note: string; layers: { file: string; x: number; y: number; width: number; height: number }[] };
};
const LABEL_JA: Record<string, string> = {
  Downtown: "ダウンタウン",
  "Loraine Hills": "ロレインヒルズ",
  Palmside: "パームサイド",
  "Sunny Beach": "サニービーチ",
};
const byRrg = new Map(tipsData.locations.map((l) => [l.rrgId, l]));
const ASPECT = data.initialBounds.height / data.initialBounds.width;

/** Looty Bay の建物・車のスポーン位置を描いた地図。ホイール／ピンチで拡大、ドラッグで移動 */
export default function LootyBayMap() {
  const [view, setView] = useState<Box>(data.initialBounds);
  const [sel, setSel] = useState<string | null>(null);
  const [show, setShow] = useState({ car: false, heli: true, pins: true });
  const svg = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(false);

  const clamp = (v: Box): Box => {
    const b = data.bounds;
    const width = Math.min(Math.max(v.width, 200), b.width);
    const height = width * ASPECT;
    return {
      width,
      height,
      minX: Math.min(Math.max(v.minX, b.minX), b.minX + b.width - width),
      minY: Math.min(Math.max(v.minY, b.minY), b.minY + b.height - height),
    };
  };
  /** 画面上の点 (px,py) を中心に factor 倍ズーム */
  const zoomAt = (factor: number, px?: number, py?: number) =>
    setView((v) => {
      const r = svg.current!.getBoundingClientRect();
      const fx = px === undefined ? 0.5 : (px - r.left) / r.width;
      const fy = py === undefined ? 0.5 : (py - r.top) / r.height;
      const w = v.width / factor;
      return clamp({ minX: v.minX + (v.width - w) * fx, minY: v.minY + (v.height - w * ASPECT) * fy, width: w, height: w * ASPECT });
    });

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const pts = pointers.current;
    if (pts.size === 2) {
      const [a, b] = [...pts.entries()];
      const other = a[0] === e.pointerId ? b[1] : a[1];
      const d0 = Math.hypot(prev.x - other.x, prev.y - other.y);
      const d1 = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      if (d0 > 0) zoomAt(d1 / d0, (e.clientX + other.x) / 2, (e.clientY + other.y) / 2);
    } else {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true;
      setView((v) => {
        const r = svg.current!.getBoundingClientRect();
        return clamp({ ...v, minX: v.minX - (dx * v.width) / r.width, minY: v.minY - (dy * v.height) / r.height });
      });
    }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onPointerUp = (e: React.PointerEvent) => pointers.current.delete(e.pointerId);

  // ホイールで拡大（ページがスクロールしないよう passive: false で登録）
  const zoomRef = useRef(zoomAt);
  zoomRef.current = zoomAt;
  useEffect(() => {
    const el = svg.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const s = view.width / 100; // 画面上の大きさを一定に保つための係数
  const places = useMemo(() => data.places.filter((p) => p.kind === "building" || show[p.kind]), [show]);
  const selected = data.places.find((p) => p.id === sel);
  const selLoc = selected ? byRrg.get(selected.id) : undefined;
  const nameOf = (p: Place) => byRrg.get(p.id)?.nameJa ?? (p.kind === "car" ? "車" : p.kind === "heli" ? "ヘリコプター" : p.nameEn);

  return (
    <section className="rounded-xl border border-line bg-bg-panel p-3">
      <h2 className="mb-1 text-lg font-bold">Looty Bay の地図（建物と車の位置）</h2>
      <p className="mb-2 text-xs text-muted">
        ホイール・ピンチで拡大、ドラッグで移動。緑の丸を押すと名前と強盗スポットの情報。背景はゲーム内の地図のスクリーンショット。
      </p>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full border-2 border-green-600" />建物（強盗スポット）</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full border-2 border-yellow-500" />主要な建物</span>
        <label className="flex items-center gap-1"><input type="checkbox" checked={show.pins} onChange={(e) => setShow({ ...show, pins: e.target.checked })} className="accent-[#5cff8a]" />名前と印を表示</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={show.car} onChange={(e) => setShow({ ...show, car: e.target.checked })} className="accent-[#5cff8a]" /><span className="inline-block h-3 w-3 rounded-sm bg-sky-400" />車のスポーン</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={show.heli} onChange={(e) => setShow({ ...show, heli: e.target.checked })} className="accent-[#5cff8a]" /><span className="inline-block h-3 w-3 rotate-45 bg-orange-400" />ヘリのスポーン</label>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-line bg-[#0b1210]">
        <svg
          ref={svg}
          viewBox={`${view.minX} ${view.minY} ${view.width} ${view.height}`}
          className="block aspect-[13/11] w-full cursor-grab touch-none select-none active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
          onClick={() => !moved.current && setSel(null)}
          role="img"
          aria-label="Looty Bay の建物と車のスポーン位置"
        >
          <defs>
            <pattern id="lb-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M50 0H0V50" fill="none" stroke="#1d2a24" strokeWidth={1} />
            </pattern>
          </defs>
          <rect x={data.bounds.minX} y={data.bounds.minY} width={data.bounds.width} height={data.bounds.height} fill={data.images ? "#5ea9b1" : "url(#lb-grid)"} />
          {/* 全体図は常に表示、拡大したら詳細のスクショを重ねる */}
          {data.images?.layers.filter((_, i) => i === 0 || view.width < 900).map((l) => (
            <image key={l.file} href={l.file} x={l.x} y={l.y} width={l.width} height={l.height} preserveAspectRatio="none" pointerEvents="none" />
          ))}
          {!data.images && data.labels.map((l) => (
            <text key={l.nameEn} x={l.x} y={l.y} textAnchor="middle" fontSize={s * 3.2} fill="#5cff8a" opacity={0.35} fontWeight="bold" pointerEvents="none">
              {LABEL_JA[l.nameEn] ?? l.nameEn}
            </text>
          ))}
          {show.pins && places.map((p) => {
            const on = p.id === sel;
            const pick = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (!moved.current) setSel(on ? null : p.id);
            };
            if (p.kind === "car")
              return <rect key={p.id} x={p.x - s * 0.9} y={p.y - s * 0.9} width={s * 1.8} height={s * 1.8} rx={s * 0.3} fill="#38bdf8" stroke={on ? "#fff" : "none"} strokeWidth={s * 0.4} onClick={pick} className="cursor-pointer" />;
            if (p.kind === "heli")
              return <rect key={p.id} x={p.x - s} y={p.y - s} width={s * 2} height={s * 2} fill="#fb923c" transform={`rotate(45 ${p.x} ${p.y})`} stroke={on ? "#fff" : "none"} strokeWidth={s * 0.4} onClick={pick} className="cursor-pointer" />;
            return (
              <g key={p.id} onClick={pick} className="cursor-pointer">
                <circle cx={p.x} cy={p.y} r={s * (p.landmark ? 2.2 : 1.8)} fill="#5cff8a" fillOpacity={on ? 0.35 : 0.08} stroke={on ? "#ffffff" : p.landmark ? "#eab308" : "#16a34a"} strokeWidth={s * 0.45} />
                {(view.width < 700 || p.landmark || on) && (
                  <text x={p.x} y={p.y - s * 2} textAnchor="middle" fontSize={s * 2} fill="#ffffff" stroke="#111827" strokeWidth={s * 0.5} paintOrder="stroke" pointerEvents="none">
                    {nameOf(p)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button type="button" aria-label="拡大" onClick={() => zoomAt(1.5)} className="rounded-md border border-line bg-bg-panel/90 p-1.5 hover:text-neon"><Plus size={16} /></button>
          <button type="button" aria-label="縮小" onClick={() => zoomAt(1 / 1.5)} className="rounded-md border border-line bg-bg-panel/90 p-1.5 hover:text-neon"><Minus size={16} /></button>
          <button type="button" aria-label="元に戻す" onClick={() => setView(data.initialBounds)} className="rounded-md border border-line bg-bg-panel/90 p-1.5 hover:text-neon"><RotateCcw size={16} /></button>
        </div>
        {selected && (
          <div className="absolute bottom-2 left-2 right-2 rounded-lg border border-neon/60 bg-bg-panel/95 p-2 text-sm shadow-lg sm:right-auto sm:max-w-sm">
            <p className="font-bold">
              {selected.kind !== "building" && <Car size={14} className="mr-1 inline" />}
              {nameOf(selected)} <span className="font-mono text-xs text-gray-400">{selected.nameEn}</span>
            </p>
            {selLoc ? (
              <p className="text-xs text-muted">
                {selLoc.typeJa}・{selLoc.districtJa}・店員{selLoc.staff}人{selLoc.breaker ? "・配電盤あり" : ""}{" "}
                <Link to="/tips#locations" className="text-sky-300 underline">強盗スポット比較で見る</Link>
              </p>
            ) : (
              <p className="text-xs text-muted">{selected.kind === "building" ? "" : "車両が出現する場所"}</p>
            )}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        座標の出典：
        <a href={data.source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-sky-300 hover:underline">
          {data.source.name} <ExternalLink size={11} />
        </a>
        （ゲームファイル由来・{data.source.retrievedAt}取得）。{data.images?.note} 故買屋・密輸業者のバンなど、データに無い場所の印は未収録（地図上の $ や箱のアイコンはゲーム内の表示）。
      </p>
    </section>
  );
}
