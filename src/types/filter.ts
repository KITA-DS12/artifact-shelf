import type { FileType } from "./artifact";

export type SortKey =
  | "unread-then-captured-desc"
  | "captured-desc"
  | "captured-asc"
  | "updated-desc"
  | "opened-desc"
  | "title-asc"
  | "favorite-first";

export type ReadState = "all" | "unread" | "read";

/** 開封（事実）状態。`isRead`（自己申告）と独立。 */
export type OpenedState = "all" | "opened" | "unopened";

export interface LibraryFilter {
  search: string;
  tags: string[];
  fileTypes: FileType[];
  readState: ReadState;
  openedState: OpenedState;
  favoriteOnly: boolean;
  /** 取り込み日の下限 (YYYY-MM-DD) */
  capturedFrom: string | null;
  /** 取り込み日の上限 (YYYY-MM-DD) */
  capturedTo: string | null;
  /** 選択中のディレクトリ（このプレフィックスに収まるものだけ表示） */
  directory: string | null;
}

export const DEFAULT_FILTER: LibraryFilter = {
  search: "",
  tags: [],
  fileTypes: [],
  readState: "all",
  openedState: "all",
  favoriteOnly: false,
  capturedFrom: null,
  capturedTo: null,
  directory: null,
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
