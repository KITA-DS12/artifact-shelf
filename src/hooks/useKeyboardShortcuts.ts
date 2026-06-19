import { useEffect, useRef } from "react";

export type KeyboardHandlers = {
  /** J / ↓ */
  onNext?: () => void;
  /** K / ↑ */
  onPrev?: () => void;
  /** / */
  onSearch?: () => void;
  /** Esc */
  onEscape?: () => void;
};

function isTextField(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  return (el as HTMLElement).isContentEditable === true;
}

/**
 * グローバルなキーボードショートカット。
 *
 * - 入力フィールド（input/textarea/contentEditable）にフォーカス中は基本無視。
 *   ただし Esc は入力中でも blur のため動かす。
 * - Enter / Space は標準動作（ボタンクリック等）に任せる。
 */
export function useKeyboardShortcuts(handlers: KeyboardHandlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const active = document.activeElement;

      if (isTextField(active)) {
        if (e.key === "Escape") {
          (active as HTMLElement).blur();
          e.preventDefault();
        }
        return;
      }

      // 修飾子があるショートカット（Cmd+K 等）には今は介入しない
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "j":
        case "ArrowDown":
          if (ref.current.onNext) {
            ref.current.onNext();
            e.preventDefault();
          }
          break;
        case "k":
        case "ArrowUp":
          if (ref.current.onPrev) {
            ref.current.onPrev();
            e.preventDefault();
          }
          break;
        case "/":
          if (ref.current.onSearch) {
            ref.current.onSearch();
            e.preventDefault();
          }
          break;
        case "Escape":
          if (ref.current.onEscape) {
            ref.current.onEscape();
            e.preventDefault();
          }
          break;
        default:
          break;
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
