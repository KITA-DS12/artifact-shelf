import { useEffect, useState } from "react";
import type { Artifact } from "../types/artifact";
import { readArtifactContent } from "../lib/library";
import { MarkdownView } from "./MarkdownView";
import { generateToc, type TocEntry } from "../lib/toc";

type Props = {
  artifact: Artifact;
  onBack: () => void;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; content: string }
  | { kind: "error"; message: string };

export function ArtifactDetail({ artifact, onBack }: Props) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

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

  return (
    <article className="artifact-detail">
      <div className="detail-toolbar">
        <button type="button" className="link-button" onClick={onBack}>
          ← ライブラリ
        </button>
      </div>
      <header className="detail-header">
        <h1 className="detail-title">{artifact.title}</h1>
        <div className="detail-meta">
          <span className={`type-badge type-${artifact.fileType}`}>
            {artifact.fileType === "markdown" ? "Markdown" : "HTML"}
          </span>
          <span>{artifact.source}</span>
          <span className="dot">·</span>
          <span>{artifact.generatedAt}</span>
        </div>
        {artifact.tags.length > 0 && (
          <ul className="detail-tags" aria-label="タグ">
            {artifact.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
        <div className="detail-actions">
          <button type="button" disabled title="後続 Issue で実装">
            元ファイルを開く
          </button>
        </div>
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
          {state.kind === "ready" && artifact.fileType !== "markdown" && (
            <p className="muted">
              この形式のプレビューは Issue #6 で実装されます。
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
