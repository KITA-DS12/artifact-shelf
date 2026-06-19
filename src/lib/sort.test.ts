import { describe, it, expect } from "vitest";
import { sortByUnreadThenCapturedDesc, sortArtifacts } from "./sort";
import type { Artifact } from "../types/artifact";

function make(
  overrides: Partial<Artifact> & Pick<Artifact, "id" | "capturedAt">,
): Artifact {
  return {
    title: overrides.id,
    sourcePath: "",
    fileType: "markdown",
    tags: [],
    generatedAt: null,
    importedAt: "2026-06-18T00:00:00Z",
    updatedAt: "2026-06-18T00:00:00Z",
    openedAt: null,
    isRead: false,
    isFavorite: false,
    source: "Unknown",
    note: "",
    ...overrides,
  };
}

describe("sortByUnreadThenCapturedDesc", () => {
  it("未読を既読より先に並べる", () => {
    const a = make({ id: "a", capturedAt: "2026-06-10T00:00:00Z", isRead: true });
    const b = make({ id: "b", capturedAt: "2026-06-09T00:00:00Z", isRead: false });
    expect(sortByUnreadThenCapturedDesc([a, b]).map((x) => x.id)).toEqual([
      "b",
      "a",
    ]);
  });

  it("同じ既読状態なら capturedAt 降順", () => {
    const a = make({ id: "a", capturedAt: "2026-06-10T00:00:00Z" });
    const b = make({ id: "b", capturedAt: "2026-06-18T00:00:00Z" });
    const c = make({ id: "c", capturedAt: "2026-06-15T00:00:00Z" });
    expect(
      sortByUnreadThenCapturedDesc([a, b, c]).map((x) => x.id),
    ).toEqual(["b", "c", "a"]);
  });

  it("元配列を変更しない", () => {
    const a = make({ id: "a", capturedAt: "2026-06-10T00:00:00Z" });
    const b = make({ id: "b", capturedAt: "2026-06-18T00:00:00Z" });
    const input = [a, b];
    sortByUnreadThenCapturedDesc(input);
    expect(input.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("取り込み時刻が同じならタイトル昇順で安定化", () => {
    const a = make({
      id: "1",
      title: "banana",
      capturedAt: "2026-06-18T00:00:00Z",
    });
    const b = make({
      id: "2",
      title: "apple",
      capturedAt: "2026-06-18T00:00:00Z",
    });
    expect(
      sortByUnreadThenCapturedDesc([a, b]).map((x) => x.title),
    ).toEqual(["apple", "banana"]);
  });
});

describe("sortArtifacts", () => {
  const items = [
    make({
      id: "a",
      title: "AAA",
      capturedAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-15T00:00:00Z",
      isFavorite: true,
    }),
    make({
      id: "b",
      title: "BBB",
      capturedAt: "2026-06-18T00:00:00Z",
      updatedAt: "2026-06-10T00:00:00Z",
    }),
    make({
      id: "c",
      title: "CCC",
      capturedAt: "2026-06-10T00:00:00Z",
      updatedAt: "2026-06-20T00:00:00Z",
    }),
  ];

  it("captured-desc", () => {
    expect(sortArtifacts(items, "captured-desc").map((a) => a.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("captured-asc", () => {
    expect(sortArtifacts(items, "captured-asc").map((a) => a.id)).toEqual([
      "a",
      "c",
      "b",
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
