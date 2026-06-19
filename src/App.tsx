import { useCallback, useEffect, useMemo, useState } from "react";
import { ImportButton } from "./components/ImportButton";
import { ArtifactList } from "./components/ArtifactList";
import { ArtifactDetail } from "./components/ArtifactDetail";
import { LibraryToolbar } from "./components/LibraryToolbar";
import { ConfirmDialog } from "./components/ConfirmDialog";
import {
  checkMissingArtifacts,
  deleteArtifacts,
  emptyLibrary,
  loadLibrary,
} from "./lib/library";
import { applyFilter, collectAllTags } from "./lib/filter";
import { sortArtifacts } from "./lib/sort";
import { useDragDropImport } from "./hooks/useDragDropImport";
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

  const filtered = useMemo(
    () => sortArtifacts(applyFilter(library.artifacts, filter), sortKey),
    [library.artifacts, filter, sortKey],
  );

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
    <main className="container">
      {overlay}
      <header className="app-header">
        <div className="app-header-row">
          <h1>Artifact Shelf</h1>
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
      <ArtifactList
        artifacts={filtered}
        missingIds={missingIds}
        selectMode={selectMode}
        selectedIds={selectedIds}
        onSelect={(a) => setSelectedId(a.id)}
        onToggleSelect={toggleSelect}
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

export default App;
