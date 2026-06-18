import type { FileType, Source } from "./artifact";

export type SortKey =
  | "unread-then-generated-desc"
  | "generated-desc"
  | "generated-asc"
  | "imported-desc"
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
  sources: Source[];
  generatedFrom: string | null;
  generatedTo: string | null;
}

export const DEFAULT_FILTER: LibraryFilter = {
  search: "",
  tags: [],
  fileTypes: [],
  readState: "all",
  favoriteOnly: false,
  sources: [],
  generatedFrom: null,
  generatedTo: null,
};

export const SORT_LABELS: Record<SortKey, string> = {
  "unread-then-generated-desc": "未読優先 / 生成日新しい順",
  "generated-desc": "生成日 新しい順",
  "generated-asc": "生成日 古い順",
  "imported-desc": "取り込み日 新しい順",
  "updated-desc": "更新日 新しい順",
  "title-asc": "タイトル順",
  "favorite-first": "お気に入り優先",
};
