import type { Artifact } from "../types/artifact";
import type { SortKey } from "../types/filter";

function compareDesc(a: string, b: string): number {
  if (a === b) return 0;
  return a > b ? -1 : 1;
}

/**
 * 未読を先に、各グループ内では capturedAt の降順で並べる。
 * 元配列は変更しない。
 */
export function sortByUnreadThenCapturedDesc(
  artifacts: readonly Artifact[],
): Artifact[] {
  return [...artifacts].sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    if (a.capturedAt !== b.capturedAt)
      return compareDesc(a.capturedAt, b.capturedAt);
    return a.title.localeCompare(b.title);
  });
}

export function sortArtifacts(
  artifacts: readonly Artifact[],
  key: SortKey,
): Artifact[] {
  switch (key) {
    case "unread-then-captured-desc":
      return sortByUnreadThenCapturedDesc(artifacts);
    case "captured-desc":
      return [...artifacts].sort((a, b) =>
        compareDesc(a.capturedAt, b.capturedAt),
      );
    case "captured-asc":
      return [...artifacts].sort((a, b) =>
        compareDesc(b.capturedAt, a.capturedAt),
      );
    case "updated-desc":
      return [...artifacts].sort((a, b) =>
        compareDesc(a.updatedAt, b.updatedAt),
      );
    case "title-asc":
      return [...artifacts].sort((a, b) => a.title.localeCompare(b.title));
    case "favorite-first":
      return [...artifacts].sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
        return compareDesc(a.capturedAt, b.capturedAt);
      });
  }
}
