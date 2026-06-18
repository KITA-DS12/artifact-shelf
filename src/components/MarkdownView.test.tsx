import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownView } from "./MarkdownView";

describe("MarkdownView", () => {
  it("見出しを H タグでレンダリングする", () => {
    render(<MarkdownView content={"# Hello\n\n本文"} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Hello" }),
    ).toBeInTheDocument();
  });

  it("GFM テーブルをレンダリングする", () => {
    const md = `| H1 | H2 |\n|---|---|\n| A | B |`;
    render(<MarkdownView content={md} />);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("コードブロックを <code> でレンダリングする", () => {
    const md = "```js\nconst x = 1;\n```";
    const { container } = render(<MarkdownView content={md} />);
    const code = container.querySelector("pre code");
    expect(code).not.toBeNull();
    expect(code?.textContent).toContain("const x");
  });
});
