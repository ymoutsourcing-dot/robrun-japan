import { Link } from "react-router-dom";
import { ChevronLeft, ExternalLink } from "lucide-react";
import type { Guide, Source, SourceKind } from "../lib/guides";
import { Section } from "./ui";

export const KIND: Record<SourceKind | "derived", { label: string; cls: string }> = {
  official: { label: "公式", cls: "border-neon text-neon" },
  fan: { label: "ファン情報", cls: "border-sky-500 text-sky-300" },
  data: { label: "ゲームデータ", cls: "border-rare text-rare" },
  derived: { label: "算出", cls: "border-money text-money" },
};

/** 出典バッジ＋リンク */
export function SourceTag({ source, derived, note }: { source: Source; derived?: boolean; note?: string }) {
  const kind = KIND[derived ? "derived" : source.kind];
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
      <span className={`rounded border px-1 ${kind.cls}`}>{kind.label}</span>
      {source.url.startsWith("/") ? (
        <Link to={source.url} className="underline">
          {source.label}
        </Link>
      ) : (
        <a href={source.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline">
          {source.label} <ExternalLink size={10} />
        </a>
      )}
      {note && <span>※{note}</span>}
    </span>
  );
}

export function GuideHeader({ guide }: { guide: Guide }) {
  return (
    <>
      <Link to="/guides" className="inline-flex items-center gap-1 text-sm text-muted hover:text-white">
        <ChevronLeft size={16} /> 攻略ガイド
      </Link>
      <header>
        <h1 className="text-2xl font-bold leading-snug">{guide.title}</h1>
        <p className="font-mono text-sm text-gray-300">{guide.titleEn}</p>
        <p className="mt-2 text-sm">{guide.summary}</p>
        <p className="mt-1 text-xs text-muted">最終更新: {guide.updatedAt}</p>
      </header>
    </>
  );
}

/** ガイドの本文（出典付きの項目）と未確認事項 */
export function GuideSections({ guide }: { guide: Guide }) {
  return (
    <>
      {guide.sections.map((s) => (
        <Section key={s.heading} title={s.heading}>
          <ul className="space-y-2.5">
            {s.facts.map((f, i) => {
              const src = guide.sources[f.source];
              return (
                <li key={i} className="text-sm leading-relaxed">
                  <p>
                    {f.text}
                    {f.link && (
                      <Link to={f.link} className="ml-1 text-sky-300 hover:underline">
                        →
                      </Link>
                    )}
                  </p>
                  <p className="mt-0.5">{src ? <SourceTag source={src} derived={f.derived} note={f.note} /> : <span className="text-danger">出典不明: {f.source}</span>}</p>
                </li>
              );
            })}
          </ul>
        </Section>
      ))}
      <Section title="まだ分かっていないこと">
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">
          {guide.unknowns.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      </Section>
    </>
  );
}

export function SourceLegend() {
  return (
    <p className="text-xs text-muted">
      出典の種類：<span className="text-neon">公式</span>＝Kefirの公式ヘルプ・Steamのお知らせ ／ <span className="text-sky-300">ファン情報</span>
      ＝攻略サイト・ゲーム設定値（公式未確認） ／ <span className="text-rare">ゲームデータ</span>＝本サイトのShipmentsデータ ／{" "}
      <span className="text-money">算出</span>＝出典をもとに本サイトがまとめたもの
    </p>
  );
}
