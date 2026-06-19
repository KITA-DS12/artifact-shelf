import { describe, it, expect } from "vitest";
import { applyFilter, collectAllTags } from "./filter";
import { DEFAULT_FILTER, type LibraryFilter } from "../types/filter";
import type { Artifact } from "../types/artifact";

function make(overrides: Partial<Artifact> & Pick<Artifact, "id">): Artifact {
  return {
    title: overrides.id,
    sourcePath: `/tmp/${overrides.id}.md`,
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
    ...overrides,
  };
}

const sample: Artifact[] = [
  make({
    id: "a",
    title: "認証フロー",
    tags: ["review", "auth"],
    note: "Next.js",
    isRead: false,
    capturedAt: "2026-06-10T00:00:00Z",
  }),
  make({
    id: "b",
    title: "Repo Map",
    tags: ["repo"],
    fileType: "html",
    isRead: true,
    isFavorite: true,
    capturedAt: "2026-06-18T00:00:00Z",
  }),
  make({
    id: "c",
    title: "memo",
    tags: ["misc"],
    note: "auth に関するメモ",
    isRead: false,
    capturedAt: "2026-05-01T00:00:00Z",
  }),
];

function filterWith(overrides: Partial<LibraryFilter>): LibraryFilter {
  return { ...DEFAULT_FILTER, ...overrides };
}

describe("applyFilter", () => {
  it("デフォルトフィルタは全件返す", () => {
    expect(applyFilter(sample, DEFAULT_FILTER)).toHaveLength(3);
  });

  it("検索はタイトル / タグ / メモ / パスを部分一致で照合する", () => {
    expect(
      applyFilter(sample, filterWith({ search: "auth" })).map((a) => a.id),
    ).toEqual(["a", "c"]);
    expect(
      applyFilter(sample, filterWith({ search: "REPO" })).map((a) => a.id),
    ).toEqual(["b"]);
    expect(
      applyFilter(sample, filterWith({ search: "/c.md" })).map((a) => a.id),
    ).toEqual(["c"]);
  });

  it("タグは AND で適用", () => {
    expect(
      applyFilter(sample, filterWith({ tags: ["review", "auth"] })).map(
        (a) => a.id,
      ),
    ).toEqual(["a"]);
    expect(applyFilter(sample, filterWith({ tags: ["repo"] }))).toHaveLength(
      1,
    );
  });

  it("ファイル種別で絞り込める", () => {
    expect(
      applyFilter(sample, filterWith({ fileTypes: ["html"] })).map((a) => a.id),
    ).toEqual(["b"]);
  });

  it("未読 / 既読で絞り込める", () => {
    expect(
      applyFilter(sample, filterWith({ readState: "unread" })).map((a) => a.id),
    ).toEqual(["a", "c"]);
    expect(
      applyFilter(sample, filterWith({ readState: "read" })).map((a) => a.id),
    ).toEqual(["b"]);
  });

  it("お気に入りのみで絞り込める", () => {
    expect(
      applyFilter(sample, filterWith({ favoriteOnly: true })).map((a) => a.id),
    ).toEqual(["b"]);
  });

  it("取り込み日の期間で絞り込める", () => {
    expect(
      applyFilter(
        sample,
        filterWith({ capturedFrom: "2026-06-01", capturedTo: "2026-06-30" }),
      ).map((a) => a.id),
    ).toEqual(["a", "b"]);
  });

  it("openedState=opened は openedAt あり のみ", () => {
    const opened: Artifact[] = [
      make({ id: "x", openedAt: "2026-06-19T00:00:00Z" }),
      make({ id: "y" }),
    ];
    expect(
      applyFilter(opened, filterWith({ openedState: "opened" })).map((a) => a.id),
    ).toEqual(["x"]);
    expect(
      applyFilter(opened, filterWith({ openedState: "unopened" })).map(
        (a) => a.id,
      ),
    ).toEqual(["y"]);
  });

  it("複数条件は AND で適用される", () => {
    expect(
      applyFilter(
        sample,
        filterWith({
          search: "auth",
          readState: "unread",
          fileTypes: ["markdown"],
        }),
      ).map((a) => a.id),
    ).toEqual(["a", "c"]);
  });
});

describe("collectAllTags", () => {
  it("全件から重複なし・ソート済みでタグを抽出", () => {
    expect(collectAllTags(sample)).toEqual(["auth", "misc", "repo", "review"]);
  });
});
