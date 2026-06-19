import type { FileType } from "./artifact";

export type SortKey =
  | "unread-then-captured-desc"
  | "captured-desc"
  | "captured-asc"
  | "updated-desc"
  | "title-asc"
  | "favorite-first";

export type ReadState = "all" | "unread" | "read";

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
}

export const DEFAULT_FILTER: LibraryFilter = {
  search: "",
  tags: [],
  fileTypes: [],
  readState: "all",
  favoriteOnly: false,
  capturedFrom: null,
  capturedTo: null,
};

export const SORT_LABELS: Record<SortKey, string> = {
  "unread-then-captured-desc": "未読優先 / 取り込み新しい順",
  "captured-desc": "取り込み 新しい順",
  "captured-asc": "取り込み 古い順",
  "updated-desc": "更新 新しい順",
  "title-asc": "タイトル順",
  "favorite-first": "お気に入り優先",
};
