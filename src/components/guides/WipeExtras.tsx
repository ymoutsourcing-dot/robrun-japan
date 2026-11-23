import { useEffect, useState } from "react";
import { CalendarClock, CheckSquare } from "lucide-react";
import { wipeGuide as g } from "../../lib/guides";
import { Section } from "../ui";
import { SourceTag } from "../GuideBody";

const STORAGE_KEY = "robrun-jp-server-opened";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmt(d: Date) {
  return d.toLocaleString("ja-JP", { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" });
}

/** ワイプガイド：ワイプ時刻の計算機＋日程表 */
export default function WipeExtras() {
  const [opened, setOpened] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    try {
      if (opened) localStorage.setItem(STORAGE_KEY, opened);
    } catch {
      /* noop */
    }
  }, [opened]);

  const openedDate = opened ? new Date(opened) : null;
  const wipe = openedDate ? new Date(openedDate.getTime() + g.schedule.cycleDays * 86400000) : null;
  const left = wipe ? wipe.getTime() - now : 0;
  const dayNo = openedDate ? Math.floor((now - openedDate.getTime()) / 86400000) + 1 : null;

  const setPreset = (utcHour: number, utcMin: number, daysAgo: number) => {
    // 直近の開設時刻を求めてから n 日さかのぼる
    const d = new Date();
    d.setUTCHours(utcHour, utcMin, 0, 0);
    if (d.getTime() > Date.now()) d.setUTCDate(d.getUTCDate() - 1);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    setOpened(toLocalInput(d));
  };

  return (
    <>
      <Section title="自分のサーバーのワイプ時刻を計算">
        <div className="space-y-2 text-sm">
          <label className="flex flex-wrap items-center gap-2">
            サーバーの開設日時（この端末の時刻）:
            <input
              type="datetime-local"
              value={opened}
              onChange={(e) => setOpened(e.target.value)}
              className="rounded-md border border-line bg-bg px-2 py-1 font-mono outline-none focus:border-neon"
            />
          </label>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="text-muted">定時の新サーバー：</span>
            {[0, 1, 2, 3].map((n) => (
              <button key={`eu${n}`} onClick={() => setPreset(17, 0, n)} className="rounded border border-line px-1.5 py-0.5 hover:border-neon">
                EU {n === 0 ? "直近" : `${n}日前`}
              </button>
            ))}
            {[0, 1, 2, 3].map((n) => (
              <button key={`us${n}`} onClick={() => setPreset(1, 0, n)} className="rounded border border-line px-1.5 py-0.5 hover:border-neon">
                East US {n === 0 ? "直近" : `${n}日前`}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">サーバー一覧の「Lifetime（稼働時間）」から逆算して入力してください。ゲーム内のタイマーが最優先です。</p>
        </div>
        {wipe && (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-line bg-bg-card p-3">
              <p className="text-xs text-muted">ワイプ予定</p>
              <p className="font-mono text-lg">{fmt(wipe)}</p>
            </div>
            <div className="rounded-md border border-neon/40 bg-neon/5 p-3">
              <p className="text-xs text-muted">残り</p>
              <p className="font-mono text-lg text-money">
                {left > 0 ? `${Math.floor(left / 86400000)}日 ${Math.floor((left % 86400000) / 3600000)}時間 ${Math.floor((left % 3600000) / 60000)}分` : "ワイプ済み"}
              </p>
            </div>
            <div className="rounded-md border border-line bg-bg-card p-3">
              <p className="text-xs text-muted">今日は</p>
              <p className="font-mono text-lg">{dayNo !== null && dayNo >= 1 && dayNo <= g.schedule.cycleDays ? `${dayNo}日目` : "—"}</p>
            </div>
          </div>
        )}
        <table className="mt-3 w-full max-w-md text-sm">
          <thead className="text-left text-xs text-muted">
            <tr>
              <th className="p-1.5">地域</th>
              <th className="p-1.5">新サーバー開設</th>
              <th className="p-1.5">日本時間</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {g.schedule.regions.map((r) => (
              <tr key={r.name}>
                <td className="p-1.5 font-bold">{r.name}</td>
                <td className="p-1.5">{r.openLocal}</td>
                <td className="p-1.5 font-mono text-money">{r.jst}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="7日間の動き方">
        <ol className="space-y-3">
          {g.days.map((d) => (
            <li key={d.day} className="rounded-lg border border-line bg-bg-card p-3">
              <h3 className="flex items-center gap-2 font-bold">
                <CalendarClock size={16} className="text-neon" />
                <span className="text-neon">{d.day}</span> {d.title}
              </h3>
              <ul className="mt-1.5 space-y-1 text-sm">
                {d.items.map((it) => (
                  <li key={it} className="flex gap-1.5">
                    <CheckSquare size={14} className="mt-0.5 shrink-0 text-muted" />
                    {it}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5">
                <SourceTag source={g.sources[d.source]} derived={d.derived} />
              </p>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
