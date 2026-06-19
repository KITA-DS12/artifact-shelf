import { useEffect, useRef } from "react";
import type { Artifact } from "../types/artifact";
import { toDate } from "../lib/format";
import { isRead } from "../lib/read-state";
import { StarIcon } from "./icons";

type Props = {
  artifact: Artifact;
  missing?: boolean;
  selectMode?: boolean;
  selected?: boolean;
  /** キーボードナビゲーションのフォーカス対象 */
  focused?: boolean;
  onClick?: (artifact: Artifact) => void;
  onToggleSelect?: (artifact: Artifact) => void;
};

export function ArtifactCard({
  artifact,
  missing,
  selectMode,
  selected,
  focused,
  onClick,
  onToggleSelect,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!focused || !ref.current) return;
    ref.current.focus({ preventScroll: true });
    if (typeof ref.current.scrollIntoView === "function") {
      ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focused]);

  const handleClick = () => {
    if (selectMode) onToggleSelect?.(artifact);
    else onClick?.(artifact);
  };

  return (
    <article
      ref={ref}
      className={`artifact-card${isRead(artifact) ? "" : " is-unread"}${missing ? " is-missing" : ""}${selectMode ? " is-selectable" : ""}${selected ? " is-selected" : ""}${focused ? " is-focused" : ""}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-pressed={selectMode ? selected : undefined}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {selectMode && (
        <span className="select-checkbox" aria-hidden="true">
          {selected ? "✓" : ""}
        </span>
      )}
      <div className="artifact-card-header">
        <span className={`type-badge type-${artifact.fileType}`}>
          {artifact.fileType === "markdown" ? "Markdown" : "HTML"}
        </span>
        {artifact.isFavorite && (
          <span className="favorite-star" aria-label="お気に入り">
            <StarIcon filled size={12} />
          </span>
        )}
        {missing && (
          <span className="missing-badge" aria-label="ファイルが見つかりません">
            ファイル無
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
        <span>取り込み {toDate(artifact.capturedAt)}</span>
      </div>
    </article>
  );
}
