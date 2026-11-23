import { useParams } from "react-router-dom";
import { guideById } from "../lib/guides";
import { GuideHeader, GuideSections, SourceLegend } from "../components/GuideBody";
import JailExtras from "../components/guides/JailExtras";
import MoneyExtras from "../components/guides/MoneyExtras";
import WipeExtras from "../components/guides/WipeExtras";
import PoliceExtras from "../components/guides/PoliceExtras";
import ProductionExtras from "../components/guides/ProductionExtras";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import NotFound from "./NotFound";

/** ガイドごとの計算機・表（本文の前に表示） */
const EXTRAS: Record<string, () => React.ReactElement> = {
  "jail-time": JailExtras,
  money: MoneyExtras,
  wipe: WipeExtras,
  police: PoliceExtras,
  production: ProductionExtras,
};

export default function GuidePage() {
  const { id = "" } = useParams();
  const guide = guideById.get(id);
  useDocumentTitle(guide ? guide.title : null, guide ? `ROB RUN 攻略：${guide.summary}` : undefined);
  if (!guide) return <NotFound />;
  const Extras = EXTRAS[guide.id];
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:px-4">
      <GuideHeader guide={guide} />
      <SourceLegend />
      {Extras && <Extras />}
      <GuideSections guide={guide} />
    </div>
  );
}
