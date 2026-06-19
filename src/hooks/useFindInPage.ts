import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";
import { findMatches } from "../lib/find-in-page";

declare global {
  interface Window {
    Highlight: {
      new (...ranges: Range[]): unknown;
    };
  }
  interface CSS {
    highlights?: {
      set(name: string, highlight: unknown): void;
      delete(name: string): boolean;
      clear?(): void;
    };
  }
}

const HL_ALL = "yomikura-find";
const HL_CURRENT = "yomikura-find-current";

function getHighlights() {
  return (window as unknown as { CSS?: CSS }).CSS?.highlights;
}

function deleteHighlight(name: string) {
  const hi = getHighlights();
  if (!hi) return;
  try {
    hi.delete(name);
  } catch {
    /* noop */
  }
}

function setHighlight(name: string, ranges: Range[]) {
  // 必ず先に削除（ブラウザ実装によっては set だけだと残るケースがあるため）
  deleteHighlight(name);
  if (ranges.length === 0) return;
  const HighlightCtor = (window as { Highlight?: typeof Window.prototype.Highlight })
    .Highlight;
  const hi = getHighlights();
  if (!HighlightCtor || !hi) return;
  try {
    const hl = new HighlightCtor(...ranges);
    hi.set(name, hl);
  } catch {
    /* noop */
  }
}

export interface FindController {
  query: string;
  setQuery: (q: string) => void;
  count: number;
  currentIndex: number;
  next: () => void;
  prev: () => void;
  close: () => void;
}

/**
 * Markdown 側の DOM 内でのページ内検索フック。
 * CSS Custom Highlight API でハイライトする。
 */
export function useFindInPage(
  rootRef: RefObject<HTMLElement | null>,
): FindController {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Range[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // query が変わるたびに探索 + ハイライト
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      setMatches([]);
      setCurrentIndex(0);
      setHighlight(HL_ALL, []);
      setHighlight(HL_CURRENT, []);
      return;
    }
    if (!query) {
      setMatches([]);
      setCurrentIndex(0);
      setHighlight(HL_ALL, []);
      setHighlight(HL_CURRENT, []);
      return;
    }
    const found = findMatches(root, query);
    setMatches(found);
    setCurrentIndex(0);
    setHighlight(HL_ALL, found);
    setHighlight(HL_CURRENT, found.length > 0 ? [found[0]] : []);
  }, [query, rootRef]);

  // current 変更で scroll + current のハイライト更新
  useEffect(() => {
    if (matches.length === 0) return;
    const r = matches[currentIndex];
    if (!r) return;
    setHighlight(HL_CURRENT, [r]);
    const rect = r.getBoundingClientRect();
    window.scrollTo({
      top: window.scrollY + rect.top - 120,
      behavior: "smooth",
    });
  }, [currentIndex, matches]);

  useEffect(
    () => () => {
      setHighlight(HL_ALL, []);
      setHighlight(HL_CURRENT, []);
    },
    [],
  );

  const next = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentIndex((i) => (i + 1) % matches.length);
  }, [matches.length]);

  const prev = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentIndex((i) => (i - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const close = useCallback(() => {
    setQuery("");
    setHighlight(HL_ALL, []);
    setHighlight(HL_CURRENT, []);
  }, []);

  return {
    query,
    setQuery,
    count: matches.length,
    currentIndex,
    next,
    prev,
    close,
  };
}
