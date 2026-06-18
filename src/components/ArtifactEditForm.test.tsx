import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArtifactEditForm } from "./ArtifactEditForm";
import type { Artifact } from "../types/artifact";

function fixture(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: "x",
    title: "old",
    sourcePath: "/tmp/a.md",
    fileType: "markdown",
    tags: ["t1"],
    generatedAt: "2026-06-18",
    importedAt: "2026-06-18T00:00:00Z",
    updatedAt: "2026-06-18T00:00:00Z",
    isRead: false,
    isFavorite: false,
    source: "Unknown",
    note: "old note",
    ...overrides,
  };
}

describe("ArtifactEditForm", () => {
  it("既存値を初期表示する", () => {
    render(
      <ArtifactEditForm
        artifact={fixture()}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText("タイトル")).toHaveValue("old");
    expect(screen.getByLabelText("メモ")).toHaveValue("old note");
    expect(screen.getByText("t1")).toBeInTheDocument();
    expect(screen.getByLabelText("既読")).not.toBeChecked();
    expect(screen.getByLabelText("お気に入り")).not.toBeChecked();
  });

  it("タグを追加・削除できる", async () => {
    const user = userEvent.setup();
    render(
      <ArtifactEditForm
        artifact={fixture()}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );

    const input = screen.getByPlaceholderText(/タグを入力/);
    await user.type(input, "review{Enter}");
    expect(screen.getByText("review")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "タグ t1 を削除" }),
    );
    expect(screen.queryByText("t1")).not.toBeInTheDocument();
  });

  it("保存時に編集値を ArtifactUpdate として渡す", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <ArtifactEditForm
        artifact={fixture()}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );

    await user.clear(screen.getByLabelText("タイトル"));
    await user.type(screen.getByLabelText("タイトル"), "new title");
    await user.click(screen.getByLabelText("既読"));
    await user.click(screen.getByLabelText("お気に入り"));
    await user.selectOptions(screen.getByLabelText("生成元"), "Claude");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(onSave).toHaveBeenCalledWith({
      title: "new title",
      tags: ["t1"],
      note: "old note",
      isRead: true,
      isFavorite: true,
      source: "Claude",
    });
  });

  it("キャンセルボタンで onCancel が呼ばれる", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ArtifactEditForm
        artifact={fixture()}
        onSave={() => {}}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole("button", { name: "キャンセル" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
