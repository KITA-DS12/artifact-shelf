import { describe, it, expect } from "vitest";
import { emptyLibrary } from "./library";
import { CURRENT_SCHEMA_VERSION } from "../types/artifact";

describe("emptyLibrary", () => {
  it("現行スキーマバージョンと空の artifacts を返す", () => {
    const lib = emptyLibrary();
    expect(lib.version).toBe(CURRENT_SCHEMA_VERSION);
    expect(lib.artifacts).toEqual([]);
  });
});
