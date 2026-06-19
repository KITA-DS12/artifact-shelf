import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "safe" | "scripts";

type Props = {
  content: string;
};

// 通常プレビュー時にだけ srcDoc 末尾へ差し込む高さ通知スクリプト。
// 親から contentDocument を覗かない（= sandbox に allow-same-origin を付けない）構成のため、
// 内側スクリプトから postMessage 経由で高さを通知する。
// 識別子 ARTIFACT_SHELF_RESIZE で他の message と混ざらないようにする。
const RESIZE_NOTIFIER = `
<script>
(function () {
  if (window.__asResizeInstalled) return;
  window.__asResizeInstalled = true;
  function notify() {
    var h = Math.max(
      document.body ? document.body.scrollHeight : 0,
      document.documentElement ? document.documentElement.scrollHeight : 0
    );
    parent.postMessage({ type: 'ARTIFACT_SHELF_RESIZE', height: h }, '*');
  }
  function setup() {
    notify();
    if (typeof ResizeObserver !== 'undefined' && document.body) {
      new ResizeObserver(function () { notify(); }).observe(document.body);
    }
    [100, 300, 800, 1500].forEach(function (d) { setTimeout(notify, d); });
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setup();
  else window.addEventListener('DOMContentLoaded', setup);
})();
</script>
`;

function injectResizeNotifier(content: string): string {
  if (content.includes("</body>")) {
    return content.replace("</body>", `${RESIZE_NOTIFIER}</body>`);
  }
  return content + RESIZE_NOTIFIER;
}

export function HtmlView({ content }: Props) {
  const [mode, setMode] = useState<Mode>("safe");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // 通常プレビューは iframe 内 script からの postMessage で高さ追従。
  // 安全プレビューでは JS が動かないため固定高さ + 内側スクロール許可。
  const [autoHeight, setAutoHeight] = useState<number | null>(null);

  // sandbox の組み立て:
  // - safe: 何も許可しない（最も厳しい）。MDN 警告どおり allow-same-origin と allow-scripts の
  //   同時付与は escape 余地があるので絶対に付けない。
  // - scripts: allow-scripts のみ。親は contentDocument を覗かない。
  const sandbox = mode === "safe" ? "" : "allow-scripts";

  const srcDoc = useMemo(
    () => (mode === "scripts" ? injectResizeNotifier(content) : content),
    [content, mode],
  );

  useEffect(() => {
    if (mode !== "scripts") {
      setAutoHeight(null);
      return;
    }
    const handler = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== "ARTIFACT_SHELF_RESIZE") return;
      const h = Number(data.height);
      if (Number.isFinite(h) && h > 0) setAutoHeight(h);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [mode]);

  const style =
    mode === "scripts" && autoHeight !== null
      ? { height: `${autoHeight}px` }
      : undefined;

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
        className={`html-view-frame${mode === "safe" ? " is-fixed" : ""}`}
        title="HTML プレビュー"
        sandbox={sandbox}
        srcDoc={srcDoc}
        scrolling={mode === "safe" ? "auto" : "no"}
        style={style}
      />
    </div>
  );
}
