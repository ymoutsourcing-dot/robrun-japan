import { Link } from "react-router-dom";
import type { MapGuide } from "../../lib/guides";
import { Section } from "../ui";
import { SourceTag } from "../GuideBody";

const LEVEL_CLS: Record<number, string> = {
  1: "border-line text-gray-300",
  2: "border-sky-500 text-sky-300",
  3: "border-money text-money",
};

/** マップ解説：施設一覧と地区一覧（本文の前に表示） */
export default function MapExtras({ guide: g }: { guide: MapGuide }) {
  return (
    <>
      {g.districts && (
        <Section title={g.districtsTitle ?? "地区"}>
          <div className="grid gap-2 sm:grid-cols-2">
            {g.districts.map((d) => (
              <div key={d.nameEn} className="rounded-lg border border-line bg-bg-card p-2.5 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className={`rounded border px-1 text-xs ${LEVEL_CLS[d.level] ?? ""}`}>Lv{d.level}</span>
                  <span className="font-bold">{d.nameJa}</span>
                  <span className="font-mono text-xs text-gray-300">{d.nameEn}</span>
                </div>
                <p className="mt-1 text-xs text-muted">位置：{d.whereJa}</p>
                <p className="mt-0.5 text-xs">
                  販売センターの売却ボーナス <span className="text-money">{d.saleBonus}</span>
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {d.infraJa.map((n, i) => (
                    <span key={i} className="rounded bg-bg-hover px-1.5 py-0.5 text-xs text-gray-200 ring-1 ring-line">
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {g.districtsNote && <p className="mt-2 text-xs text-muted">※{g.districtsNote}</p>}
          {g.districtsSources && (
            <div className="mt-1 space-y-0.5">
              {g.districtsSources.map((s) => (
                <SourceTag key={s} source={g.sources[s]} />
              ))}
            </div>
          )}
        </Section>
      )}

      {g.places && (
        <Section title={g.placesTitle ?? "施設"}>
          <ul className="divide-y divide-line/60">
            {g.places.map((p) => (
              <li key={p.nameJa} className="py-2 text-sm">
                <p>
                  <span className="font-bold">{p.nameJa}</span>
                  {p.nameEn && <span className="ml-2 font-mono text-xs text-gray-300">{p.nameEn}</span>}
                </p>
                <p className="mt-0.5 leading-relaxed">
                  {p.whatJa}
                  {p.link && (
                    <Link to={p.link} className="ml-1 text-sky-300 hover:underline">
                      →
                    </Link>
                  )}
                </p>
                <p className="mt-0.5">
                  {g.sources[p.source] ? <SourceTag source={g.sources[p.source]} /> : <span className="text-xs text-danger">出典不明: {p.source}</span>}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
