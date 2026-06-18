import { describe, it, expect } from "vitest";
import { sortByUnreadThenGeneratedDesc } from "./sort";
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
  } as Artifact;
}

describe("sortByUnreadThenGeneratedDesc", () => {
  it("未読を既読より先に並べる", () => {
    const a = make({ id: "a", generatedAt: "2026-06-10", isRead: true });
    const b = make({ id: "b", generatedAt: "2026-06-09", isRead: false });
    const sorted = sortByUnreadThenGeneratedDesc([a, b]);
    expect(sorted.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("同じ既読状態なら generatedAt 降順", () => {
    const a = make({ id: "a", generatedAt: "2026-06-10" });
    const b = make({ id: "b", generatedAt: "2026-06-18" });
    const c = make({ id: "c", generatedAt: "2026-06-15" });
    const sorted = sortByUnreadThenGeneratedDesc([a, b, c]);
    expect(sorted.map((x) => x.id)).toEqual(["b", "c", "a"]);
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
    const sorted = sortByUnreadThenGeneratedDesc([a, b]);
    expect(sorted.map((x) => x.title)).toEqual(["apple", "banana"]);
  });
});
