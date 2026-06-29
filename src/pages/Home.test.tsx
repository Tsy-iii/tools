import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Home from "@/pages/Home";
import { useDiffStore } from "@/stores/useDiffStore";
import { COMPARE_HISTORY_STORAGE_KEY } from "@/utils/compareHistory";
import { FIELD_DISPLAY_PREFERENCES_STORAGE_KEY } from "@/utils/fieldDisplayPreferences";
import { PANEL_NAMES_STORAGE_KEY } from "@/utils/panelNames";

function hasExactText(text: string) {
  return (_content: string, node: Element | null) => node?.textContent === text;
}

describe("Home", () => {
  beforeEach(() => {
    useDiffStore.getState().clearAll();
    useDiffStore.getState().clearHistory();
    window.localStorage.removeItem(COMPARE_HISTORY_STORAGE_KEY);
    window.localStorage.removeItem(FIELD_DISPLAY_PREFERENCES_STORAGE_KEY);
    window.localStorage.removeItem(PANEL_NAMES_STORAGE_KEY);
    useDiffStore.getState().hydratePanelNames();
    useDiffStore.getState().hydrateFieldDisplayPreferences();
  });

  afterEach(() => {
    useDiffStore.getState().clearAll();
    useDiffStore.getState().clearHistory();
    window.localStorage.removeItem(COMPARE_HISTORY_STORAGE_KEY);
    window.localStorage.removeItem(FIELD_DISPLAY_PREFERENCES_STORAGE_KEY);
    window.localStorage.removeItem(PANEL_NAMES_STORAGE_KEY);
    useDiffStore.getState().hydratePanelNames();
    useDiffStore.getState().hydrateFieldDisplayPreferences();
    cleanup();
  });

  it("可以粘贴两组 JSON 并触发对比展示差异", () => {
    render(<Home />);

    fireEvent.change(screen.getByLabelText("左侧待对比数据"), {
      target: {
        value: JSON.stringify({ requestId: "left", payload: { page: 1 } }),
      },
    });

    fireEvent.change(screen.getByLabelText("右侧待对比数据"), {
      target: {
        value: JSON.stringify({ requestId: "right", payload: { page: 1 } }),
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "开始对比" }));

    const resultsPanel = within(screen.getByTestId("diff-results-panel"));

    expect(resultsPanel.getAllByText("requestId")).toHaveLength(2);
    expect(resultsPanel.getByText("left")).toBeInTheDocument();
    expect(resultsPanel.getByText("right")).toBeInTheDocument();
    expect(resultsPanel.getAllByText("1").length).toBeGreaterThan(0);
  });

  it("顶部统计卡片标签保持单行显示，避免中文逐字换行", () => {
    render(<Home />);

    const statLabel = screen.getByText("总字段数");
    const statsGrid = statLabel.closest("section")?.querySelector("div.grid");

    expect(statLabel.className).toContain("whitespace-nowrap");
    expect(statsGrid?.className).toContain("grid-cols-4");
    expect(statsGrid?.className).toContain("w-full");
  });

  it("会渲染页面模块侧边导航并为主要区块生成锚点", () => {
    render(<Home />);

    const navigator = screen.getByTestId("section-navigator");

    expect(navigator).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "页面模块导航" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "展开页面导航" })).toBeInTheDocument();
    expect(document.getElementById("page-overview")).toHaveAttribute("data-page-section", "页面概览");
    expect(document.getElementById("diff-results")).toHaveAttribute("data-page-section", "对比结果");
  });

  it("点击侧边导航项时会平滑滚动到对应模块", () => {
    render(<Home />);

    const target = document.getElementById("diff-results");
    const scrollIntoViewMock = vi.fn();
    const trigger = screen.getByTestId("section-navigator-trigger");
    const panel = screen.getByTestId("section-navigator-panel");

    Object.defineProperty(target!, "scrollIntoView", {
      value: scrollIntoViewMock,
      configurable: true,
    });

    fireEvent.focus(trigger);
    fireEvent.click(within(panel).getByRole("button", { name: "对比结果" }));

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("桌面端导航默认折叠，悬停后展开完整菜单", () => {
    vi.useFakeTimers();

    render(<Home />);

    const trigger = screen.getByTestId("section-navigator-trigger");
    const panel = screen.getByTestId("section-navigator-panel");
    const container = screen.getByTestId("section-navigator-desktop");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(panel.className).toContain("pointer-events-none");
    expect(panel.className).toContain("w-0");

    fireEvent.pointerEnter(container);
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(panel.className).toContain("pointer-events-auto");
    expect(panel.className).toContain("w-56");

    vi.useRealTimers();
  });

  it("鼠标在导航边缘短暂移出后快速回到组件区域时不会闪烁收起", () => {
    vi.useFakeTimers();

    render(<Home />);

    const desktopNavigator = screen.getByTestId("section-navigator-desktop");
    const panel = screen.getByTestId("section-navigator-panel");

    fireEvent.pointerEnter(desktopNavigator);
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(panel.className).toContain("pointer-events-auto");

    fireEvent.pointerLeave(desktopNavigator);
    act(() => {
      vi.advanceTimersByTime(80);
    });
    fireEvent.pointerEnter(desktopNavigator);
    act(() => {
      vi.advanceTimersByTime(160);
    });

    expect(panel.className).toContain("pointer-events-auto");
    expect(panel.className).toContain("w-56");

    vi.useRealTimers();
  });

  it("桌面端展开面板采用绝对定位覆盖展示，不会排到触发器下方", () => {
    render(<Home />);

    const desktopNavigator = screen.getByTestId("section-navigator-desktop");
    const trigger = screen.getByTestId("section-navigator-trigger").parentElement;
    const panel = screen.getByTestId("section-navigator-panel");

    expect(desktopNavigator.className).toContain("relative");
    expect(trigger?.className).toContain("absolute");
    expect(panel.className).toContain("absolute");
    expect(panel.className).toContain("top-1/2");
    expect(panel.className).toContain("right-0");
  });

  it("当前可视模块变化时会高亮对应导航项", async () => {
    const OriginalIntersectionObserver = window.IntersectionObserver;

    class TriggerableIntersectionObserver implements IntersectionObserver {
      static latestCallback: IntersectionObserverCallback | null = null;

      readonly root = null;

      readonly rootMargin = "-20% 0px -55% 0px";

      readonly thresholds = [0.15, 0.35, 0.55, 0.75];

      constructor(callback: IntersectionObserverCallback) {
        TriggerableIntersectionObserver.latestCallback = callback;
      }

      disconnect() {}

      observe() {}

      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }

      unobserve() {}
    }

    Object.defineProperty(window, "IntersectionObserver", {
      value: TriggerableIntersectionObserver,
      configurable: true,
    });

    render(<Home />);

    const target = document.getElementById("diff-results") as HTMLElement;

    await waitFor(() => {
      expect(TriggerableIntersectionObserver.latestCallback).not.toBeNull();
    });

    TriggerableIntersectionObserver.latestCallback?.(
      [
        {
          target,
          isIntersecting: true,
          intersectionRatio: 0.7,
          boundingClientRect: target.getBoundingClientRect(),
          intersectionRect: target.getBoundingClientRect(),
          rootBounds: null,
          time: 0,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );

    await waitFor(() => {
      fireEvent.focus(screen.getByTestId("section-navigator-trigger"));
      expect(within(screen.getByTestId("section-navigator-panel")).getByRole("button", { name: "对比结果" }).className).toContain(
        "bg-cyan-300/10",
      );
    });

    Object.defineProperty(window, "IntersectionObserver", {
      value: OriginalIntersectionObserver,
      configurable: true,
    });
  });

  it("仅看差异开关会过滤相同字段", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "填充 JSON 示例" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /仅看差异/i }));

    const resultsPanel = within(screen.getByTestId("diff-results-panel"));

    expect(resultsPanel.queryAllByText("scene")).toHaveLength(0);
    expect(resultsPanel.getAllByText("priority")).toHaveLength(2);
  });

  it("输入非法 JSON 时会展示错误提示", () => {
    render(<Home />);

    fireEvent.change(screen.getByLabelText("左侧待对比数据"), {
      target: { value: "{bad json}" },
    });
    fireEvent.change(screen.getByLabelText("右侧待对比数据"), {
      target: { value: "{}" },
    });

    fireEvent.click(screen.getByRole("button", { name: "开始对比" }));

    expect(screen.getByText(/JSON 解析失败/)).toBeInTheDocument();
  });

  it("支持 cURL 与 JSON 混合对比", () => {
    render(<Home />);

    fireEvent.change(screen.getByLabelText("左侧待对比数据"), {
      target: {
        value:
          "curl 'https://example.com/api/search?scene=test' -X POST -H 'Content-Type: application/json' --data-raw '{\"requestId\":\"curl-left\",\"payload\":{\"page\":1}}'",
      },
    });

    fireEvent.change(screen.getByLabelText("右侧待对比数据"), {
      target: {
        value: JSON.stringify({ requestId: "json-right", payload: { page: 1 } }),
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "开始对比" }));

    const resultsPanel = within(screen.getByTestId("diff-results-panel"));

    expect(screen.getByText("提取的 JSON Body")).toBeInTheDocument();
    expect(screen.getByText("JSON 根对象")).toBeInTheDocument();
    expect(resultsPanel.getAllByText("requestId")).toHaveLength(2);
    expect(resultsPanel.getByText("curl-left")).toBeInTheDocument();
    expect(resultsPanel.getByText("json-right")).toBeInTheDocument();
  });

  it("对比广告创建 cURL 时会保留 budget_mode 等嵌套字段，并明确展示空字符串值", () => {
    render(<Home />);

    const curlInput =
      "curl ' `https://ads.tiktok.com/api/v4/i18n/creation/ad_snap/save/?aadvid=7427019453189128209` ' -H 'content-type: application/json; charset=UTF-8' -b '_ga=GA1.1.1795962681.1778826535; dogfooding_data={\"lark_email\":\"yeshutan.fjra@bytedance.com\"}; msToken=demo' -H 'referer: `https://ads.tiktok.com/i18n/creation/1nn/create/search-adgroup?campaign_snap_id=1868935075931153` ' --data-raw '{\"ad_sketch_form_data\":{\"name\":\"Ad group 20260625022112\",\"collection_id\":\"\",\"budget\":\"30\",\"budget_mode\":3},\"spc_upgrade_mode\":1,\"with_sketch\":true,\"campaign_snap_id\":\"1868935075931153\"}'";

    fireEvent.change(screen.getByLabelText("左侧待对比数据"), {
      target: {
        value: curlInput,
      },
    });

    fireEvent.change(screen.getByLabelText("右侧待对比数据"), {
      target: {
        value: curlInput,
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "开始对比" }));

    const resultsPanel = within(screen.getByTestId("diff-results-panel"));

    expect(resultsPanel.getAllByText("budget_mode")).toHaveLength(2);
    expect(resultsPanel.getAllByText("3")).toHaveLength(2);
    expect(resultsPanel.getAllByText("collection_id")).toHaveLength(2);
    expect(resultsPanel.getAllByText('""')).toHaveLength(2);
  });

  it("支持分别清空左侧和右侧内容", () => {
    render(<Home />);

    fireEvent.change(screen.getByLabelText("左侧待对比数据"), {
      target: { value: '{"left":"value"}' },
    });
    fireEvent.change(screen.getByLabelText("右侧待对比数据"), {
      target: { value: '{"right":"value"}' },
    });

    fireEvent.click(screen.getByRole("button", { name: "左侧待对比数据 清空" }));

    expect((screen.getByLabelText("左侧待对比数据") as HTMLTextAreaElement).value).toBe("");
    expect((screen.getByLabelText("右侧待对比数据") as HTMLTextAreaElement).value).toBe('{"right":"value"}');

    fireEvent.click(screen.getByRole("button", { name: "右侧待对比数据 清空" }));

    expect((screen.getByLabelText("右侧待对比数据") as HTMLTextAreaElement).value).toBe("");
  });

  it("面板名称默认显示左侧和右侧占位提示", () => {
    render(<Home />);

    expect(screen.getByRole("button", { name: "左侧待对比数据 命名" })).toHaveTextContent("左侧");
    expect(screen.getByRole("button", { name: "右侧待对比数据 命名" })).toHaveTextContent("右侧");
  });

  it("支持点击名称进入编辑并保存自定义名称", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "左侧待对比数据 命名" }));
    fireEvent.change(screen.getByLabelText("左侧待对比数据 自定义名称"), {
      target: { value: "实验组请求" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(screen.getByRole("button", { name: "左侧待对比数据 命名" })).toHaveTextContent("实验组请求");
    expect(JSON.parse(window.localStorage.getItem(PANEL_NAMES_STORAGE_KEY) ?? "{}")).toMatchObject({
      left: "实验组请求",
    });
  });

  it("自定义名称会持久化到本地存储并在刷新后恢复", () => {
    const { unmount } = render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "右侧待对比数据 命名" }));
    fireEvent.change(screen.getByLabelText("右侧待对比数据 自定义名称"), {
      target: { value: "基线版本" },
    });
    fireEvent.keyDown(screen.getByLabelText("右侧待对比数据 自定义名称"), {
      key: "Enter",
      code: "Enter",
      charCode: 13,
    });

    unmount();
    useDiffStore.getState().clearAll();
    render(<Home />);

    expect(screen.getByRole("button", { name: "右侧待对比数据 命名" })).toHaveTextContent("基线版本");
  });

  it("结果头部会在图标说明右侧展示左右自定义名称", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "左侧待对比数据 命名" }));
    fireEvent.change(screen.getByLabelText("左侧待对比数据 自定义名称"), {
      target: { value: "实验组A" },
    });
    fireEvent.keyDown(screen.getByLabelText("左侧待对比数据 自定义名称"), {
      key: "Enter",
      code: "Enter",
      charCode: 13,
    });

    fireEvent.click(screen.getByRole("button", { name: "右侧待对比数据 命名" }));
    fireEvent.change(screen.getByLabelText("右侧待对比数据 自定义名称"), {
      target: { value: "基线组B" },
    });
    fireEvent.keyDown(screen.getByLabelText("右侧待对比数据 自定义名称"), {
      key: "Enter",
      code: "Enter",
      charCode: 13,
    });

    fireEvent.change(screen.getByLabelText("左侧待对比数据"), {
      target: { value: JSON.stringify({ requestId: "left" }) },
    });
    fireEvent.change(screen.getByLabelText("右侧待对比数据"), {
      target: { value: JSON.stringify({ requestId: "right" }) },
    });
    fireEvent.click(screen.getByRole("button", { name: "开始对比" }));

    const resultsPanel = within(screen.getByTestId("diff-results-panel"));

    expect(resultsPanel.getByText("实验组A")).toBeInTheDocument();
    expect(resultsPanel.getByText("基线组B")).toBeInTheDocument();
    expect(resultsPanel.getAllByText("自定义名称")).toHaveLength(2);
  });

  it("结果头部未设置自定义名称时回退展示左侧和右侧", () => {
    render(<Home />);

    fireEvent.change(screen.getByLabelText("左侧待对比数据"), {
      target: { value: JSON.stringify({ requestId: "left" }) },
    });
    fireEvent.change(screen.getByLabelText("右侧待对比数据"), {
      target: { value: JSON.stringify({ requestId: "right" }) },
    });
    fireEvent.click(screen.getByRole("button", { name: "开始对比" }));

    const resultsPanel = within(screen.getByTestId("diff-results-panel"));

    expect(resultsPanel.getByText("左侧")).toBeInTheDocument();
    expect(resultsPanel.getByText("右侧")).toBeInTheDocument();

    const nameLabels = resultsPanel.getAllByText("自定义名称");
    const nameValueContainer = nameLabels[0].parentElement?.querySelector("p:last-child");
    expect(nameValueContainer?.className).toContain("whitespace-nowrap");
    expect(nameValueContainer?.className).toContain("overflow-x-auto");
  });

  it("JSON 与 cURL 对比时可以通过仅看相同筛出相同字段", () => {
    render(<Home />);

    fireEvent.change(screen.getByLabelText("左侧待对比数据"), {
      target: {
        value:
          "curl 'https://example.com/api/search?scene=test' -X POST -H 'Content-Type: application/json' --data-raw '{\"requestId\":\"same-id\",\"payload\":{\"page\":1,\"keyword\":\"shoe\"}}'",
      },
    });

    fireEvent.change(screen.getByLabelText("右侧待对比数据"), {
      target: {
        value: JSON.stringify({ requestId: "same-id", payload: { page: 1, keyword: "shoe", debug: true } }),
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "开始对比" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /仅看相同/i }));

    const resultsPanel = within(screen.getByTestId("diff-results-panel"));

    expect(resultsPanel.getAllByText("requestId")).toHaveLength(2);
    expect(resultsPanel.getAllByText("page")).toHaveLength(2);
    expect(resultsPanel.getAllByText("keyword")).toHaveLength(2);
    expect(resultsPanel.queryAllByText("payload.debug")).toHaveLength(0);
  });

  it("字段名展示默认只显示最后一级，并且可以切换回完整层级结构", () => {
    render(<Home />);

    fireEvent.change(screen.getByLabelText("左侧待对比数据"), {
      target: {
        value: JSON.stringify({
          campaign_sketch_form_data: {
            virtual_isolated: {
              _a_o_s: {
                validate_result: {
                  12: [
                    {
                      extras: {
                        custom_scene: "left-scene",
                      },
                    },
                  ],
                },
              },
            },
          },
        }),
      },
    });

    fireEvent.change(screen.getByLabelText("右侧待对比数据"), {
      target: {
        value: JSON.stringify({
          campaign_sketch_form_data: {
            virtual_isolated: {
              _a_o_s: {
                validate_result: {
                  12: [
                    {
                      extras: {
                        custom_scene: "right-scene",
                      },
                    },
                  ],
                },
              },
            },
          },
        }),
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "开始对比" }));

    const resultsPanel = within(screen.getByTestId("diff-results-panel"));
    const fullPath = "campaign_sketch_form_data.virtual_isolated._a_o_s.validate_result.12[0].extras.custom_scene";

    expect((screen.getByRole("checkbox", { name: /字段名仅显示最后一级/i }) as HTMLInputElement).checked).toBe(true);
    expect(resultsPanel.queryAllByText(fullPath)).toHaveLength(0);
    expect(resultsPanel.getAllByText("custom_scene")).toHaveLength(2);

    fireEvent.click(screen.getByRole("checkbox", { name: /字段名仅显示最后一级/i }));

    expect(resultsPanel.getAllByText(fullPath)).toHaveLength(2);
    expect(resultsPanel.queryAllByText("custom_scene")).toHaveLength(0);
  });

  it("字段名展示开关会持久化到本地配置，并在刷新后保持用户选择", () => {
    const { unmount } = render(<Home />);

    const toggle = screen.getByRole("checkbox", { name: /字段名仅显示最后一级/i }) as HTMLInputElement;

    expect(toggle.checked).toBe(true);

    fireEvent.click(toggle);

    expect(toggle.checked).toBe(false);
    expect(JSON.parse(window.localStorage.getItem(FIELD_DISPLAY_PREFERENCES_STORAGE_KEY) ?? "{}")).toMatchObject({
      showLeafFieldOnly: false,
    });

    unmount();
    useDiffStore.getState().clearAll();
    render(<Home />);

    expect((screen.getByRole("checkbox", { name: /字段名仅显示最后一级/i }) as HTMLInputElement).checked).toBe(false);
  });

  it("支持多选字段，只展示被选中的字段结果", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "填充 JSON 示例" }));

    fireEvent.click(screen.getByRole("checkbox", { name: "选择字段 requestId" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "选择字段 payload.filters.device" }));

    const resultsPanel = within(screen.getByTestId("diff-results-panel"));

    expect(resultsPanel.getAllByTestId("diff-row")).toHaveLength(2);
    expect(screen.getByText("当前只对比 2 个指定字段")).toBeInTheDocument();
    expect(screen.getByText("当前生效字段：", { selector: "span" })).toBeInTheDocument();
    expect(resultsPanel.getByText("REQ-20260623-LEFT")).toBeInTheDocument();
    expect(resultsPanel.getByText("REQ-20260623-RIGHT")).toBeInTheDocument();
  });

  it("保留单选模式作为兼容方案，并且一次只对比一个字段", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "填充 JSON 示例" }));
    fireEvent.click(screen.getByRole("button", { name: "单选模式" }));

    fireEvent.click(screen.getByRole("radio", { name: "选择字段 requestId" }));
    let resultsPanel = within(screen.getByTestId("diff-results-panel"));
    expect(resultsPanel.getAllByTestId("diff-row")).toHaveLength(1);
    expect(resultsPanel.getByText("REQ-20260623-LEFT")).toBeInTheDocument();
    expect(resultsPanel.getByText("REQ-20260623-RIGHT")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "选择字段 payload.filters.device" }));
    resultsPanel = within(screen.getByTestId("diff-results-panel"));
    expect(resultsPanel.getAllByTestId("diff-row")).toHaveLength(1);
    expect(resultsPanel.queryByText("REQ-20260623-LEFT")).toBeNull();
    expect(resultsPanel.queryByText("REQ-20260623-RIGHT")).toBeNull();
    expect(resultsPanel.getAllByText("ios").length).toBeGreaterThan(0);
  });

  it("手动字段输入为空时，保持默认展示全部字段", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "填充 JSON 示例" }));
    fireEvent.change(screen.getByLabelText("手动输入字段"), {
      target: { value: "   " },
    });

    const resultsPanel = within(screen.getByTestId("diff-results-panel"));

    expect(resultsPanel.getAllByTestId("diff-row").length).toBeGreaterThan(2);
    expect(screen.getByText("当前展示全部字段")).toBeInTheDocument();
  });

  it("支持手动输入单个字段并只展示该字段结果", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "填充 JSON 示例" }));
    fireEvent.change(screen.getByLabelText("手动输入字段"), {
      target: { value: "requestId" },
    });

    const resultsPanel = within(screen.getByTestId("diff-results-panel"));

    expect(resultsPanel.getAllByTestId("diff-row")).toHaveLength(1);
    expect(resultsPanel.getAllByText("requestId")).toHaveLength(2);
    expect(resultsPanel.queryByText("scene")).toBeNull();
    expect(screen.getByText("当前只对比 1 个指定字段")).toBeInTheDocument();
  });

  it("支持手动输入多个字段，并兼容逗号空格和换行分隔", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "填充 JSON 示例" }));
    fireEvent.change(screen.getByLabelText("手动输入字段"), {
      target: { value: "requestId, payload.page\nstrategy.priority" },
    });

    const resultsPanel = within(screen.getByTestId("diff-results-panel"));

    expect(resultsPanel.getAllByTestId("diff-row")).toHaveLength(3);
    expect(resultsPanel.getAllByText("requestId")).toHaveLength(2);
    expect(resultsPanel.getAllByText("page")).toHaveLength(2);
    expect(resultsPanel.getAllByText("priority")).toHaveLength(2);
    expect(resultsPanel.queryByText("payload.filters.region")).toBeNull();
  });

  it("手动输入不存在的字段时会给出清晰提示", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "填充 JSON 示例" }));
    fireEvent.change(screen.getByLabelText("手动输入字段"), {
      target: { value: "not.exists payload.page" },
    });

    const resultsPanel = within(screen.getByTestId("diff-results-panel"));

    expect(screen.getByText("以下字段未在当前数据中找到：not.exists")).toBeInTheDocument();
    expect(resultsPanel.getAllByTestId("diff-row")).toHaveLength(1);
    expect(resultsPanel.getAllByText("page")).toHaveLength(2);
  });

  it("支持多选和手动输入组合使用，只展示并集字段", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "填充 JSON 示例" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "选择字段 requestId" }));
    fireEvent.change(screen.getByLabelText("手动输入字段"), {
      target: { value: "payload.page" },
    });

    const resultsPanel = within(screen.getByTestId("diff-results-panel"));

    expect(resultsPanel.getAllByTestId("diff-row")).toHaveLength(2);
    expect(resultsPanel.getAllByText("requestId")).toHaveLength(2);
    expect(resultsPanel.getAllByText("page")).toHaveLength(2);
    expect(resultsPanel.queryByText("scene")).toBeNull();
  });

  it("手动输入 data_dict 前缀字段时会优先命中顶级业务字段", () => {
    render(<Home />);

    fireEvent.change(screen.getByLabelText("左侧待对比数据"), {
      target: {
        value: JSON.stringify({ spc_upgrade_mode: 1, budget: 50 }),
      },
    });
    fireEvent.change(screen.getByLabelText("右侧待对比数据"), {
      target: {
        value: JSON.stringify({ data_dict: { spc_upgrade_mode: 2 }, budget: 50 }),
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "开始对比" }));

    fireEvent.change(screen.getByLabelText("手动输入字段"), {
      target: { value: "data_dict.spc_upgrade_mode" },
    });

    const resultsPanel = within(screen.getByTestId("diff-results-panel"));

    expect(resultsPanel.getAllByTestId("diff-row")).toHaveLength(1);
    expect(resultsPanel.getAllByText("spc_upgrade_mode")).toHaveLength(2);
    expect(resultsPanel.queryByText("data_dict.spc_upgrade_mode")).toBeNull();
  });

  it("支持清空手动输入并恢复默认展示全部字段", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "填充 JSON 示例" }));
    fireEvent.change(screen.getByLabelText("手动输入字段"), {
      target: { value: "requestId" },
    });

    let resultsPanel = within(screen.getByTestId("diff-results-panel"));
    expect(resultsPanel.getAllByTestId("diff-row")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "清空输入" }));

    resultsPanel = within(screen.getByTestId("diff-results-panel"));
    expect(resultsPanel.getAllByTestId("diff-row").length).toBeGreaterThan(2);
    expect((screen.getByLabelText("手动输入字段") as HTMLTextAreaElement).value).toBe("");
  });

  it("仅看相同与仅看差异互斥", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "填充 JSON 示例" }));

    const sameCheckbox = screen.getByRole("checkbox", { name: /仅看相同/i });
    const diffCheckbox = screen.getByRole("checkbox", { name: /仅看差异/i });

    fireEvent.click(sameCheckbox);
    expect((sameCheckbox as HTMLInputElement).checked).toBe(true);
    expect((diffCheckbox as HTMLInputElement).checked).toBe(false);

    fireEvent.click(diffCheckbox);
    expect((diffCheckbox as HTMLInputElement).checked).toBe(true);
    expect((sameCheckbox as HTMLInputElement).checked).toBe(false);
  });

  it("筛选按钮采用更紧凑的分组布局", () => {
    render(<Home />);

    const filterGroup = screen.getByTestId("compare-filter-group");

    expect(filterGroup.className).toContain("gap-2");
    expect(filterGroup.className).toContain("p-1.5");
  });

  it("默认自动识别模式下直接粘贴 cURL 也能正常对比", () => {
    render(<Home />);

    fireEvent.change(screen.getByLabelText("左侧待对比数据"), {
      target: {
        value:
          "curl ' `https://example.com/api/search?scene=test` ' -X POST -H 'Content-Type: application/json' --data-raw $'{\"requestId\":\"curl-auto\"}'",
      },
    });

    fireEvent.change(screen.getByLabelText("右侧待对比数据"), {
      target: {
        value: JSON.stringify({ requestId: "json-right" }),
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "开始对比" }));

    const resultsPanel = within(screen.getByTestId("diff-results-panel"));

    expect(resultsPanel.getAllByText("requestId")).toHaveLength(2);
    expect(resultsPanel.getByText("curl-auto")).toBeInTheDocument();
    expect(resultsPanel.getByText("json-right")).toBeInTheDocument();
  });

  it("对比两个 cURL 时会展开到具体叶子字段，而不是整体对象", () => {
    render(<Home />);

    fireEvent.change(screen.getByLabelText("左侧待对比数据"), {
      target: {
        value:
          "curl 'https://example.com/api/save?scene=test' -X POST -H 'Content-Type: application/json' --data-raw '{\"campaign_sketch_form_data\":{\"budget\":\"50.00\",\"payload\":{\"page\":1}}}'",
      },
    });

    fireEvent.change(screen.getByLabelText("右侧待对比数据"), {
      target: {
        value:
          "curl 'https://example.com/api/save?scene=test' -X POST -H 'Content-Type: application/json' --data-raw '{\"campaign_sketch_form_data\":{\"budget\":\"60.00\",\"payload\":{\"page\":2}}}'",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "开始对比" }));

    const resultsPanel = within(screen.getByTestId("diff-results-panel"));

    expect(resultsPanel.queryAllByText("campaign_sketch_form_data")).toHaveLength(0);
    expect(resultsPanel.getAllByText("budget")).toHaveLength(2);
    expect(resultsPanel.getAllByText("page")).toHaveLength(2);
    expect(resultsPanel.getByText("50.00")).toBeInTheDocument();
    expect(resultsPanel.getByText("60.00")).toBeInTheDocument();
  });

  it("手动选择 JSON 模式后粘贴 cURL 会提示切换模式", () => {
    render(<Home />);

    fireEvent.change(screen.getByLabelText("左侧待对比数据 输入模式"), {
      target: { value: "json" },
    });
    fireEvent.change(screen.getByLabelText("左侧待对比数据"), {
      target: {
        value: "curl 'https://example.com/api/save' --data-raw '{\"name\":\"demo\"}'",
      },
    });
    fireEvent.change(screen.getByLabelText("右侧待对比数据"), {
      target: { value: "{}" },
    });

    fireEvent.click(screen.getByRole("button", { name: "开始对比" }));

    expect(screen.getByText(/检测到当前内容是 cURL 命令/)).toBeInTheDocument();
  });

  it("支持字段搜索和精确匹配切换", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "填充 JSON 示例" }));
    const searchInput = screen.getByLabelText("字段搜索");

    fireEvent.change(searchInput, {
      target: { value: "priority" },
    });

    expect(screen.getByText("按回车确认搜索")).toBeInTheDocument();
    expect(screen.queryByText("1/1")).toBeNull();

    fireEvent.keyDown(searchInput, {
      key: "Enter",
      code: "Enter",
      charCode: 13,
    });

    const resultsPanel = screen.getByTestId("diff-results-panel");
    const priorityLabels = Array.from(resultsPanel.querySelectorAll("p")).filter((node) => node.textContent === "priority");

    expect(priorityLabels).toHaveLength(2);
    expect(screen.getByText("1/1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "精确匹配" }));
    expect(screen.getByText("1/1")).toBeInTheDocument();
  });

  it("搜索框采用顶部吸附布局", () => {
    render(<Home />);

    const toolbar = screen.getByTestId("sticky-search-toolbar");
    const toolbarCard = screen.getByTestId("search-toolbar-card");

    expect(toolbar.className).toContain("sticky");
    expect(toolbar.className).toContain("top-4");
    expect(toolbar.className).toContain("z-30");
    expect(toolbarCard.className).not.toContain("sticky");
  });

  it("清空后会重置已确认的搜索状态", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "填充 JSON 示例" }));
    const searchInput = screen.getByLabelText("字段搜索");

    fireEvent.change(searchInput, {
      target: { value: "priority" },
    });
    fireEvent.keyDown(searchInput, {
      key: "Enter",
      code: "Enter",
      charCode: 13,
    });

    expect(screen.getByText("1/1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "全部清空" }));

    expect((screen.getByLabelText("字段搜索") as HTMLInputElement).value).toBe("");
    expect(screen.getByText("未开始搜索")).toBeInTheDocument();
  });

  it("会保存历史对比记录并支持重新加载", () => {
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "左侧待对比数据 命名" }));
    fireEvent.change(screen.getByLabelText("左侧待对比数据 自定义名称"), {
      target: { value: "实验版本" },
    });
    fireEvent.keyDown(screen.getByLabelText("左侧待对比数据 自定义名称"), {
      key: "Enter",
      code: "Enter",
      charCode: 13,
    });

    fireEvent.click(screen.getByRole("button", { name: "右侧待对比数据 命名" }));
    fireEvent.change(screen.getByLabelText("右侧待对比数据 自定义名称"), {
      target: { value: "对照版本" },
    });
    fireEvent.keyDown(screen.getByLabelText("右侧待对比数据 自定义名称"), {
      key: "Enter",
      code: "Enter",
      charCode: 13,
    });

    fireEvent.change(screen.getByLabelText("左侧待对比数据"), {
      target: { value: JSON.stringify({ requestId: "history-left", payload: { page: 1 } }) },
    });
    fireEvent.change(screen.getByLabelText("右侧待对比数据"), {
      target: { value: JSON.stringify({ requestId: "history-right", payload: { page: 2 } }) },
    });

    fireEvent.click(screen.getByRole("button", { name: "开始对比" }));

    fireEvent.click(screen.getByRole("button", { name: "查看历史" }));

    expect(screen.getByText("历史对比记录")).toBeInTheDocument();
    expect(screen.getByText("history-left")).toBeInTheDocument();
    expect(screen.getByText("history-right")).toBeInTheDocument();
    expect(screen.getAllByText("实验版本").length).toBeGreaterThan(1);
    expect(screen.getAllByText("对照版本").length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole("button", { name: /重新加载这次对比/i }));

    expect((screen.getByLabelText("左侧待对比数据") as HTMLTextAreaElement).value).toContain("history-left");
    expect((screen.getByLabelText("右侧待对比数据") as HTMLTextAreaElement).value).toContain("history-right");
    expect(screen.getByRole("button", { name: "左侧待对比数据 命名" })).toHaveTextContent("实验版本");
    expect(screen.getByRole("button", { name: "右侧待对比数据 命名" })).toHaveTextContent("对照版本");
    expect(screen.queryByText("历史对比记录")).not.toBeInTheDocument();
  });
});
