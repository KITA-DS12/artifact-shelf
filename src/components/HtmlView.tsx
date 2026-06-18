import { useState } from "react";

type Mode = "safe" | "scripts";

type Props = {
  content: string;
};

export function HtmlView({ content }: Props) {
  const [mode, setMode] = useState<Mode>("safe");
  const sandbox = mode === "safe" ? "" : "allow-scripts";

  return (
    <div className="html-view">
      <div className="html-view-toolbar" role="group" aria-label="プレビュー モード">
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
        key={mode}
        className="html-view-frame"
        title="HTML プレビュー"
        sandbox={sandbox}
        srcDoc={content}
      />
    </div>
  );
}
