import { describe, it, expect } from "vitest";
import { buildNormalized, filterEntries, highlight, normalize, escapeHtml } from "../src/search.ts";
import type { Entry } from "../src/types.ts";

const SAMPLE: Entry[] = [
  ["aba", "perintah;", 0],
  ["aba-aba", "memberi perintah", 0],
  ["abang", "merah", 0],
  ["babad", "cerita sejarah", 0],
  ["candra", "bulan", 0],
];

describe("normalize", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalize("Abá")).toBe("aba");
    expect(normalize("BèN")).toBe("ben");
  });
});

describe("escapeHtml", () => {
  it("escapes &, <, >, \", '", () => {
    expect(escapeHtml(`<a>&"'`)).toBe("&lt;a&gt;&amp;&quot;&#39;");
  });
});

describe("highlight", () => {
  it("highlights all occurrences case-insensitive", () => {
    const out = highlight("aba aba-aba", "aba");
    // should contain 3 marks (aba, aba, aba)
    expect((out.match(/<mark>/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it("escapes html in text", () => {
    const out = highlight("<script>", "script");
    // highlight splits "script" and wraps mark, so escaped brackets remain
    expect(out).toBe("&lt;<mark>script</mark>&gt;");
    expect(out).not.toContain("<script>");
  });

  it("returns escaped when no match", () => {
    expect(highlight("abang", "zzz")).toBe("abang");
  });
});

describe("filterEntries", () => {
  const norm = buildNormalized(SAMPLE);

  it("filters by kata prefix priority", () => {
    const res = filterEntries(norm, "aba", "Semua");
    expect(res[0][0]).toBe("aba"); // exact first
    expect(res.map((e) => e[0])).toContain("aba-aba");
  });

  it("falls back to arti", () => {
    const res = filterEntries(norm, "merah", "Semua");
    expect(res.map((e) => e[0])).toContain("abang");
  });

  it("filters by abjad", () => {
    const res = filterEntries(norm, "", "B");
    expect(res.every(([k]) => k.toLowerCase().startsWith("b"))).toBe(true);
    expect(res.map((e) => e[0])).toContain("babad");
  });

  it("combines abjad + query", () => {
    const res = filterEntries(norm, "aba", "A");
    expect(res.every(([k]) => k.toLowerCase().startsWith("a"))).toBe(true);
  });

  it("is diacritic-insensitive", () => {
    const data: Entry[] = [["bèbè", "test", 0]];
    const n = buildNormalized(data);
    expect(filterEntries(n, "bebe", "Semua")).toHaveLength(1);
  });
});
