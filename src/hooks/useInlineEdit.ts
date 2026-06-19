import { useEffect, useRef, useState } from "react";

type InlineEditElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * インライン編集（display ⇄ edit）の共通 state を提供する。
 *
 * - `editing` で表示モードを切り替える
 * - `draft` は編集中の作業値。`!editing` のとき `value` に追従する
 * - `ref` は edit モード突入時に自動 focus される
 *
 * commit / cancel の判定（trim・空チェック・変化チェック）は呼び出し側の責務。
 * 条件が Field ごとに異なるため hook には吸収しない。
 */
export function useInlineEdit<T extends InlineEditElement>(value: string) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  return { editing, setEditing, draft, setDraft, ref };
}
