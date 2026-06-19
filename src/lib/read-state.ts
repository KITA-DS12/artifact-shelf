import type { Artifact } from "../types/artifact";

/**
 * 既読判定。詳細を一度でも開いた = `openedAt` が入っていれば既読。
 * 手動の `isRead` フラグは後方互換のため残しているがフロントでは参照しない。
 */
export function isRead(artifact: Pick<Artifact, "openedAt">): boolean {
  return artifact.openedAt !== null && artifact.openedAt !== undefined;
}
