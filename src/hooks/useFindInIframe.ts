import { useCallback, useEffect, useState } from "react";
import type { RefObject } from "react";
import type { HtmlViewHandle } from "../components/HtmlView";
import type { FindController } from "./useFindInPage";

/**
 * HTML プレビュー (iframe) 用のページ内検索フック。
 * - query の変更 / next / prev は iframe に postMessage で投げる
 * - iframe から `YOMIKURA_FIND_RESULT { count, currentIndex }` を受け取って state に反映
 */
export function useFindInIframe(
  viewRef: RefObject<HtmlViewHandle | null>,
): FindController {
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  // iframe からの結果通知を受け取る
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type !== "YOMIKURA_FIND_RESULT") return;
      const c = Number(e.data.count ?? 0);
      const i = Number(e.data.currentIndex ?? 0);
      setCount(Number.isFinite(c) ? c : 0);
      setCurrentIndex(Number.isFinite(i) ? i : 0);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // query 変更を iframe に転送
  useEffect(() => {
    viewRef.current?.setFindQuery(query);
  }, [query, viewRef]);

  const next = useCallback(() => {
    viewRef.current?.findNext();
  }, [viewRef]);

  const prev = useCallback(() => {
    viewRef.current?.findPrev();
  }, [viewRef]);

  const close = useCallback(() => {
    setQuery("");
    setCount(0);
    setCurrentIndex(0);
    viewRef.current?.setFindQuery("");
  }, [viewRef]);

  return { query, setQuery, count, currentIndex, next, prev, close };
}
