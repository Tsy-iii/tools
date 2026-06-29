import { describe, expect, it, vi } from "vitest";

import { preserveNativeEditingShortcuts } from "@/utils/editingShortcuts";

describe("preserveNativeEditingShortcuts", () => {
  it("在输入控件内按下 Cmd/Ctrl+A 时会显式全选当前文本并阻止继续冒泡", () => {
    const stopPropagation = vi.fn();
    const preventDefault = vi.fn();
    const textarea = document.createElement("textarea");
    textarea.value = "alpha beta";
    document.body.appendChild(textarea);

    preserveNativeEditingShortcuts({
      key: "a",
      metaKey: true,
      ctrlKey: false,
      target: textarea,
      stopPropagation,
      preventDefault,
    } as never);

    expect(textarea.selectionStart).toBe(0);
    expect(textarea.selectionEnd).toBe(textarea.value.length);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);

    textarea.remove();
  });

  it("复制粘贴撤销等其它编辑快捷键仍保持原行为，只阻止继续冒泡", () => {
    const stopPropagation = vi.fn();
    const preventDefault = vi.fn();

    preserveNativeEditingShortcuts({
      key: "c",
      metaKey: true,
      ctrlKey: false,
      target: document.createElement("textarea"),
      stopPropagation,
      preventDefault,
    } as never);

    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it("非编辑快捷键不做额外处理", () => {
    const stopPropagation = vi.fn();

    preserveNativeEditingShortcuts({
      key: "Enter",
      metaKey: false,
      ctrlKey: false,
      target: document.createElement("textarea"),
      stopPropagation,
    } as never);

    expect(stopPropagation).not.toHaveBeenCalled();
  });
});
