import type { Artifact } from "./artifact";

export interface ImportResult {
  added: Artifact[];
  skippedDuplicates: string[];
  skippedUnsupported: string[];
}
