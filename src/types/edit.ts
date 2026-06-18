import type { Source } from "./artifact";

export interface ArtifactUpdate {
  title: string;
  tags: string[];
  note: string;
  isRead: boolean;
  isFavorite: boolean;
  source: Source;
}
