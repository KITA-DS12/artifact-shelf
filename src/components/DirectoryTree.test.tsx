import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DirectoryTree } from "./DirectoryTree";
import type { Artifact } from "../types/artifact";

function art(id: string, sourcePath: string): Artifact {
  return {
    id,
    title: id,
    sourcePath,
    fileType: "markdown",
    tags: [],
    capturedAt: "2026-06-18T00:00:00Z",
    generatedAt: null,
    importedAt: "2026-06-18T00:00:00Z",
    updatedAt: "2026-06-18T00:00:00Z",
    openedAt: null,
    deletedAt: null,
    isRead: false,
    isFavorite: false,
    source: "Unknown",
    note: "",
  };
}

describe("DirectoryTree", () => {
  it("「すべて」と各ディレクトリを描画する", () => {
    render(
      <DirectoryTree
        artifacts={[
          art("1", "/Users/me/repo/a.md"),
          art("2", "/Users/me/repo/b.md"),
        ]}
        selected={null}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText("すべて")).toBeInTheDocument();
    expect(screen.getByText("Users/me/repo")).toBeInTheDocument();
  });

  it("ノードクリックでパスを onSelect に渡す", async () => {
    const onSelect = vi.fn();
    render(
      <DirectoryTree
        artifacts={[art("1", "/Users/me/repo/a.md")]}
        selected={null}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByTitle("/Users/me/repo"));
    expect(onSelect).toHaveBeenCalledWith("/Users/me/repo");
  });

  it("「すべて」クリックで null が渡される", async () => {
    const onSelect = vi.fn();
    render(
      <DirectoryTree
        artifacts={[art("1", "/Users/me/repo/a.md")]}
        selected="/Users/me/repo"
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByText("すべて"));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("空のとき empty メッセージが出る", () => {
    render(
      <DirectoryTree artifacts={[]} selected={null} onSelect={() => {}} />,
    );
    expect(screen.getByText(/登録があるとここに出ます/)).toBeInTheDocument();
  });
});
