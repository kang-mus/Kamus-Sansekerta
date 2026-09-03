# Data Contract — Kata Sansekerta

## Entry

```ts
// src/types.ts:1
type Source = 0 | 1; // 0 = wiktionary, 1 = kbji
type Entry = [string, string, Source]; // [kata, arti, source]
```

- `kata`: string, headword asli (contoh `aba`, `abang`, `(m)bok`), case-preserved
- `arti`: string, definisi Indonesia (contoh `perintah;`, `merah`), `"; "` dipisah, `<...>` & `[[...]]` sudah dibersihkan
- `source`: `0` Wiktionary, `1` KBJI (prioritas merge)

File: `data/kamus.json` = `Entry[]` sorted `localeCompare("id")`, JSON array-of-arrays (bukan object) untuk ukuran minimal.

Contoh:
```json
[["aba","perintah;",0],["abang","merah",0],["aban-aban","suara keras",0]]
```

## Snapshot Per Source

- `data/kamus.wiktionary.json`: `Entry[]` ~13.320, sumber `https://id.wiktionary.org/wiki/Lampiran:Kamus_bahasa_Sanskerta_%E2%80%93_bahasa_Indonesia`, lisensi `CC BY-SA 4.0`
- `data/kamus.kbji.json`: `Entry[]` ~0–41k (partial → complete), sumber `https://kbji.kemendikdasmen.go.id`, lisensi `Balai Bahasa DIY`
- `data/cache/kbji/`: HTML cache `list-{abjad}-p{n}.html`, `kata-{slug}.html` (ter-`.gitignore`)

## Meta

```ts
// src/types.ts:1
type MetaFile = {
  wiktionary: { count: number; updated: string; license: string; source: string };
  kbji?: { count: number; updated: string; license: string; source: string; status: "partial"|"complete" };
  merged: { count: number; updated: string };
};
```

File: `data/meta.json` + copy `public/data/meta.json` + `dist/data/meta.json`

## Merge Rule

`scripts/merge.ts:30` — `Map<lowerKata, Entry>`, isi `wiktionary` dulu, `kbji` overwrite. Sort `id` sensitive `base`.

## Validasi di App

`src/app.ts:173` — `Array.isArray(json) && e[0] is string && e[1] is string`, filter invalid. Pre-normalize `nKata/nArti = normalize(raw)` untuk search `1.65ms/100`.

## Ukuran

- Raw: ~440kb, gzip ~142kb (Wiktionary saja). Setelah merge KBJI ~1.1mb raw / ~260kb gzip (estimasi).
- Build JS: 4.06kb (gzip 1.92kb), CSS 2.70kb.

## Sync ke Public

`package.json:9` `sync:public` → `Bun.write('public/data/kamus.json', Bun.file('data/kamus.json').text())` agar `vite build` copy ke `dist/data/`.
