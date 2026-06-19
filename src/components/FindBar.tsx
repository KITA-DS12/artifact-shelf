import { useEffect, useRef } from "react";

type Props = {
  query: string;
  count: number;
  currentIndex: number;
  onChange: (q: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
};

export function FindBar({
  query,
  count,
  currentIndex,
  onChange,
  onNext,
  onPrev,
  onClose,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div className="find-bar" role="search">
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder="ページ内検索"
        aria-label="ページ内検索"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
      />
      <span className="find-count">
        {query ? (count === 0 ? "0 件" : `${currentIndex + 1} / ${count}`) : ""}
      </span>
      <button
        type="button"
        className="find-button"
        onClick={onPrev}
        disabled={count === 0}
        aria-label="前のマッチ"
        title="Shift+Enter"
      >
        ▴
      </button>
      <button
        type="button"
        className="find-button"
        onClick={onNext}
        disabled={count === 0}
        aria-label="次のマッチ"
        title="Enter"
      >
        ▾
      </button>
      <button
        type="button"
        className="find-button find-close"
        onClick={onClose}
        aria-label="閉じる"
        title="Esc"
      >
        ×
      </button>
    </div>
  );
}
