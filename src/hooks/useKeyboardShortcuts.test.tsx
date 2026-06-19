import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useKeyboardShortcuts, type KeyboardHandlers } from "./useKeyboardShortcuts";

function Harness(props: KeyboardHandlers & { children?: React.ReactNode }) {
  useKeyboardShortcuts(props);
  return <div>{props.children}</div>;
}

describe("useKeyboardShortcuts", () => {
  it("j / ArrowDown で onNext", async () => {
    const onNext = vi.fn();
    render(<Harness onNext={onNext} />);
    await userEvent.keyboard("j");
    await userEvent.keyboard("{ArrowDown}");
    expect(onNext).toHaveBeenCalledTimes(2);
  });

  it("k / ArrowUp で onPrev", async () => {
    const onPrev = vi.fn();
    render(<Harness onPrev={onPrev} />);
    await userEvent.keyboard("k");
    await userEvent.keyboard("{ArrowUp}");
    expect(onPrev).toHaveBeenCalledTimes(2);
  });

  it("/ で onSearch", async () => {
    const onSearch = vi.fn();
    render(<Harness onSearch={onSearch} />);
    await userEvent.keyboard("/");
    expect(onSearch).toHaveBeenCalled();
  });

  it("Esc で onEscape", async () => {
    const onEscape = vi.fn();
    render(<Harness onEscape={onEscape} />);
    await userEvent.keyboard("{Escape}");
    expect(onEscape).toHaveBeenCalled();
  });

  it("input フォーカス中は j で onNext を呼ばない", async () => {
    const onNext = vi.fn();
    render(
      <Harness onNext={onNext}>
        <input data-testid="x" />
      </Harness>,
    );
    const input = document.querySelector("input")!;
    input.focus();
    await userEvent.keyboard("j");
    expect(onNext).not.toHaveBeenCalled();
  });

  it("input フォーカス中の Esc は blur する", async () => {
    const onEscape = vi.fn();
    render(
      <Harness onEscape={onEscape}>
        <input data-testid="x" />
      </Harness>,
    );
    const input = document.querySelector("input")!;
    input.focus();
    expect(document.activeElement).toBe(input);
    await userEvent.keyboard("{Escape}");
    expect(document.activeElement).not.toBe(input);
    // 入力フィールド中の Esc は onEscape を呼ばない（blur 専用）
    expect(onEscape).not.toHaveBeenCalled();
  });

  it("Cmd+J は無視（修飾子付きには介入しない）", async () => {
    const onNext = vi.fn();
    render(<Harness onNext={onNext} />);
    await userEvent.keyboard("{Meta>}j{/Meta}");
    expect(onNext).not.toHaveBeenCalled();
  });
});
