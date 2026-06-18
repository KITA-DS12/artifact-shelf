import { useEffect, useState } from "react";
import type { Artifact } from "../types/artifact";
import type { ArtifactUpdate } from "../types/edit";
import { readArtifactContent, updateArtifact } from "../lib/library";
import { MarkdownView } from "./MarkdownView";
import { HtmlView } from "./HtmlView";
import { ArtifactEditForm } from "./ArtifactEditForm";
import { generateToc, type TocEntry } from "../lib/toc";

type Props = {
  artifact: Artifact;
  onBack: () => void;
  onUpdated?: (updated: Artifact) => void;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; content: string }
  | { kind: "error"; message: string };

export function ArtifactDetail({ artifact, onBack, onUpdated }: Props) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    readArtifactContent(artifact.id)
      .then((content) => {
        if (!cancelled) setState({ kind: "ready", content });
      })
      .catch((err) => {
        if (!cancelled)
          setState({ kind: "error", message: String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [artifact.id]);

  const toc: TocEntry[] =
    state.kind === "ready" && artifact.fileType === "markdown"
      ? generateToc(state.content)
      : [];

  async function handleSave(update: ArtifactUpdate) {
    const updated = await updateArtifact(artifact.id, update);
    setEditing(false);
    onUpdated?.(updated);
  }

  return (
    <article className="artifact-detail">
      <div className="detail-toolbar">
        <button type="button" className="link-button" onClick={onBack}>
          ← ライブラリ
        </button>
      </div>
      <header className="detail-header">
        {!editing ? (
          <>
            <h1 className="detail-title">{artifact.title}</h1>
            <div className="detail-meta">
              <span className={`type-badge type-${artifact.fileType}`}>
                {artifact.fileType === "markdown" ? "Markdown" : "HTML"}
              </span>
              <span>{artifact.source}</span>
              <span className="dot">·</span>
              <span>{artifact.generatedAt}</span>
              {artifact.isFavorite && (
                <span className="favorite-star" aria-label="お気に入り">
                  ★
                </span>
              )}
              <span className={`read-pill ${artifact.isRead ? "is-read" : "is-unread"}`}>
                {artifact.isRead ? "既読" : "未読"}
              </span>
            </div>
            {artifact.tags.length > 0 && (
              <ul className="detail-tags" aria-label="タグ">
                {artifact.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
            {artifact.note && <p className="detail-note">{artifact.note}</p>}
            <div className="detail-actions">
              <button type="button" onClick={() => setEditing(true)}>
                編集
              </button>
              <button type="button" disabled title="後続 Issue で実装">
                元ファイルを開く
              </button>
            </div>
          </>
        ) : (
          <ArtifactEditForm
            artifact={artifact}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
          />
        )}
      </header>

      <div className="detail-body">
        {toc.length > 0 && (
          <nav className="detail-toc" aria-label="目次">
            <div className="toc-title">目次</div>
            <ul>
              {toc.map((e, i) => (
                <li key={i} className={`toc-level-${e.level}`}>
                  {e.text}
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className="detail-content">
          {state.kind === "loading" && <p className="muted">読み込み中…</p>}
          {state.kind === "error" && (
            <p className="error-banner" role="alert">
              読み込みに失敗しました: {state.message}
            </p>
          )}
          {state.kind === "ready" && artifact.fileType === "markdown" && (
            <MarkdownView content={state.content} />
          )}
          {state.kind === "ready" && artifact.fileType === "html" && (
            <HtmlView content={state.content} />
          )}
        </div>
      </div>
    </article>
  );
}
