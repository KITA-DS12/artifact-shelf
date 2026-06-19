import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LibraryToolbar } from "./LibraryToolbar";
import { DEFAULT_FILTER, type LibraryFilter } from "../types/filter";

function setup(overrides: { filter?: Partial<LibraryFilter> } = {}) {
  const onFilterChange = vi.fn();
  const onSortChange = vi.fn();
  render(
    <LibraryToolbar
      filter={{ ...DEFAULT_FILTER, ...overrides.filter }}
      onFilterChange={onFilterChange}
      sortKey="unread-then-captured-desc"
      onSortChange={onSortChange}
      availableTags={["review", "auth"]}
      totalCount={10}
      matchedCount={3}
    />,
  );
  return { onFilterChange, onSortChange };
}

describe("LibraryToolbar", () => {
  it("検索入力で onFilterChange に新しい search を渡す", async () => {
    const { onFilterChange } = setup();
    await userEvent.type(screen.getByLabelText("検索"), "auth");
    // 1 文字ずつ呼ばれる → 最後の呼び出しは 1 文字 't'... ではなく、
    // controlled component なので毎回 value=filter.search で再 render される。
    // mock では値が反映されないので、最後の呼び出しは "a" → "t" → "h" の最初 'a' 一字
    expect(onFilterChange).toHaveBeenCalled();
    const lastCall = onFilterChange.mock.calls[0][0];
    expect(lastCall.search).toBe("a");
  });

  it("ソート変更で onSortChange が呼ばれる", async () => {
    const { onSortChange } = setup();
    await userEvent.selectOptions(
      screen.getByLabelText("並び順"),
      "title-asc",
    );
    expect(onSortChange).toHaveBeenCalledWith("title-asc");
  });

  it("フィルタを展開すると形式や状態のオプションが出る", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /フィルタ/ }));
    expect(screen.getByLabelText("Markdown")).toBeInTheDocument();
    expect(screen.getByLabelText("HTML")).toBeInTheDocument();
    expect(screen.getByLabelText("未読")).toBeInTheDocument();
    expect(screen.getByLabelText("既読")).toBeInTheDocument();
    expect(screen.getByLabelText("お気に入りのみ")).toBeInTheDocument();
  });

  it("利用可能なタグがチェックボックスとして並ぶ", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /フィルタ/ }));
    expect(screen.getByLabelText("review")).toBeInTheDocument();
    expect(screen.getByLabelText("auth")).toBeInTheDocument();
  });

  it("件数表示", () => {
    setup();
    expect(screen.getByText(/3 \/ 10 件を表示/)).toBeInTheDocument();
  });
});
