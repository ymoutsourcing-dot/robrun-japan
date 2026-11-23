import { policeGuide as g } from "../../lib/guides";
import { Section } from "../ui";
import { SourceTag } from "../GuideBody";

/** 警察ガイド：死亡・逮捕時に失うもの、警官の報酬とボーナス */
export default function PoliceExtras() {
  return (
    <>
      <Section title="死亡・逮捕時に失うもの">
        <ul className="divide-y divide-line/60 text-sm">
          {g.deathRules.map((r) => (
            <li key={r.role} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-0.5 py-1.5">
              <span className="font-bold">{r.role}</span>
              <span className="text-right">
                {r.lose}
                <span className="block">
                  <SourceTag source={g.sources[r.source]} />
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="警官の報酬（設定値）">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line/60">
              {g.copRewards.map((r) => (
                <tr key={r.label}>
                  <td className="py-1.5">{r.label}</td>
                  <td className="py-1.5 text-right font-mono text-money">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2">
            <SourceTag source={g.sources["rri-police"]} />
          </p>
        </Section>
        <Section title="警官の一時ボーナス">
          <ul className="space-y-2 text-sm">
            {g.copBonuses.map((b) => (
              <li key={b.name} className="rounded-md border border-line bg-bg-card p-2">
                <p className="flex justify-between font-bold">
                  {b.name}
                  <span className="font-mono text-xs text-muted">{b.duration}</span>
                </p>
                <p className="text-xs text-muted">{b.how}</p>
                <p className="text-money">{b.effect}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2">
            <SourceTag source={g.sources["rri-police"]} />
          </p>
        </Section>
      </div>
    </>
  );
}
