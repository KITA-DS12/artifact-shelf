import { useCallback, useEffect, useState } from "react";
import { ImportButton } from "./components/ImportButton";
import { ArtifactList } from "./components/ArtifactList";
import { ArtifactDetail } from "./components/ArtifactDetail";
import { emptyLibrary, loadLibrary } from "./lib/library";
import type { Library } from "./types/artifact";
import "./App.css";

function App() {
  const [library, setLibrary] = useState<Library>(emptyLibrary);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const next = await loadLibrary();
      setLibrary(next);
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selected =
    selectedId !== null
      ? library.artifacts.find((a) => a.id === selectedId) ?? null
      : null;

  if (selected) {
    return (
      <main className="container">
        <ArtifactDetail
          artifact={selected}
          onBack={() => setSelectedId(null)}
          onUpdated={() => void reload()}
        />
      </main>
    );
  }

  return (
    <main className="container">
      <header className="app-header">
        <div className="app-header-row">
          <h1>Artifact Shelf</h1>
          <ImportButton onImported={() => void reload()} />
        </div>
        <p className="tagline">
          Markdown と HTML の生成物をローカルで整理・閲覧するデスクトップアプリ
        </p>
      </header>
      {error && (
        <div className="error-banner" role="alert">
          ライブラリの読み込みに失敗しました: {error}
        </div>
      )}
      <ArtifactList
        artifacts={library.artifacts}
        onSelect={(a) => setSelectedId(a.id)}
      />
    </main>
  );
}

export default App;
