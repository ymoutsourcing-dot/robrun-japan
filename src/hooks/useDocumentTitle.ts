import { useEffect } from "react";

const SITE = "ROB RUN JAPAN";

/** ページごとのタイトルと description を設定する */
export function useDocumentTitle(title: string | null, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE}（非公式攻略）` : `${SITE} | ROB RUN 日本語攻略・Shipments研究ツリー`;
    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      meta?.setAttribute("content", description);
    }
  }, [title, description]);
}
