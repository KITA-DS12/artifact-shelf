import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

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

  it("インポートボタンを表示する", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: "インポート" }),
    ).toBeInTheDocument();
  });
});
