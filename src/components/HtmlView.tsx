import { useEffect, useRef, useState } from "react";

type Mode = "safe" | "scripts";

type Props = {
  content: string;
};

export function HtmlView({ content }: Props) {
  const [mode, setMode] = useState<Mode>("safe");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(400);

  // safe: 同一オリジン扱いだが JS は無効
  // scripts: JS も許可
  const sandbox =
    mode === "safe" ? "allow-same-origin" : "allow-same-origin allow-scripts";

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let observer: ResizeObserver | null = null;
    let cancelled = false;

    const updateHeight = () => {
      if (cancelled) return;
      const doc = iframe.contentDocument;
      if (!doc) return;
      const body = doc.body;
      const root = doc.documentElement;
      // body と html の両方からとり、最大値（一部 CSS で margin が body に出るため）
      const next = Math.max(
        body?.scrollHeight ?? 0,
        body?.offsetHeight ?? 0,
        root?.scrollHeight ?? 0,
        root?.offsetHeight ?? 0,
      );
      if (next > 0) setHeight(next);
    };

    const handleLoad = () => {
      updateHeight();
      const doc = iframe.contentDocument;
      if (!doc) return;
      // 内部リサイズに追従
      if (typeof ResizeObserver !== "undefined" && doc.body) {
        observer = new ResizeObserver(() => updateHeight());
        observer.observe(doc.body);
      }
      // 画像が遅れて読み込まれるケースに備え数回サンプリング
      const samples = [100, 300, 800, 1500];
      samples.forEach((delay) => {
        window.setTimeout(updateHeight, delay);
      });
    };

    iframe.addEventListener("load", handleLoad);
    return () => {
      cancelled = true;
      iframe.removeEventListener("load", handleLoad);
      observer?.disconnect();
    };
  }, [content, mode]);

  return (
    <div className="html-view">
      <div
        className="html-view-toolbar"
        role="group"
        aria-label="プレビュー モード"
      >
        <button
          type="button"
          aria-pressed={mode === "safe"}
          onClick={() => setMode("safe")}
        >
          安全プレビュー (JS 無効)
        </button>
        <button
          type="button"
          aria-pressed={mode === "scripts"}
          onClick={() => setMode("scripts")}
        >
          通常プレビュー (JS 有効)
        </button>
      </div>
      <iframe
        ref={iframeRef}
        key={mode}
        className="html-view-frame"
        title="HTML プレビュー"
        sandbox={sandbox}
        srcDoc={content}
        scrolling="no"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}
