import { describe, expect, it } from "vitest";

import { getHighlightRange, isPathMatched } from "@/utils/fieldSearch";

describe("fieldSearch", () => {
  it("兼容通过 data_dict 前缀搜索已经标准化的字段路径", () => {
    expect(isPathMatched("spc_upgrade_mode", "data_dict.spc_upgrade_mode", "exact")).toBe(true);
    expect(getHighlightRange("spc_upgrade_mode", "data_dict.spc_upgrade_mode", "exact")).toEqual([
      0,
      "spc_upgrade_mode".length,
    ]);
  });
});
