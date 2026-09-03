/**
 * Scrape KBJI via HTML (tanpa API key)
 * - List: /terjemahan/list?abjad=A&page=N  -> .kbji-word-pill
 * - Detail: /kata/{slug} -> .kbji-result-body (padanan Indonesia)
 *
 * Fitur:
 * - Throttled (delay 400ms)
 * - Cache HTML di data/cache/kbji/
 * - Resumable (--resume)
 * - Output: data/kamus.kbji.json (Entry[]) + update data/meta.json
 *
 * Catatan: proses penuh ~41k kata bisa 5 jam, jadi jalan background. Untuk demo/MVP bisa pakai --limit.
 */
import type { Entry } from "../src/types.ts";

const BASE = "https://kbji.kemendikdasmen.go.id";
const ABJAD = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DELAY_MS = 450;
const CACHE_DIR = "data/cache/kbji";
const OUT_KBJI = "data/kamus.kbji.json";
const OUT_META = "data/meta.json";

const args = process.argv.slice(2);
const RESUME = args.includes("--resume");
// limit untuk testing: --limit=200 (hanya 200 kata pertama)
  const limitArg = args.find((a: string) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1]!, 10) : Infinity;
// abjad filter: --abjad=A,B,C
const abjadArg = args.find((a: string) => a.startsWith("--abjad="));
const ABJAD_FILTER = abjadArg ? abjadArg.split("=")[1]!.split(",").map((s: string) => s.trim().toUpperCase()) : null;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchHtml(url: string, cachePath: string): Promise<string> {
  if (RESUME) {
    const f = Bun.file(cachePath);
    if (await f.exists()) {
      const t = await f.text();
      if (t.length > 500) return t;
    }
  }
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Kata-Sansekerta/0.1 (bun; educational; +https://github.com)",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  const text = await res.text();
  await Bun.write(cachePath, text);
  await sleep(DELAY_MS);
  return text;
}

function parseListHtml(html: string, abjad: string): { slugs: string[]; totalPages: number; totalLema: number } {
  // .kbji-word-pill href="/kata/xxx"
  const slugs: string[] = [];
  const re = /href="\/kata\/([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      slugs.push(decodeURIComponent(m[1]));
    } catch {
      slugs.push(m[1]);
    }
  }
  // total pages: prefer link "Terakhir" for current abjad, fallback to max ?page=
  let totalPages = 1;
  const escapedAbjad = abjad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const lastPageMatch = html.match(new RegExp(`/abjad/${escapedAbjad}\\?page=(\\d+)[^>]*>Terakhir`));
  if (lastPageMatch) totalPages = parseInt(lastPageMatch[1], 10);
  else {
    const pageMatches = [...html.matchAll(/\?page=(\d+)/g)].map((x) => parseInt(x[1], 10));
    if (pageMatches.length) totalPages = Math.max(...pageMatches);
  }
  // total lema
  let totalLema = slugs.length;
  const totalMatch = html.match(/total\s*<strong>(\d+)<\/strong>\s*lema/i);
  if (totalMatch) totalLema = parseInt(totalMatch[1], 10);
  return { slugs, totalPages, totalLema };
}

function parseDetailHtml(html: string): string {
  // Ambil semua <p class="indent..."> di dalam .kbji-result-body
  // Sederhana: ekstrak kbji-result-body block
  const bodyMatch = html.match(/<div class="kbji-result-body">([\s\S]*?)<\/div>\s*<div class="kbji-usul-btn"/);
  const block = bodyMatch ? bodyMatch[1] : html;

  // Kumpulkan semua <p class="indent...">...</p>
  const pRe = /<p class="indent[^>]*>([\s\S]*?)<\/p>/g;
  const parts: string[] = [];
  let pm: RegExpExecArray | null;
  while ((pm = pRe.exec(block))) {
    let t = pm[1];
    // hilangkan <button>...</button>
    t = t.replace(/<button[\s\S]*?<\/button>/g, "");
    // ganti <span class="kbji-abbr" title="...">dg</span> -> "dg"
    // simpan title sebagai plain: tidak perlu
    t = t.replace(/<[^>]+>/g, "");
    // decode entities
    t = t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
    t = t.replace(/\s+/g, " ").trim();
    if (t) parts.push(t);
  }

  if (parts.length === 0) {
    // fallback: cari kbji-exact-match atau plain
    const plain = block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return plain.slice(0, 400);
  }

  // Gabung dengan " | " atau " " — untuk arti, pisah dengan "; "
  // parts[0] biasanya: "aba 1 suara...; 2 perintah..."
  return parts.join(" | ").slice(0, 800);
}

async function scrapeAbjad(abjad: string): Promise<string[]> {
  console.log(`[kbji] abjad ${abjad} — fetching page 1`);
  const firstUrl = `${BASE}/terjemahan/list?abjad=${abjad}`;
  const firstHtml = await fetchHtml(firstUrl, `${CACHE_DIR}/list-${abjad}-p1.html`);
  const { slugs: firstSlugs, totalPages } = parseListHtml(firstHtml, abjad);
  console.log(`[kbji] abjad ${abjad}: ~${totalPages} pages, page1 ${firstSlugs.length} slugs`);

  const allSlugs = [...firstSlugs];
  for (let p = 2; p <= totalPages; p++) {
    if (allSlugs.length >= LIMIT) break;
    const url = `${BASE}/abjad/${abjad}?page=${p}`;
    // KBJI list juga bisa diakses via /terjemahan/list?abjad=A&page=N tapi pagination link pakai /abjad/A?page=N
    // coba keduanya
    const cachePath = `${CACHE_DIR}/list-${abjad}-p${p}.html`;
    try {
      const html = await fetchHtml(url, cachePath);
      const { slugs } = parseListHtml(html, abjad);
      allSlugs.push(...slugs);
      if (p % 10 === 0) console.log(`[kbji] abjad ${abjad} page ${p}/${totalPages} total slugs ${allSlugs.length}`);
      if (slugs.length === 0) break;
    } catch (e) {
      console.warn(`[kbji] abjad ${abjad} page ${p} failed: ${e}`);
      await sleep(1000);
    }
  }
  return allSlugs;
}

async function main() {
  const targetAbjad = ABJAD_FILTER ? ABJAD.filter((a) => ABJAD_FILTER.includes(a)) : ABJAD;
  console.log(`[kbji] target abjad: ${targetAbjad.join(",")} resume=${RESUME} limit=${LIMIT}`);

  // Phase 1: collect slugs
  const allSlugs: string[] = [];
  for (const abjad of targetAbjad) {
    const slugs = await scrapeAbjad(abjad);
    allSlugs.push(...slugs);
    if (allSlugs.length >= LIMIT) {
      console.log(`[kbji] limit ${LIMIT} reached, stopping slug collection`);
      break;
    }
  }

  const uniqueSlugs = [...new Set(allSlugs)].slice(0, LIMIT);
  console.log(`[kbji] total unique slugs collected: ${uniqueSlugs.length}`);

  if (uniqueSlugs.length === 0) {
    console.error("[kbji] no slugs found, abort");
    return;
  }

  // Phase 2: fetch details
  const entries: Entry[] = [];
  // load existing jika resume
  if (RESUME) {
    try {
      const existing = JSON.parse(await Bun.file(OUT_KBJI).text()) as Entry[];
      if (existing.length > 0) {
        console.log(`[kbji] resume: loaded ${existing.length} existing entries`);
        entries.push(...existing);
      }
    } catch {}
  }
  const existingSet = new Set(entries.map((e) => e[0].toLowerCase()));

  let count = 0;
  for (const slug of uniqueSlugs) {
    // slug bisa "abah, abah-abah" — pecah jadi beberapa kata? Simpan sebagai kata utama slug mentah
    // Untuk detail, fetch pakai slug yang encoded
    const kataKey = slug.toLowerCase();
    if (existingSet.has(kataKey)) continue;

    const encoded = encodeURIComponent(slug);
    const url = `${BASE}/kata/${encoded}`;
    const cachePath = `${CACHE_DIR}/kata-${encodeURIComponent(slug).replace(/%/g, "_")}.html`;

    try {
      const html = await fetchHtml(url, cachePath);
      const arti = parseDetailHtml(html);
      if (!arti || arti.length < 3) {
        console.warn(`[kbji] skip ${slug}: arti too short`);
        continue;
      }
      // slug bisa mengandung ", " -> pecah jadi beberapa entry dengan arti sama
      const headwords = slug
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const hw of headwords) {
        const key = hw.toLowerCase();
        if (existingSet.has(key)) continue;
        existingSet.add(key);
        entries.push([hw, arti, 1]);
      }
      count++;
      if (count % 50 === 0) {
        console.log(`[kbji] fetched ${count}/${uniqueSlugs.length} entries total ${entries.length}`);
        // checkpoint
        await Bun.write(OUT_KBJI, JSON.stringify(entries));
      }
    } catch (e) {
      console.warn(`[kbji] failed ${slug}: ${e}`);
      await sleep(800);
    }

    if (entries.length >= LIMIT) break;
  }

  // Sort
  entries.sort((a, b) => a[0].localeCompare(b[0], "id", { sensitivity: "base" }));
  await Bun.write(OUT_KBJI, JSON.stringify(entries));
  console.log(`[kbji] wrote ${OUT_KBJI} count=${entries.length}`);

  // Update meta
  let meta: Record<string, unknown> = {};
  try {
    meta = JSON.parse(await Bun.file(OUT_META).text());
  } catch {}
  const now = new Date().toISOString();
  (meta as Record<string, unknown>)["kbji"] = {
    count: entries.length,
    updated: now,
    license: "Balai Bahasa DIY (KBJI)",
    source: "https://kbji.kemendikdasmen.go.id",
    status: entries.length >= 40000 ? "complete" : "partial",
  };
  await Bun.write(OUT_META, JSON.stringify(meta, null, 2));
  console.log(`[kbji] updated ${OUT_META}`);
  console.log(`[kbji] sample:`);
  for (const e of entries.slice(0, 3)) console.log(`  ${e[0]}: ${e[1].slice(0, 80)}`);
}

if (import.meta.main) await main();
