import { useEffect, useRef, useState } from "react";

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
  // 表示用の値（IME 未確定中も即時表示する）
  const [localValue, setLocalValue] = useState(query);
  // IME 変換中フラグ
  const composingRef = useRef(false);

  // 外から query が変わったら追従
  useEffect(() => {
    setLocalValue(query);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div className="find-bar" role="search">
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        placeholder="ページ内検索"
        aria-label="ページ内検索"
        onChange={(e) => {
          const v = e.target.value;
          setLocalValue(v);
          // IME 確定前は find を走らせない（compositionend でまとめて反映）
          if (!composingRef.current) {
            onChange(v);
          }
        }}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          composingRef.current = false;
          // 確定したのでまとめて反映
          onChange(e.currentTarget.value);
        }}
        onKeyDown={(e) => {
          // IME 変換中の Enter は確定として扱われるため、キー操作は受けない
          if (composingRef.current || e.nativeEvent.isComposing) return;
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
