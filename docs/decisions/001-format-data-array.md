# ADR 001 — Format Data Array-of-Arrays

- **Status:** Accepted
- **Tanggal:** 2026-09-04
- **Context:** Perlu snapshot `data/kamus.json` untuk 13–50k entri, dibaca `fetch().json()` di browser. Pilihan: object, array, CSV, NDJSON.

## Options

| Format | Contoh 1 entri | Raw 14k | Gzip | Konsumsi JS |
|---|---|---|---|---|
| Object `[{"k":"aba","a":"perintah;", "s":0}]` | 30–45 byte | ~550kb | ~155kb | `fetch().json()` |
| **Array `["aba","perintah;",0]` (chosen)** | 20–30 byte | ~440kb | **~142kb** | `fetch().json()` |
| CSV `aba,"perintah;",0` | 18–28 byte | ~360kb | ~120kb | butuh `PapaParse` +5kb, rapuh `","` di arti |
| NDJSON | mirip array | ~440kb | ~142kb | split manual |

## Decision

Pakai `Entry = [kata, arti, source]` (`src/types.ts:1`), JSON array-of-arrays.

## Consequences

- **Positif:** 30% lebih kecil dari object (tanpa pengulangan key `"k","a"` 14k×), tanpa parser tambahan seperti CSV. `arti` mengandung `, ; "` tidak perlu escape CSV.
- **Negatif:** Kurang readable di `cat kamus.json` (harus ingat index 0=kata,1=arti,2=source) → diatasi dengan `type Entry` + `data-contract.md`.
- **Alternatif ditolak:** CSV lebih kecil tapi butuh library + edge case arti. Object lebih readable tapi boros 100kb.

## Verification

`bun -e` gzip `data/kamus.json` 142kb, `typecheck` lolos, `app.ts` langsung `data.map(raw => ...)` tanpa parse step.
