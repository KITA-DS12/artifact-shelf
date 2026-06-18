import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue({ version: 1, artifacts: [] });
});

describe("App", () => {
  it("アプリ名を見出しとして表示する", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Artifact Shelf" }),
    ).toBeInTheDocument();
  });

  it("起動時に load_library を呼び出す", async () => {
    render(<App />);
    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("load_library");
    });
  });

  it("空ライブラリのとき空状態メッセージを表示する", async () => {
    render(<App />);
    expect(
      await screen.findByText(/条件に合う Artifact がありません/),
    ).toBeInTheDocument();
  });

  it("ライブラリ取得済みなら artifact のタイトルを表示する", async () => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({
      version: 1,
      artifacts: [
        {
          id: "x",
          title: "認証フローのレビュー",
          sourcePath: "/tmp/a.md",
          fileType: "markdown",
          tags: ["review"],
          generatedAt: "2026-06-18",
          importedAt: "2026-06-18T00:00:00Z",
          updatedAt: "2026-06-18T00:00:00Z",
          isRead: false,
          isFavorite: false,
          source: "Claude",
          note: "",
        },
      ],
    });
    render(<App />);
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "認証フローのレビュー",
      }),
    ).toBeInTheDocument();
  });

  it("インポートボタンを表示する", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: "インポート" }),
    ).toBeInTheDocument();
  });
});
