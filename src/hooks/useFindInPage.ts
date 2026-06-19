import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { findMatches } from "../lib/find-in-page";

// CSS Custom Highlight API (Chromium 105+) を使うため、グローバル型を最小で宣言
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

function clearHighlights() {
  // CSS.highlights は ES module からは window.CSS で読む
  const css = (window as unknown as { CSS?: CSS }).CSS;
  if (css?.highlights) {
    try {
      css.highlights.delete(HL_ALL);
      css.highlights.delete(HL_CURRENT);
    } catch {
      /* noop */
    }
  }
}

function setHighlight(name: string, ranges: Range[]) {
  const css = (window as unknown as { CSS?: CSS }).CSS;
  const HighlightCtor = (window as { Highlight?: typeof Window.prototype.Highlight })
    .Highlight;
  if (!css?.highlights || !HighlightCtor || ranges.length === 0) {
    if (css?.highlights) {
      try {
        css.highlights.delete(name);
      } catch {
        /* noop */
      }
    }
    return;
  }
  try {
    const hl = new HighlightCtor(...ranges);
    css.highlights.set(name, hl);
  } catch {
    /* noop */
  }
}

export function useFindInPage(rootRef: RefObject<HTMLElement | null>) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Range[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  // 直前 query で highlight を入れたかをトラッキング
  const lastQueryRef = useRef("");

  // query が変わるたびに探索とハイライトを更新
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!query) {
      setMatches([]);
      setCurrentIndex(0);
      clearHighlights();
      lastQueryRef.current = "";
      return;
    }
    const found = findMatches(root, query);
    setMatches(found);
    setCurrentIndex(0);
    setHighlight(HL_ALL, found);
    if (found.length > 0) {
      setHighlight(HL_CURRENT, [found[0]]);
    } else {
      setHighlight(HL_CURRENT, []);
    }
    lastQueryRef.current = query;
  }, [query, rootRef]);

  // current 変更で scroll + current のハイライト更新
  useEffect(() => {
    const r = matches[currentIndex];
    if (!r) return;
    setHighlight(HL_CURRENT, [r]);
    const rect = r.getBoundingClientRect();
    // 検索バーの高さ分くらいマージンを置く
    window.scrollTo({
      top: window.scrollY + rect.top - 120,
      behavior: "smooth",
    });
  }, [currentIndex, matches]);

  // unmount 時にクリーンアップ
  useEffect(() => clearHighlights, []);

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
    clearHighlights();
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
