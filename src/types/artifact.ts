export type FileType = "markdown" | "html";

export type Source = "Claude" | "ChatGPT" | "Gemini" | "Manual" | "Unknown";

export interface Artifact {
  id: string;
  title: string;
  sourcePath: string;
  fileType: FileType;
  tags: string[];
  /** 取り込み時刻（ISO8601）。ライブラリ上の年表の基準。 */
  capturedAt: string;
  /**
   * ファイル本来の生成日。frontmatter / `<title>` / 先頭 `#` 見出しから抽出できた
   * 場合にのみ入る。検出できない場合は null（mtime からの推定は行わない）。
   */
  generatedAt: string | null;
  importedAt: string;
  updatedAt: string;
  isRead: boolean;
  isFavorite: boolean;
  source: Source;
  note: string;
}

export interface Library {
  version: number;
  artifacts: Artifact[];
}

export const CURRENT_SCHEMA_VERSION = 1;
