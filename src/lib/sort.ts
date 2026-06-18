import type { Artifact } from "../types/artifact";

/**
 * 未読を先に、各グループ内では generatedAt の降順で並べる。
 * 元配列は変更しない。
 */
export function sortByUnreadThenGeneratedDesc(
  artifacts: readonly Artifact[],
): Artifact[] {
  return [...artifacts].sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    if (a.generatedAt !== b.generatedAt) {
      return a.generatedAt > b.generatedAt ? -1 : 1;
    }
    return a.title.localeCompare(b.title);
  });
}
