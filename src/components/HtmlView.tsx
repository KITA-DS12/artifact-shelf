import { useEffect, useMemo, useRef, useState } from "react";
import { openExternalUrl } from "../lib/library";

type Props = {
  content: string;
};

// srcDoc 末尾に差し込む補助スクリプト。
//
// 役割:
// 1. iframe の高さを内容に合わせて親へ通知（postMessage）
// 2. リンククリックを 3 つに振り分け
//    - "#xxx" 同一ドキュメント内アンカー → scrollIntoView
//    - "http(s)://..." 外部 URL → 親に通知してブラウザで開く
//    - その他 (mailto / javascript / 相対パスなど) → preventDefault のみで無害化
//
// すべて try/catch で囲い、内部 HTML が壊れていても他機能を巻き込まない。
const INJECT_SCRIPT = `
<script>
(function () {
  try {
    if (window.__yomikuraInstalled) return;
    window.__yomikuraInstalled = true;

    function notify() {
      try {
        var h = Math.max(
          document.body ? document.body.scrollHeight : 0,
          document.documentElement ? document.documentElement.scrollHeight : 0
        );
        parent.postMessage({ type: 'YOMIKURA_RESIZE', height: h }, '*');
      } catch (e) { /* noop */ }
    }

    function findAnchor(node) {
      while (node && node.nodeType === 1) {
        if (node.tagName === 'A') return node;
        node = node.parentNode;
      }
      return null;
    }

    function resolveTarget(id) {
      try {
        var t = document.getElementById(id);
        if (t) return t;
      } catch (_) {}
      try {
        var named = document.getElementsByName(id);
        if (named && named.length > 0) return named[0];
      } catch (_) {}
      return null;
    }

    function isHttp(href) {
      return /^https?:\\/\\//i.test(href);
    }

    function handleClick(e) {
      try {
        var a = findAnchor(e.target);
        if (!a) return;
        var href = a.getAttribute('href');
        if (!href) return;

        // 同一ドキュメント内アンカー
        // iframe は scrolling="no" + 内容に合わせた auto height で運用しているため、
        // iframe 内の scrollIntoView は viewport 全体が見えている扱いで動かない。
        // 親に target の位置を通知してホストウィンドウ側でスクロールさせる。
        if (href.charAt(0) === '#') {
          if (href.length < 2) {
            e.preventDefault();
            return;
          }
          e.preventDefault();
          var raw = href.slice(1);
          var decoded = raw;
          try { decoded = decodeURIComponent(raw); } catch (_) {}
          var target = resolveTarget(decoded) || resolveTarget(raw);
          if (target) {
            var rect = target.getBoundingClientRect();
            var pageY = (window.scrollY || window.pageYOffset || 0);
            parent.postMessage({
              type: 'YOMIKURA_SCROLL_TO',
              topInFrame: rect.top + pageY,
            }, '*');
          } else {
            console.warn('[yomikura] anchor target not found:', href);
          }
          return;
        }

        // 外部 URL → 親に通知してブラウザで開く
        if (isHttp(href)) {
          e.preventDefault();
          parent.postMessage({ type: 'YOMIKURA_OPEN_EXTERNAL', url: href }, '*');
          return;
        }

        // mailto / javascript / 相対パス等は preventDefault のみ
        e.preventDefault();
      } catch (err) {
        console.error('[yomikura] click handler error:', err);
      }
    }

    function setup() {
      notify();
      try {
        if (typeof ResizeObserver !== 'undefined' && document.body) {
          new ResizeObserver(function () { notify(); }).observe(document.body);
        }
      } catch (_) {}
      [100, 300, 800, 1500].forEach(function (d) { setTimeout(notify, d); });
      document.addEventListener('click', handleClick, true);
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setup();
    } else {
      window.addEventListener('DOMContentLoaded', setup);
    }
  } catch (err) {
    try { console.error('[yomikura] inject error:', err); } catch (_) {}
  }
})();
</script>
`;

function injectHelper(content: string): string {
  if (content.includes("</body>")) {
    return content.replace("</body>", `${INJECT_SCRIPT}</body>`);
  }
  return content + INJECT_SCRIPT;
}

export function HtmlView({ content }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [autoHeight, setAutoHeight] = useState<number | null>(null);

  // ローカルで自分が取り込んだファイルだけを開くアプリなので、外部からの悪意ある
  // HTML を想定する必要は薄い。allow-same-origin は付けない（escape 防止）ので
  // 親側の cookie / localStorage / IPC は読めない。
  const sandbox = "allow-scripts";

  const srcDoc = useMemo(() => injectHelper(content), [content]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "YOMIKURA_RESIZE") {
        const h = Number(data.height);
        if (Number.isFinite(h) && h > 0) setAutoHeight(h);
        return;
      }
      if (data.type === "YOMIKURA_OPEN_EXTERNAL") {
        const url = String(data.url ?? "");
        if (url) void openExternalUrl(url).catch(() => {});
        return;
      }
      if (data.type === "YOMIKURA_SCROLL_TO") {
        const iframe = iframeRef.current;
        if (!iframe) return;
        const topInFrame = Number(data.topInFrame ?? 0);
        if (!Number.isFinite(topInFrame)) return;
        const rect = iframe.getBoundingClientRect();
        // iframe の document 内座標 → ホストウィンドウの絶対座標
        const absoluteTop = window.scrollY + rect.top + topInFrame;
        // 上に少しマージン（読みやすさのため）
        window.scrollTo({ top: absoluteTop - 24, behavior: "smooth" });
        return;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const style = autoHeight !== null ? { height: `${autoHeight}px` } : undefined;

  return (
    <div className="html-view">
      <iframe
        ref={iframeRef}
        className="html-view-frame"
        title="HTML プレビュー"
        sandbox={sandbox}
        srcDoc={srcDoc}
        scrolling="no"
        style={style}
      />
    </div>
  );
}
