import { useState, type FormEvent } from "react";
import type { Artifact, Source } from "../types/artifact";
import type { ArtifactUpdate } from "../types/edit";

type Props = {
  artifact: Artifact;
  onSave: (update: ArtifactUpdate) => void | Promise<void>;
  onCancel: () => void;
};

const SOURCE_OPTIONS: Source[] = [
  "Claude",
  "ChatGPT",
  "Gemini",
  "Manual",
  "Unknown",
];

export function ArtifactEditForm({ artifact, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(artifact.title);
  const [tags, setTags] = useState<string[]>([...artifact.tags]);
  const [tagInput, setTagInput] = useState("");
  const [note, setNote] = useState(artifact.note);
  const [isRead, setIsRead] = useState(artifact.isRead);
  const [isFavorite, setIsFavorite] = useState(artifact.isFavorite);
  const [source, setSource] = useState<Source>(artifact.source);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.includes(t)) {
      setTagInput("");
      return;
    }
    setTags([...tags, t]);
    setTagInput("");
  }

  function removeTag(target: string) {
    setTags(tags.filter((t) => t !== target));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: title.trim() || artifact.title,
        tags,
        note,
        isRead,
        isFavorite,
        source,
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="artifact-edit-form" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">タイトル</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <div className="field">
        <span className="field-label">タグ</span>
        <ul className="tag-edit-list" aria-label="編集中のタグ">
          {tags.map((t) => (
            <li key={t}>
              <span>{t}</span>
              <button
                type="button"
                aria-label={`タグ ${t} を削除`}
                onClick={() => removeTag(t)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="tag-input-row">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="タグを入力して Enter / 追加"
          />
          <button type="button" onClick={addTag}>
            追加
          </button>
        </div>
      </div>

      <label className="field">
        <span className="field-label">メモ</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
        />
      </label>

      <label className="field">
        <span className="field-label">生成元</span>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as Source)}
        >
          {SOURCE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <div className="field-toggles">
        <label>
          <input
            type="checkbox"
            checked={isRead}
            onChange={(e) => setIsRead(e.target.checked)}
          />
          既読
        </label>
        <label>
          <input
            type="checkbox"
            checked={isFavorite}
            onChange={(e) => setIsFavorite(e.target.checked)}
          />
          お気に入り
        </label>
      </div>

      {error && (
        <p className="error-banner" role="alert">
          保存に失敗しました: {error}
        </p>
      )}

      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? "保存中…" : "保存"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          キャンセル
        </button>
      </div>
    </form>
  );
}
