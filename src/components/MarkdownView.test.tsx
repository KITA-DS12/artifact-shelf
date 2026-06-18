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

  it("見出しに slug の id を付与する", () => {
    const { container } = render(
      <MarkdownView content={"# Hello\n\n## API"} />,
    );
    expect(container.querySelector("h1")?.id).toBe("hello");
    expect(container.querySelector("h2")?.id).toBe("api");
  });

  it("heading の id は generateToc の slug と一致する", async () => {
    const { generateToc } = await import("../lib/toc");
    const md = "# 認証フロー\n\n## API 一覧";
    const toc = generateToc(md);
    const { container } = render(<MarkdownView content={md} />);
    const headings = container.querySelectorAll("h1, h2");
    expect(headings[0].id).toBe(toc[0].slug);
    expect(headings[1].id).toBe(toc[1].slug);
  });
});
