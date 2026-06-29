import { describe, expect, it } from "vitest";

import { getLeafFieldPath } from "@/utils/fieldDisplayPath";

describe("getLeafFieldPath", () => {
  it("单层路径保持原样", () => {
    expect(getLeafFieldPath("requestId")).toBe("requestId");
  });

  it("普通多级路径只保留最后一级字段", () => {
    expect(getLeafFieldPath("campaign_sketch_form_data.payload.page")).toBe("page");
  });

  it("包含数组索引时只保留最后一级字段", () => {
    expect(getLeafFieldPath("strategy.rules[0].id")).toBe("id");
  });

  it("包含数字键与数组索引时只保留最后一级叶子字段", () => {
    expect(getLeafFieldPath("campaign_sketch_form_data.virtual_isolated._a_o_s.validate_result.12[0].extras.custom_scene")).toBe(
      "custom_scene",
    );
  });

  it("路径最后一级是数字键时保留末级数字节点", () => {
    expect(getLeafFieldPath("validate_result.groups.12[0]")).toBe("12[0]");
  });

  it("连续数组索引后的叶子字段会正确保留", () => {
    expect(getLeafFieldPath("payload.matrix[0][1].value")).toBe("value");
  });

  it("原始数组元素路径会保留带索引的末级节点", () => {
    expect(getLeafFieldPath("payload.tags[0]")).toBe("tags[0]");
  });
});
