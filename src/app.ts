import type { Entry } from "./types";
import { buildNormalized, filterEntries, highlight, type NormalizedEntry } from "./search";

const ABJAD = ["Semua", "A", "B", "C", "D", "Dh", "E", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "T", "U", "W", "Y"] as const;

let data: Entry[] = [];
let normData: NormalizedEntry[] = [];
let activeAbjad: string = "Semua";
let query = "";

const elSearch = document.getElementById("search") as HTMLInputElement | null;
const elResults = document.getElementById("results") as HTMLUListElement | null;
const elEmpty = document.getElementById("empty") as HTMLParagraphElement | null;
const elCount = document.getElementById("count") as HTMLSpanElement | null;
const elAbjad = document.getElementById("abjad") as HTMLElement | null;
const elMeta = document.getElementById("meta") as HTMLElement | null;

function getFiltered(): Entry[] {
  return filterEntries(normData, query, activeAbjad);
}

function render() {
  if (!elResults || !elEmpty || !elCount) return;
  const filtered = getFiltered();
  const q = query.trim();
  const slice = filtered.slice(0, 80);

  elResults.innerHTML = "";
  if (slice.length === 0) {
    elEmpty.hidden = false;
  } else {
    elEmpty.hidden = true;
    const frag = document.createDocumentFragment();
    for (const [kata, arti, src] of slice) {
      const li = document.createElement("li");
      const badge = src === 1 ? `<span class="badge badge-kbji">KBJI</span>` : "";
      li.innerHTML = `<div class="kata">${highlight(kata, q)}${badge}</div><div class="arti">${highlight(arti, q)}</div>`;
      frag.appendChild(li);
    }
    elResults.appendChild(frag);
  }

  const total = data.length;
  const shown = slice.length;
  const filteredCount = filtered.length;
  if (!q && activeAbjad === "Semua") {
    elCount.textContent = `${total.toLocaleString("id-ID")} lema · menampilkan ${shown}`;
  } else {
    elCount.textContent = `${filteredCount.toLocaleString("id-ID")} hasil · menampilkan ${shown} dari ${total.toLocaleString("id-ID")}`;
  }
}

function buildAbjad() {
  if (!elAbjad) return;
  for (const label of ABJAD) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.type = "button";
    btn.dataset.abjad = label;
    if (label === activeAbjad) btn.classList.add("is-active");
    btn.addEventListener("click", () => {
      activeAbjad = label;
      if (!elAbjad) return;
      for (const b of Array.from(elAbjad.querySelectorAll("button")))
        b.classList.toggle("is-active", (b as HTMLButtonElement).dataset.abjad === label);
      render();
    });
    elAbjad.appendChild(btn);
  }
}

let debounceTimer: number | undefined;
function onSearchInput() {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    query = elSearch?.value ?? "";
    render();
  }, 150);
}

async function load() {
  buildAbjad();
  elSearch?.addEventListener("input", onSearchInput);

  try {
    const res = await fetch("./data/kamus.json");
    if (!res.ok) throw new Error(`fetch kamus.json ${res.status}`);
    const json = (await res.json()) as Entry[];
    // Basic validation: external data treated as untrusted
    if (!Array.isArray(json) || json.length === 0) throw new Error("kamus.json invalid");
    data = json.filter((e): e is Entry => Array.isArray(e) && typeof e[0] === "string" && typeof e[1] === "string");
    // Pre-normalize for fast search (avoids 26k normalize calls per keystroke)
    normData = buildNormalized(data);
    if (elCount) elCount.textContent = `${data.length.toLocaleString("id-ID")} lema dimuat`;

    // meta
    try {
      const mRes = await fetch("./data/meta.json");
      if (mRes.ok) {
        const meta = (await mRes.json()) as Record<string, { count: number; updated: string }>;
        const w = meta["wiktionary"];
        const merged = meta["merged"];
        if (w || merged) {
          const c = merged?.count ?? w?.count ?? data.length;
          const d = (merged?.updated ?? w?.updated ?? "").slice(0, 10);
          if (elMeta) elMeta.textContent = `${c.toLocaleString("id-ID")} lema · update ${d}`;
        }
      }
    } catch {}

    render();
    // focus search on desktop
    if (window.innerWidth > 768) elSearch?.focus();
  } catch (e) {
    if (elCount) elCount.textContent = `Gagal memuat data: ${e}`;
    console.error(e);
  }
}

load();
