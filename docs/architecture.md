# Architecture — Kata Sansekerta

## Diagram Alir Data

```
Wiktionary API (wikitext)          KBJI HTML (/terjemahan/list + /kata/{slug})
        |                                      |
        v                                      v
scripts/scrape-wiktionary.ts       scripts/scrape-kbji.ts (throttled 450ms, cache)
        |                                      |
        v                                      v
data/kamus.wiktionary.json         data/kamus.kbji.json (+ data/cache/kbji/)
        \                                     /
         \                                   /
          \                                 /
           scripts/merge.ts (deduplicate case-insensitive, KBJI prioritas)
                    |
                    v
              data/kamus.json (Entry = [kata, arti, source]) ~440kb
              data/meta.json  (wiktionary/merged/kbji)
                    |
                    v (synced to public/data/ via bun run sync:public)
              Vite build → dist/
                    |
                    v
              src/app.ts (fetch + pre-normalize + live search + abjad filter + highlight)
```

## Modul

- `src/types.ts:1` — `Source = 0|1`, `Entry = [string,string,Source]`, `MetaFile`
- `src/app.ts:1` — fetch `data/kamus.json` (validate shape), pre-normalize `nKata/nArti`, `getFiltered()` scoring, `highlight()` escape, `render()` 80 slice, `buildAbjad()`
- `src/style.css:1` — minimalis, `--accent #1d4ed8`, grid results, mark `#fef08a`
- `index.html:1` — `#search`, `#abjad`, `#results[aria-live]`, footer atribusi

## Build & Deploy

- `bun run typecheck` → `tsc --noEmit`
- `bun run build` → `sync:public` (Bun.write `data/*` → `public/data/*`) → `vite build` → `dist/` (copy `public/` otomatis)
- `dist/` siap `GitHub Pages / Cloudflare Pages` (statis, base `./`)

## Keputusan Kunci

- Single-page vanilla, bukan 14k halaman Astro → lihat `docs/decisions/002-vite-vanilla-vs-astro.md`
- Format `[kata,arti,source]` array, bukan object → lihat `docs/decisions/001-format-data-array.md`
- KBJI scraping HTML (bukan API key) → throttled + cache + resumable, merge deduplicate.

## Risiko & Mitigasi

- KBJI class `kbji-word-pill` berubah → `parseListHtml(html, abjad)` pakai regex `href="/kata/..."` (lebih stabil dari class).
- Wiktionary wikitext format ganti → test `parsed count <5000` warning.
- Lisensi KBJI tidak CC → footer atribusi `Balai Bahasa DIY` + link sumber.
