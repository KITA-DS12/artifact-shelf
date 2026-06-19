/**
 * ISO8601 文字列の先頭 10 文字（YYYY-MM-DD）を返す。
 * 不正な入力は空文字を返す。
 */
export function toDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}
