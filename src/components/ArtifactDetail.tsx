import { useCallback, useEffect, useRef, useState } from "react";
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
import { generateToc, type TocEntry } from "../lib/toc";
import { CrossIcon, PencilIcon, PlusIcon, StarIcon } from "./icons";

type Props = {
  artifact: Artifact;
  missing?: boolean;
  onBack: () => void;
  onUpdated?: (updated: Artifact) => void;
  onDelete?: () => void;
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
  onDelete,
}: Props) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
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

  const patch = useCallback(
    async (partial: Partial<ArtifactUpdate>) => {
      const update: ArtifactUpdate = {
        title: artifact.title,
        tags: artifact.tags,
        note: artifact.note,
        isRead: artifact.isRead,
        isFavorite: artifact.isFavorite,
        source: artifact.source,
        ...partial,
      };
      const updated = await updateArtifact(artifact.id, update);
      onUpdated?.(updated);
    },
    [artifact, onUpdated],
  );

  const toc: TocEntry[] =
    state.kind === "ready" && artifact.fileType === "markdown"
      ? generateToc(state.content)
      : [];

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
        { name: "Markdown / HTML", extensions: ["md", "mdx", "html", "htm"] },
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
        <TitleField
          value={artifact.title}
          onSave={(title) => patch({ title })}
        />

        <div className="detail-meta">
          <span className={`type-badge type-${artifact.fileType}`}>
            {artifact.fileType === "markdown" ? "Markdown" : "HTML"}
          </span>
          <span>{artifact.generatedAt}</span>
          <button
            type="button"
            className={`read-pill ${artifact.isRead ? "is-read" : "is-unread"}`}
            onClick={() => void patch({ isRead: !artifact.isRead })}
            aria-pressed={artifact.isRead}
            title="クリックで未読/既読を切替"
          >
            {artifact.isRead ? "既読" : "未読"}
          </button>
          <button
            type="button"
            className={`star-button${artifact.isFavorite ? " is-on" : ""}`}
            onClick={() => void patch({ isFavorite: !artifact.isFavorite })}
            aria-pressed={artifact.isFavorite}
            aria-label={artifact.isFavorite ? "お気に入りを解除" : "お気に入りに追加"}
          >
            <StarIcon filled={artifact.isFavorite} />
          </button>
          {missing && <span className="missing-badge">ファイル無</span>}
        </div>

        <TagsField
          tags={artifact.tags}
          onChange={(tags) => patch({ tags })}
        />

        <NoteField
          value={artifact.note}
          onSave={(note) => patch({ note })}
        />

        <p className="detail-path" title={artifact.sourcePath}>
          {artifact.sourcePath}
        </p>
        {missing && (
          <div className="missing-banner" role="alert">
            元ファイルが見つかりません。移動またはリネームされた可能性があります。
          </div>
        )}
        <div className="detail-actions">
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
          {onDelete && (
            <button
              type="button"
              className="btn-danger-outline"
              onClick={onDelete}
            >
              ライブラリから削除
            </button>
          )}
        </div>
        {actionMessage && (
          <p className="action-message">{actionMessage}</p>
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

// ───────── インライン編集パーツ ─────────

function TitleField({
  value,
  onSave,
}: {
  value: string;
  onSave: (next: string) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const next = draft.trim();
    if (next && next !== value) {
      void onSave(next);
    } else {
      setDraft(value);
    }
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className="title-input"
        aria-label="タイトル"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            cancel();
          }
        }}
      />
    );
  }

  return (
    <div className="title-row">
      <h1 className="detail-title">{value}</h1>
      <button
        type="button"
        className="icon-button"
        aria-label="タイトルを編集"
        onClick={() => setEditing(true)}
      >
        <PencilIcon />
      </button>
    </div>
  );
}

function TagsField({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (next: string[]) => void | Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function commitAdd() {
    const next = draft.trim();
    if (next && !tags.includes(next)) {
      void onChange([...tags, next]);
    }
    setDraft("");
    setAdding(false);
  }

  return (
    <ul className="tag-edit-list" aria-label="タグ">
      {tags.map((t) => (
        <li key={t}>
          <span>{t}</span>
          <button
            type="button"
            aria-label={`タグ ${t} を削除`}
            onClick={() => onChange(tags.filter((x) => x !== t))}
          >
            <CrossIcon />
          </button>
        </li>
      ))}
      <li className="tag-add">
        {adding ? (
          <input
            ref={inputRef}
            type="text"
            aria-label="新しいタグ"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitAdd}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitAdd();
              } else if (e.key === "Escape") {
                setDraft("");
                setAdding(false);
              }
            }}
            placeholder="タグを入力"
          />
        ) : (
          <button
            type="button"
            className="tag-add-button"
            aria-label="タグを追加"
            onClick={() => setAdding(true)}
          >
            <PlusIcon /> タグ
          </button>
        )}
      </li>
    </ul>
  );
}

function NoteField({
  value,
  onSave,
}: {
  value: string;
  onSave: (next: string) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  function commit() {
    if (draft !== value) {
      void onSave(draft);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        className="note-input"
        aria-label="メモ"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        rows={4}
        placeholder="メモを入力…"
      />
    );
  }

  if (!value) {
    return (
      <button
        type="button"
        className="note-empty"
        onClick={() => setEditing(true)}
      >
        ＋ メモを追加
      </button>
    );
  }

  return (
    <p
      className="detail-note"
      role="button"
      tabIndex={0}
      aria-label="メモを編集"
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
    >
      {value}
    </p>
  );
}
