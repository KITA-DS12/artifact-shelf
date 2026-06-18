import "./App.css";

function App() {
  return (
    <main className="container">
      <header className="app-header">
        <h1>Artifact Shelf</h1>
        <p className="tagline">
          Markdown と HTML の生成物をローカルで整理・閲覧するデスクトップアプリ
        </p>
      </header>
      <section className="empty-state">
        <p>まだ何も登録されていません。</p>
        <p className="muted">
          v1 MVP は順次実装中です。インポート機能・一覧画面が利用可能になります。
        </p>
      </section>
    </main>
  );
}

export default App;
