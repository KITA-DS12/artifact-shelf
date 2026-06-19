import { useState } from "react";
import type { FileType } from "../types/artifact";
import {
  type LibraryFilter,
  type SortKey,
  SORT_LABELS,
} from "../types/filter";

type Props = {
  filter: LibraryFilter;
  onFilterChange: (next: LibraryFilter) => void;
  sortKey: SortKey;
  onSortChange: (next: SortKey) => void;
  availableTags: string[];
  totalCount: number;
  matchedCount: number;
  selectMode?: boolean;
  selectedCount?: number;
  onEnterSelectMode?: () => void;
  onExitSelectMode?: () => void;
  onRequestDelete?: () => void;
};

const FILE_TYPES: FileType[] = ["markdown", "html"];
const SORT_KEYS: SortKey[] = [
  "unread-then-captured-desc",
  "captured-desc",
  "captured-asc",
  "updated-desc",
  "opened-desc",
  "title-asc",
  "favorite-first",
];

export function LibraryToolbar({
  filter,
  onFilterChange,
  sortKey,
  onSortChange,
  availableTags,
  totalCount,
  matchedCount,
  selectMode = false,
  selectedCount = 0,
  onEnterSelectMode,
  onExitSelectMode,
  onRequestDelete,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  if (selectMode) {
    return (
      <div className="library-toolbar select-mode">
        <div className="toolbar-row">
          <span className="select-summary">
            {selectedCount} 件を選択中
          </span>
          <button
            type="button"
            className="btn btn-danger"
            disabled={selectedCount === 0}
            onClick={onRequestDelete}
          >
            削除
          </button>
          <button
            type="button"
            className="btn"
            onClick={onExitSelectMode}
          >
            キャンセル
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="library-toolbar">
      <div className="toolbar-row">
        <input
          className="search-input"
          type="search"
          aria-label="検索"
          placeholder="タイトル / タグ / メモ / パスを検索…"
          value={filter.search}
          onChange={(e) =>
            onFilterChange({ ...filter, search: e.target.value })
          }
        />
        <label className="sort-control">
          <span className="visually-hidden">並び順</span>
          <select
            aria-label="並び順"
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
          >
            {SORT_KEYS.map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="filter-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          フィルタ {expanded ? "▴" : "▾"}
        </button>
        <button
          type="button"
          className="filter-toggle"
          onClick={onEnterSelectMode}
        >
          選択
        </button>
      </div>
      <div className="toolbar-meta muted">
        {matchedCount} / {totalCount} 件を表示
      </div>
      {expanded && (
        <div className="filter-panel">
          <fieldset>
            <legend>形式</legend>
            {FILE_TYPES.map((ft) => (
              <label key={ft}>
                <input
                  type="checkbox"
                  checked={filter.fileTypes.includes(ft)}
                  onChange={() =>
                    onFilterChange({
                      ...filter,
                      fileTypes: toggle(filter.fileTypes, ft),
                    })
                  }
                />
                {ft === "markdown" ? "Markdown" : "HTML"}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>状態</legend>
            <label>
              <input
                type="radio"
                name="readState"
                checked={filter.readState === "all"}
                onChange={() =>
                  onFilterChange({ ...filter, readState: "all" })
                }
              />
              すべて
            </label>
            <label>
              <input
                type="radio"
                name="readState"
                checked={filter.readState === "unread"}
                onChange={() =>
                  onFilterChange({ ...filter, readState: "unread" })
                }
              />
              未読
            </label>
            <label>
              <input
                type="radio"
                name="readState"
                checked={filter.readState === "read"}
                onChange={() =>
                  onFilterChange({ ...filter, readState: "read" })
                }
              />
              既読
            </label>
            <label>
              <input
                type="checkbox"
                checked={filter.favoriteOnly}
                onChange={(e) =>
                  onFilterChange({
                    ...filter,
                    favoriteOnly: e.target.checked,
                  })
                }
              />
              お気に入りのみ
            </label>
          </fieldset>

          <fieldset>
            <legend>開封 (事実)</legend>
            <label>
              <input
                type="radio"
                name="openedState"
                checked={filter.openedState === "all"}
                onChange={() =>
                  onFilterChange({ ...filter, openedState: "all" })
                }
              />
              すべて
            </label>
            <label>
              <input
                type="radio"
                name="openedState"
                checked={filter.openedState === "opened"}
                onChange={() =>
                  onFilterChange({ ...filter, openedState: "opened" })
                }
              />
              開いたことがある
            </label>
            <label>
              <input
                type="radio"
                name="openedState"
                checked={filter.openedState === "unopened"}
                onChange={() =>
                  onFilterChange({ ...filter, openedState: "unopened" })
                }
              />
              まだ開いていない
            </label>
          </fieldset>

          <fieldset>
            <legend>取り込み日</legend>
            <label>
              <span className="filter-sub">From</span>
              <input
                type="date"
                value={filter.capturedFrom ?? ""}
                onChange={(e) =>
                  onFilterChange({
                    ...filter,
                    capturedFrom: e.target.value || null,
                  })
                }
              />
            </label>
            <label>
              <span className="filter-sub">To</span>
              <input
                type="date"
                value={filter.capturedTo ?? ""}
                onChange={(e) =>
                  onFilterChange({
                    ...filter,
                    capturedTo: e.target.value || null,
                  })
                }
              />
            </label>
          </fieldset>

          {availableTags.length > 0 && (
            <fieldset className="tag-fieldset">
              <legend>タグ (AND)</legend>
              <div className="tag-options">
                {availableTags.map((t) => (
                  <label key={t}>
                    <input
                      type="checkbox"
                      checked={filter.tags.includes(t)}
                      onChange={() =>
                        onFilterChange({
                          ...filter,
                          tags: toggle(filter.tags, t),
                        })
                      }
                    />
                    {t}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}
    </div>
  );
}
