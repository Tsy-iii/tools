import type { KeyboardEvent as ReactKeyboardEvent } from "react";

const NATIVE_EDITING_SHORTCUTS = new Set(["a", "c", "v", "x", "z", "y"]);

function isEditableElement(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

function selectAllText(target: HTMLInputElement | HTMLTextAreaElement) {
  target.focus();
  target.select();
}

export function preserveNativeEditingShortcuts(event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
  if (!isEditableElement(event.target)) {
    return;
  }

  const key = event.key.toLowerCase();
  const hasModifier = event.metaKey || event.ctrlKey;

  if (!hasModifier || !NATIVE_EDITING_SHORTCUTS.has(key)) {
    return;
  }

  if (key === "a") {
    // Some embedded hosts still hijack Cmd/Ctrl+A before the browser completes
    // native selection. Select the current editable value explicitly so users
    // can reliably select all text while staying scoped to the focused input.
    selectAllText(event.target);
    event.preventDefault();
  }

  // Prevent higher-level shortcut handlers from hijacking common editing keys.
  event.stopPropagation();
}
