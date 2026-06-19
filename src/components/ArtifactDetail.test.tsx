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
      <ArtifactDetail artifact={fixture()} missing onBack={() => {}} />,
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
    invokeMock.mockResolvedValueOnce("# A");
    invokeMock.mockResolvedValueOnce(undefined);
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

  it("openedAt があれば最終閲覧を表示する", async () => {
    invokeMock.mockResolvedValueOnce("# A");
    render(
      <ArtifactDetail
        artifact={fixture({ openedAt: "2026-06-19T08:30:00Z" })}
        onBack={() => {}}
      />,
    );
    expect(
      await screen.findByText(/最終閲覧 2026-06-19/),
    ).toBeInTheDocument();
  });

  it("openedAt が null のときは最終閲覧を表示しない", async () => {
    invokeMock.mockResolvedValueOnce("# A");
    render(<ArtifactDetail artifact={fixture()} onBack={() => {}} />);
    await screen.findByRole("heading", { level: 1, name: "認証レビュー" });
    expect(screen.queryByText(/最終閲覧/)).not.toBeInTheDocument();
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

  it("タイトルをインライン編集して保存できる", async () => {
    const user = userEvent.setup();
    invokeMock.mockResolvedValueOnce("# A");
    invokeMock.mockResolvedValueOnce({ ...fixture(), title: "改題" });
    const onUpdated = vi.fn();
    render(
      <ArtifactDetail
        artifact={fixture()}
        onBack={() => {}}
        onUpdated={onUpdated}
      />,
    );
    await user.click(
      await screen.findByRole("button", { name: "タイトルを編集" }),
    );
    const input = screen.getByRole("textbox", { name: "タイトル" });
    await user.clear(input);
    await user.type(input, "改題{Enter}");

    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("update_artifact", {
        id: "x",
        update: expect.objectContaining({ title: "改題" }),
      }),
    );
    expect(onUpdated).toHaveBeenCalled();
  });

  it("openedAt があると「既読」、なければ「未読」として表示", async () => {
    invokeMock.mockResolvedValueOnce("# A");
    render(
      <ArtifactDetail
        artifact={fixture({ openedAt: "2026-06-19T00:00:00Z" })}
        onBack={() => {}}
      />,
    );
    expect(await screen.findByText("既読")).toBeInTheDocument();
    invokeMock.mockReset();
    invokeMock.mockResolvedValueOnce("# B");
    render(<ArtifactDetail artifact={fixture()} onBack={() => {}} />);
    expect(await screen.findAllByText("未読")).not.toHaveLength(0);
  });

  it("星クリックで isFavorite をトグル", async () => {
    const user = userEvent.setup();
    invokeMock.mockResolvedValueOnce("# A");
    invokeMock.mockResolvedValueOnce({ ...fixture(), isFavorite: true });
    render(<ArtifactDetail artifact={fixture()} onBack={() => {}} />);
    await user.click(
      await screen.findByRole("button", { name: "お気に入りに追加" }),
    );
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("update_artifact", {
        id: "x",
        update: expect.objectContaining({ isFavorite: true }),
      }),
    );
  });

  it("タグ追加 → update_artifact が呼ばれる", async () => {
    const user = userEvent.setup();
    invokeMock.mockResolvedValueOnce("# A");
    invokeMock.mockResolvedValueOnce({
      ...fixture(),
      tags: ["review", "auth"],
    });
    render(<ArtifactDetail artifact={fixture()} onBack={() => {}} />);
    await user.click(
      await screen.findByRole("button", { name: "タグを追加" }),
    );
    const tagInput = screen.getByRole("textbox", { name: "新しいタグ" });
    await user.type(tagInput, "auth{Enter}");
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("update_artifact", {
        id: "x",
        update: expect.objectContaining({ tags: ["review", "auth"] }),
      }),
    );
  });
});
