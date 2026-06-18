export type FileType = "markdown" | "html";

export type Source = "Claude" | "ChatGPT" | "Gemini" | "Manual" | "Unknown";

export interface Artifact {
  id: string;
  title: string;
  sourcePath: string;
  fileType: FileType;
  tags: string[];
  generatedAt: string;
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
