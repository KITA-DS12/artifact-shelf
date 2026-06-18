import { describe, it, expect } from "vitest";
import { sortByUnreadThenGeneratedDesc, sortArtifacts } from "./sort";
import type { Artifact } from "../types/artifact";

function make(
  overrides: Partial<Artifact> & Pick<Artifact, "id" | "generatedAt">,
): Artifact {
  return {
    title: overrides.id,
    sourcePath: "",
    fileType: "markdown",
    tags: [],
    importedAt: "2026-06-18T00:00:00Z",
    updatedAt: "2026-06-18T00:00:00Z",
    isRead: false,
    isFavorite: false,
    source: "Unknown",
    note: "",
    ...overrides,
  };
}

describe("sortByUnreadThenGeneratedDesc", () => {
  it("未読を既読より先に並べる", () => {
    const a = make({ id: "a", generatedAt: "2026-06-10", isRead: true });
    const b = make({ id: "b", generatedAt: "2026-06-09", isRead: false });
    expect(sortByUnreadThenGeneratedDesc([a, b]).map((x) => x.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("同じ既読状態なら generatedAt 降順", () => {
    const a = make({ id: "a", generatedAt: "2026-06-10" });
    const b = make({ id: "b", generatedAt: "2026-06-18" });
    const c = make({ id: "c", generatedAt: "2026-06-15" });
    expect(
      sortByUnreadThenGeneratedDesc([a, b, c]).map((x) => x.id),
    ).toEqual(["b", "c", "a"]);
  });

  it("元配列を変更しない", () => {
    const a = make({ id: "a", generatedAt: "2026-06-10" });
    const b = make({ id: "b", generatedAt: "2026-06-18" });
    const input = [a, b];
    sortByUnreadThenGeneratedDesc(input);
    expect(input.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("生成日が同じならタイトル昇順で安定化", () => {
    const a = make({ id: "1", title: "banana", generatedAt: "2026-06-18" });
    const b = make({ id: "2", title: "apple", generatedAt: "2026-06-18" });
    expect(
      sortByUnreadThenGeneratedDesc([a, b]).map((x) => x.title),
    ).toEqual(["apple", "banana"]);
  });
});

describe("sortArtifacts", () => {
  const items = [
    make({
      id: "a",
      title: "AAA",
      generatedAt: "2026-06-01",
      importedAt: "2026-06-15T00:00:00Z",
      updatedAt: "2026-06-15T00:00:00Z",
      isFavorite: true,
    }),
    make({
      id: "b",
      title: "BBB",
      generatedAt: "2026-06-18",
      importedAt: "2026-06-18T00:00:00Z",
      updatedAt: "2026-06-10T00:00:00Z",
    }),
    make({
      id: "c",
      title: "CCC",
      generatedAt: "2026-06-10",
      importedAt: "2026-06-10T00:00:00Z",
      updatedAt: "2026-06-20T00:00:00Z",
    }),
  ];

  it("generated-desc", () => {
    expect(sortArtifacts(items, "generated-desc").map((a) => a.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("generated-asc", () => {
    expect(sortArtifacts(items, "generated-asc").map((a) => a.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("imported-desc", () => {
    expect(sortArtifacts(items, "imported-desc").map((a) => a.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("updated-desc", () => {
    expect(sortArtifacts(items, "updated-desc").map((a) => a.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("title-asc", () => {
    expect(sortArtifacts(items, "title-asc").map((a) => a.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("favorite-first はお気に入りを先に", () => {
    expect(sortArtifacts(items, "favorite-first")[0].id).toBe("a");
  });
});
