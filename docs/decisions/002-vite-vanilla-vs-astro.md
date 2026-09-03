# ADR 002 — Vite Vanilla vs Astro/Next

- **Status:** Accepted
- **Tanggal:** 2026-09-04
- **Context:** Halaman utama harus paling ringan, fitur utama live search. Opsi: Astro, Next static export, Vite + Vanilla TS, HTML tanpa build.

## Options

| Stack | JS gzipped (halaman utama) | Build 14k | SEO per kata | Kompleksitas |
|---|---|---|---|---|
| Next static export | ~70kb (React runtime) | 30–60s (14k halaman) | baik (per `/kata/[slug]`) | tinggi |
| Astro (islands) | ~5–10kb (hydration) | 30–60s | baik | sedang |
| **Vite Vanilla TS (chosen)** | **1.92kb** | **0.3s** | single-page (cukup untuk MVP) | rendah |
| HTML tanpa build | 0kb | 0s | sama | minimal tapi tanpa TS/minify |

## Decision

Pilih `Vite + Vanilla TS` (`vite.config.ts:1`, `src/app.ts:1`) untuk MVP. Alasan: live search 13k entri cukup `filter + normalize` di memory (1.65ms/100), tidak butuh framework. Build `dist/index.html 2.19kb + index-B7m3OER6.js 4.06kb`.

## Consequences

- **Positif:** First paint <120kb gzipped total (JS+CSS+kamus.json), termurah untuk user. `bun run dev` instan, `Bun + TS strict` tetap dapat type safety tanpa runtime cost (TS di-strip saat build).
- **Negatif:** Tidak ada halaman `/kata/aba` untuk SEO/share. Bisa upgrade ke Astro nanti — `data/kamus.json` tetap terpakai sebagai source (`getStaticPaths` 14k).
- **Mitigasi:** Struktur `scripts/merge.ts` & `Entry` sudah siap multi-source, migrasi ke Astro hanya tambah `src/pages/kata/[slug].astro`.

## Verification

`bun run build` → `assets/index-B7m3OER6.js 4.06kb (gzip 1.92kb)`, Lighthouse Performance target >95 (belum di-run di CI, cek manual via `preview`).
