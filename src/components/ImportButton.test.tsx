import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportButton } from "./ImportButton";

const openMock = vi.fn();
const invokeMock = vi.fn();

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: (...args: unknown[]) => openMock(...args),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

beforeEach(() => {
  openMock.mockReset();
  invokeMock.mockReset();
});

describe("ImportButton", () => {
  it("選択されたパスを import_artifacts に渡し、追加件数を表示する", async () => {
    const user = userEvent.setup();
    openMock.mockResolvedValueOnce(["/tmp/a.md", "/tmp/b.html"]);
    invokeMock.mockResolvedValueOnce({
      added: [
        { id: "1" },
        { id: "2" },
      ],
      skippedDuplicates: [],
      skippedUnsupported: [],
    });

    render(<ImportButton />);
    await user.click(screen.getByRole("button", { name: "インポート" }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("import_artifacts", {
        paths: ["/tmp/a.md", "/tmp/b.html"],
      });
    });
    expect(screen.getByText(/2 件を追加/)).toBeInTheDocument();
  });

  it("重複・未対応の件数もメッセージに含める", async () => {
    const user = userEvent.setup();
    openMock.mockResolvedValueOnce(["/tmp/a.md", "/tmp/b.md", "/tmp/c.txt"]);
    invokeMock.mockResolvedValueOnce({
      added: [{ id: "1" }],
      skippedDuplicates: ["/tmp/b.md"],
      skippedUnsupported: ["/tmp/c.txt"],
    });

    render(<ImportButton />);
    await user.click(screen.getByRole("button", { name: "インポート" }));

    await waitFor(() => {
      expect(
        screen.getByText(/1 件を追加.+重複 1 件.+未対応 1 件/),
      ).toBeInTheDocument();
    });
  });

  it("キャンセル時には何も呼ばれない", async () => {
    const user = userEvent.setup();
    openMock.mockResolvedValueOnce(null);

    render(<ImportButton />);
    await user.click(screen.getByRole("button", { name: "インポート" }));

    await waitFor(() => {
      expect(invokeMock).not.toHaveBeenCalled();
    });
  });
});
