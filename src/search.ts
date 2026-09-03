import type { Entry } from "./types.ts";

export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlight(text: string, q: string): string {
  if (!q) return escapeHtml(text);
  const nQ = normalize(q);
  if (!nQ) return escapeHtml(text);
  const re = new RegExp(`(${escapeRegExp(q)})`, "gi");
  if (re.test(text)) {
    return text
      .split(new RegExp(`(${escapeRegExp(q)})`, "gi"))
      .map((part) => (normalize(part) === nQ ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)))
      .join("");
  }
  const nText = normalize(text);
  let out = "";
  let pos = 0;
  let idx = nText.indexOf(nQ, pos);
  if (idx === -1) return escapeHtml(text);
  while (idx !== -1) {
    out += escapeHtml(text.slice(pos, idx));
    out += `<mark>${escapeHtml(text.slice(idx, idx + q.length))}</mark>`;
    pos = idx + q.length;
    idx = nText.indexOf(nQ, pos);
  }
  out += escapeHtml(text.slice(pos));
  return out;
}

export type NormalizedEntry = { raw: Entry; nKata: string; nArti: string };

export function buildNormalized(data: Entry[]): NormalizedEntry[] {
  return data.map((raw) => ({
    raw,
    nKata: normalize(raw[0]),
    nArti: normalize(raw[1]),
  }));
}

export function filterEntries(
  normData: NormalizedEntry[],
  query: string,
  activeAbjad: string,
): Entry[] {
  const nQ = normalize(query.trim());
  let filtered = normData;

  if (activeAbjad !== "Semua") {
    const prefix = normalize(activeAbjad);
    filtered = filtered.filter(({ nKata }) => nKata.startsWith(prefix));
  }

  if (nQ) {
    const scored: Array<{ e: Entry; score: number }> = [];
    for (const { raw, nKata, nArti } of filtered) {
      const idxK = nKata.indexOf(nQ);
      const idxA = nArti.indexOf(nQ);
      if (idxK === -1 && idxA === -1) continue;
      let score = 10;
      if (nKata === nQ) score = 0;
      else if (idxK === 0) score = 1;
      else if (idxK !== -1) score = 2;
      else score = 3;
      scored.push({ e: raw, score });
    }
    scored.sort((a, b) => a.score - b.score || a.e[0].localeCompare(b.e[0], "id"));
    return scored.map((x) => x.e);
  }

  return filtered.map((x) => x.raw);
}
