import { useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  saveSettings,
  scanAndImportInbox,
} from "../lib/library";
import { describeImportResult } from "../lib/import-message";
import type { Settings } from "../types/settings";

type Props = {
  settings: Settings;
  onSettingsChange: (next: Settings) => void;
  onImported?: () => void;
};

export function InboxBar({ settings, onSettingsChange, onImported }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function pickFolder() {
    const picked = await openDialog({ directory: true, multiple: false });
    if (!picked || Array.isArray(picked)) return;
    const next: Settings = { ...settings, inboxPath: picked };
    await saveSettings(next);
    onSettingsChange(next);
    // 設定直後に scan 走らせる
    await runScan(next);
  }

  async function clearInbox() {
    const next: Settings = { ...settings, inboxPath: null };
    await saveSettings(next);
    onSettingsChange(next);
    setMessage(null);
  }

  async function runScan(s: Settings = settings) {
    if (!s.inboxPath) return;
    setBusy(true);
    try {
      const result = await scanAndImportInbox();
      setMessage(describeImportResult(result));
      onImported?.();
    } catch (err) {
      setMessage(`Inbox 取り込みに失敗: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!settings.inboxPath) {
    return (
      <div className="inbox-bar">
        <span className="inbox-label">Inbox 未設定</span>
        <button
          type="button"
          className="btn"
          onClick={() => void pickFolder()}
        >
          Inbox フォルダを設定
        </button>
        <span className="inbox-help muted">
          設定したフォルダに置いた .md / .html を起動時 + 手動 scan で自動取り込みします
        </span>
      </div>
    );
  }

  return (
    <div className="inbox-bar">
      <span className="inbox-label">Inbox</span>
      <code className="inbox-path" title={settings.inboxPath}>
        {settings.inboxPath}
      </code>
      <button
        type="button"
        className="btn"
        onClick={() => void runScan()}
        disabled={busy}
      >
        {busy ? "取り込み中…" : "いま取り込む"}
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => void pickFolder()}
      >
        変更
      </button>
      <button
        type="button"
        className="link-button inbox-clear"
        onClick={() => void clearInbox()}
      >
        解除
      </button>
      {message && <span className="inbox-message muted">{message}</span>}
    </div>
  );
}
