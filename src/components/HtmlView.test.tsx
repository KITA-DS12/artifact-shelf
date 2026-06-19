import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HtmlView } from "./HtmlView";

describe("HtmlView", () => {
  it("安全プレビュー (初期) は sandbox=\"\" で最も厳しい設定", () => {
    render(<HtmlView content="<h1>hi</h1>" />);
    const frame = screen.getByTitle("HTML プレビュー") as HTMLIFrameElement;
    expect(frame.getAttribute("sandbox")).toBe("");
    expect(
      screen.getByRole("button", { name: /安全プレビュー/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("通常プレビューでは sandbox=allow-scripts のみ（allow-same-origin は付けない）", async () => {
    render(<HtmlView content="<h1>hi</h1>" />);
    await userEvent.click(
      screen.getByRole("button", { name: /通常プレビュー/ }),
    );
    const frame = screen.getByTitle("HTML プレビュー") as HTMLIFrameElement;
    expect(frame.getAttribute("sandbox")).toBe("allow-scripts");
    expect(frame.getAttribute("sandbox")).not.toContain("allow-same-origin");
  });

  it("安全プレビューでは srcDoc は content そのまま（inject なし）", () => {
    const content = "<p>hello</p>";
    render(<HtmlView content={content} />);
    const frame = screen.getByTitle("HTML プレビュー") as HTMLIFrameElement;
    expect(frame.getAttribute("srcdoc")).toBe(content);
  });

  it("通常プレビューでは srcDoc に高さ通知スクリプトが挟まる", async () => {
    render(<HtmlView content="<body><p>x</p></body>" />);
    await userEvent.click(
      screen.getByRole("button", { name: /通常プレビュー/ }),
    );
    const frame = screen.getByTitle("HTML プレビュー") as HTMLIFrameElement;
    const srcdoc = frame.getAttribute("srcdoc") ?? "";
    expect(srcdoc).toContain("ARTIFACT_SHELF_RESIZE");
    expect(srcdoc).toContain("</body>");
    // 元の <p> も残っていること
    expect(srcdoc).toContain("<p>x</p>");
  });

  it("安全プレビューでは scrolling=auto（内側スクロール許可）", () => {
    render(<HtmlView content="<p>x</p>" />);
    const frame = screen.getByTitle("HTML プレビュー") as HTMLIFrameElement;
    expect(frame.getAttribute("scrolling")).toBe("auto");
  });

  it("通常プレビューでは scrolling=no（外側スクロールに任せる）", async () => {
    render(<HtmlView content="<p>x</p>" />);
    await userEvent.click(
      screen.getByRole("button", { name: /通常プレビュー/ }),
    );
    const frame = screen.getByTitle("HTML プレビュー") as HTMLIFrameElement;
    expect(frame.getAttribute("scrolling")).toBe("no");
  });
});
