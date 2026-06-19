export interface TocEntry {
  level: 1 | 2 | 3;
  text: string;
  slug: string;
}

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9぀-ゟ゠-ヿ一-鿿-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Markdown 本文から H1〜H3 を抽出して目次エントリ配列を返す。
 * フェンス付きコードブロック内の `#` は見出しとして扱わない。
 */
export function generateToc(markdown: string): TocEntry[] {
  if (!markdown) return [];
  const lines = markdown.split(/\r?\n/);
  const entries: TocEntry[] = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const level = m[1].length as 1 | 2 | 3;
    const text = m[2].trim();
    entries.push({ level, text, slug: slugify(text) });
  }
  return entries;
}
