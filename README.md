# Artifact Shelf

Markdown と HTML の AI 生成物を、ローカルで整理・タグ付け・閲覧するデスクトップアプリ。

「生成したことは覚えているが、どこに置いたか分からない」を解消する。

## 主な利用シーン

- Claude や ChatGPT に作らせたレビュー結果を蓄積する
- リポジトリ構成の可視化 HTML を保存する
- 設計メモ・仕様書を Markdown で管理する
- タグや日付から過去の生成物を探し直す

## 技術構成

- Tauri 2.x
- React 19 + TypeScript + Vite
- 永続化: JSON ファイル（`~/Library/Application Support/com.kita.artifact-shelf/library.json`）
- テスト: Vitest + React Testing Library / Rust 単体テスト

## 開発セットアップ

### 必要なツール

- Node.js 22 以上
- Rust 1.80 以上
- Tauri 2 のシステム要件: https://v2.tauri.app/start/prerequisites/

### 起動

```sh
npm install
npm run tauri dev
```

### テスト

```sh
# フロント側
npm run test

# Rust 側
npm run test:rust
```

### ビルド（ローカル）

```sh
npm run tauri build
```

ビルド成果物は `src-tauri/target/release/bundle/` に出力される。

## 配布（macOS 向け）

リポジトリで `v0.1.0` のような Git タグを push すると、GitHub Actions が macOS (Apple Silicon / Intel) 向けの `.dmg` を自動ビルドし Draft Release として GitHub Releases にアップロードする。

ユーザーは Releases ページからダウンロードした `.dmg` を開き、`Artifact Shelf.app` を Applications フォルダにドラッグするだけでインストールできる。

> macOS では Apple 署名・公証なしのため、初回起動時に「開発元が未確認です」警告が出る場合がある。Finder で `.app` を右クリック → 開く で回避できる。

## ライセンス

未定（リポジトリは private）。
