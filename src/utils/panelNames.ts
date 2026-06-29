export const PANEL_NAMES_STORAGE_KEY = "json-compare-panel-names";

export type PanelNames = {
  left: string;
  right: string;
};

const EMPTY_PANEL_NAMES: PanelNames = {
  left: "",
  right: "",
};

export function readPanelNames(): PanelNames {
  if (typeof window === "undefined") {
    return EMPTY_PANEL_NAMES;
  }

  const raw = window.localStorage.getItem(PANEL_NAMES_STORAGE_KEY);

  if (!raw) {
    return EMPTY_PANEL_NAMES;
  }

  try {
    const parsed = JSON.parse(raw);

    return {
      left: typeof parsed?.left === "string" ? parsed.left : "",
      right: typeof parsed?.right === "string" ? parsed.right : "",
    };
  } catch {
    return EMPTY_PANEL_NAMES;
  }
}

export function writePanelNames(names: PanelNames) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PANEL_NAMES_STORAGE_KEY, JSON.stringify(names));
}
