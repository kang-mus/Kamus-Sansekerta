import { describe, it, expect } from "vitest";
import { parseWikitext } from "../scripts/scrape-wiktionary";

describe("parseWikitext", () => {
  it("parses single entry", () => {
    const wt = "*[[aba]]: perintah;";
    const res = parseWikitext(wt);
    expect(res).toContainEqual(["aba", "perintah;", 0]);
  });

  it("parses multi-headword with comma", () => {
    const wt = "*[[abah]], [[abah-abah]]: perkakas, alat-alat;";
    const res = parseWikitext(wt);
    const katas = res.map((e) => e[0]);
    expect(katas).toContain("abah");
    expect(katas).toContain("abah-abah");
    expect(res.find((e) => e[0] === "abah")?.[1]).toBe("perkakas, alat-alat;");
  });

  it("parses sub-lema with **", () => {
    const wt = "*[[bojo]]: suami istri\n**[[(m)bok]]: ibu;";
    const res = parseWikitext(wt);
    expect(res.map((e) => e[0])).toContain("bojo");
    expect(res.map((e) => e[0])).toContain("(m)bok");
  });

  it("cleans wiki markup [[link|display]] and ''", () => {
    const wt = "*[[kata]]: ''arti'' dengan [[link|tampilan]];";
    const res = parseWikitext(wt);
    expect(res[0][1]).toBe("arti dengan tampilan;");
  });

  it("deduplicates case-insensitive", () => {
    const wt = "*[[aba]]: perintah;\n*[[Aba]]: perintah2;";
    const res = parseWikitext(wt);
    expect(res.filter((e) => e[0].toLowerCase() === "aba")).toHaveLength(1);
  });

  it("sorts Indonesian locale", () => {
    const wt = "*[[zebra]]: z;\n*[[aba]]: a;\n*[[mangga]]: m;";
    const res = parseWikitext(wt);
    expect(res.map((e) => e[0])).toEqual(["aba", "mangga", "zebra"]);
  });

  it("ignores lines without colon", () => {
    const wt = "*[[aba]] perintah tanpa colon\n*[[baba]]: valid;";
    const res = parseWikitext(wt);
    expect(res.map((e) => e[0])).not.toContain("aba");
    expect(res.map((e) => e[0])).toContain("baba");
  });
});
