import { useEffect, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { importArtifacts } from "../lib/library";
import { describeImportResult } from "../lib/import-message";
import type { ImportResult } from "../types/import";

export function useDragDropImport(
  onImported?: (result: ImportResult) => void,
) {
  const [hovering, setHovering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    const setup = async () => {
      try {
        const fn = await getCurrentWebview().onDragDropEvent(async (event) => {
          const type = event.payload.type;
          if (type === "over") {
            setHovering(true);
          } else if (type === "leave") {
            setHovering(false);
          } else if (type === "drop") {
            setHovering(false);
            try {
              const result = await importArtifacts(event.payload.paths);
              setMessage(describeImportResult(result));
              onImported?.(result);
            } catch (err) {
              setMessage(`インポートに失敗しました: ${String(err)}`);
            }
          }
        });
        if (cancelled) {
          fn();
        } else {
          unlisten = fn;
        }
      } catch {
        // Tauri 環境外 (ブラウザでのテスト等) ではドラッグ＆ドロップを無効化
      }
    };

    void setup();
    return () => {
      cancelled = true;
      if (unlisten) unlisten();
    };
  }, [onImported]);

  return { hovering, message };
}
