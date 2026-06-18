import { describe, it, expect } from "vitest";
import { describeImportResult } from "./import-message";

describe("describeImportResult", () => {
  it("追加件数のみのとき", () => {
    expect(
      describeImportResult({
        added: [{} as never, {} as never],
        skippedDuplicates: [],
        skippedUnsupported: [],
      }),
    ).toBe("2 件を追加");
  });

  it("重複・未対応がある場合は付加する", () => {
    expect(
      describeImportResult({
        added: [{} as never],
        skippedDuplicates: ["/a", "/b"],
        skippedUnsupported: ["/c"],
      }),
    ).toBe("1 件を追加 / 重複 2 件をスキップ / 未対応 1 件をスキップ");
  });

  it("0 件追加でも追加件数を出す", () => {
    expect(
      describeImportResult({
        added: [],
        skippedDuplicates: ["/a"],
        skippedUnsupported: [],
      }),
    ).toBe("0 件を追加 / 重複 1 件をスキップ");
  });
});
