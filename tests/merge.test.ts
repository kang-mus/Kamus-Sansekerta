import { describe, it, expect } from "vitest";
import type { Entry } from "../src/types";

function mergeEntries(wikt: Entry[], kbji: Entry[]): Entry[] {
  const map = new Map<string, Entry>();
  for (const e of wikt) {
    const key = e[0].toLowerCase().trim();
    if (!map.has(key)) map.set(key, e);
  }
  for (const e of kbji) {
    const key = e[0].toLowerCase().trim();
    map.set(key, e);
  }
  return [...map.values()].sort((a, b) => a[0].localeCompare(b[0], "id"));
}

describe("merge", () => {
  it("deduplicates case-insensitive, kbji wins", () => {
    const wikt: Entry[] = [["aba", "perintah;", 0]];
    const kbji: Entry[] = [["aba", "suara, perintah dg suara", 1]];
    const merged = mergeEntries(wikt, kbji);
    expect(merged).toHaveLength(1);
    expect(merged[0][2]).toBe(1);
    expect(merged[0][1]).toContain("suara");
  });

  it("keeps wiktionary if not in kbji", () => {
    const wikt: Entry[] = [["zebra", "z", 0]];
    const merged = mergeEntries(wikt, []);
    expect(merged).toHaveLength(1);
  });

  it("sorts locale id", () => {
    const wikt: Entry[] = [
      ["zebra", "z", 0],
      ["aba", "a", 0],
    ];
    const merged = mergeEntries(wikt, []);
    expect(merged.map((e) => e[0])).toEqual(["aba", "zebra"]);
  });
});
