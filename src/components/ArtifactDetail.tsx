import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { Artifact } from "../types/artifact";
import type { ArtifactUpdate } from "../types/edit";
import {
  readArtifactContent,
  updateArtifact,
  openInFinder,
  openWithDefault,
  copyToClipboard,
  relinkArtifact,
} from "../lib/library";
import { MarkdownView } from "./MarkdownView";
import { HtmlView } from "./HtmlView";
import { ArtifactEditForm } from "./ArtifactEditForm";
import { generateToc, type TocEntry } from "../lib/toc";

type Props = {
  artifact: Artifact;
  missing?: boolean;
  onBack: () => void;
  onUpdated?: (updated: Artifact) => void;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; content: string }
  | { kind: "error"; message: string }
  | { kind: "missing" };

export function ArtifactDetail({
  artifact,
  missing,
  onBack,
  onUpdated,
}: Props) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [editing, setEditing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (missing) {
      setState({ kind: "missing" });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    readArtifactContent(artifact.id)
      .then((content) => {
        if (!cancelled) setState({ kind: "ready", content });
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            kind: "error",
            message: `読み込みに失敗しました: ${String(err)}`,
          });
      });
    return () => {
      cancelled = true;
    };
  }, [artifact.id, missing]);

  const toc: TocEntry[] =
    state.kind === "ready" && artifact.fileType === "markdown"
      ? generateToc(state.content)
      : [];

  async function handleSave(update: ArtifactUpdate) {
    const updated = await updateArtifact(artifact.id, update);
    setEditing(false);
    onUpdated?.(updated);
  }

  async function withFeedback(
    label: string,
    action: () => Promise<void>,
  ): Promise<void> {
    try {
      await action();
      setActionMessage(`${label}しました`);
    } catch (err) {
      setActionMessage(`${label}に失敗しました: ${String(err)}`);
    }
  }

  async function handleRelink() {
    const picked = await openDialog({
      multiple: false,
      filters: [
        {
          name: "Markdown / HTML",
          extensions: ["md", "mdx", "html", "htm"],
        },
      ],
    });
    if (!picked || Array.isArray(picked)) return;
    try {
      const updated = await relinkArtifact(artifact.id, picked);
      onUpdated?.(updated);
      setActionMessage("再紐付けしました");
    } catch (err) {
      setActionMessage(`再紐付けに失敗しました: ${String(err)}`);
    }
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
              <span
                className={`read-pill ${artifact.isRead ? "is-read" : "is-unread"}`}
              >
                {artifact.isRead ? "既読" : "未読"}
              </span>
              {missing && (
                <span className="missing-badge">ファイル無</span>
              )}
            </div>
            {artifact.tags.length > 0 && (
              <ul className="detail-tags" aria-label="タグ">
                {artifact.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
            {artifact.note && <p className="detail-note">{artifact.note}</p>}
            <p className="muted detail-path" title={artifact.sourcePath}>
              {artifact.sourcePath}
            </p>
            {missing && (
              <div className="missing-banner" role="alert">
                元ファイルが見つかりません。移動またはリネームされた可能性があります。
              </div>
            )}
            <div className="detail-actions">
              <button type="button" onClick={() => setEditing(true)}>
                編集
              </button>
              <button
                type="button"
                disabled={missing}
                onClick={() =>
                  void withFeedback("Finder で表示", () =>
                    openInFinder(artifact.sourcePath),
                  )
                }
              >
                Finder で表示
              </button>
              <button
                type="button"
                disabled={missing}
                onClick={() =>
                  void withFeedback("規定アプリで開く", () =>
                    openWithDefault(artifact.sourcePath),
                  )
                }
              >
                規定アプリで開く
              </button>
              <button
                type="button"
                onClick={() =>
                  void withFeedback("パスをコピー", () =>
                    copyToClipboard(artifact.sourcePath),
                  )
                }
              >
                パスをコピー
              </button>
              <button type="button" onClick={() => void handleRelink()}>
                再紐付け…
              </button>
            </div>
            {actionMessage && (
              <p className="muted action-message">{actionMessage}</p>
            )}
          </>
        ) : (
          <ArtifactEditForm
            artifact={artifact}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
          />
        )}
      </header>

      <div className={`detail-body${toc.length > 0 ? " has-toc" : ""}`}>
        {toc.length > 0 && (
          <nav className="detail-toc" aria-label="目次">
            <div className="toc-title">目次</div>
            <ul>
              {toc.map((e, i) => (
                <li key={i} className={`toc-level-${e.level}`}>
                  <a href={`#${e.slug}`}>{e.text}</a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div className="detail-content">
          {state.kind === "loading" && <p className="muted">読み込み中…</p>}
          {state.kind === "missing" && (
            <p className="muted">
              元ファイルが無いためプレビューできません。
            </p>
          )}
          {state.kind === "error" && (
            <p className="error-banner" role="alert">
              {state.message}
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
