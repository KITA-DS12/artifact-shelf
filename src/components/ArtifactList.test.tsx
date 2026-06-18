import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArtifactList } from "./ArtifactList";
import type { Artifact } from "../types/artifact";

function make(
  overrides: Partial<Artifact> & Pick<Artifact, "id" | "title" | "generatedAt">,
): Artifact {
  return {
    sourcePath: "",
    fileType: "markdown",
    tags: [],
    importedAt: "2026-06-18T00:00:00Z",
    updatedAt: "2026-06-18T00:00:00Z",
    isRead: false,
    isFavorite: false,
    source: "Unknown",
    note: "",
    ...overrides,
  } as Artifact;
}

describe("ArtifactList", () => {
  it("0 件のとき空状態 UI を表示する", () => {
    render(<ArtifactList artifacts={[]} />);
    expect(screen.getByText(/まだ何も登録されていません/)).toBeInTheDocument();
  });

  it("未読を先に、generatedAt 降順で表示する", () => {
    const items = [
      make({ id: "1", title: "古い既読", generatedAt: "2026-06-01", isRead: true }),
      make({ id: "2", title: "新しい未読", generatedAt: "2026-06-18" }),
      make({ id: "3", title: "古い未読", generatedAt: "2026-06-10" }),
    ];
    render(<ArtifactList artifacts={items} />);
    const titles = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    expect(titles).toEqual(["新しい未読", "古い未読", "古い既読"]);
  });

  it("カードクリックで onSelect が呼ばれる", async () => {
    const onSelect = vi.fn();
    const items = [make({ id: "1", title: "X", generatedAt: "2026-06-18" })];
    render(<ArtifactList artifacts={items} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /X/ }));
    expect(onSelect).toHaveBeenCalledWith(items[0]);
  });
});
