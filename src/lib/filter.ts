import type { Artifact } from "../types/artifact";
import type { LibraryFilter } from "../types/filter";

function matchesSearch(a: Artifact, q: string): boolean {
  const fields: string[] = [a.title, a.note, a.sourcePath, ...a.tags];
  return fields.some((f) => f.toLowerCase().includes(q));
}

function capturedDate(a: Artifact): string {
  return a.capturedAt.slice(0, 10);
}

export function applyFilter(
  artifacts: readonly Artifact[],
  filter: LibraryFilter,
): Artifact[] {
  const q = filter.search.trim().toLowerCase();
  return artifacts.filter((a) => {
    if (q && !matchesSearch(a, q)) return false;
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
    if (filter.readState === "unread" && a.isRead) return false;
    if (filter.readState === "read" && !a.isRead) return false;
    if (filter.favoriteOnly && !a.isFavorite) return false;
    if (filter.capturedFrom && capturedDate(a) < filter.capturedFrom)
      return false;
    if (filter.capturedTo && capturedDate(a) > filter.capturedTo) return false;
    return true;
  });
}

export function collectAllTags(artifacts: readonly Artifact[]): string[] {
  const set = new Set<string>();
  artifacts.forEach((a) => a.tags.forEach((t) => set.add(t)));
  return [...set].sort((a, b) => a.localeCompare(b));
}
