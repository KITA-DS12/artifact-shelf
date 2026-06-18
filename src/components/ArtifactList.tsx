import type { Artifact } from "../types/artifact";
import { sortByUnreadThenGeneratedDesc } from "../lib/sort";
import { ArtifactCard } from "./ArtifactCard";

type Props = {
  artifacts: readonly Artifact[];
  onSelect?: (artifact: Artifact) => void;
};

export function ArtifactList({ artifacts, onSelect }: Props) {
  if (artifacts.length === 0) {
    return (
      <section className="empty-state">
        <p>まだ何も登録されていません。</p>
        <p className="muted">
          「インポート」ボタンから .md / .mdx / .html / .htm を選んで登録してください。
        </p>
      </section>
    );
  }

  const sorted = sortByUnreadThenGeneratedDesc(artifacts);

  return (
    <section className="artifact-list" aria-label="Artifact 一覧">
      {sorted.map((a) => (
        <ArtifactCard key={a.id} artifact={a} onClick={onSelect} />
      ))}
    </section>
  );
}
