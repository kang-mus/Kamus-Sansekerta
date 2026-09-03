# Spec — Kata Sansekerta (MVP)

## Tujuan
Web statis Kamus Sanskerta–Indonesia yang ringan, live search instan, tanpa backend.

## Sumber Data
- **MVP:** Wiktionary ID `Lampiran:Kamus_bahasa_Sanskerta_–_bahasa_Indonesia` (~13.320 entri, CC BY-SA 4.0)
- **Next (siap merge):** KBJI `kbji.kemendikdasmen.go.id` (~41.2k lema, scraping HTML, Balai Bahasa DIY)

## Pengguna & Use Case
Pencari kata Sanskerta/Jawa arkais → Indonesia. Ketik `aba`, `merah`, atau filter huruf `B` → hasil <100ms di HP.

## Fitur MVP
- Live search default `kata`, fallback `arti` (Indonesia). Prioritas: kata exact > prefix > contains > arti.
- Filter abjad: `Semua,A,B,C,D,Dh,E,G,H,I,J,K,L,M,N,O,P,R,S,T,U,W,Y` (sesuai seksi Wiktionary).
- Highlight match `<mark>` untuk kata & arti.
- Menampilkan 80 hasil teratas, sort alfabet `id`.
- Atribusi lisensi di footer, `data/meta.json` (`count`, `updated`).

## Non-Goal MVP
- Aksara Jawa/Devanagari (data Latin saja).
- 14k halaman per kata untuk SEO (single-page vanilla lebih ringan).
- Fuzzy typo-tolerant (bisa tambah `MiniSearch` nanti).

## Acceptance Criteria
- `bun run scrape:wiktionary && bun run merge` menghasilkan `data/kamus.json` 13k+ entri.
- `bun run build` → `dist/` <10kb JS+CSS gzipped + `data/kamus.json` 142kb gzipped.
- Ketik `aba` → `aba: perintah;` di atas, `merah` → `abang: merah` muncul.
- Filter `B` + query `babad` → hanya hasil B.
- `bun run typecheck` & `bun run build` hijau.

## Stack
`Bun + TypeScript (strict) + Vite + Vanilla TS` — tanpa framework.
