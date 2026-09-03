/** Sumber data kamus */
export type Source = 0 | 1; // 0 = wiktionary, 1 = kbji

/** Entry minimal: [kata, arti, source] — array-of-arrays untuk ukuran terkecil */
export type Entry = [string, string, Source];

export type MetaFile = {
  wiktionary: { count: number; updated: string; license: string; source: string };
  kbji?: { count: number; updated: string; license: string; source: string; status: "partial" | "complete" };
  merged: { count: number; updated: string };
};
