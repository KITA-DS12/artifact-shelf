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
  emptyTrash,
  loadLibrary,
  purgeArtifacts,
  restoreArtifacts,
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
  type LibraryView,
  type SortKey,
} from "./types/filter";
import "./App.css";

type PendingAction =
  | { type: "trash"; ids: string[] }
  | { type: "purge"; ids: string[] }
  | { type: "empty-trash" };

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
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState(0);
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

  // active / trash の件数とリスト
  const activeArtifacts = useMemo(
    () => library.artifacts.filter((a) => a.deletedAt === null),
    [library.artifacts],
  );
  const trashedArtifacts = useMemo(
    () => library.artifacts.filter((a) => a.deletedAt !== null),
    [library.artifacts],
  );

  const availableTags = useMemo(
    () => collectAllTags(activeArtifacts),
    [activeArtifacts],
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
    const base = applyFilter(library.artifacts, filter, contentMatched);
    return sortArtifacts(base, sortKey);
  }, [library.artifacts, filter, sortKey, contentMatched]);

  useEffect(() => {
    setFocusedIndex((i) => {
      if (filtered.length === 0) return 0;
      return Math.min(i, filtered.length - 1);
    });
  }, [filtered.length]);

  // view 切替 / フィルタ変更で選択モードを解除
  useEffect(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, [filter.view]);

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

  function changeView(view: LibraryView) {
    setFilter({ ...filter, view });
    setSelectedId(null);
  }

  // 復元は確認なし
  async function handleRestore(ids: string[]) {
    try {
      await restoreArtifacts(ids);
      exitSelectMode();
      if (selectedId && ids.includes(selectedId)) setSelectedId(null);
      await reload();
    } catch (err) {
      setError(String(err));
    }
  }

  async function confirmAction() {
    if (!pendingAction) return;
    try {
      if (pendingAction.type === "trash") {
        await deleteArtifacts(pendingAction.ids);
        if (selectedId && pendingAction.ids.includes(selectedId)) {
          setSelectedId(null);
        }
      } else if (pendingAction.type === "purge") {
        await purgeArtifacts(pendingAction.ids);
        if (selectedId && pendingAction.ids.includes(selectedId)) {
          setSelectedId(null);
        }
      } else {
        await emptyTrash();
      }
      setPendingAction(null);
      exitSelectMode();
      await reload();
    } catch (err) {
      setError(String(err));
      setPendingAction(null);
    }
  }

  const dialog = (() => {
    if (!pendingAction) return null;
    if (pendingAction.type === "trash") {
      const n = pendingAction.ids.length;
      return {
        title: "ゴミ箱に移動しますか？",
        message:
          n > 1
            ? `${n} 件の Artifact をゴミ箱に移動します。ゴミ箱からは復元 / 完全削除ができます。元のファイル自体は削除されません。`
            : `この Artifact をゴミ箱に移動します。ゴミ箱からは復元 / 完全削除ができます。元のファイル自体は削除されません。`,
        confirmLabel: "ゴミ箱へ",
      };
    }
    if (pendingAction.type === "purge") {
      const n = pendingAction.ids.length;
      return {
        title: "完全に削除しますか？",
        message:
          n > 1
            ? `${n} 件の Artifact を完全に削除します。元に戻せません（元のファイル自体は残ります）。`
            : `この Artifact を完全に削除します。元に戻せません（元のファイル自体は残ります）。`,
        confirmLabel: "完全に削除",
      };
    }
    // empty-trash
    return {
      title: "ゴミ箱を空にしますか？",
      message: `ゴミ箱の中の ${trashedArtifacts.length} 件をすべて完全に削除します。元に戻せません（元のファイル自体は残ります）。`,
      confirmLabel: "ゴミ箱を空にする",
    };
  })();

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
          onDelete={
            selected.deletedAt === null
              ? () => setPendingAction({ type: "trash", ids: [selected.id] })
              : undefined
          }
          onRestore={
            selected.deletedAt !== null
              ? () => void handleRestore([selected.id])
              : undefined
          }
          onPurge={
            selected.deletedAt !== null
              ? () => setPendingAction({ type: "purge", ids: [selected.id] })
              : undefined
          }
          prevId={prevId}
          nextId={nextId}
          onNavigate={(id) => setSelectedId(id)}
        />
        {dialog && (
          <ConfirmDialog
            open
            title={dialog.title}
            message={dialog.message}
            confirmLabel={dialog.confirmLabel}
            destructive
            onConfirm={() => void confirmAction()}
            onCancel={() => setPendingAction(null)}
          />
        )}
      </main>
    );
  }

  const isTrashView = filter.view === "trash";

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
      {missingIds.size > 0 && !isTrashView && (
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
            <>
              <nav className="view-switch" aria-label="ビュー切替">
                <button
                  type="button"
                  className={`view-link${filter.view === "active" ? " is-current" : ""}`}
                  onClick={() => changeView("active")}
                >
                  <span>ライブラリ</span>
                  <span className="view-count">{activeArtifacts.length}</span>
                </button>
                <button
                  type="button"
                  className={`view-link${filter.view === "trash" ? " is-current" : ""}`}
                  onClick={() => changeView("trash")}
                >
                  <span>ゴミ箱</span>
                  <span className="view-count">{trashedArtifacts.length}</span>
                </button>
              </nav>
              {!isTrashView && (
                <DirectoryTree
                  artifacts={activeArtifacts}
                  selected={filter.directory}
                  onSelect={(directory) => setFilter({ ...filter, directory })}
                />
              )}
            </>
          )}
        </aside>
        <div className="app-content">
          {isTrashView && trashedArtifacts.length > 0 && (
            <div className="trash-bar">
              <span className="muted">
                ゴミ箱 — {trashedArtifacts.length} 件
              </span>
              <button
                type="button"
                className="btn btn-danger-outline"
                onClick={() => setPendingAction({ type: "empty-trash" })}
              >
                ゴミ箱を空にする
              </button>
            </div>
          )}
          <LibraryToolbar
            filter={filter}
            onFilterChange={setFilter}
            sortKey={sortKey}
            onSortChange={setSortKey}
            availableTags={availableTags}
            totalCount={
              isTrashView ? trashedArtifacts.length : activeArtifacts.length
            }
            matchedCount={filtered.length}
            selectMode={selectMode}
            selectedCount={selectedIds.size}
            onEnterSelectMode={() => setSelectMode(true)}
            onExitSelectMode={exitSelectMode}
            onRequestDelete={() =>
              setPendingAction({
                type: isTrashView ? "purge" : "trash",
                ids: [...selectedIds],
              })
            }
            onRequestRestore={
              isTrashView
                ? () => void handleRestore([...selectedIds])
                : undefined
            }
            isTrashView={isTrashView}
          />
          {filter.directory && !isTrashView && (
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
      {dialog && (
        <ConfirmDialog
          open
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          destructive
          onConfirm={() => void confirmAction()}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </main>
  );
}

export default App;
