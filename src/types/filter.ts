import type { FileType } from "./artifact";

export type SortKey =
  | "unread-then-captured-desc"
  | "captured-desc"
  | "captured-asc"
  | "updated-desc"
  | "opened-desc"
  | "title-asc"
  | "favorite-first";

/**
 * 既読/未読の状態。詳細を一度でも開いたら自動で既読（`openedAt` の有無で判定）。
 * 手動操作は不要。
 */
export type ReadState = "all" | "unread" | "read";

/** "active" は通常表示、"trash" はゴミ箱表示 */
export type LibraryView = "active" | "trash";

export interface LibraryFilter {
  search: string;
  tags: string[];
  fileTypes: FileType[];
  readState: ReadState;
  favoriteOnly: boolean;
  /** 取り込み日の下限 (YYYY-MM-DD) */
  capturedFrom: string | null;
  /** 取り込み日の上限 (YYYY-MM-DD) */
  capturedTo: string | null;
  /** 選択中のディレクトリ（このプレフィックスに収まるものだけ表示） */
  directory: string | null;
  /** 検索クエリを本文（Markdown/HTML ファイル中身）にも適用 */
  searchInContent: boolean;
  /** 通常表示 / ゴミ箱表示 の切替 */
  view: LibraryView;
}

export const DEFAULT_FILTER: LibraryFilter = {
  search: "",
  tags: [],
  fileTypes: [],
  readState: "all",
  favoriteOnly: false,
  capturedFrom: null,
  capturedTo: null,
  directory: null,
  searchInContent: false,
  view: "active",
};

export const SORT_LABELS: Record<SortKey, string> = {
  "unread-then-captured-desc": "未読優先 / 取り込み新しい順",
  "captured-desc": "取り込み 新しい順",
  "captured-asc": "取り込み 古い順",
  "updated-desc": "更新 新しい順",
  "opened-desc": "最近開いた順",
  "title-asc": "タイトル順",
  "favorite-first": "お気に入り優先",
};
