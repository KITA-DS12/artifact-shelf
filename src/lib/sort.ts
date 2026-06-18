import type { Artifact } from "../types/artifact";
import type { SortKey } from "../types/filter";

function compareString(a: string, b: string): number {
  if (a === b) return 0;
  return a > b ? -1 : 1;
}

/**
 * 未読を先に、各グループ内では generatedAt の降順で並べる。
 * 元配列は変更しない。
 */
export function sortByUnreadThenGeneratedDesc(
  artifacts: readonly Artifact[],
): Artifact[] {
  return [...artifacts].sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    if (a.generatedAt !== b.generatedAt)
      return compareString(a.generatedAt, b.generatedAt);
    return a.title.localeCompare(b.title);
  });
}

export function sortArtifacts(
  artifacts: readonly Artifact[],
  key: SortKey,
): Artifact[] {
  switch (key) {
    case "unread-then-generated-desc":
      return sortByUnreadThenGeneratedDesc(artifacts);
    case "generated-desc":
      return [...artifacts].sort((a, b) =>
        compareString(a.generatedAt, b.generatedAt),
      );
    case "generated-asc":
      return [...artifacts].sort((a, b) =>
        compareString(b.generatedAt, a.generatedAt),
      );
    case "imported-desc":
      return [...artifacts].sort((a, b) =>
        compareString(a.importedAt, b.importedAt),
      );
    case "updated-desc":
      return [...artifacts].sort((a, b) =>
        compareString(a.updatedAt, b.updatedAt),
      );
    case "title-asc":
      return [...artifacts].sort((a, b) => a.title.localeCompare(b.title));
    case "favorite-first":
      return [...artifacts].sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
        return compareString(a.generatedAt, b.generatedAt);
      });
  }
}
