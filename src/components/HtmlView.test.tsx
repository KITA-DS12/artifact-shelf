import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HtmlView } from "./HtmlView";

describe("HtmlView", () => {
  it("初期表示は安全プレビューで sandbox は allow-same-origin（JS 無効）", () => {
    render(<HtmlView content="<h1>hi</h1>" />);
    const frame = screen.getByTitle("HTML プレビュー") as HTMLIFrameElement;
    expect(frame.getAttribute("sandbox")).toBe("allow-same-origin");
    expect(
      screen.getByRole("button", { name: /安全プレビュー/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("通常プレビューに切り替えると sandbox に allow-scripts が加わる", async () => {
    render(<HtmlView content="<h1>hi</h1>" />);
    await userEvent.click(
      screen.getByRole("button", { name: /通常プレビュー/ }),
    );
    const frame = screen.getByTitle("HTML プレビュー") as HTMLIFrameElement;
    expect(frame.getAttribute("sandbox")).toBe(
      "allow-same-origin allow-scripts",
    );
    expect(
      screen.getByRole("button", { name: /通常プレビュー/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("srcDoc に content がそのまま渡される", () => {
    render(<HtmlView content="<p>hello</p>" />);
    const frame = screen.getByTitle("HTML プレビュー") as HTMLIFrameElement;
    expect(frame.getAttribute("srcdoc")).toBe("<p>hello</p>");
  });

  it("内側スクロールを抑制する scrolling 属性を持つ", () => {
    render(<HtmlView content="<p>x</p>" />);
    const frame = screen.getByTitle("HTML プレビュー") as HTMLIFrameElement;
    expect(frame.getAttribute("scrolling")).toBe("no");
  });
});
