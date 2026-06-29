import { describe, expect, it } from "vitest";

import { compareJsonInputs, filterDiffRowsByPaths, summarizeDiffRows } from "@/utils/jsonDiff";

describe("compareJsonInputs", () => {
  it("能对齐嵌套对象与数组路径，并识别值差异", () => {
    const result = compareJsonInputs(
      {
        payload: {
          list: [{ id: 1, status: "online" }],
          filters: { region: "CN" },
        },
      },
      {
        payload: {
          list: [{ id: 1, status: "offline" }],
          filters: { region: "CN" },
        },
      },
    );

    expect(result.rows.map((row) => row.path)).toContain("payload.list[0].status");
    expect(result.rows.find((row) => row.path === "payload.list[0].status")?.status).toBe("changed");
    expect(result.summary.different).toBeGreaterThan(0);
  });

  it("能识别字段缺失与类型变化", () => {
    const result = compareJsonInputs(
      {
        page: 1,
        ext: {
          debug: true,
        },
      },
      {
        page: "1",
      },
    );

    expect(result.rows.find((row) => row.path === "page")?.status).toBe("type-changed");
    expect(result.rows.some((row) => row.path === "ext")).toBe(false);
    expect(result.rows.find((row) => row.path === "ext.debug")?.status).toBe("missing-right");
    expect(result.summary.typeChanged).toBe(1);
    expect(result.summary.missingRight).toBeGreaterThanOrEqual(1);
  });

  it("默认只对比叶子节点，不把非空对象整体作为单独字段", () => {
    const result = compareJsonInputs(
      {
        campaign_sketch_form_data: {
          budget: "50.00",
          payload: {
            page: 1,
          },
        },
      },
      {
        campaign_sketch_form_data: {
          budget: "60.00",
          payload: {
            page: 2,
          },
        },
      },
    );

    expect(result.rows.some((row) => row.path === "campaign_sketch_form_data")).toBe(false);
    expect(result.rows.some((row) => row.path === "campaign_sketch_form_data.payload")).toBe(false);
    expect(result.rows.find((row) => row.path === "campaign_sketch_form_data.budget")?.status).toBe("changed");
    expect(result.rows.find((row) => row.path === "campaign_sketch_form_data.payload.page")?.status).toBe("changed");
  });

  it("支持按选中字段集合过滤对比结果并重算摘要", () => {
    const result = compareJsonInputs(
      {
        requestId: "left",
        payload: {
          page: 1,
          region: "CN",
        },
      },
      {
        requestId: "right",
        payload: {
          page: 1,
          region: "SG",
        },
      },
    );

    const filteredRows = filterDiffRowsByPaths(result.rows, ["requestId", "payload.page"]);
    const filteredSummary = summarizeDiffRows(filteredRows);

    expect(filteredRows.map((row) => row.path)).toEqual(["requestId", "payload.page"]);
    expect(filteredSummary.total).toBe(2);
    expect(filteredSummary.same).toBe(1);
    expect(filteredSummary.different).toBe(1);
  });

  it("对 data_dict 包裹字段优先产出顶级业务字段路径，并兼容旧结构", () => {
    const result = compareJsonInputs(
      {
        spc_upgrade_mode: 1,
      },
      {
        data_dict: {
          spc_upgrade_mode: 2,
        },
      },
    );

    expect(result.rows.find((row) => row.path === "spc_upgrade_mode")?.status).toBe("changed");
    expect(result.rows.some((row) => row.path === "data_dict.spc_upgrade_mode")).toBe(false);
  });

  it("空字符串值会明确显示为双引号，避免和未取值混淆", () => {
    const result = compareJsonInputs(
      {
        ad_sketch_form_data: {
          collection_id: "",
        },
      },
      {
        ad_sketch_form_data: {
          collection_id: "",
        },
      },
    );

    const row = result.rows.find((item) => item.path === "ad_sketch_form_data.collection_id");

    expect(row?.leftDisplay).toBe('""');
    expect(row?.rightDisplay).toBe('""');
    expect(row?.status).toBe("same");
  });
});
