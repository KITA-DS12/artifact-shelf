import type { Artifact } from "../types/artifact";
import type { LibraryFilter } from "../types/filter";
import { isUnderDirectory } from "./directory-tree";
import { isRead } from "./read-state";

function matchesSearch(
  a: Artifact,
  q: string,
  contentMatched?: ReadonlySet<string>,
): boolean {
  const fields: string[] = [a.title, a.note, a.sourcePath, ...a.tags];
  if (fields.some((f) => f.toLowerCase().includes(q))) return true;
  // 本文検索 ON のとき、メタデータにマッチしなくても本文にあれば OR で通す
  if (contentMatched && contentMatched.has(a.id)) return true;
  return false;
}

function capturedDate(a: Artifact): string {
  return a.capturedAt.slice(0, 10);
}

/**
 * フィルタを適用する。検索クエリは title / tag / note / path に対する case-insensitive
 * 部分一致で、本文検索 ON のときは `contentMatched` set に含まれる id も OR で通す。
 */
export function applyFilter(
  artifacts: readonly Artifact[],
  filter: LibraryFilter,
  contentMatched?: ReadonlySet<string> | null,
): Artifact[] {
  const q = filter.search.trim().toLowerCase();
  const cm = contentMatched ?? undefined;
  return artifacts.filter((a) => {
    // view 切替: active は deletedAt === null のみ、trash は deletedAt !== null のみ
    if (filter.view === "active" && a.deletedAt !== null) return false;
    if (filter.view === "trash" && a.deletedAt === null) return false;
    if (q && !matchesSearch(a, q, cm)) return false;
    if (
      filter.tags.length > 0 &&
      !filter.tags.every((t) => a.tags.includes(t))
    )
      return false;
    if (
      filter.fileTypes.length > 0 &&
      !filter.fileTypes.includes(a.fileType)
    )
      return false;
    if (filter.readState === "unread" && isRead(a)) return false;
    if (filter.readState === "read" && !isRead(a)) return false;
    if (filter.favoriteOnly && !a.isFavorite) return false;
    if (filter.capturedFrom && capturedDate(a) < filter.capturedFrom)
      return false;
    if (filter.capturedTo && capturedDate(a) > filter.capturedTo) return false;
    if (filter.directory && !isUnderDirectory(a.sourcePath, filter.directory))
      return false;
    return true;
  });
}

export function collectAllTags(artifacts: readonly Artifact[]): string[] {
  const set = new Set<string>();
  artifacts.forEach((a) => a.tags.forEach((t) => set.add(t)));
  return [...set].sort((a, b) => a.localeCompare(b));
}
