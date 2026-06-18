import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { importArtifacts } from "../lib/library";
import { describeImportResult } from "../lib/import-message";
import type { ImportResult } from "../types/import";

type Props = {
  onImported?: (result: ImportResult) => void;
};

export function ImportButton({ onImported }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "Markdown / HTML",
            extensions: ["md", "mdx", "html", "htm"],
          },
        ],
      });
      if (!selected) {
        setBusy(false);
        return;
      }
      const paths = Array.isArray(selected) ? selected : [selected];
      const result = await importArtifacts(paths);
      setMessage(describeImportResult(result));
      onImported?.(result);
    } catch (err) {
      setMessage(`インポートに失敗しました: ${String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="import-control">
      <button type="button" onClick={handleClick} disabled={busy}>
        {busy ? "インポート中…" : "インポート"}
      </button>
      {message && <span className="import-message">{message}</span>}
    </div>
  );
}
