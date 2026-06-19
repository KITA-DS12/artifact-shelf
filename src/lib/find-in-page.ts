/**
 * 与えられた root 要素配下の TextNode を全て走査し、query に case-insensitive で
 * 一致する位置の Range を返す。
 */
export function findMatches(root: HTMLElement, query: string): Range[] {
  if (!query) return [];
  const q = query.toLowerCase();
  const matches: Range[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const text = node.nodeValue ?? "";
    const lower = text.toLowerCase();
    let idx = 0;
    while (true) {
      const found = lower.indexOf(q, idx);
      if (found === -1) break;
      const range = document.createRange();
      range.setStart(node, found);
      range.setEnd(node, found + query.length);
      matches.push(range);
      idx = found + query.length;
    }
  }
  return matches;
}
