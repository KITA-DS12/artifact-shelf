import { describe, it, expect } from "vitest";
import { buildDirectoryTree, isUnderDirectory } from "./directory-tree";
import type { Artifact } from "../types/artifact";

function art(sourcePath: string): Artifact {
  return {
    id: sourcePath,
    title: sourcePath,
    sourcePath,
    fileType: "markdown",
    tags: [],
    capturedAt: "2026-06-18T00:00:00Z",
    generatedAt: null,
    importedAt: "2026-06-18T00:00:00Z",
    updatedAt: "2026-06-18T00:00:00Z",
    openedAt: null,
    isRead: false,
    isFavorite: false,
    source: "Unknown",
    note: "",
  };
}

describe("buildDirectoryTree", () => {
  it("空配列は空の森", () => {
    expect(buildDirectoryTree([])).toEqual([]);
  });

  it("単一ファイルは 1 本の枝として返る", () => {
    const tree = buildDirectoryTree([art("/Users/me/repo/a.md")]);
    expect(tree).toHaveLength(1);
    // 単独枝なので最大限まで圧縮される
    expect(tree[0].name).toBe("Users/me/repo");
    expect(tree[0].path).toBe("/Users/me/repo");
    expect(tree[0].count).toBe(1);
    expect(tree[0].children).toEqual([]);
  });

  it("共通プレフィックスは圧縮される", () => {
    const tree = buildDirectoryTree([
      art("/Users/me/repo-a/x.md"),
      art("/Users/me/repo-b/y.md"),
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("Users/me");
    expect(tree[0].count).toBe(2);
    const childNames = tree[0].children.map((c) => c.name);
    expect(childNames).toEqual(["repo-a", "repo-b"]);
  });

  it("兄弟が複数ある分岐点では圧縮しない", () => {
    const tree = buildDirectoryTree([
      art("/Users/me/repo/docs/a.md"),
      art("/Users/me/repo/src/b.md"),
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("Users/me/repo");
    expect(tree[0].children.map((c) => c.name)).toEqual(["docs", "src"]);
  });

  it("同じディレクトリの複数ファイルが集計される", () => {
    const tree = buildDirectoryTree([
      art("/Users/me/repo/a.md"),
      art("/Users/me/repo/b.md"),
      art("/Users/me/repo/c.md"),
    ]);
    expect(tree[0].count).toBe(3);
    expect(tree[0].path).toBe("/Users/me/repo");
  });

  it("カウントは自分 + 子孫の合計", () => {
    const tree = buildDirectoryTree([
      art("/Users/me/repo/docs/a.md"),
      art("/Users/me/repo/docs/b.md"),
      art("/Users/me/repo/src/c.md"),
    ]);
    expect(tree[0].count).toBe(3);
    const docs = tree[0].children.find((c) => c.name === "docs")!;
    expect(docs.count).toBe(2);
    const src = tree[0].children.find((c) => c.name === "src")!;
    expect(src.count).toBe(1);
  });

  it("複数の独立ルートは forest になる", () => {
    const tree = buildDirectoryTree([
      art("/Users/me/repo/a.md"),
      art("/Users/other/work/b.md"),
    ]);
    // 共通祖先は /Users（兄弟が 2 つあるので圧縮停止）
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("Users");
    expect(tree[0].children.map((c) => c.name)).toEqual(["me/repo", "other/work"]);
  });

  it("Windows パスも扱える", () => {
    const tree = buildDirectoryTree([
      art("C:\\Users\\me\\repo\\a.md"),
      art("C:\\Users\\me\\repo\\b.md"),
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe("C:\\Users\\me\\repo");
    expect(tree[0].path).toBe("C:\\Users\\me\\repo");
    expect(tree[0].count).toBe(2);
  });
});

describe("isUnderDirectory", () => {
  it("ディレクトリ配下のパスは true", () => {
    expect(isUnderDirectory("/Users/me/repo/a.md", "/Users/me/repo")).toBe(true);
    expect(isUnderDirectory("/Users/me/repo/sub/a.md", "/Users/me/repo")).toBe(
      true,
    );
  });

  it("プレフィックスだけ同じで境界が違う場合は false", () => {
    expect(
      isUnderDirectory("/Users/me/repo-other/a.md", "/Users/me/repo"),
    ).toBe(false);
  });

  it("Windows パスでも動く", () => {
    expect(
      isUnderDirectory("C:\\Users\\me\\repo\\a.md", "C:\\Users\\me\\repo"),
    ).toBe(true);
  });
});
