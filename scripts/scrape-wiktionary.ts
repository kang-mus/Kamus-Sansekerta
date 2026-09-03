/**
 * Scrape Wiktionary: Lampiran:Kamus_bahasa_Sanskerta – bahasa Indonesia
 * - Fetch wikitext via MediaWiki API (1 request)
 * - Parse *[[kata]]: arti;  dan ** sub-lema
 * - Output: data/kamus.wiktionary.json (Entry[]) + data/kamus.json (merged awal) + data/meta.json
 */
import type { Entry } from "../src/types.ts";

const WIKTIONARY_API =
  "https://id.wiktionary.org/w/api.php?action=parse&page=Lampiran:Kamus_bahasa_Sanskerta_%E2%80%93_bahasa_Indonesia&prop=wikitext&format=json&origin=*";

const OUT_WIKT = "data/kamus.wiktionary.json";
const OUT_MERGED = "data/kamus.json";
const OUT_META = "data/meta.json";

async function fetchWikitext(): Promise<string> {
  console.log("[wiktionary] fetching wikitext...");
  const res = await fetch(WIKTIONARY_API, {
    headers: { "User-Agent": "Kata-Sansekerta/0.1 (bun; +https://github.com)" },
  });
  if (!res.ok) throw new Error(`Wiktionary API failed: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as { parse: { wikitext: { "*": string } } };
  const wt = json.parse?.wikitext?.["*"];
  if (!wt) throw new Error("Wikitext not found in response");
  console.log(`[wiktionary] wikitext length: ${wt.length}`);
  return wt;
}

export function parseWikitext(wt: string): Entry[] {
  const entries: Entry[] = [];
  const seen = new Set<string>();
  const lines = wt.split("\n");

  // Pola: *[[kata]]: arti  atau *[[kata1]], [[kata2]]: arti  atau *kata: arti
  // Sub-lema: **[[ngabani]]: arti
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith("*")) continue;

    // Hitung level bintang (** = sub-lema, tetap dimasukkan sebagai entry terpisah)
    // Ambil bagian setelah bintang
    const content = line.replace(/^\*+\s*/, "");
    if (!content) continue;

    // Cari delimiter ":" pertama yang memisahkan kata dan arti
    const colonIdx = content.indexOf(":");
    if (colonIdx === -1) continue;

    const left = content.slice(0, colonIdx).trim();
    let arti = content.slice(colonIdx + 1).trim();
    if (!arti) continue;

    // Bersihkan arti: hilangkan ";" akhir opsional tapi simpan isi
    // Normalisasi spasi
    arti = arti.replace(/\s+/g, " ").trim();
    // Hilangkan markup wiki sederhana: '' ''', [[link|display]] -> display, [[link]] -> link
    arti = arti.replace(/''+/g, "");
    arti = arti.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2");
    arti = arti.replace(/\[\[([^\]]+)\]\]/g, "$1");
    // Hapus tag <...>
    arti = arti.replace(/<[^>]+>/g, "").trim();
    if (!arti) continue;

    // Parse headwords di sisi kiri: bisa "[[aba]]", "[[abah]], [[abah-abah]]", "aba", "wuninga"
    // Ekstrak semua [[...]] jika ada, jika tidak ada pakai left mentah
    const bracketMatches = [...left.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) =>
      m[1].split("|").pop()!.trim(),
    );

    let headwords: string[];
    if (bracketMatches.length > 0) {
      headwords = bracketMatches;
    } else {
      // left tanpa bracket, split by ","
      headwords = left
        .split(",")
        .map((s) => s.trim().replace(/^\[\[|\]\]$/g, "").trim())
        .filter(Boolean);
    }

    for (const hw of headwords) {
      const kata = hw.trim();
      if (!kata || kata.length < 1) continue;
      const key = kata.toLowerCase();
      if (seen.has(key)) continue; // dedup exact
      seen.add(key);
      entries.push([kata, arti, 0]);
    }
  }

  // Sort alfabet Indonesia
  entries.sort((a, b) => a[0].localeCompare(b[0], "id", { sensitivity: "base" }));
  return entries;
}

async function main() {
  const wt = await fetchWikitext();
  const entries = parseWikitext(wt);
  console.log(`[wiktionary] parsed ${entries.length} entries`);
  if (entries.length < 5000) {
    console.warn("[wiktionary] WARNING: parsed count <5000, mungkin parser perlu dicek");
  }

  // Tulis wiktionary snapshot
  await Bun.write(OUT_WIKT, JSON.stringify(entries));
  console.log(`[wiktionary] wrote ${OUT_WIKT}`);

  // Untuk MVP, merged = wiktionary saja (nanti merge.ts akan overwrite dengan hasil merge + kbji)
  await Bun.write(OUT_MERGED, JSON.stringify(entries));
  console.log(`[wiktionary] wrote ${OUT_MERGED}`);

  // Meta
  let meta: Record<string, unknown> = {};
  try {
    const existing = await Bun.file(OUT_META).text();
    meta = JSON.parse(existing);
  } catch {}
  const now = new Date().toISOString();
  (meta as Record<string, unknown>)["wiktionary"] = {
    count: entries.length,
    updated: now,
    license: "CC BY-SA 4.0",
    source: "https://id.wiktionary.org/wiki/Lampiran:Kamus_bahasa_Sanskerta_%E2%80%93_bahasa_Indonesia",
  };
  (meta as Record<string, unknown>)["merged"] = { count: entries.length, updated: now };
  await Bun.write(OUT_META, JSON.stringify(meta, null, 2));
  console.log(`[wiktionary] wrote ${OUT_META}`);
  console.log(`[wiktionary] sample:`);
  for (const e of entries.slice(0, 5)) console.log(`  ${e[0]}: ${e[1].slice(0, 80)}`);
}

if (import.meta.main) await main();
