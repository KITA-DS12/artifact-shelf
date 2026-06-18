import type { Artifact } from "../types/artifact";

type Props = {
  artifact: Artifact;
  onClick?: (artifact: Artifact) => void;
};

export function ArtifactCard({ artifact, onClick }: Props) {
  const handleClick = () => onClick?.(artifact);

  return (
    <article
      className={`artifact-card${artifact.isRead ? "" : " is-unread"}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="artifact-card-header">
        <span className={`type-badge type-${artifact.fileType}`}>
          {artifact.fileType === "markdown" ? "Markdown" : "HTML"}
        </span>
        {!artifact.isRead && <span className="unread-dot" aria-label="未読" />}
        {artifact.isFavorite && (
          <span className="favorite-star" aria-label="お気に入り">
            ★
          </span>
        )}
      </div>
      <h2 className="artifact-card-title">{artifact.title}</h2>
      {artifact.tags.length > 0 && (
        <ul className="artifact-card-tags" aria-label="タグ">
          {artifact.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      <div className="artifact-card-meta">
        <span>{artifact.generatedAt}</span>
        <span className="dot">·</span>
        <span>{artifact.source}</span>
      </div>
    </article>
  );
}
