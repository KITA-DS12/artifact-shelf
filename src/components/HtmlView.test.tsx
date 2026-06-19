import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HtmlView } from "./HtmlView";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("HtmlView", () => {
  it("sandbox は allow-scripts のみ（allow-same-origin は付けない）", () => {
    render(<HtmlView content="<h1>hi</h1>" />);
    const frame = screen.getByTitle("HTML プレビュー") as HTMLIFrameElement;
    expect(frame.getAttribute("sandbox")).toBe("allow-scripts");
    expect(frame.getAttribute("sandbox")).not.toContain("allow-same-origin");
  });

  it("srcDoc に inject script が挟まる（高さ通知 + クリック振り分け）", () => {
    render(<HtmlView content="<body><p>x</p></body>" />);
    const frame = screen.getByTitle("HTML プレビュー") as HTMLIFrameElement;
    const srcdoc = frame.getAttribute("srcdoc") ?? "";
    expect(srcdoc).toContain("YOMIKURA_RESIZE");
    expect(srcdoc).toContain("YOMIKURA_OPEN_EXTERNAL");
    expect(srcdoc).toContain("scrollIntoView");
    expect(srcdoc).toContain("preventDefault");
    expect(srcdoc).toContain("<p>x</p>");
  });

  it("内側スクロールを抑制する", () => {
    render(<HtmlView content="<p>x</p>" />);
    const frame = screen.getByTitle("HTML プレビュー") as HTMLIFrameElement;
    expect(frame.getAttribute("scrolling")).toBe("no");
  });

  it("プレビューモード切替ボタンは存在しない（単一モード）", () => {
    render(<HtmlView content="<p>x</p>" />);
    expect(
      screen.queryByRole("button", { name: /プレビュー/ }),
    ).not.toBeInTheDocument();
  });
});
