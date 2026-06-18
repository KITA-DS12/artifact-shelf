import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("アプリ名を見出しとして表示する", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Artifact Shelf" }),
    ).toBeInTheDocument();
  });

  it("空状態のメッセージを表示する", () => {
    render(<App />);
    expect(screen.getByText(/まだ何も登録されていません/)).toBeInTheDocument();
  });
});
