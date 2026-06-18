import { describe, it, expect } from "vitest";
import { generateToc } from "./toc";

describe("generateToc", () => {
  it("H1〜H3 だけ抽出する", () => {
    const md = `# A\n## B\n### C\n#### D ignored\nbody`;
    expect(generateToc(md)).toEqual([
      { level: 1, text: "A", slug: "a" },
      { level: 2, text: "B", slug: "b" },
      { level: 3, text: "C", slug: "c" },
    ]);
  });

  it("コードブロック内の # は見出しとして扱わない", () => {
    const md = "# 本物\n\n```sh\n# これはコメント\n```\n## 本物2\n";
    const toc = generateToc(md);
    expect(toc.map((e) => e.text)).toEqual(["本物", "本物2"]);
  });

  it("日本語タイトルも slug 化される", () => {
    const toc = generateToc("# 認証フローのレビュー");
    expect(toc[0].slug).toMatch(/[぀-ゟ゠-ヿ一-鿿]/);
  });

  it("空入力は空配列", () => {
    expect(generateToc("")).toEqual([]);
  });
});
