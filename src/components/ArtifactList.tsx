import type { Artifact } from "../types/artifact";
import { ArtifactCard } from "./ArtifactCard";

type Props = {
  artifacts: readonly Artifact[];
  missingIds?: ReadonlySet<string>;
  onSelect?: (artifact: Artifact) => void;
  selectMode?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelect?: (artifact: Artifact) => void;
  /** キーボードナビゲーションのフォーカス対象 id */
  focusedId?: string | null;
};

export function ArtifactList({
  artifacts,
  missingIds,
  onSelect,
  selectMode,
  selectedIds,
  onToggleSelect,
  focusedId,
}: Props) {
  if (artifacts.length === 0) {
    return (
      <section className="empty-state">
        <p>条件に合う Artifact がありません。</p>
        <p className="muted">
          検索条件を変えるか、「インポート」ボタンから新しい Artifact を登録してください。
        </p>
      </section>
    );
  }

  return (
    <section className="artifact-list" aria-label="Artifact 一覧">
      {artifacts.map((a) => (
        <ArtifactCard
          key={a.id}
          artifact={a}
          missing={missingIds?.has(a.id)}
          selectMode={selectMode}
          selected={selectedIds?.has(a.id)}
          focused={focusedId === a.id}
          onClick={onSelect}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </section>
  );
}
