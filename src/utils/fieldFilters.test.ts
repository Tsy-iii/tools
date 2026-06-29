import { describe, expect, it } from "vitest";

import { parseManualFieldInput, resolveFieldFilterState } from "@/utils/fieldFilters";

describe("fieldFilters", () => {
  it("支持按逗号空格和换行解析手动字段输入，并去重", () => {
    expect(parseManualFieldInput("requestId, payload.page\nrequestId strategy.priority")).toEqual([
      "requestId",
      "payload.page",
      "strategy.priority",
    ]);
  });

  it("会区分有效和无效手动字段，并与多选字段合并", () => {
    const result = resolveFieldFilterState({
      availablePaths: ["requestId", "payload.page", "strategy.priority"],
      selectedFieldPaths: ["requestId"],
      manualFieldInput: "payload.page missing.path",
      enableManualValidation: true,
    });

    expect(result.validManualFieldPaths).toEqual(["payload.page"]);
    expect(result.invalidManualFieldPaths).toEqual(["missing.path"]);
    expect(result.effectiveFieldPaths).toEqual(["requestId", "payload.page"]);
    expect(result.hasActiveFieldFilter).toBe(true);
  });

  it("优先匹配顶级字段，同时兼容 data_dict 前缀输入", () => {
    const result = resolveFieldFilterState({
      availablePaths: ["spc_upgrade_mode", "budget"],
      selectedFieldPaths: ["data_dict.spc_upgrade_mode"],
      manualFieldInput: "data_dict.spc_upgrade_mode budget",
      enableManualValidation: true,
    });

    expect(result.validSelectedFieldPaths).toEqual(["spc_upgrade_mode"]);
    expect(result.validManualFieldPaths).toEqual(["spc_upgrade_mode", "budget"]);
    expect(result.invalidManualFieldPaths).toEqual([]);
    expect(result.effectiveFieldPaths).toEqual(["spc_upgrade_mode", "budget"]);
  });
});
