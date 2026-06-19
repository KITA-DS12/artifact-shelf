import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { openExternalUrl } from "../lib/library";

type Props = {
  content: string;
};

export type HtmlViewHandle = {
  /** iframe 内ページ内検索の query を設定。空文字でクリア */
  setFindQuery: (query: string) => void;
  /** 次のマッチへ */
  findNext: () => void;
  /** 前のマッチへ */
  findPrev: () => void;
};

// srcDoc 末尾に差し込む補助スクリプト。
//
// 役割:
// 1. iframe の高さを内容に合わせて親へ通知（postMessage）
// 2. リンククリックを 3 つに振り分け
//    - "#xxx" 同一ドキュメント内アンカー → 親に位置を通知して親でスクロール
//    - "http(s)://..." 外部 URL → 親に通知してブラウザで開く
//    - その他 (mailto / javascript / 相対パスなど) → preventDefault のみで無害化
// 3. <pre> に Copy ボタンを動的挿入
// 4. ページ内検索: 親から YOMIKURA_FIND を受けると CSS Custom Highlight API で highlight
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

        if (isHttp(href)) {
          e.preventDefault();
          parent.postMessage({ type: 'YOMIKURA_OPEN_EXTERNAL', url: href }, '*');
          return;
        }

        e.preventDefault();
      } catch (err) {
        console.error('[yomikura] click handler error:', err);
      }
    }

    function installCopyButtons() {
      try {
        var pres = document.querySelectorAll('pre');
        pres.forEach(function (pre) {
          if (pre.getAttribute('data-yomikura-copy')) return;
          pre.setAttribute('data-yomikura-copy', '1');
          var wrap = document.createElement('div');
          wrap.className = 'yomikura-code-wrap';
          wrap.style.cssText = 'position:relative;';
          var parent = pre.parentNode;
          if (!parent) return;
          parent.insertBefore(wrap, pre);
          wrap.appendChild(pre);

          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = 'Copy';
          btn.className = 'yomikura-copy-btn';
          btn.style.cssText =
            'position:absolute;top:6px;right:6px;font:inherit;font-size:11px;padding:2px 10px;border:1px solid rgba(0,0,0,0.2);border-radius:3px;background:rgba(255,255,255,0.9);cursor:pointer;color:#333;z-index:1;';
          btn.addEventListener('click', function () {
            var text = pre.innerText || pre.textContent || '';
            window.parent.postMessage({ type: 'YOMIKURA_COPY', text: text }, '*');
            btn.textContent = 'Copied';
            setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
          });
          wrap.appendChild(btn);
        });
      } catch (e) { /* noop */ }
    }

    function installFindStyles() {
      try {
        var style = document.createElement('style');
        style.textContent =
          '::highlight(yomikura-find){background-color:#fff39a;color:inherit;}' +
          '::highlight(yomikura-find-current){background-color:#ffb84a;color:inherit;}';
        document.head.appendChild(style);
      } catch (_) {}
    }

    // iframe 内の find 状態（matches 配列と current index）を保持
    window.__yomikuraFind = { matches: [], currentIndex: 0 };

    function clearFindHighlights() {
      var hi = window.CSS && window.CSS.highlights;
      if (!hi) return;
      try { hi.delete('yomikura-find'); } catch (_) {}
      try { hi.delete('yomikura-find-current'); } catch (_) {}
    }

    function applyFindHighlights(matches, currentIndex) {
      var hi = window.CSS && window.CSS.highlights;
      if (!hi || !window.Highlight) return;
      clearFindHighlights();
      if (matches.length === 0) return;
      try {
        var hlAll = new window.Highlight();
        matches.forEach(function (r) { hlAll.add(r); });
        hi.set('yomikura-find', hlAll);
        var current = matches[currentIndex] || matches[0];
        var hlCurrent = new window.Highlight();
        hlCurrent.add(current);
        hi.set('yomikura-find-current', hlCurrent);
      } catch (_) {}
    }

    function scrollToCurrentMatch() {
      var state = window.__yomikuraFind;
      if (!state || state.matches.length === 0) return;
      var r = state.matches[state.currentIndex];
      if (!r) return;
      try {
        var rect = r.getBoundingClientRect();
        parent.postMessage({
          type: 'YOMIKURA_SCROLL_TO',
          topInFrame: rect.top + (window.scrollY || 0),
        }, '*');
      } catch (_) {}
    }

    function reportResult() {
      var state = window.__yomikuraFind;
      parent.postMessage({
        type: 'YOMIKURA_FIND_RESULT',
        count: state.matches.length,
        currentIndex: state.currentIndex,
      }, '*');
    }

    function performFind(query) {
      try {
        clearFindHighlights();
        window.__yomikuraFind = { matches: [], currentIndex: 0 };
        if (!query) {
          reportResult();
          return 0;
        }
        var root = document.body;
        if (!root) {
          reportResult();
          return 0;
        }
        var matches = [];
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        var q = query.toLowerCase();
        while (walker.nextNode()) {
          var node = walker.currentNode;
          var text = (node.nodeValue || '').toLowerCase();
          var idx = 0;
          while (true) {
            var found = text.indexOf(q, idx);
            if (found === -1) break;
            try {
              var range = document.createRange();
              range.setStart(node, found);
              range.setEnd(node, found + query.length);
              matches.push(range);
            } catch (_) {}
            idx = found + query.length;
          }
        }
        window.__yomikuraFind = { matches: matches, currentIndex: 0 };
        applyFindHighlights(matches, 0);
        if (matches.length > 0) {
          scrollToCurrentMatch();
        }
        reportResult();
        return matches.length;
      } catch (e) {
        return 0;
      }
    }

    function navigateFind(direction) {
      var state = window.__yomikuraFind;
      if (!state || state.matches.length === 0) return;
      if (direction === 'next') {
        state.currentIndex = (state.currentIndex + 1) % state.matches.length;
      } else {
        state.currentIndex =
          (state.currentIndex - 1 + state.matches.length) % state.matches.length;
      }
      applyFindHighlights(state.matches, state.currentIndex);
      scrollToCurrentMatch();
      reportResult();
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
      installCopyButtons();
      installFindStyles();
      [300, 800, 1500].forEach(function (d) { setTimeout(installCopyButtons, d); });
      window.addEventListener('message', function (e) {
        if (!e.data || typeof e.data !== 'object') return;
        if (e.data.type === 'YOMIKURA_FIND') {
          performFind(e.data.query || '');
        } else if (e.data.type === 'YOMIKURA_FIND_NAV') {
          navigateFind(e.data.direction || 'next');
        }
      });
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

export const HtmlView = forwardRef<HtmlViewHandle, Props>(function HtmlView(
  { content },
  ref,
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [autoHeight, setAutoHeight] = useState<number | null>(null);

  const sandbox = "allow-scripts";

  const srcDoc = useMemo(() => injectHelper(content), [content]);

  useImperativeHandle(
    ref,
    () => ({
      setFindQuery: (query: string) => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "YOMIKURA_FIND", query },
          "*",
        );
      },
      findNext: () => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "YOMIKURA_FIND_NAV", direction: "next" },
          "*",
        );
      },
      findPrev: () => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "YOMIKURA_FIND_NAV", direction: "prev" },
          "*",
        );
      },
    }),
    [],
  );

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
      if (data.type === "YOMIKURA_COPY") {
        const text = String(data.text ?? "");
        if (text)
          void import("../lib/library").then(({ copyToClipboard }) =>
            copyToClipboard(text).catch(() => {}),
          );
        return;
      }
      if (data.type === "YOMIKURA_SCROLL_TO") {
        const iframe = iframeRef.current;
        if (!iframe) return;
        const topInFrame = Number(data.topInFrame ?? 0);
        if (!Number.isFinite(topInFrame)) return;
        const rect = iframe.getBoundingClientRect();
        const absoluteTop = window.scrollY + rect.top + topInFrame;
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
});
