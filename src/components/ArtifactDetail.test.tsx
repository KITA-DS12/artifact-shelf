import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArtifactDetail } from "./ArtifactDetail";
import type { Artifact } from "../types/artifact";

const invokeMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

function fixture(overrides: Partial<Artifact> = {}): Artifact {
  return {
    id: "x",
    title: "認証レビュー",
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
    ...overrides,
  };
}

beforeEach(() => {
  invokeMock.mockReset();
});

describe("ArtifactDetail", () => {
  it("artifact id でファイル内容を読み込み、Markdown をレンダリングする", async () => {
    invokeMock.mockResolvedValueOnce("# H1 見出し\n\n本文");
    render(<ArtifactDetail artifact={fixture()} onBack={() => {}} />);
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("read_artifact_content", {
        id: "x",
      }),
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "H1 見出し" }),
    ).toBeInTheDocument();
  });

  it("見出しから目次を生成する", async () => {
    invokeMock.mockResolvedValueOnce("# A\n## B\n## C");
    render(<ArtifactDetail artifact={fixture()} onBack={() => {}} />);
    const nav = await screen.findByRole("navigation", { name: "目次" });
    expect(nav).toHaveTextContent("A");
    expect(nav).toHaveTextContent("B");
    expect(nav).toHaveTextContent("C");
  });

  it("読み込みエラー時はエラーメッセージを表示する", async () => {
    invokeMock.mockRejectedValueOnce("読めません");
    render(<ArtifactDetail artifact={fixture()} onBack={() => {}} />);
    expect(
      await screen.findByText(/読み込みに失敗しました/),
    ).toBeInTheDocument();
  });

  it("戻るボタンで onBack が呼ばれる", async () => {
    invokeMock.mockResolvedValueOnce("# A");
    const onBack = vi.fn();
    render(<ArtifactDetail artifact={fixture()} onBack={onBack} />);
    await userEvent.click(screen.getByRole("button", { name: /ライブラリ/ }));
    expect(onBack).toHaveBeenCalled();
  });

  it("missing=true のとき警告を表示し、読み込みを試みない", async () => {
    render(
      <ArtifactDetail
        artifact={fixture()}
        missing
        onBack={() => {}}
      />,
    );
    expect(
      await screen.findByText(/元ファイルが見つかりません/),
    ).toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalledWith(
      "read_artifact_content",
      expect.anything(),
    );
  });

  it("Finder で表示ボタンで open_in_finder が呼ばれる", async () => {
    const user = userEvent.setup();
    invokeMock.mockResolvedValueOnce("# A"); // read
    invokeMock.mockResolvedValueOnce(undefined); // open
    render(<ArtifactDetail artifact={fixture()} onBack={() => {}} />);
    await user.click(
      await screen.findByRole("button", { name: "Finder で表示" }),
    );
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("open_in_finder", {
        path: "/tmp/a.md",
      }),
    );
  });

  it("パスをコピーで copy_to_clipboard が呼ばれる", async () => {
    const user = userEvent.setup();
    invokeMock.mockResolvedValueOnce("# A");
    invokeMock.mockResolvedValueOnce(undefined);
    render(<ArtifactDetail artifact={fixture()} onBack={() => {}} />);
    await user.click(
      await screen.findByRole("button", { name: "パスをコピー" }),
    );
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("copy_to_clipboard", {
        text: "/tmp/a.md",
      }),
    );
  });

  it("HTML artifact のときは iframe プレビューを表示する", async () => {
    invokeMock.mockResolvedValueOnce("<h1>hi</h1>");
    render(
      <ArtifactDetail
        artifact={fixture({ fileType: "html", sourcePath: "/tmp/a.html" })}
        onBack={() => {}}
      />,
    );
    expect(await screen.findByTitle("HTML プレビュー")).toBeInTheDocument();
  });

  it("編集ボタンで編集フォームに切替、保存で update_artifact を呼ぶ", async () => {
    const user = userEvent.setup();
    invokeMock.mockResolvedValueOnce("# A"); // read_artifact_content
    invokeMock.mockResolvedValueOnce({ ...fixture(), title: "改題" }); // update_artifact
    const onUpdated = vi.fn();
    render(
      <ArtifactDetail
        artifact={fixture()}
        onBack={() => {}}
        onUpdated={onUpdated}
      />,
    );
    await user.click(await screen.findByRole("button", { name: "編集" }));
    await user.clear(screen.getByLabelText("タイトル"));
    await user.type(screen.getByLabelText("タイトル"), "改題");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith("update_artifact", {
        id: "x",
        update: expect.objectContaining({ title: "改題" }),
      });
    });
    expect(onUpdated).toHaveBeenCalled();
  });
});
