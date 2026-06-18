import { ImportButton } from "./components/ImportButton";
import "./App.css";

function App() {
  return (
    <main className="container">
      <header className="app-header">
        <div className="app-header-row">
          <h1>Artifact Shelf</h1>
          <ImportButton />
        </div>
        <p className="tagline">
          Markdown と HTML の生成物をローカルで整理・閲覧するデスクトップアプリ
        </p>
      </header>
      <section className="empty-state">
        <p>まだ何も登録されていません。</p>
        <p className="muted">
          「インポート」ボタンから .md / .mdx / .html / .htm を選んで登録してください。
        </p>
      </section>
    </main>
  );
}

export default App;
