import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArtifactList } from "./ArtifactList";
import type { Artifact } from "../types/artifact";

function make(
  overrides: Partial<Artifact> & Pick<Artifact, "id" | "title">,
): Artifact {
  return {
    sourcePath: "",
    fileType: "markdown",
    tags: [],
    capturedAt: "2026-06-18T00:00:00Z",
    generatedAt: null,
    importedAt: "2026-06-18T00:00:00Z",
    updatedAt: "2026-06-18T00:00:00Z",
    openedAt: null,
    isRead: false,
    isFavorite: false,
    source: "Unknown",
    note: "",
    ...overrides,
  };
}

describe("ArtifactList", () => {
  it("0 件のとき空状態 UI を表示する", () => {
    render(<ArtifactList artifacts={[]} />);
    expect(
      screen.getByText(/条件に合う Artifact がありません/),
    ).toBeInTheDocument();
  });

  it("渡された順番でカードを描画する（ソートは外側の責務）", () => {
    const items = [
      make({ id: "1", title: "C" }),
      make({ id: "2", title: "A" }),
      make({ id: "3", title: "B" }),
    ];
    render(<ArtifactList artifacts={items} />);
    const titles = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(titles).toEqual(["C", "A", "B"]);
  });

  it("カードクリックで onSelect が呼ばれる", async () => {
    const onSelect = vi.fn();
    const items = [make({ id: "1", title: "X" })];
    render(<ArtifactList artifacts={items} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /X/ }));
    expect(onSelect).toHaveBeenCalledWith(items[0]);
  });
});
