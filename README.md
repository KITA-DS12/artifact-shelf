# Artifact Shelf

[![CI](https://github.com/KITA-DS12/artifact-shelf/actions/workflows/ci.yml/badge.svg)](https://github.com/KITA-DS12/artifact-shelf/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Markdown と HTML の AI 生成物を、ローカルで整理・タグ付け・閲覧する **書庫風** デスクトップアプリ。

「生成したことは覚えているが、どこに置いたか分からない」を解消する。

## 特徴

- **ローカル完結**: アカウント・クラウド同期・サーバー不要、データは外部に出ない
- **書庫メタファー**: 紙のクリーム、藍、蔵書印の朱を基調にした落ち着いた配色
- **インライン編集**: タイトル / タグ / メモ / 既読 / お気に入りをその場で編集
- **シームレスプレビュー**: Markdown と HTML を本文として流して表示（HTML は sandbox iframe）
- **目次ジャンプ**: Markdown の H1〜H3 から該当箇所にスクロール
- **ドラッグ＆ドロップ取り込み**: ウィンドウへドロップで一括登録
- **元ファイル導線**: Finder / 規定アプリ / パスコピー / 再紐付け
- **履歴からの削除**: 単体・複数選択削除（実ファイルは触らない）

## 主な利用シーン

- Claude / ChatGPT に作らせたレビュー結果やリポジトリ可視化 HTML を蓄積する
- 設計メモ・仕様書を Markdown で整理する
- タグや日付から過去の生成物を探し直す

## ダウンロード（macOS）

[Releases ページ](https://github.com/KITA-DS12/artifact-shelf/releases) から OS に対応した `.dmg` をダウンロードしてください。

- Apple Silicon: `Artifact Shelf_<version>_aarch64.dmg`
- Intel Mac: `Artifact Shelf_<version>_x64.dmg`

インストール:

1. `.dmg` をダブルクリックで開く
2. `Artifact Shelf.app` を Applications フォルダにドラッグ

> macOS では Apple 署名・公証なしのため、初回起動時に「開発元が未確認です」警告が出る場合があります。Finder で `.app` を右クリック → 「開く」 で回避できます。

## 技術構成

- Tauri 2.x（Rust + WebView）
- React 19 + TypeScript + Vite
- 永続化: JSON ファイル
  - macOS: `~/Library/Application Support/com.kita.artifact-shelf/library.json`
- テスト: Vitest + React Testing Library / Rust 単体テスト

## 開発

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

成果物は `src-tauri/target/release/bundle/` に出力される。

## リリース（メンテナ向け）

`vX.Y.Z` の Git タグを push すると、GitHub Actions が macOS（Apple Silicon / Intel）向けの `.dmg` を自動ビルドし Draft Release として GitHub Releases にアップロードする。

```sh
git tag v0.1.0
git push origin v0.1.0
```

完走後、Releases ページの Draft を確認して Publish する。

## ライセンス

[MIT](LICENSE) © 2026 KITA-DS12
