/**
 * Merge data/kamus.wiktionary.json + data/kamus.kbji.json -> data/kamus.json
 * Deduplicate case-insensitive, KBJI prioritas (lebih lengkap)
 */
import type { Entry } from "../src/types.ts";

const WIKT = "data/kamus.wiktionary.json";
const KBJI = "data/kamus.kbji.json";
const OUT = "data/kamus.json";
const META = "data/meta.json";

async function loadJson(path: string): Promise<Entry[]> {
  try {
    const f = Bun.file(path);
    if (!(await f.exists())) return [];
    const t = await f.text();
    if (!t.trim()) return [];
    const data = JSON.parse(t) as Entry[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function main() {
  const wikt = await loadJson(WIKT);
  const kbji = await loadJson(KBJI);
  console.log(`[merge] wiktionary: ${wikt.length}, kbji: ${kbji.length}`);

  const map = new Map<string, Entry>();

  // Masukkan wiktionary dulu
  for (const e of wikt) {
    const key = e[0].toLowerCase().trim();
    if (!key) continue;
    if (!map.has(key)) map.set(key, e);
  }
  // KBJI overwrite (prioritas)
  let overwritten = 0;
  for (const e of kbji) {
    const key = e[0].toLowerCase().trim();
    if (!key) continue;
    if (map.has(key)) overwritten++;
    map.set(key, e);
  }

  const merged = [...map.values()].sort((a, b) => a[0].localeCompare(b[0], "id", { sensitivity: "base" }));
  console.log(`[merge] merged: ${merged.length} (overwritten ${overwritten})`);

  await Bun.write(OUT, JSON.stringify(merged));
  console.log(`[merge] wrote ${OUT}`);

  // Update meta
  let meta: Record<string, unknown> = {};
  try {
    meta = JSON.parse(await Bun.file(META).text());
  } catch {}
  const now = new Date().toISOString();
  (meta as Record<string, unknown>)["merged"] = { count: merged.length, updated: now };
  await Bun.write(META, JSON.stringify(meta, null, 2));
  console.log(`[merge] updated ${META}`);
  console.log(`[merge] sample:`);
  for (const e of merged.slice(0, 5)) console.log(`  [${e[2]===1?"KBJI":"WIKT"}] ${e[0]}: ${e[1].slice(0,80)}`);
}

if (import.meta.main) await main();
