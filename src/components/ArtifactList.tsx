import type { Artifact } from "../types/artifact";
import { ArtifactCard } from "./ArtifactCard";

type Props = {
  artifacts: readonly Artifact[];
  missingIds?: ReadonlySet<string>;
  onSelect?: (artifact: Artifact) => void;
};

export function ArtifactList({ artifacts, missingIds, onSelect }: Props) {
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
          onClick={onSelect}
        />
      ))}
    </section>
  );
}
