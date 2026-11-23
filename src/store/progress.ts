import { create } from "zustand";
import { persist } from "zustand/middleware";
import { itemById } from "../lib/data";

export type Flag = "researched" | "favorite" | "planned";

interface ProgressState {
  researched: string[];
  favorite: string[];
  planned: string[];
  /** プレイヤーが入力した現在の累計服役年数（未入力は null） */
  jailYears: number | null;
  setJailYears: (v: number | null) => void;
  toggle: (flag: Flag, id: string) => void;
  set: (flag: Flag, id: string, on: boolean) => void;
  /** 研究済みにする際、前提研究もまとめて研究済みにする */
  markResearchedWithAncestors: (ids: string[]) => void;
  reset: () => void;
  importData: (json: unknown) => { ok: true; count: number } | { ok: false; error: string };
}

const STORAGE_KEY = "robrun-jp-progress";

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      researched: [],
      favorite: [],
      planned: [],
      jailYears: null,
      setJailYears: (v) => set({ jailYears: v }),
      toggle: (flag, id) => {
        const cur = get()[flag];
        set({ [flag]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] } as Partial<ProgressState>);
      },
      set: (flag, id, on) => {
        const cur = get()[flag].filter((x) => x !== id);
        set({ [flag]: on ? [...cur, id] : cur } as Partial<ProgressState>);
      },
      markResearchedWithAncestors: (ids) => {
        const s = new Set(get().researched);
        for (const id of ids) s.add(id);
        set({ researched: [...s], planned: get().planned.filter((p) => !s.has(p)) });
      },
      reset: () => set({ researched: [], favorite: [], planned: [] }),
      importData: (json) => {
        if (!json || typeof json !== "object") return { ok: false, error: "JSON形式が正しくありません" };
        const o = json as Record<string, unknown>;
        const pick = (k: string) =>
          Array.isArray(o[k]) ? (o[k] as unknown[]).filter((x): x is string => typeof x === "string" && itemById.has(x)) : [];
        const researched = pick("researched");
        const favorite = pick("favorite");
        const planned = pick("planned");
        const jailYears = typeof o.jailYears === "number" && o.jailYears >= 0 ? o.jailYears : get().jailYears;
        set({ researched, favorite, planned, jailYears });
        return { ok: true, count: researched.length };
      },
    }),
    { name: STORAGE_KEY, version: 1 },
  ),
);

export function exportProgress(): string {
  const { researched, favorite, planned, jailYears } = useProgress.getState();
  return JSON.stringify(
    { app: "robrun-japan", version: 1, exportedAt: new Date().toISOString(), researched, favorite, planned, jailYears },
    null,
    2,
  );
}
