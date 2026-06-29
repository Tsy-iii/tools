import { describe, expect, it } from "vitest";

import { parseComparableInput } from "@/utils/inputParser";

describe("parseComparableInput", () => {
  it("可以从 cURL 中提取 JSON body 作为对比对象", () => {
    const result = parseComparableInput(
      `curl 'https://example.com/api/search?scene=test' -X POST -H 'Content-Type: application/json' --data-raw '{"requestId":"123","payload":{"page":1}}'`,
      "curl",
    );

    expect(result.error).toBeUndefined();
    expect(result.meta?.resolvedFormat).toBe("curl");
    expect(result.meta?.compareSource).toBe("curl-body-json");
    expect(result.meta?.queryCount).toBe(1);
    expect(result.value).toEqual({
      requestId: "123",
      payload: {
        page: 1,
      },
    });
  });

  it("可以在自动识别模式下处理 cURL", () => {
    const result = parseComparableInput(
      "curl --url 'https://example.com/api/list?page=2&keyword=shoe' -G",
      "auto",
    );

    expect(result.error).toBeUndefined();
    expect(result.meta?.compareSource).toBe("curl-query");
    expect(result.value).toEqual({
      page: "2",
      keyword: "shoe",
    });
  });

  it("会对不规范的 cURL body 提供友好错误提示", () => {
    const result = parseComparableInput(
      `curl 'https://example.com/api' -X POST -H 'Content-Type: application/json' --data-raw 'not-json'`,
      "curl",
    );

    expect(result.error).toMatch(/未能从 body 中提取结构化 JSON 或参数数据/);
  });

  it("可以在自动识别模式下处理带反引号和空格的 cURL", () => {
    const result = parseComparableInput(
      "curl ' `https://example.com/api/save/?page=1` ' -H 'content-type: application/json' --data-raw $'{\"name\":\"demo\"}'",
      "auto",
    );

    expect(result.error).toBeUndefined();
    expect(result.meta?.url).toBe("https://example.com/api/save/?page=1");
    expect(result.value).toEqual({
      name: "demo",
    });
  });

  it("有 body 时默认只提取 body，不把 query 和 headers 混入对比对象", () => {
    const result = parseComparableInput(
      "curl 'https://example.com/api/save/?page=1&scene=test' -H 'content-type: application/json' --data-raw '{\"name\":\"demo\"}'",
      "auto",
    );

    expect(result.error).toBeUndefined();
    expect(result.value).toEqual({
      name: "demo",
    });
    expect(result.value).not.toEqual({
      request: {
        body: {
          name: "demo",
        },
      },
    });
  });

  it("在 JSON 模式下粘贴 cURL 时会给出明确提示", () => {
    const result = parseComparableInput(
      "curl 'https://example.com/api/save' --data-raw '{\"name\":\"demo\"}'",
      "json",
    );

    expect(result.error).toMatch(/检测到当前内容是 cURL 命令/);
  });

  it("可以处理真实 cURL 中的 $'...' 和转义单引号", () => {
    const result = parseComparableInput(
      `curl 'https://example.com/api/save/?scene=test' \\
        -H 'content-type: application/json; charset=UTF-8' \\
        --data-raw $'{"message":"we\\'ll keep going","payload":{"page":1}}'`,
      "auto",
    );

    expect(result.error).toBeUndefined();
    expect(result.meta?.compareSource).toBe("curl-body-json");
    expect(result.value).toEqual({
      message: "we'll keep going",
      payload: {
        page: 1,
      },
    });
  });

  it("可以从广告创建场景的真实 cURL 结构中完整提取 body 字段", () => {
    const result = parseComparableInput(
      `curl ' \`https://ads.tiktok.com/api/v4/i18n/creation/ad_snap/save/?aadvid=7427019453189128209\` ' \\
        -H 'content-type: application/json; charset=UTF-8' \\
        -b '_ga=GA1.1.1795962681.1778826535; dogfooding_data={"lark_email":"yeshutan.fjra@bytedance.com"}; msToken=demo' \\
        -H 'referer: \`https://ads.tiktok.com/i18n/creation/1nn/create/search-adgroup?campaign_snap_id=1868935075931153\` ' \\
        --data-raw '{"ad_sketch_form_data":{"name":"Ad group 20260625022112","collection_id":"","budget":"30","budget_mode":3,"search_keywords":[{"keyword_id":"23542","match_type":3,"source_type":1,"is_no_go":false}]},"spc_upgrade_mode":1,"with_sketch":true,"campaign_snap_id":"1868935075931153"}'`,
      "auto",
    );

    expect(result.error).toBeUndefined();
    expect(result.meta?.resolvedFormat).toBe("curl");
    expect(result.meta?.compareSource).toBe("curl-body-json");
    expect(result.value).toMatchObject({
      ad_sketch_form_data: {
        collection_id: "",
        budget: "30",
        budget_mode: 3,
      },
      spc_upgrade_mode: 1,
      with_sketch: true,
    });
  });
});
