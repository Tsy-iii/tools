import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Home from "@/pages/Home";
import { useDiffStore } from "@/stores/useDiffStore";
import { COMPARE_HISTORY_STORAGE_KEY } from "@/utils/compareHistory";
import { FIELD_DISPLAY_PREFERENCES_STORAGE_KEY } from "@/utils/fieldDisplayPreferences";
import { PANEL_NAMES_STORAGE_KEY } from "@/utils/panelNames";

describe("Home editing shortcuts", () => {
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

  it("在正确焦点下按下 Command+A 会选中当前输入框全部文本，并阻止父层快捷键劫持", () => {
    const parentBubbleSpy = vi.fn();

    render(
      <div onKeyDown={parentBubbleSpy}>
        <Home />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "填充 JSON 示例" }));

    const leftInput = screen.getByLabelText("左侧待对比数据") as HTMLTextAreaElement;
    const searchInput = screen.getByLabelText("字段搜索") as HTMLInputElement;
    const manualInput = screen.getByLabelText("手动输入字段") as HTMLTextAreaElement;

    fireEvent.change(searchInput, { target: { value: "requestId" } });
    fireEvent.change(manualInput, { target: { value: "payload.page\nrequestId" } });

    const cases = [
      leftInput,
      searchInput,
      manualInput,
    ];

    for (const target of cases) {
      target.focus();

      const event = new KeyboardEvent("keydown", {
        key: "a",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });

      target.dispatchEvent(event);

      expect(document.activeElement).toBe(target);
      expect(target.selectionStart).toBe(0);
      expect(target.selectionEnd).toBe(target.value.length);
      expect(event.defaultPrevented).toBe(true);
    }

    expect(parentBubbleSpy).not.toHaveBeenCalled();
  });

  it("其他编辑快捷键仍不会被额外阻止", () => {
    const parentBubbleSpy = vi.fn();

    render(
      <div onKeyDown={parentBubbleSpy}>
        <Home />
      </div>,
    );

    const searchInput = screen.getByLabelText("字段搜索") as HTMLInputElement;

    searchInput.focus();

    const event = new KeyboardEvent("keydown", {
      key: "c",
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });

    searchInput.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(parentBubbleSpy).not.toHaveBeenCalled();
  });
});
