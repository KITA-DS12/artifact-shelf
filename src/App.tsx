import { useCallback, useEffect, useMemo, useState } from "react";
import { ImportButton } from "./components/ImportButton";
import { ArtifactList } from "./components/ArtifactList";
import { ArtifactDetail } from "./components/ArtifactDetail";
import { LibraryToolbar } from "./components/LibraryToolbar";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { DirectoryTree } from "./components/DirectoryTree";
import {
  checkMissingArtifacts,
  deleteArtifacts,
  emptyLibrary,
  loadLibrary,
  searchInContents,
} from "./lib/library";
import { applyFilter, collectAllTags } from "./lib/filter";
import { sortArtifacts } from "./lib/sort";
import { useDragDropImport } from "./hooks/useDragDropImport";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import type { Artifact, Library } from "./types/artifact";
import {
  DEFAULT_FILTER,
  type LibraryFilter,
  type SortKey,
} from "./types/filter";
import "./App.css";

function App() {
  const [library, setLibrary] = useState<Library>(emptyLibrary);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<LibraryFilter>(DEFAULT_FILTER);
  const [sortKey, setSortKey] = useState<SortKey>("unread-then-captured-desc");
  const [missingIds, setMissingIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTargets, setDeleteTargets] = useState<string[] | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState(0);
  // 本文全文検索の結果。null は「適用中ではない」を意味する
  const [contentMatched, setContentMatched] = useState<Set<string> | null>(
    null,
  );

  const reload = useCallback(async () => {
    try {
      const next = await loadLibrary();
      setLibrary(next);
      setError(null);
      try {
        const missing = await checkMissingArtifacts();
        setMissingIds(new Set(missing));
      } catch {
        setMissingIds(new Set());
      }
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const { hovering: dragHovering, message: dragMessage } = useDragDropImport(
    () => void reload(),
  );

  const availableTags = useMemo(
    () => collectAllTags(library.artifacts),
    [library.artifacts],
  );

  // 本文検索 (Rust で grep)。debounce 300ms。
  useEffect(() => {
    if (!filter.searchInContent || filter.search.trim().length === 0) {
      setContentMatched(null);
      return;
    }
    const handle = window.setTimeout(() => {
      searchInContents(filter.search.trim())
        .then((ids) => setContentMatched(new Set(ids)))
        .catch(() => setContentMatched(new Set()));
    }, 300);
    return () => window.clearTimeout(handle);
  }, [filter.searchInContent, filter.search]);

  const filtered = useMemo(() => {
    const base = applyFilter(library.artifacts, filter);
    const narrowed =
      contentMatched !== null
        ? base.filter((a) => contentMatched.has(a.id))
        : base;
    return sortArtifacts(narrowed, sortKey);
  }, [library.artifacts, filter, sortKey, contentMatched]);

  // filtered の長さが縮んだら focused を clamp
  useEffect(() => {
    setFocusedIndex((i) => {
      if (filtered.length === 0) return 0;
      return Math.min(i, filtered.length - 1);
    });
  }, [filtered.length]);

  const focusedArtifact = filtered[focusedIndex] ?? null;

  const selectedPos = selectedId
    ? filtered.findIndex((a) => a.id === selectedId)
    : -1;
  const prevId = selectedPos > 0 ? filtered[selectedPos - 1].id : null;
  const nextId =
    selectedPos >= 0 && selectedPos < filtered.length - 1
      ? filtered[selectedPos + 1].id
      : null;

  useKeyboardShortcuts({
    onNext: () => {
      if (selectedId !== null) {
        if (nextId) setSelectedId(nextId);
        return;
      }
      setFocusedIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
    },
    onPrev: () => {
      if (selectedId !== null) {
        if (prevId) setSelectedId(prevId);
        return;
      }
      setFocusedIndex((i) => Math.max(i - 1, 0));
    },
    onSearch: () => {
      if (selectedId !== null) return;
      const input = document.querySelector<HTMLInputElement>(".search-input");
      input?.focus();
      input?.select();
    },
    onEscape: () => {
      if (selectedId !== null) setSelectedId(null);
    },
  });

  const selected =
    selectedId !== null
      ? library.artifacts.find((a) => a.id === selectedId) ?? null
      : null;

  function toggleSelect(a: Artifact) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(a.id)) next.delete(a.id);
      else next.add(a.id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function confirmDelete() {
    if (!deleteTargets) return;
    try {
      await deleteArtifacts(deleteTargets);
      setDeleteTargets(null);
      exitSelectMode();
      if (selectedId && deleteTargets.includes(selectedId)) {
        setSelectedId(null);
      }
      await reload();
    } catch (err) {
      setError(String(err));
      setDeleteTargets(null);
    }
  }

  const deleteCount = deleteTargets?.length ?? 0;
  const deleteMessage =
    deleteCount > 1
      ? `${deleteCount} 件の Artifact をライブラリから削除します。元のファイル自体は削除されません。`
      : `この Artifact をライブラリから削除します。元のファイル自体は削除されません。`;

  const overlay = dragHovering ? (
    <div className="drop-overlay" aria-live="polite">
      <div className="drop-overlay-message">
        ファイルをここにドロップしてインポート
      </div>
    </div>
  ) : null;

  if (selected) {
    return (
      <main className="container">
        {overlay}
        <ArtifactDetail
          artifact={selected}
          missing={missingIds.has(selected.id)}
          onBack={() => setSelectedId(null)}
          onUpdated={() => void reload()}
          onDelete={() => setDeleteTargets([selected.id])}
          prevId={prevId}
          nextId={nextId}
          onNavigate={(id) => setSelectedId(id)}
        />
        <ConfirmDialog
          open={deleteTargets !== null}
          title="ライブラリから削除しますか？"
          message={deleteMessage}
          confirmLabel="削除する"
          destructive
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleteTargets(null)}
        />
      </main>
    );
  }

  return (
    <main className="container app-shell">
      {overlay}
      <header className="app-header">
        <div className="app-header-row">
          <h1>Yomikura</h1>
          <ImportButton onImported={() => void reload()} />
        </div>
        <p className="tagline">
          Markdown と HTML の生成物をローカルで整理・閲覧するデスクトップアプリ
          （ウィンドウへドロップでも追加できます）
        </p>
      </header>
      {error && (
        <div className="error-banner" role="alert">
          ライブラリの読み込みに失敗しました: {error}
        </div>
      )}
      {missingIds.size > 0 && (
        <div className="warning-banner" role="alert">
          元ファイルが見つからない Artifact が {missingIds.size} 件あります。
        </div>
      )}
      {dragMessage && (
        <div className="info-banner" role="status">
          ドラッグ＆ドロップ: {dragMessage}
        </div>
      )}
      <div className={`app-body${sidebarOpen ? "" : " sidebar-collapsed"}`}>
        <aside className="app-sidebar">
          <button
            type="button"
            className="sidebar-toggle"
            aria-pressed={sidebarOpen}
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
          >
            {sidebarOpen ? "◂" : "▸"}
          </button>
          {sidebarOpen && (
            <DirectoryTree
              artifacts={library.artifacts}
              selected={filter.directory}
              onSelect={(directory) => setFilter({ ...filter, directory })}
            />
          )}
        </aside>
        <div className="app-content">
          <LibraryToolbar
            filter={filter}
            onFilterChange={setFilter}
            sortKey={sortKey}
            onSortChange={setSortKey}
            availableTags={availableTags}
            totalCount={library.artifacts.length}
            matchedCount={filtered.length}
            selectMode={selectMode}
            selectedCount={selectedIds.size}
            onEnterSelectMode={() => setSelectMode(true)}
            onExitSelectMode={exitSelectMode}
            onRequestDelete={() => setDeleteTargets([...selectedIds])}
          />
          {filter.directory && (
            <div className="active-dir-chip">
              <span className="muted">ディレクトリ:</span>{" "}
              <span className="active-dir-path" title={filter.directory}>
                {filter.directory}
              </span>
              <button
                type="button"
                className="link-button"
                onClick={() => setFilter({ ...filter, directory: null })}
              >
                解除
              </button>
            </div>
          )}
          <ArtifactList
            artifacts={filtered}
            missingIds={missingIds}
            selectMode={selectMode}
            selectedIds={selectedIds}
            focusedId={focusedArtifact?.id ?? null}
            onSelect={(a) => setSelectedId(a.id)}
            onToggleSelect={toggleSelect}
          />
        </div>
      </div>
      <ConfirmDialog
        open={deleteTargets !== null}
        title="ライブラリから削除しますか？"
        message={deleteMessage}
        confirmLabel="削除する"
        destructive
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTargets(null)}
      />
    </main>
  );
}

export default App;
