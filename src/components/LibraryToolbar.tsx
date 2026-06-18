import { useState } from "react";
import type { FileType, Source } from "../types/artifact";
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
};

const FILE_TYPES: FileType[] = ["markdown", "html"];
const SOURCES: Source[] = ["Claude", "ChatGPT", "Gemini", "Manual", "Unknown"];
const SORT_KEYS: SortKey[] = [
  "unread-then-generated-desc",
  "generated-desc",
  "generated-asc",
  "imported-desc",
  "updated-desc",
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
}: Props) {
  const [expanded, setExpanded] = useState(false);

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
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
            <legend>生成元</legend>
            {SOURCES.map((s) => (
              <label key={s}>
                <input
                  type="checkbox"
                  checked={filter.sources.includes(s)}
                  onChange={() =>
                    onFilterChange({
                      ...filter,
                      sources: toggle(filter.sources, s),
                    })
                  }
                />
                {s}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>生成日</legend>
            <label>
              <span className="filter-sub">From</span>
              <input
                type="date"
                value={filter.generatedFrom ?? ""}
                onChange={(e) =>
                  onFilterChange({
                    ...filter,
                    generatedFrom: e.target.value || null,
                  })
                }
              />
            </label>
            <label>
              <span className="filter-sub">To</span>
              <input
                type="date"
                value={filter.generatedTo ?? ""}
                onChange={(e) =>
                  onFilterChange({
                    ...filter,
                    generatedTo: e.target.value || null,
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
