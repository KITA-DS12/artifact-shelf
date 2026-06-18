import type { ImportResult } from "../types/import";

export function describeImportResult(result: ImportResult): string {
  const parts: string[] = [`${result.added.length} 件を追加`];
  if (result.skippedDuplicates.length > 0) {
    parts.push(`重複 ${result.skippedDuplicates.length} 件をスキップ`);
  }
  if (result.skippedUnsupported.length > 0) {
    parts.push(`未対応 ${result.skippedUnsupported.length} 件をスキップ`);
  }
  return parts.join(" / ");
}
