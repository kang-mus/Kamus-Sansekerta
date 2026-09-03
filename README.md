# Kata Sansekerta — Kamus Sanskerta–Indonesia (Statis)

Web statis Kamus Sanskerta–Indonesia. Live search instan (kata prioritas, fallback arti), filter abjad, <5kb JS gzipped. Data snapshot dari Wiktionary + siap merge KBJI.

Live: `dist/` (deploy ke GitHub Pages / Cloudflare Pages). Demo lokal: `bun run dev`.

## Fitur

- Live search: ketik `aba` atau `merah` → hasil <2ms (pre-normalized, 13.320 lema)
- Filter abjad: `Semua,A,B,C,D,Dh,E,G,H,I,J,K,L,M,N,O,P,R,S,T,U,W,Y`
- Highlight `<mark>`, 80 hasil teratas, sort `id`
- Minimalis, a11y `aria-live`, responsive

## Stack

`Bun 1.4 + TypeScript 5.9 (strict) + Vite 6 + Vanilla TS` — tanpa framework. Lihat `docs/decisions/002-vite-vanilla-vs-astro.md`.

## Data

- **MVP:** Wiktionary ID `Lampiran:Kamus_bahasa_Sanskerta_–_bahasa_Indonesia` (~13.320 entri, **CC BY-SA 4.0**) → `data/kamus.wiktionary.json`
- **Next:** KBJI `kbji.kemendikdasmen.go.id` (Balai Bahasa DIY, scraping HTML) → `data/kamus.kbji.json`
- **Merged:** `data/kamus.json` = `Entry = [kata, arti, source]` (`docs/data-contract.md`, `docs/decisions/001-format-data-array.md`) ~440kb / 142kb gzip

## Cara Jalan

```bash
bun install
bun run scrape:wiktionary   # fetch Wiktionary wikitext → data/kamus.wiktionary.json
bun run merge               # → data/kamus.json + data/meta.json
bun run sync:public         # copy data/* → public/data/* (otomatis di build)
bun run dev                 # http://localhost:5173
bun run build               # → dist/ (siap deploy)
bun run preview             # cek dist

# KBJI (opsional, lama ~5 jam full 41k, throttled 450ms + cache)
bun run scrape:kbji -- --abjad=A --limit=100  # test 100 kata A
bun run scrape:kbji -- --abjad=A --limit=100 --resume
bun run merge && bun run build
```

## Struktur

```
scripts/scrape-wiktionary.ts  # 1 request MediaWiki API
scripts/scrape-kbji.ts        # HTML scraping + cache data/cache/kbji/
scripts/merge.ts              # dedup case-insensitive, KBJI prioritas
src/app.ts                    # live search + filter + highlight
src/types.ts                  # Entry, Source, MetaFile
data/kamus.json               # merged snapshot (yang di-fetch app)
public/data/                  # copy untuk vite build → dist/data/
docs/                         # spec, architecture, data-contract, decisions
```

## Atribusi

- Wiktionary: `https://id.wiktionary.org/wiki/Lampiran:Kamus_bahasa_Sanskerta_%E2%80%93_bahasa_Indonesia` (CC BY-SA 4.0)
- KBJI: `https://kbji.kemendikdasmen.go.id` (Balai Bahasa Provinsi DIY)

## Lisensi

Kode MIT. Data Wiktionary CC BY-SA 4.0. Data KBJI milik Balai Bahasa DIY — cantumkan sumber saat publikasi.

## Docs

- `docs/spec.md`
- `docs/architecture.md`
- `docs/data-contract.md`
- `docs/decisions/`
